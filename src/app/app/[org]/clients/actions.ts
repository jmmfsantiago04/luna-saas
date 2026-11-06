"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, type ClientFieldErrors } from "@/lib/clients";

export type ClientFormValues = {
  name: string;
  type: string;
  email: string;
  phone: string;
  contact: string;
  source: string;
  notes: string;
};

export type ClientFormState = {
  error?: string;
  fieldErrors?: ClientFieldErrors;
  values?: ClientFormValues;
};

function text(formData: FormData, key: keyof ClientFormValues) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createClientAction(
  slug: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  // Só os campos conhecidos: o schema é strict e o organizationId vem da sessão.
  const values: ClientFormValues = {
    name: text(formData, "name"),
    type: text(formData, "type"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    contact: text(formData, "contact"),
    source: text(formData, "source"),
    notes: text(formData, "notes"),
  };

  const result = await createClient(slug, values);
  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors, values };
  }

  revalidatePath(`/app/${slug}/clients`);
  redirect(`/app/${slug}/clients`);
}
