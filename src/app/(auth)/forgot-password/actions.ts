"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { resetPasswordEmail, sendEmail } from "@/lib/email";
import { generateResetToken, RESET_TTL_MINUTES, resetUrl } from "@/lib/password-reset";

export type ForgotState = { done?: boolean; error?: string };

const MAX_PER_HOUR = 3;

export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const parsed = z.object({ email: z.email() }).safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  });
  if (!parsed.success) return { error: "Digite um email válido." };
  const email = parsed.data.email;

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (user) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [{ value: recent }] = await db
      .select({ value: count() })
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.userId, user.id), gt(passwordResetTokens.createdAt, hourAgo)));

    if (Number(recent) < MAX_PER_HOUR) {
      const { token, tokenHash } = generateResetToken();
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
      });
      await sendEmail({ to: email, ...resetPasswordEmail({ url: resetUrl(token) }) });
    }
  }

  // Mesma resposta exista ou não a conta (não revela quem está cadastrado).
  return { done: true };
}