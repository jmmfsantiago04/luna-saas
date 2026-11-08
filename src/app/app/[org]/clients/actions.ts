"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveClient,
  createClient,
  restoreClient,
  updateClient,
  type ClientFieldErrors,
} from "@/lib/clients";

const BASIC_KEYS = ["name", "type", "email", "phone", "contact", "source", "notes"] as const;
const EXTRA_KEYS = [
  "document",
  "birthDate",
  "addressStreet",
  "addressCity",
  "addressState",
  "addressZip",
  "instagram",
  "website",
  "tags",
] as const;

export type ClientFormKey = (typeof BASIC_KEYS)[number] | (typeof EXTRA_KEYS)[number];
export type ClientFormValues = Partial<Record<ClientFormKey, string>>;

export type ClientFormState = {
  error?: string;
  fieldErrors?: ClientFieldErrors;
  values?: ClientFormValues;
};

/** Só lê as chaves conhecidas: o organizationId nunca vem do formulário. */
function readValues(formData: FormData, keys: readonly ClientFormKey[]): ClientFormValues {
  const values: ClientFormValues = {};
  for (const key of keys) {
    const value = formData.get(key);
    values[key] = typeof value === "string" ? value : "";
  }
  return values;
}

export async function createClientAction(
  slug: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const values = readValues(formData, BASIC_KEYS);
  const result = await createClient(slug, values);
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors, values };

  revalidatePath(`/app/${slug}/clients`);
  redirect(`/app/${slug}/clients`);
}

export async function updateClientAction(
  slug: string,
  clientId: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  // A edição sempre envia todos os campos, para não apagar os extras sem querer.
  const values = readValues(formData, [...BASIC_KEYS, ...EXTRA_KEYS]);
  const result = await updateClient(slug, clientId, values);
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors, values };

  revalidatePath(`/app/${slug}/clients`);
  revalidatePath(`/app/${slug}/clients/${clientId}`);
  redirect(`/app/${slug}/clients/${clientId}`);
}

export async function archiveClientAction(slug: string, clientId: string) {
  await archiveClient(slug, clientId);
  revalidatePath(`/app/${slug}/clients`);
  revalidatePath(`/app/${slug}/clients/${clientId}`);
}

export async function restoreClientAction(slug: string, clientId: string) {
  await restoreClient(slug, clientId);
  revalidatePath(`/app/${slug}/clients`);
  revalidatePath(`/app/${slug}/clients/${clientId}`);
}
