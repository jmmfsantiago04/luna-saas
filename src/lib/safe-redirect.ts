/** Aceita só caminhos internos (evita open redirect para outro site). */
export function safeCallback(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}