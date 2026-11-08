import { z } from "zod";

/** Bounds aligned to CRM text columns (Postgres text; app-level caps). */
export const CLIENT_NAME_MAX = 200;
export const CLIENT_EMAIL_MAX = 320;
export const CLIENT_PHONE_MAX = 40;
export const CLIENT_CONTACT_MAX = 200;
export const CLIENT_SOURCE_MAX = 120;
export const CLIENT_NOTES_MAX = 5_000;
export const CLIENT_DOCUMENT_MAX = 20;
export const CLIENT_ADDRESS_MAX = 200;
export const CLIENT_CITY_MAX = 120;
export const CLIENT_STATE_MAX = 60;
export const CLIENT_ZIP_MAX = 20;
export const CLIENT_INSTAGRAM_MAX = 100;
export const CLIENT_WEBSITE_MAX = 300;
export const CLIENT_TAGS_MAX = 20;
export const CLIENT_TAG_MAX = 40;

export const clientTypes = ["person", "company"] as const;
export type ClientType = (typeof clientTypes)[number];

/**
 * Optional text: missing / null / whitespace-only => null.
 * Non-strings are rejected (no coercion from numbers/objects).
 */
function optionalText(max: number, label: string) {
  return z.preprocess((value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }, z.union([
    z.null(),
    z
      .string()
      .min(1, `${label} inválido`)
      .max(max, `${label} deve ter no máximo ${max} caracteres`),
  ]));
}

/**
 * Optional email: empty/whitespace => null; otherwise trim + lowercase + format check.
 */
const optionalEmail = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}, z.union([
  z.null(),
  z
    .email("Email inválido")
    .max(CLIENT_EMAIL_MAX, `Email deve ter no máximo ${CLIENT_EMAIL_MAX} caracteres`),
]));

/** Data opcional no formato YYYY-MM-DD (input type="date"); vazio => null. */
const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}, z.union([z.null(), z.iso.date("Data inválida")]));

/**
 * Tags: aceita array ou texto separado por vírgula ("noiva, vip").
 * Remove vazios e repetidos; vazio => [].
 */
const tagsField = z.preprocess((value) => {
  if (value === undefined || value === null) return [];
  const list = typeof value === "string" ? value.split(",") : value;
  if (!Array.isArray(list)) return value;
  const cleaned = list.map((t) => (typeof t === "string" ? t.trim() : t)).filter((t) => t !== "");
  return [...new Set(cleaned)];
}, z
  .array(z.string().max(CLIENT_TAG_MAX, `Cada tag deve ter no máximo ${CLIENT_TAG_MAX} caracteres`))
  .max(CLIENT_TAGS_MAX, `Máximo de ${CLIENT_TAGS_MAX} tags`));

/**
 * Payload de campos CRM editáveis (não inclui organizationId / timestamps / id).
 * `.strict()` rejeita chaves extras — sem aceitar shapes inesperados em silêncio.
 */
export const clientFieldsSchema = z
  .object({
    name: z
      .string({ error: "Nome é obrigatório" })
      .trim()
      .min(1, "Nome é obrigatório")
      .max(CLIENT_NAME_MAX, `Nome deve ter no máximo ${CLIENT_NAME_MAX} caracteres`),
    type: z.enum(clientTypes, { error: "Tipo deve ser person ou company" }),
    email: optionalEmail,
    phone: optionalText(CLIENT_PHONE_MAX, "Telefone"),
    contact: optionalText(CLIENT_CONTACT_MAX, "Contato"),
    source: optionalText(CLIENT_SOURCE_MAX, "Origem"),
    notes: optionalText(CLIENT_NOTES_MAX, "Notas"),
    document: optionalText(CLIENT_DOCUMENT_MAX, "Documento"),
    birthDate: optionalDate,
    addressStreet: optionalText(CLIENT_ADDRESS_MAX, "Endereço"),
    addressCity: optionalText(CLIENT_CITY_MAX, "Cidade"),
    addressState: optionalText(CLIENT_STATE_MAX, "Estado"),
    addressZip: optionalText(CLIENT_ZIP_MAX, "CEP"),
    instagram: optionalText(CLIENT_INSTAGRAM_MAX, "Instagram"),
    website: optionalText(CLIENT_WEBSITE_MAX, "Site"),
    tags: tagsField,
  })
  .strict();

export type ClientFieldsInput = z.input<typeof clientFieldsSchema>;
export type ClientFields = z.output<typeof clientFieldsSchema>;

export function parseClientFields(data: unknown) {
  return clientFieldsSchema.safeParse(data);
}