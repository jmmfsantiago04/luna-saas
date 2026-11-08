export type ClientStatus = "active" | "archived";
export type ClientListParams = { q: string; tag: string; status: ClientStatus; page: number };
export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export const CLIENT_SEARCH_MAX = 100;
export const CLIENT_TAG_FILTER_MAX = 40;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** A URL pode trazer qualquer coisa: normaliza para valores seguros. */
export function parseClientListParams(sp: SearchParamsRecord): ClientListParams {
  const q = (first(sp.q) ?? "").trim().slice(0, CLIENT_SEARCH_MAX);
  const tag = (first(sp.tag) ?? "").trim().slice(0, CLIENT_TAG_FILTER_MAX);
  const status: ClientStatus = first(sp.status) === "archived" ? "archived" : "active";
  const pageNum = Number(first(sp.page));
  const page = Number.isInteger(pageNum) && pageNum >= 1 ? pageNum : 1;
  return { q, tag, status, page };
}

export function buildClientsHref(slug: string, f: Partial<ClientListParams>) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.tag) params.set("tag", f.tag);
  if (f.status && f.status !== "active") params.set("status", f.status);
  if (f.page && f.page > 1) params.set("page", String(f.page));
  const qs = params.toString();
  return `/app/${encodeURIComponent(slug)}/clients${qs ? `?${qs}` : ""}`;
}
