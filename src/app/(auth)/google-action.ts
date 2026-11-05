"use server";

import { signIn } from "@/auth";
import { safeCallback } from "@/lib/safe-redirect";

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeCallback(formData.get("callbackUrl")) ?? "/app" });
}