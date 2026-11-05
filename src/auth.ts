import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, count, eq, sql } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { db } from "@/db";
import { accounts, loginAttempts, users, verificationTokens } from "@/db/schema";
import { isJwtSessionVersionValid } from "@/lib/auth/session-version";
import {
  DUMMY_PASSWORD_HASH,
  passwordSchema,
  verifyPassword,
} from "@/lib/password";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function clientIp(request: Request | undefined) {
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    // Junta com conta existente do mesmo email: o Google verifica o email.
    Google({ allowDangerousEmailAccountLinking: true }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials, request) => {
        const parsed = z
          .object({
            email: z.email(),
            password: z.string().min(1),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const email = normalizeEmail(parsed.data.email);
        const password = parsed.data.password;
        const ip = clientIp(request);

        // Rate limit: 5 falhas nos últimos 15 minutos → bloqueia (erro genérico).
        const [{ value: failedCount }] = await db
          .select({ value: count() })
          .from(loginAttempts)
          .where(
            and(
              eq(loginAttempts.email, email),
              eq(loginAttempts.success, false),
              sql`${loginAttempts.createdAt} > now() - interval '15 minutes'`,
            ),
          );

        if (Number(failedCount) >= 5) {
          // Ainda registra a tentativa bloqueada para auditoria.
          await db.insert(loginAttempts).values({
            email,
            ip,
            success: false,
          });
          return null;
        }

        const passwordCheck = passwordSchema(email).safeParse(password);
        // Ainda assim comparamos com hash (ou DUMMY) para tempo mais uniforme.
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
        const ok =
          passwordCheck.success &&
          !!user?.passwordHash &&
          (await verifyPassword(password, hash));

        await db.insert(loginAttempts).values({
          email,
          ip,
          success: ok,
        });

        if (!ok || !user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Login novo (Credentials ou Google): grava session_version atual no JWT.
      if (user?.id) {
        token.sub = user.id;
        const [row] = await db
          .select({ sv: users.sessionVersion })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        if (!row) return {};
        token.sv = row.sv;
        return token;
      }

      // Tokens antigos sem sv, usuário inexistente, ou versão divergente → revoga.
      if (!token.sub) return {};
      const [row] = await db
        .select({ sv: users.sessionVersion })
        .from(users)
        .where(eq(users.id, token.sub))
        .limit(1);
      if (!isJwtSessionVersionValid(token.sv, row?.sv)) {
        return {};
      }
      return token;
    },
    async session({ session, token }) {
      // jwt já rejeitou versões inválidas (retorna token sem sub/sv).
      if (!session.user || !token.sub || typeof token.sv !== "number") {
        return { ...session, user: undefined as unknown as typeof session.user };
      }
      session.user.id = token.sub;
      session.sessionVersion = token.sv;
      return session;
    },
    authorized: async ({ auth, request }) => {
      const { pathname } = request.nextUrl;
      const isProtected =
        pathname.startsWith("/app") || pathname.startsWith("/onboarding");
      if (!isProtected) return true;
      return !!auth?.user?.id;
    },
  },
  trustHost: true,
});