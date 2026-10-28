import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type WranglerLimiter = {
  name: string;
  namespace_id: string;
  simple: { limit: number; period: number };
};
export type WranglerEnvironment = {
  triggers?: { crons?: string[] };
  vars?: Record<string, string>;
  ratelimits?: WranglerLimiter[];
  browser?: { binding: string };
  d1_databases?: Array<{
    binding: string;
    database_name: string;
    database_id: string;
    migrations_dir?: string;
  }>;
};
export type WranglerConfig = WranglerEnvironment & {
  main?: string;
  compatibility_date?: string;
  env?: Record<string, WranglerEnvironment>;
};

/** wrangler.jsonc: whole-line comments and trailing commas are allowed. */
export function readWranglerConfig(): WranglerConfig {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "wrangler.jsonc"), "utf8")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/,\s*([}\]])/g, "$1"),
  ) as WranglerConfig;
}
