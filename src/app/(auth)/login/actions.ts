"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";

export type LoginState = {
  error?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = z
    .object({
      email: z.email(),
      password: z.string().min(1),
    })
    .safeParse({
      email: normalizeEmail(String(formData.get("email") ?? "")),
      password: formData.get("password"),
    });

  if (!parsed.success) {
    return { error: "Email ou senha inválidos" };
  }

  try {
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (result?.error) {
      return { error: "Email ou senha inválidos" };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ou senha inválidos" };
    }
    throw error;
  }

  redirect("/app");
}
