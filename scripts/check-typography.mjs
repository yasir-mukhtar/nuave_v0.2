import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOTS = ["src/app", "src/components", "src/styles"];
const EXTENSIONS = new Set([".css", ".ts", ".tsx"]);
const CSS_RAW_TYPE_ALLOWLIST = new Set([
  // Fixture/spec preview surfaces are intentionally isolated from the live product.
  "src/app/audit/fixture/fixture.module.css",
  "src/app/audit/spec004/spec004.module.css",
]);

const failures = [];

async function walk(relativeDir) {
  const entries = await readdir(relativeDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(relativePath)));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }
  return files;
}

function record(file, line, reason, sample) {
  failures.push(`${file}:${line} ${reason}\n  ${sample.trim()}`);
}

for (const root of ROOTS) {
  for (const file of await walk(root)) {
    const source = await readFile(file, "utf8");
    const lines = source.split("\n");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (/--step-(?:-?\d+)/.test(line)) {
        record(file, lineNumber, "legacy perfect-fourth token is forbidden", line);
      }
      if (/font-family\s*:\s*Inter\b/i.test(line)) {
        record(file, lineNumber, "Inter is not an approved Nuave font", line);
      }
      if (/font-size\s*:\s*var\(--text-body\)/.test(line)) {
        record(file, lineNumber, "color token used as font-size", line);
      }
      if (/font-weight\s*:\s*650\b/.test(line)) {
        record(file, lineNumber, "non-canonical 650 weight is forbidden", line);
      }

      if (/\btext-\[(?:\d+(?:\.\d+)?(?:px|rem)|clamp\()/i.test(line)) {
        record(file, lineNumber, "arbitrary Tailwind font size is forbidden", line);
      }
      if (/\bleading-\[[^\]]+\]/.test(line)) {
        record(file, lineNumber, "arbitrary Tailwind line-height is forbidden", line);
      }
      if (/\btracking-\[[^\]]+\]/.test(line)) {
        record(file, lineNumber, "arbitrary Tailwind tracking is forbidden", line);
      }

      if (
        file.endsWith(".css") &&
        file !== "src/styles/tokens.css" &&
        !CSS_RAW_TYPE_ALLOWLIST.has(file) &&
        /font-size\s*:\s*(?:clamp\(|\d+(?:\.\d+)?(?:px|rem))/.test(line)
      ) {
        record(
          file,
          lineNumber,
          "raw CSS font-size must use a canonical --type-* token",
          line,
        );
      }
    });
  }
}

if (failures.length) {
  console.error("Typography drift check failed:\n");
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log("Typography drift check passed.");
