/**
 * Loads `.env.local` before live specs read provider configuration — the
 * established convention in the repo's evaluation runners (scripts/eval). The
 * loader never prints values; it only makes them available to the credential
 * mechanism already used by the audit pipeline.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadEnvLocal(): void {
  const file = join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
