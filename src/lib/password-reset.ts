import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { generateInviteToken, hashInviteToken } from "@/lib/invites";

export const RESET_TTL_MINUTES = 30;
export const generateResetToken = generateInviteToken;

export function resetUrl(token: string) {
  const base = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/reset-password/${token}`;
}

/** Token válido (não usado, não vencido) + email do usuário, ou null. */
export async function findValidResetToken(token: string) {
  const [row] = await db
    .select({ id: passwordResetTokens.id, userId: users.id, email: users.email })
    .from(passwordResetTokens)
    .innerJoin(users, eq(users.id, passwordResetTokens.userId))
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashInviteToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}