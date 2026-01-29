/**
 * Database Client for Neon PostgreSQL
 *
 * Uses Drizzle ORM with @neondatabase/serverless driver
 * for optimal performance on Vercel serverless.
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema.js';

// Get database URL from environment
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!url) {
    // Fallback for local development - will fail gracefully
    console.warn('No DATABASE_URL or POSTGRES_URL found, using placeholder');
    return 'postgresql://placeholder:placeholder@localhost:5432/stock_researcher';
  }

  // Fix postgres:// -> postgresql:// for compatibility
  return url.replace(/^postgres:\/\//, 'postgresql://');
}

// Create Neon SQL client
const sql = neon(getDatabaseUrl());

// Create Drizzle ORM instance with schema
export const db = drizzle(sql, { schema });

// Export schema for convenience
export { schema };

// Export types
export type Database = typeof db;
