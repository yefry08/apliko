import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cached: NeonQueryFunction<false, false> | null = null;

/** Neon (Postgres). Null without DATABASE_URL, so the app still runs browser-only. */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  cached ??= neon(url);
  return cached;
}
