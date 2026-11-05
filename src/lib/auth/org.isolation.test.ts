/**
 * Integration tests: org isolation + invites against Neon DEV only.
 * Coverage: actual requireOrg / createInvite / acceptInvite / findValidInvite / getUserOrgs.
 * Not browser/E2E. Auth + email mocked; DB real (dev).
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
const emailCalls: { to: string }[] = [];

mock.module("server-only", { contents: "" });
mock.module("react", {
  exports: {
    cache: (fn: unknown) => fn,
  },
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
mock.module("next/cache", {
  exports: { revalidatePath: () => {} },
});
mock.module("@/auth", {
  exports: {
    auth: async () => sessionBox.current,
    signIn: async () => undefined,
    signOut: async () => undefined,
    handlers: {},
  },
});
mock.module("@/lib/email", {
  exports: {
    sendEmail: async (opts: { to: string }) => {
      emailCalls.push({ to: opts.to });
      return { ok: true as const };
    },
    inviteEmail: () => ({ subject: "t", text: "t", html: "t" }),
    resetPasswordEmail: () => ({ subject: "t", text: "t", html: "t" }),
    escapeHtml: (s: string) => s,
  },
});

function isNotFound(err: unknown) {
  return (
    err instanceof Error &&
    ((err as Error & { digest?: string }).digest === "NEXT_HTTP_ERROR_FALLBACK;404" ||
      err.message === "NOT_FOUND")
  );
}

function isRedirect(err: unknown, needle: string) {
  if (!(err instanceof Error)) return false;
  const digest = (err as Error & { digest?: string }).digest ?? "";
  return digest.includes("NEXT_REDIRECT") && (digest.includes(needle) || err.message.includes(needle));
}

function asSession(user: { id: string; email: string; name?: string | null; sessionVersion?: number }): Session {
  return {
    user: { id: user.id, email: user.email, name: user.name ?? null },
    sessionVersion: user.sessionVersion ?? 0,
  };
}

describe("org isolation (integration, neon dev)", { concurrency: false }, async () => {
  const runId = `${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  const prefix = `iso-${runId}`;

  const emailOwnerA = `${prefix}-owner-a@luna-iso.test`;
  const emailAdminA = `${prefix}-admin-a@luna-iso.test`;
  const emailOwnerB = `${prefix}-owner-b@luna-iso.test`;
  const emailInvitee = `${prefix}-invitee@luna-iso.test`;
  const emailStranger = `${prefix}-stranger@luna-iso.test`;
  const slugA = `${prefix}-orga`;
  const slugB = `${prefix}-orgb`;

  const ids = {
    ownerA: "" as string,
    adminA: "" as string,
    ownerB: "" as string,
    invitee: "" as string,
    stranger: "" as string,
    orgA: "" as string,
    orgB: "" as string,
  };

  // Dynamic imports AFTER mocks.
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { eq, and, inArray, like, or } = await import("drizzle-orm");
  const { requireOrg } = await import("@/lib/auth/org");
  const { getUserOrgs } = await import("@/lib/auth/user-orgs");
  const { createInvite } = await import("@/app/app/[org]/members/actions");
  const { acceptInvite } = await import("@/app/invite/[token]/actions");
  const { findValidInvite } = await import("@/lib/invite-lookup");
  const { generateInviteToken } = await import("@/lib/invites");

  const { users, organizations, organizationMembers, organizationInvites } = schema;

  async function cleanupFixtures() {
    const orgRows = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(or(eq(organizations.slug, slugA), eq(organizations.slug, slugB)));
    const orgIds = orgRows.map((r) => r.id);

    if (orgIds.length > 0) {
      await db.delete(organizationInvites).where(inArray(organizationInvites.organizationId, orgIds));
      await db.delete(organizationMembers).where(inArray(organizationMembers.organizationId, orgIds));
      await db.delete(organizations).where(inArray(organizations.id, orgIds));
    }

    // Invites addressed to fixture emails but possibly orphaned
    await db.delete(organizationInvites).where(like(organizationInvites.email, `${prefix}-%`));

    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, `${prefix}-%`));
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
    const leftInvites = await db
      .select({ id: organizationInvites.id })
      .from(organizationInvites)
      .where(like(organizationInvites.email, `${prefix}-%`));
    assert.equal(leftUsers.length, 0, "fixture users remain");
    assert.equal(leftOrgs.length, 0, "fixture orgs remain");
    assert.equal(leftInvites.length, 0, "fixture invites remain");
  }

  before(async () => {
    assertDevOnly();
    await cleanupFixtures();

    const insertedUsers = await db
      .insert(users)
      .values([
        { email: emailOwnerA, name: "Owner A", sessionVersion: 0 },
        { email: emailAdminA, name: "Admin A", sessionVersion: 0 },
        { email: emailOwnerB, name: "Owner B", sessionVersion: 0 },
        { email: emailInvitee, name: "Invitee", sessionVersion: 0 },
        { email: emailStranger, name: "Stranger", sessionVersion: 0 },
      ])
      .returning({ id: users.id, email: users.email });

    const byEmail = Object.fromEntries(insertedUsers.map((u) => [u.email, u.id]));
    ids.ownerA = byEmail[emailOwnerA]!;
    ids.adminA = byEmail[emailAdminA]!;
    ids.ownerB = byEmail[emailOwnerB]!;
    ids.invitee = byEmail[emailInvitee]!;
    ids.stranger = byEmail[emailStranger]!;

    const [orgA] = await db
      .insert(organizations)
      .values({ name: `ISO Org A ${runId}`, slug: slugA })
      .returning({ id: organizations.id });
    const [orgB] = await db
      .insert(organizations)
      .values({ name: `ISO Org B ${runId}`, slug: slugB })
      .returning({ id: organizations.id });
    ids.orgA = orgA!.id;
    ids.orgB = orgB!.id;

    await db.insert(organizationMembers).values([
      { organizationId: ids.orgA, userId: ids.ownerA, role: "owner" },
      { organizationId: ids.orgA, userId: ids.adminA, role: "admin" },
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
        // drizzle node-postgres: end underlying Pool so node:test can exit.
        const client = (db as unknown as { $client?: { end?: () => Promise<void> } }).$client
          ?? (db as unknown as { session?: { client?: { end?: () => Promise<void> } } }).session?.client;
        if (client?.end) await client.end();
      } catch {
        /* ignore */
      }
    }
  });

  it("nonmember cannot access other org via requireOrg", async () => {
    sessionBox.current = asSession({ id: ids.ownerA, email: emailOwnerA });
    await assert.rejects(async () => requireOrg(slugB, "admin"), isNotFound);
  });

  it("own-org access works for member via requireOrg", async () => {
    sessionBox.current = asSession({ id: ids.adminA, email: emailAdminA });
    const ctx = await requireOrg(slugA, "admin");
    assert.equal(ctx.org.id, ids.orgA);
    assert.equal(ctx.role, "admin");
    assert.equal(ctx.user.id, ids.adminA);
  });

  it("admin can list members only for own org (tenant-scoped read)", async () => {
    sessionBox.current = asSession({ id: ids.adminA, email: emailAdminA });
    const { org } = await requireOrg(slugA, "admin");

    // Same scoping as members/page.tsx
    const members = await db
      .select({
        userId: users.id,
        email: users.email,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, org.id));

    const memberIds = new Set(members.map((m) => m.userId));
    assert.ok(memberIds.has(ids.ownerA));
    assert.ok(memberIds.has(ids.adminA));
    assert.equal(memberIds.has(ids.ownerB), false, "org B owner leaked into org A member list");
    assert.equal(members.every((m) => m.email.startsWith(`${prefix}-`)), true);

    const orgs = await getUserOrgs();
    assert.equal(orgs.some((o) => o.slug === slugA), true);
    assert.equal(orgs.some((o) => o.slug === slugB), false, "getUserOrgs leaked foreign org");
  });

  it("admin cannot create invite even via direct server action", async () => {
    sessionBox.current = asSession({ id: ids.adminA, email: emailAdminA });
    const fd = new FormData();
    fd.set("email", emailInvitee);
    emailCalls.length = 0;
    await assert.rejects(async () => createInvite(slugA, {}, fd), isNotFound);
    assert.equal(emailCalls.length, 0, "admin invite must not send email");

    const pending = await db
      .select({ id: organizationInvites.id })
      .from(organizationInvites)
      .where(and(eq(organizationInvites.organizationId, ids.orgA), eq(organizationInvites.email, emailInvitee)));
    assert.equal(pending.length, 0, "admin must not persist invite");
  });

  it("owner can create invite (email mocked, no real send)", async () => {
    sessionBox.current = asSession({ id: ids.ownerA, email: emailOwnerA, name: "Owner A" });
    const fd = new FormData();
    fd.set("email", emailInvitee);
    emailCalls.length = 0;
    const state = await createInvite(slugA, {}, fd);
    assert.equal(state.error, undefined);
    assert.equal(state.email, emailInvitee);
    assert.equal(state.emailSent, true);
    assert.equal(typeof state.url, "string");
    assert.ok(state.url && state.url.includes("/invite/"));
    assert.equal(emailCalls.length, 1);
    assert.equal(emailCalls[0]?.to, emailInvitee);

    const rows = await db
      .select({
        id: organizationInvites.id,
        email: organizationInvites.email,
        organizationId: organizationInvites.organizationId,
        acceptedAt: organizationInvites.acceptedAt,
      })
      .from(organizationInvites)
      .where(and(eq(organizationInvites.organizationId, ids.orgA), eq(organizationInvites.email, emailInvitee)));
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.organizationId, ids.orgA);
    assert.equal(rows[0]?.acceptedAt, null);
  });

  it("findValidInvite rejects expired and used tokens", async () => {
    const expiredTok = generateInviteToken();
    const usedTok = generateInviteToken();
    const validTok = generateInviteToken();

    await db.insert(organizationInvites).values([
      {
        organizationId: ids.orgA,
        email: `${prefix}-expired@luna-iso.test`,
        role: "admin",
        token: expiredTok.tokenHash,
        invitedBy: ids.ownerA,
        expiresAt: new Date(Date.now() - 60_000),
      },
      {
        organizationId: ids.orgA,
        email: `${prefix}-used@luna-iso.test`,
        role: "admin",
        token: usedTok.tokenHash,
        invitedBy: ids.ownerA,
        expiresAt: new Date(Date.now() + 86_400_000),
        acceptedAt: new Date(),
      },
      {
        organizationId: ids.orgA,
        email: `${prefix}-validlookup@luna-iso.test`,
        role: "admin",
        token: validTok.tokenHash,
        invitedBy: ids.ownerA,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    ]);

    assert.equal(await findValidInvite(expiredTok.token), null);
    assert.equal(await findValidInvite(usedTok.token), null);
    const ok = await findValidInvite(validTok.token);
    assert.ok(ok);
    assert.equal(ok.orgId, ids.orgA);
    assert.equal(ok.email, `${prefix}-validlookup@luna-iso.test`);
  });

  it("acceptInvite rejects mismatched email", async () => {
    const tok = generateInviteToken();
    await db.insert(organizationInvites).values({
      organizationId: ids.orgA,
      email: emailInvitee,
      role: "admin",
      token: tok.tokenHash,
      invitedBy: ids.ownerA,
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    sessionBox.current = asSession({ id: ids.stranger, email: emailStranger });
    const state = await acceptInvite(tok.token, {});
    assert.equal(state.error, "Este convite é para outro email.");

    const [member] = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, ids.orgA), eq(organizationMembers.userId, ids.stranger)))
      .limit(1);
    assert.equal(member, undefined);
  });

  it("acceptInvite rejects expired and already-used tokens", async () => {
    const expiredTok = generateInviteToken();
    const usedTok = generateInviteToken();
    await db.insert(organizationInvites).values([
      {
        organizationId: ids.orgA,
        email: emailInvitee,
        role: "admin",
        token: expiredTok.tokenHash,
        invitedBy: ids.ownerA,
        expiresAt: new Date(Date.now() - 5_000),
      },
      {
        organizationId: ids.orgA,
        email: emailInvitee,
        role: "admin",
        token: usedTok.tokenHash,
        invitedBy: ids.ownerA,
        expiresAt: new Date(Date.now() + 86_400_000),
        acceptedAt: new Date(),
      },
    ]);

    sessionBox.current = asSession({ id: ids.invitee, email: emailInvitee });
    assert.equal((await acceptInvite(expiredTok.token, {})).error, "Convite inválido ou expirado.");
    assert.equal((await acceptInvite(usedTok.token, {})).error, "Convite inválido ou expirado.");
  });

  it("acceptInvite accepts once then rejects duplicate acceptance", async () => {
    const tok = generateInviteToken();
    await db.insert(organizationInvites).values({
      organizationId: ids.orgA,
      email: emailInvitee,
      role: "admin",
      token: tok.tokenHash,
      invitedBy: ids.ownerA,
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    sessionBox.current = asSession({ id: ids.invitee, email: emailInvitee });

    await assert.rejects(async () => acceptInvite(tok.token, {}), (err) => isRedirect(err, `/app/${slugA}`));

    const [member] = await db
      .select({ id: organizationMembers.id, role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, ids.orgA), eq(organizationMembers.userId, ids.invitee)))
      .limit(1);
    assert.ok(member);
    assert.equal(member.role, "admin");

    const again = await acceptInvite(tok.token, {});
    assert.equal(again.error, "Convite inválido ou expirado.");

    const memberships = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, ids.orgA), eq(organizationMembers.userId, ids.invitee)));
    assert.equal(memberships.length, 1, "duplicate accept must not create extra membership");
  });
});