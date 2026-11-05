import { connection } from "next/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, organizationMembers } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";

export const instant = false;

export default async function AppIndex() {
  await connection();
  const user = await requireUser();

  const [first] = await db
    .select({ slug: organizations.slug })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, user.id))
    .orderBy(organizationMembers.createdAt)
    .limit(1);

  redirect(first ? `/app/${first.slug}` : "/onboarding");
}