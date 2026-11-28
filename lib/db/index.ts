import "server-only";
import path from "node:path";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { env } from "../env";

export type DB = PgliteDatabase<typeof schema>;

/* One database API, two engines:
   - Production: Postgres (Neon, added from the Vercel Marketplace) via DATABASE_URL.
   - Demo / local: PGlite, an in-process Postgres. Zero setup, seeded with sample
     restaurants, resets when the server restarts. Same schema, same queries. */
type Holder = { promise?: Promise<DB> };
const holder = globalThis as unknown as { __twdb?: Holder };
holder.__twdb ??= {};

const migrationsFolder = path.join(process.cwd(), "drizzle");

async function connect(): Promise<DB> {
  if (env.databaseUrl) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    const db = drizzle(neon(env.databaseUrl), { schema });
    await migrate(db, { migrationsFolder });
    const real = db as unknown as DB;
    const { seedBase, seedDemo } = await import("./seed");
    await seedBase(real);
    if (process.env.DEMO_SEED === "1") await seedDemo(real);
    return real;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite();
  const db = drizzlePglite(client, { schema });
  await migrate(db, { migrationsFolder });
  const { seedBase, seedDemo } = await import("./seed");
  await seedBase(db);
  await seedDemo(db);
  return db;
}

export function getDb(): Promise<DB> {
  if (!holder.__twdb!.promise) {
    holder.__twdb!.promise = connect().catch((error) => {
      holder.__twdb!.promise = undefined;
      throw error;
    });
  }
  return holder.__twdb!.promise;
}

export { schema };
