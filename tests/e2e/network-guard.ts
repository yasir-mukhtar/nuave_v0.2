import { expect, type Page } from "@playwright/test";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function unexpectedExternalRequests(urls: string[]): string[] {
  const violations: string[] = [];
  for (const url of urls) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (!LOCAL_HOSTS.has(parsed.hostname)) violations.push(url);
  }
  return [...new Set(violations)];
}

export async function assertNoUnexpectedExternalRequests(
  page: Page,
  urls: string[],
): Promise<void> {
  const violations = unexpectedExternalRequests(urls);
  expect(
    violations,
    `unexpected external requests: ${violations.join(", ")}`,
  ).toEqual([]);
  await expect(page).toHaveURL(/http/);
}
