"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { organizationInvites, organizationMembers, users } from "@/db/schema";
import { requireOrg } from "@/lib/auth/org";
import { generateInviteToken, inviteExpiresAt, inviteUrl } from "@/lib/invites";

export type InviteState = { error?: string; url?: string; email?: string };

const schema = z.object({ email: z.email("Email inválido") });

export async function createInvite(slug: string, _prev: InviteState, formData: FormData): Promise<InviteState> {
  // Só o owner convida; o orgId vem daqui, nunca do formulário.
  const { org, user } = await requireOrg(slug, "owner");

  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Email inválido" };
  const email = parsed.data.email.trim().toLowerCase();

  // Já é membro desta org?
  const [already] = await db
    .select({ id: users.id })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(and(eq(organizationMembers.organizationId, org.id), eq(users.email, email)))
    .limit(1);
  if (already) return { error: "Essa pessoa já faz parte da organização." };

  const { token, tokenHash } = generateInviteToken();
  const expiresAt = inviteExpiresAt();

  // Convite pendente para o mesmo email? Renova em vez de duplicar.
  const [pending] = await db
    .select({ id: organizationInvites.id })
    .from(organizationInvites)
    .where(
      and(
        eq(organizationInvites.organizationId, org.id),
        eq(organizationInvites.email, email),
        isNull(organizationInvites.acceptedAt),
        gt(organizationInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (pending) {
    await db
      .update(organizationInvites)
      .set({ token: tokenHash, expiresAt, invitedBy: user.id })
      .where(eq(organizationInvites.id, pending.id));
  } else {
    await db.insert(organizationInvites).values({
      organizationId: org.id,
      email,
      role: "admin",
      token: tokenHash,
      invitedBy: user.id,
      expiresAt,
    });
  }

  revalidatePath(`/app/${org.slug}/members`);
  return { url: inviteUrl(token), email };
}