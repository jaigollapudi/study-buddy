import postgres from "postgres";
import { config } from "@/lib/config";

// Reuse a single connection pool across HMR reloads in dev.
const globalForDb = globalThis as unknown as { __sql?: postgres.Sql };

export const sql: postgres.Sql =
  globalForDb.__sql ??
  postgres(config.databaseUrl, {
    max: 10,
    idle_timeout: 20,
    // pgvector: send embeddings as text and cast with ::vector at call sites.
  });

if (process.env.NODE_ENV !== "production") globalForDb.__sql = sql;

/** Serialise a JS number[] into a pgvector literal string. */
export function toVector(values: number[]): string {
  return `[${values.join(",")}]`;
}
