// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SavedReport from "./SavedReport";

// Spec 021 Part P (P-02): the page Browser Run prints (`/r/print`) sends its
// fragment as a single-use print code, never as the link secret; the private
// page keeps sending the secret. Both in the body, never in a URL.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.location.hash = "";
});

async function bodySent(via: "link" | "print" | undefined, fragment: string) {
  window.location.hash = fragment;
  const fetchSpy = vi.fn(async () => new Response("{}", { status: 404 }));
  vi.stubGlobal("fetch", fetchSpy);
  render(via ? <SavedReport via={via} /> : <SavedReport />);
  await screen.findByText(/tidak tersedia/i);
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  const [url, init] = fetchSpy.mock.calls[0] as unknown as [
    string,
    RequestInit,
  ];
  expect(url).toBe("/api/report");
  expect(url).not.toContain(fragment);
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

describe("the report page and the print page", () => {
  it("/r sends the fragment as the secret", async () => {
    const secret = "S".repeat(32);
    expect(await bodySent(undefined, secret)).toEqual({ secret });
  });

  it("/r/print sends the fragment as the print code, and never a secret", async () => {
    const code = "P".repeat(43);
    expect(await bodySent("print", code)).toEqual({ print_token: code });
  });
});
