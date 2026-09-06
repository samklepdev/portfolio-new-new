import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check your .env file");
}

// A single shared connection, reused across hot reloads in dev so we don't
// exhaust the connection pool every time Next.js recompiles a route.
const globalForDb = globalThis as unknown as {
  queryClient: postgres.Sql | undefined;
};

const queryClient =
  globalForDb.queryClient ?? postgres(process.env.DATABASE_URL, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

// Exported so one-off scripts (db/seed.ts) can close the socket and let the
// process exit cleanly. App code should only ever need `db`.
export const client = queryClient;

export const db = drizzle(queryClient, { schema });
