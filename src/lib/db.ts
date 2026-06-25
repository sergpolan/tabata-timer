import { neon } from "@neondatabase/serverless";

let schemaReady: Promise<void> | null = null;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? null;
}

export function getSql() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    return null;
  }

  return neon(databaseUrl);
}

export async function ensureWorkoutPlaysSchema() {
  const sql = getSql();
  if (!sql) {
    return false;
  }

  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS workout_plays (
        hash TEXT PRIMARY KEY,
        plays INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined);
  }

  await schemaReady;
  return true;
}
