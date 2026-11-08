import "server-only";

import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireOrg } from "@/lib/auth/org";
import { parseClientFields, type ClientFields } from "@/lib/clients/validation";

export const CLIENTS_PAGE_SIZE = 20;

const clientIdSchema = z.uuid("ID de cliente inválido");

const listFiltersSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    q: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    /** active (default) = archived_at IS NULL; archived = archived_at IS NOT NULL */
    status: z.enum(["active", "archived"]).default("active"),
  })
  .strict();

export type ListClientsFiltersInput = z.input<typeof listFiltersSchema>;
export type ListClientsFilters = z.output<typeof listFiltersSchema>;

export type ClientRow = typeof clients.$inferSelect;

export type ClientFieldErrors = Record<string, string[]>;

export type ClientMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: ClientFieldErrors };

function fieldErrorsFromZod(error: z.ZodError): ClientFieldErrors {
  const flat = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const out: ClientFieldErrors = {};
  for (const [key, messages] of Object.entries(flat)) {
    if (Array.isArray(messages) && messages.length > 0) out[key] = messages;
  }
  return out;
}

function parseClientId(clientId: string) {
  const parsed = clientIdSchema.safeParse(clientId);
  if (!parsed.success) notFound();
  return parsed.data;
}

/** Escape LIKE/ILIKE wildcards so user search is literal. */
function escapeIlike(term: string) {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function searchCondition(q: string | undefined): SQL | undefined {
  if (!q) return undefined;
  const pattern = `%${escapeIlike(q)}%`;
  return or(ilike(clients.name, pattern), ilike(clients.email, pattern));
}

export async function listClients(slug: string, filters: ListClientsFiltersInput = {}) {
  const { org } = await requireOrg(slug);
  const parsed = listFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Filtros inválidos",
      fieldErrors: fieldErrorsFromZod(parsed.error),
      items: [] as ClientRow[],
      total: 0,
      page: 1,
      pageSize: CLIENTS_PAGE_SIZE,
      pageCount: 0,
    };
  }

  const { page, q, status } = parsed.data;
  const archivedClause =
    status === "archived" ? isNotNull(clients.archivedAt) : isNull(clients.archivedAt);
  const where = and(eq(clients.organizationId, org.id), archivedClause, searchCondition(q));

  const [{ value: total }] = await db.select({ value: count() }).from(clients).where(where);
  const totalNum = Number(total);
  const pageCount = totalNum === 0 ? 0 : Math.ceil(totalNum / CLIENTS_PAGE_SIZE);
  const safePage = pageCount === 0 ? 1 : Math.min(page, pageCount);
  const offset = (safePage - 1) * CLIENTS_PAGE_SIZE;

  const items = await db
    .select()
    .from(clients)
    .where(where)
    .orderBy(desc(clients.createdAt), asc(clients.id))
    .limit(CLIENTS_PAGE_SIZE)
    .offset(offset);

  return {
    ok: true as const,
    items,
    total: totalNum,
    page: safePage,
    pageSize: CLIENTS_PAGE_SIZE,
    pageCount,
  };
}

export async function getClient(slug: string, clientId: string): Promise<ClientRow> {
  const { org } = await requireOrg(slug);
  const id = parseClientId(clientId);

  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.organizationId, org.id)))
    .limit(1);

  if (!row) notFound();
  return row;
}

export async function createClient(slug: string, data: unknown): Promise<ClientMutationResult> {
  const { org } = await requireOrg(slug);
  const parsed = parseClientFields(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const fields: ClientFields = parsed.data;
  const now = new Date();
  const [row] = await db
    .insert(clients)
    .values({
      ...fields,
      organizationId: org.id,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    })
    .returning({ id: clients.id });

  if (!row) return { ok: false, error: "Não foi possível criar o cliente" };
  return { ok: true, id: row.id };
}

export async function updateClient(
  slug: string,
  clientId: string,
  data: unknown,
): Promise<ClientMutationResult> {
  const { org } = await requireOrg(slug);
  const id = parseClientId(clientId);
  const parsed = parseClientFields(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const fields = parsed.data;
  const now = new Date();
  const updated = await db
    .update(clients)
    .set({
      ...fields,
      updatedAt: now,
      // organizationId fica de fora: o schema strict não aceita e nunca movemos tenants
    })
    .where(and(eq(clients.id, id), eq(clients.organizationId, org.id)))
    .returning({ id: clients.id });

  if (updated.length === 0) notFound();
  return { ok: true, id: updated[0]!.id };
}

export async function archiveClient(slug: string, clientId: string): Promise<{ id: string }> {
  const { org } = await requireOrg(slug);
  const id = parseClientId(clientId);
  const now = new Date();

  const updated = await db
    .update(clients)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(clients.id, id), eq(clients.organizationId, org.id)))
    .returning({ id: clients.id });

  if (updated.length === 0) notFound();
  return { id: updated[0]!.id };
}

export async function restoreClient(slug: string, clientId: string): Promise<{ id: string }> {
  const { org } = await requireOrg(slug);
  const id = parseClientId(clientId);
  const now = new Date();

  const updated = await db
    .update(clients)
    .set({ archivedAt: null, updatedAt: now })
    .where(and(eq(clients.id, id), eq(clients.organizationId, org.id)))
    .returning({ id: clients.id });

  if (updated.length === 0) notFound();
  return { id: updated[0]!.id };
}

/** Exported for tests / callers that need the raw page size constant already above. */
export const _clientsListFiltersSchema = listFiltersSchema;