"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { organizations, organizationMembers } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { slugify } from "@/lib/slug";

const schema = z.object({ name: z.string().trim().min(2, "Nome muito curto").max(60) });

function pgErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { code?: string; cause?: { code?: string } };
  return e.code ?? e.cause?.code;
}

export async function createOrg(_: unknown, formData: FormData) {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const base = slugify(parsed.data.name) || "org";
  let slug = base;
  let created = false;

  for (let i = 0; i < 5 && !created; i++) {
    try {
      await db.transaction(async (tx) => {
        const [org] = await tx.insert(organizations).values({ name: parsed.data.name, slug }).returning();
        await tx.insert(organizationMembers).values({ organizationId: org.id, userId: user.id, role: "owner" });
      });
      created = true;
    } catch (e: unknown) {
      if (pgErrorCode(e) !== "23505") throw e;
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  if (!created) return { error: "Não foi possível criar, tente outro nome" };
  redirect(`/app/${slug}`);
}