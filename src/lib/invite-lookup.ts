import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { organizationInvites, organizations } from "@/db/schema";
import { hashInviteToken } from "@/lib/invites";

/** Convite válido (não usado, não vencido) pelo token do link, ou null. */
export async function findValidInvite(token: string) {
  const [invite] = await db
    .select({
      id: organizationInvites.id,
      email: organizationInvites.email,
      role: organizationInvites.role,
      orgId: organizations.id,
      orgName: organizations.name,
      orgSlug: organizations.slug,
    })
    .from(organizationInvites)
    .innerJoin(organizations, eq(organizations.id, organizationInvites.organizationId))
    .where(
      and(
        eq(organizationInvites.token, hashInviteToken(token)),
        isNull(organizationInvites.acceptedAt),
        gt(organizationInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return invite ?? null;
}