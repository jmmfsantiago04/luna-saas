import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Direct (non-pooled) connection for migrations.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
});