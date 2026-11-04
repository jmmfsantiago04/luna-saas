import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Pooled Neon connection string (-pooler host) for app traffic.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// On Vercel Fluid compute, lets idle clients close before the instance suspends.
attachDatabasePool(pool);

export const db = drizzle({ client: pool, schema });