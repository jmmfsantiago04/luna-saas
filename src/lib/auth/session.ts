import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isJwtSessionVersionValid } from "@/lib/auth/session-version";

export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  // Revalida contra o DB (páginas + server actions): reset de senha incrementa session_version.
  const [row] = await db
    .select({ sv: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!isJwtSessionVersionValid(session.sessionVersion, row?.sv)) {
    redirect("/login");
  }

  return session.user;
}