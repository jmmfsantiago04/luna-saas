import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";

export async function GET() {
  // Opt out of prerendering (cacheComponents): run only at request time.
  await connection();
  try {
    const result = await db.execute<{ now: string }>(sql`select now() as now`);
    return Response.json({ ok: true, now: result.rows[0]?.now });
  } catch (error) {
    console.error("DB health check failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}