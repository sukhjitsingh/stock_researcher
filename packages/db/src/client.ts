/**
 * Database Client for Neon PostgreSQL
 *
 * Uses Drizzle ORM with @neondatabase/serverless driver
 * for optimal performance on Vercel serverless.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function getDb(databaseUrl?: string) {
  const url = databaseUrl || process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Set it in your environment or pass it to getDb()."
    );
  }

  // Fix postgres:// -> postgresql:// for compatibility
  const fixedUrl = url.replace(/^postgres:\/\//, 'postgresql://');
  const sql = neon(fixedUrl);
  return drizzle(sql, { schema });
}

export const db = getDb();
export { schema };
export type Database = ReturnType<typeof getDb>;
