"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { loginAttempts, passwordResetTokens, users } from "@/db/schema";
import { hashPassword, passwordSchema } from "@/lib/password";
import { findValidResetToken } from "@/lib/password-reset";

export type ResetState = { error?: string };

export async function resetPassword(token: string, _prev: ResetState, formData: FormData): Promise<ResetState> {
  const row = await findValidResetToken(token);
  if (!row) return { error: "Link inválido ou expirado. Peça um novo." };

  const password = String(formData.get("password") ?? "");
  if (password !== String(formData.get("confirm") ?? "")) return { error: "As senhas não conferem." };

  const parsed = passwordSchema(row.email).safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Senha inválida." };

  const passwordHash = await hashPassword(password);

  const ok = await db.transaction(async (tx) => {
    // Usa o token uma vez só (protege contra dois envios simultâneos).
    const used = await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt)))
      .returning({ id: passwordResetTokens.id });
    if (used.length === 0) return false;

    // Nova senha + bump de session_version invalida JWTs em outros browsers (Credentials e Google).
    await tx
      .update(users)
      .set({
        passwordHash,
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(eq(users.id, row.userId));
    // Invalida outros links pendentes deste usuário.
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, row.userId), isNull(passwordResetTokens.usedAt)));
    // Zera o bloqueio de tentativas de login.
    await tx.delete(loginAttempts).where(and(eq(loginAttempts.email, row.email), eq(loginAttempts.success, false)));
    return true;
  });

  if (!ok) return { error: "Link inválido ou expirado. Peça um novo." };
  redirect("/login?reset=1");
}