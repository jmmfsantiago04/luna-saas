import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

const BCRYPT_COST = 12;

/**
 * Hash bcrypt estável (cost 12) só para comparação de tempo constante
 * quando o usuário não existe. Não corresponde a nenhuma senha real usada no app.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$12$B42HFnGMxefmA0f333fF2udbMt194psxaoCGiIASYT98AZyPFz1zG";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

const basePasswordSchema = z
  .string()
  .min(10, "A senha deve ter pelo menos 10 caracteres")
  .refine((p) => Buffer.byteLength(p, "utf8") <= 72, {
    message: "A senha deve ter no máximo 72 bytes",
  })
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), {
    message: "A senha deve conter pelo menos uma letra e um número",
  });

/** Schema compartilhado; passe o email para rejeitar se a senha contém o local-part. */
export function passwordSchema(email?: string) {
  const local = (email ?? "").trim().toLowerCase().split("@")[0] ?? "";
  if (!local) return basePasswordSchema;
  return basePasswordSchema.refine(
    (p) => {
      const lower = p.toLowerCase();
      return lower !== local && !lower.includes(local);
    },
    { message: "A senha não pode ser igual nem conter a parte local do email" },
  );
}

/**
 * Consulta a API de ranges do Have I Been Pwned (k-anonymity).
 * Fail-open: em timeout/erro de rede, retorna false (não bloqueia cadastro).
 */
export async function isPwnedPassword(password: string): Promise<boolean> {
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        "Add-Padding": "true",
        "User-Agent": "luna-saas-password-check",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [hashSuffix] = line.trim().split(":");
      return hashSuffix?.toUpperCase() === suffix;
    });
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
