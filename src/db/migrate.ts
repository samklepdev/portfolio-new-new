import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Migrations run DDL, which Neon's pooled (pgBouncer) endpoint can stall on, so
// prefer the direct connection when one is exposed. Vercel's Neon integration
// injects DATABASE_URL_UNPOOLED alongside the pooled DATABASE_URL; locally only
// DATABASE_URL exists, so this falls back to it.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set — check your .env file");
}

// A dedicated single-use connection, closed in `finally`. drizzle-kit's own
// `migrate` is known to leave the postgres-js socket open and hang instead of
// exiting; in a build script that would stall the deploy, so we drive the
// migrator directly and `end()` the socket ourselves. (Do not `process.exit()`
// out from under an open socket — repo convention.)
const sql = postgres(url, { max: 1 });

(async () => {
  try {
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
    console.log("Migrations applied.");
  } finally {
    await sql.end();
  }
})();
