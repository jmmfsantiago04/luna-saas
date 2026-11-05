import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, organizationMembers } from "@/db/schema";
import { requireUser } from "./session";

export type Role = "owner" | "admin" | "member";
const rank: Record<Role, number> = { member: 1, admin: 2, owner: 3 };

export const requireOrg = cache(async (slug: string, minRole: Role = "member") => {
  const user = await requireUser();

  const [row] = await db
    .select({ org: organizations, role: organizationMembers.role })
    .from(organizations)
    .innerJoin(organizationMembers, eq(organizationMembers.organizationId, organizations.id))
    .where(and(eq(organizations.slug, slug), eq(organizationMembers.userId, user.id)))
    .limit(1);

  if (!row || rank[row.role] < rank[minRole]) notFound();

  return { user, org: row.org, role: row.role };
});