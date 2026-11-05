import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    /** Espelho de users.session_version gravado no JWT no login. */
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Cópia de users.session_version no login; mismatch ⇒ JWT inválido. */
    sv?: number;
  }
}