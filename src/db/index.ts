import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check your .env file");
}

const globalForDb = globalThis as unknown as {
  queryClient: postgres.Sql | undefined;
};

const queryClient =
  globalForDb.queryClient ?? postgres(process.env.DATABASE_URL, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

export const client = queryClient;

export const db = drizzle(queryClient, { schema });
