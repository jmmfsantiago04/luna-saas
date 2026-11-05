import { connection } from "next/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, organizationMembers } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { CreateOrgForm } from "./create-org-form";

export const instant = false;

export default async function OnboardingPage() {
  await connection();
  const user = await requireUser();

  const [existing] = await db
    .select({ slug: organizations.slug })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, user.id))
    .limit(1);
  if (existing) redirect(`/app/${existing.slug}`);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Vamos criar seu espaço</h1>
        <p className="text-muted-foreground">Você pode mudar o nome depois.</p>
      </div>
      <CreateOrgForm />
    </main>
  );
}