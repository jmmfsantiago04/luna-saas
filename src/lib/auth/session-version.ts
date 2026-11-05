/** JWT sem sv (tokens antigos) ou sv != DB → sessão revogada. */
export function isJwtSessionVersionValid(
  tokenSv: unknown,
  dbSv: number | null | undefined,
): boolean {
  if (typeof tokenSv !== "number" || !Number.isInteger(tokenSv) || tokenSv < 0) {
    return false;
  }
  if (typeof dbSv !== "number" || !Number.isInteger(dbSv) || dbSv < 0) {
    return false;
  }
  return tokenSv === dbSv;
}