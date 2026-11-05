import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const INVITE_TTL_DAYS = 7;

/** Gera um token aleatório (vai no link) e o hash dele (vai no banco). */
export function generateInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInviteToken(token) };
}

/** SHA-256 do token: o banco nunca guarda o token em si. */
export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiresAt(from = new Date()) {
  return new Date(from.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function inviteUrl(token: string) {
  const base = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invite/${token}`;
}