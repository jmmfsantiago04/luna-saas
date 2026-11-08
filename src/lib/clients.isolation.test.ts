/**
 * Integration: CRM clients data layer against Neon DEV.
 * Real list/get/create/update/archive/restore + requireOrg; auth mocked.
 */
import { after, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

function assertDevOnly() {
  assert.equal(process.env.NEON_BRANCH, "dev", "NEON_BRANCH must be dev");
  const url = process.env.DATABASE_URL ?? "";
  const host = url.split("@")[1]?.split("/")[0] ?? "";
  assert.ok(
    host.startsWith("ep-dawn-mode-b6qupa3e"),
    "DATABASE_URL host must be the neon dev endpoint",
  );
}

assertDevOnly();

type Session = {
  user: { id: string; email: string; name?: string | null };
  sessionVersion: number;
};

const sessionBox: { current: Session | null } = { current: null };

mock.module("server-only", { contents: "" });
mock.module("react", {
  exports: { cache: (fn: unknown) => fn },
});
mock.module("next/navigation", {
  exports: {
    notFound: () => {
      const e = new Error("NOT_FOUND");
      (e as Error & { digest?: string }).digest = "NEXT_HTTP_ERROR_FALLBACK;404";
      throw e;
    },
    redirect: (url: string) => {
      const e = new Error(`REDIRECT:${url}`);
      (e as Error & { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};303`;
      throw e;
    },
  },
});
mock.module("@/auth", {
  exports: {
    auth: async () => sessionBox.current,
    signIn: async () => undefined,
    signOut: async () => undefined,
    handlers: {},
  },
});

function isNotFound(err: unknown) {
  return (
    err instanceof Error &&
    ((err as Error & { digest?: string }).digest === "NEXT_HTTP_ERROR_FALLBACK;404" ||
      err.message === "NOT_FOUND")
  );
}

function asSession(user: { id: string; email: string; name?: string | null }): Session {
  return {
    user: { id: user.id, email: user.email, name: user.name ?? null },
    sessionVersion: 0,
  };
}

describe("clients data layer (integration, neon dev)", { concurrency: false }, async () => {
  const runId = `${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  const prefix = `crm-${runId}`;
  const emailA = `${prefix}-owner-a@luna-crm.test`;
  const emailB = `${prefix}-owner-b@luna-crm.test`;
  const slugA = `${prefix}-orga`;
  const slugB = `${prefix}-orgb`;

  const ids = {
    ownerA: "" as string,
    ownerB: "" as string,
    orgA: "" as string,
    orgB: "" as string,
    clientA: "" as string,
    clientB: "" as string,
  };

  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { eq, or, like, inArray } = await import("drizzle-orm");
  const {
    listClients,
    getClient,
    createClient,
    updateClient,
    archiveClient,
    restoreClient,
    listClientTags,
    CLIENTS_PAGE_SIZE,
  } = await import("@/lib/clients");

  const { users, organizations, organizationMembers, clients } = schema;

  async function cleanupFixtures() {
    const orgRows = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(or(eq(organizations.slug, slugA), eq(organizations.slug, slugB)));
    const orgIds = orgRows.map((r) => r.id);
    if (orgIds.length > 0) {
      await db.delete(clients).where(inArray(clients.organizationId, orgIds));
      await db.delete(organizationMembers).where(inArray(organizationMembers.organizationId, orgIds));
      await db.delete(organizations).where(inArray(organizations.id, orgIds));
    }
    const userRows = await db.select({ id: users.id }).from(users).where(like(users.email, `${prefix}-%`));
    const userIds = userRows.map((r) => r.id);
    if (userIds.length > 0) {
      await db.delete(organizationMembers).where(inArray(organizationMembers.userId, userIds));
      await db.delete(users).where(inArray(users.id, userIds));
    }
  }

  async function assertCleanupDone() {
    const leftUsers = await db.select({ id: users.id }).from(users).where(like(users.email, `${prefix}-%`));
    const leftOrgs = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(or(eq(organizations.slug, slugA), eq(organizations.slug, slugB)));
    assert.equal(leftUsers.length, 0, "fixture users remain");
    assert.equal(leftOrgs.length, 0, "fixture orgs remain");
  }

  before(async () => {
    assertDevOnly();
    await cleanupFixtures();

    const inserted = await db
      .insert(users)
      .values([
        { email: emailA, name: "CRM Owner A", sessionVersion: 0 },
        { email: emailB, name: "CRM Owner B", sessionVersion: 0 },
      ])
      .returning({ id: users.id, email: users.email });
    const byEmail = Object.fromEntries(inserted.map((u) => [u.email, u.id]));
    ids.ownerA = byEmail[emailA]!;
    ids.ownerB = byEmail[emailB]!;

    const [orgA] = await db
      .insert(organizations)
      .values({ name: `CRM Org A ${runId}`, slug: slugA })
      .returning({ id: organizations.id });
    const [orgB] = await db
      .insert(organizations)
      .values({ name: `CRM Org B ${runId}`, slug: slugB })
      .returning({ id: organizations.id });
    ids.orgA = orgA!.id;
    ids.orgB = orgB!.id;

    await db.insert(organizationMembers).values([
      { organizationId: ids.orgA, userId: ids.ownerA, role: "owner" },
      { organizationId: ids.orgB, userId: ids.ownerB, role: "owner" },
    ]);
  });

  after(async () => {
    try {
      await cleanupFixtures();
      await assertCleanupDone();
    } finally {
      sessionBox.current = null;
      try {
        const client =
          (db as unknown as { $client?: { end?: () => Promise<void> } }).$client ??
          (db as unknown as { session?: { client?: { end?: () => Promise<void> } } }).session?.client;
        if (client?.end) await client.end();
      } catch {
        /* ignore */
      }
    }
  });

  it("createClient succeeds and rejects invalid payload", async () => {
    sessionBox.current = asSession({ id: ids.ownerA, email: emailA });
    const bad = await createClient(slugA, { name: "", type: "person" });
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.ok(bad.fieldErrors?.name);

    const created = await createClient(slugA, {
      name: " Alpha Client ",
      type: "company",
      email: "  Alpha@CRM.TEST ",
      phone: "",
      notes: "hello",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    ids.clientA = created.id;

    const row = await getClient(slugA, ids.clientA);
    assert.equal(row.organizationId, ids.orgA);
    assert.equal(row.name, "Alpha Client");
    assert.equal(row.type, "company");
    assert.equal(row.email, "alpha@crm.test");
    assert.equal(row.phone, null);
    assert.equal(row.notes, "hello");
    assert.equal(row.archivedAt, null);
  });

  it("updateClient updates fields and sets updatedAt; invalid payload returns errors", async () => {
    sessionBox.current = asSession({ id: ids.ownerA, email: emailA });
    const before = await getClient(slugA, ids.clientA);
    const invalid = await updateClient(slugA, ids.clientA, { name: "X", type: "nope" });
    assert.equal(invalid.ok, false);

    const ok = await updateClient(slugA, ids.clientA, {
      name: "Alpha Updated",
      type: "person",
      email: "alpha@crm.test",
      phone: "11999990000",
      contact: "João",
      source: "web",
      notes: "n2",
    });
    assert.equal(ok.ok, true);
    const after = await getClient(slugA, ids.clientA);
    assert.equal(after.name, "Alpha Updated");
    assert.equal(after.type, "person");
    assert.equal(after.phone, "11999990000");
    assert.ok(after.updatedAt.getTime() >= before.updatedAt.getTime());
    assert.equal(after.organizationId, ids.orgA);
  });

  it("listClients defaults to active, supports search, pagination size, and archived filter", async () => {
    sessionBox.current = asSession({ id: ids.ownerA, email: emailA });

    // Seed enough clients for pagination + search
    for (let i = 0; i < CLIENTS_PAGE_SIZE + 3; i++) {
      const res = await createClient(slugA, {
        name: i === 0 ? "Zebra SearchTarget" : `Bulk Client ${String(i).padStart(2, "0")}`,
        type: "person",
        email: i === 1 ? "searchtarget@crm.test" : null,
      });
      assert.equal(res.ok, true);
    }

    const page1 = await listClients(slugA, {});
    assert.equal(page1.ok, true);
    if (!page1.ok) return;
    assert.equal(page1.pageSize, CLIENTS_PAGE_SIZE);
    assert.equal(page1.items.length, CLIENTS_PAGE_SIZE);
    assert.ok(page1.total >= CLIENTS_PAGE_SIZE + 4); // + original Alpha
    assert.ok(page1.pageCount >= 2);
    assert.equal(page1.items.every((c) => c.organizationId === ids.orgA), true);
    assert.equal(page1.items.every((c) => c.archivedAt === null), true);

    const page2 = await listClients(slugA, { page: 2 });
    assert.equal(page2.ok, true);
    if (page2.ok) assert.ok(page2.items.length >= 1);

    const byName = await listClients(slugA, { q: "SearchTarget" });
    assert.equal(byName.ok, true);
    if (byName.ok) {
      assert.ok(byName.items.some((c) => c.name.includes("SearchTarget")));
      assert.equal(byName.items.every((c) => c.organizationId === ids.orgA), true);
    }

    const byEmail = await listClients(slugA, { q: "searchtarget@crm.test" });
    assert.equal(byEmail.ok, true);
    if (byEmail.ok) assert.ok(byEmail.items.some((c) => c.email === "searchtarget@crm.test"));

    await archiveClient(slugA, ids.clientA);
    const active = await listClients(slugA, { status: "active" });
    assert.equal(active.ok, true);
    if (active.ok) assert.equal(active.items.some((c) => c.id === ids.clientA), false);

    const archived = await listClients(slugA, { status: "archived" });
    assert.equal(archived.ok, true);
    if (archived.ok) {
      assert.ok(archived.items.some((c) => c.id === ids.clientA));
      assert.equal(archived.items.every((c) => c.archivedAt !== null), true);
    }

    await restoreClient(slugA, ids.clientA);
    const restored = await getClient(slugA, ids.clientA);
    assert.equal(restored.archivedAt, null);
  });

  it("cross-org list/get/update/archive/restore are denied (notFound)", async () => {
    sessionBox.current = asSession({ id: ids.ownerB, email: emailB });
    const createdB = await createClient(slugB, { name: "Org B Client", type: "person" });
    assert.equal(createdB.ok, true);
    if (!createdB.ok) return;
    ids.clientB = createdB.id;

    // B cannot use slug A
    await assert.rejects(async () => listClients(slugA, {}), isNotFound);
    await assert.rejects(async () => getClient(slugA, ids.clientA), isNotFound);
    await assert.rejects(async () => updateClient(slugA, ids.clientA, { name: "hack", type: "person" }), isNotFound);
    await assert.rejects(async () => archiveClient(slugA, ids.clientA), isNotFound);
    await assert.rejects(async () => restoreClient(slugA, ids.clientA), isNotFound);

    // B on own slug cannot read/update A's client id (foreign tenant row)
    await assert.rejects(async () => getClient(slugB, ids.clientA), isNotFound);
    await assert.rejects(async () => updateClient(slugB, ids.clientA, { name: "hack", type: "person" }), isNotFound);
    await assert.rejects(async () => archiveClient(slugB, ids.clientA), isNotFound);
    await assert.rejects(async () => restoreClient(slugB, ids.clientA), isNotFound);

    // A list must not include B's client
    sessionBox.current = asSession({ id: ids.ownerA, email: emailA });
    const listA = await listClients(slugA, { status: "active" });
    assert.equal(listA.ok, true);
    if (listA.ok) assert.equal(listA.items.some((c) => c.id === ids.clientB), false);

    // invalid uuid → notFound
    await assert.rejects(async () => getClient(slugA, "not-a-uuid"), isNotFound);
  });

  it("search covers phone/instagram/document and tag filter + listClientTags stay in-org", async () => {
    sessionBox.current = asSession({ id: ids.ownerA, email: emailA });
    const a1 = await createClient(slugA, {
      name: "Tagged A1", type: "person", phone: "71988887777", instagram: "@luna_tag_a1",
      document: "123.456.789-00", tags: "vip, noiva",
    });
    const a2 = await createClient(slugA, { name: "Tagged A2", type: "person", tags: ["noiva"] });
    assert.equal(a1.ok && a2.ok, true);
    if (!a1.ok || !a2.ok) return;

    for (const q of ["988887777", "luna_tag_a1", "456.789"]) {
      const res = await listClients(slugA, { q });
      assert.equal(res.ok, true);
      if (res.ok) assert.deepEqual(res.items.map((c) => c.id), [a1.id], q);
    }
    const literal = await listClients(slugA, { q: "%" });
    assert.equal(literal.ok, true);
    if (literal.ok) assert.equal(literal.items.length, 0);

    const vip = await listClients(slugA, { tag: "vip" });
    assert.equal(vip.ok, true);
    if (vip.ok) assert.deepEqual(vip.items.map((c) => c.id), [a1.id]);
    const noiva = await listClients(slugA, { tag: "noiva" });
    if (noiva.ok) assert.deepEqual(new Set(noiva.items.map((c) => c.id)), new Set([a1.id, a2.id]));
    const combo = await listClients(slugA, { tag: "noiva", q: "A2" });
    if (combo.ok) assert.deepEqual(combo.items.map((c) => c.id), [a2.id]);

    assert.deepEqual(await listClientTags(slugA), ["noiva", "vip"]);

    sessionBox.current = asSession({ id: ids.ownerB, email: emailB });
    const b = await createClient(slugB, { name: "Tagged B", type: "person", tags: "segredo-b, vip" });
    assert.equal(b.ok, true);
    assert.deepEqual(await listClientTags(slugB), ["segredo-b", "vip"]);
    const bVip = await listClients(slugB, { tag: "vip" });
    if (bVip.ok) assert.equal(bVip.items.every((c) => c.organizationId === ids.orgB), true);
    await assert.rejects(async () => listClientTags(slugA), isNotFound);

    sessionBox.current = asSession({ id: ids.ownerA, email: emailA });
    assert.equal((await listClientTags(slugA)).includes("segredo-b"), false);
    const aSeg = await listClients(slugA, { tag: "segredo-b" });
    if (aSeg.ok) assert.equal(aSeg.items.length, 0);
  });
});
