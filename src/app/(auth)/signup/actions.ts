"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";
import { safeCallback } from "@/lib/safe-redirect";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, passwordSchema } from "@/lib/password";

export type SignupState = {
  error?: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function pgErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { code?: string; cause?: { code?: string } };
  return e.code ?? e.cause?.code;
}

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const emailRaw = String(formData.get("email") ?? "");
  const email = normalizeEmail(emailRaw);

  const schema = z.object({
    name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres"),
    email: z.email("Informe um email válido"),
    password: passwordSchema(email),
  });

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "Verifique os campos e tente novamente.",
    };
  }

  const { name, password } = parsed.data;


  const passwordHash = await hashPassword(password);

  try {
    await db.insert(users).values({
      name,
      email,
      passwordHash,
    });
  } catch (error) {
    if (pgErrorCode(error) === "23505") {
      return { error: "Email já cadastrado" };
    }
    console.error("signup insert failed", error);
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  const [created] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!created) {
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return {
        error: "Conta criada, mas o login automático falhou. Entre em /login.",
      };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Conta criada, mas o login automático falhou. Entre em /login.",
      };
    }
    throw error;
  }

  // redirect() throws NEXT_REDIRECT — let it propagate to the client.
  redirect(safeCallback(formData.get("callbackUrl")) ?? "/onboarding");
}
