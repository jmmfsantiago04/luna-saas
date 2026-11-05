"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { organizationInvites, organizationMembers } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { findValidInvite } from "@/lib/invite-lookup";

export type AcceptState = { error?: string };

export async function acceptInvite(token: string, _prev: AcceptState): Promise<AcceptState> {
  const user = await requireUser();
  // Revalida tudo no servidor: a página pode estar desatualizada.
  const invite = await findValidInvite(token);
  if (!invite) return { error: "Convite inválido ou expirado." };
  if (user.email?.toLowerCase() !== invite.email) return { error: "Este convite é para outro email." };

  const accepted = await db.transaction(async (tx) => {
    // Marca como aceito só se ainda estiver pendente (evita uso duplo).
    const updated = await tx
      .update(organizationInvites)
      .set({ acceptedAt: new Date() })
      .where(and(eq(organizationInvites.id, invite.id), isNull(organizationInvites.acceptedAt)))
      .returning({ id: organizationInvites.id });
    if (updated.length === 0) return false;
    await tx
      .insert(organizationMembers)
      .values({ organizationId: invite.orgId, userId: user.id!, role: invite.role })
      .onConflictDoNothing();
    return true;
  });

  if (!accepted) return { error: "Convite inválido ou expirado." };
  redirect(`/app/${invite.orgSlug}`);
}