import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in config/hosting.json to `DB` and configure the D1 binding before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}
