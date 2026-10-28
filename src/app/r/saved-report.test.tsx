// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SavedReport from "./SavedReport";

// The report itself is not under test here: only what the page passes it.
vi.mock("@/app/audit/ReportView", () => ({
  default: (props: { showLogos?: boolean; onDownloadPdf?: unknown }) => (
    <div
      data-testid="report"
      data-show-logos={String(Boolean(props.showLogos))}
      data-pdf={String(Boolean(props.onDownloadPdf))}
    />
  ),
}));

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

describe("logos (Spec 021 C-03)", () => {
  async function shown(via: "link" | "print", synthetic: boolean) {
    window.location.hash = via === "link" ? "S".repeat(32) : "P".repeat(43);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              report: { conclusion: "" },
              context: { identity: { name: "Klinik Fiksi" } },
              prompts: [],
              originals: [],
              observations: [],
              synthetic,
            }),
            { status: 200 },
          ),
      ),
    );
    render(<SavedReport via={via} />);
    const report = await screen.findByTestId("report");
    const result = {
      logos: report.getAttribute("data-show-logos"),
      pdf: report.getAttribute("data-pdf"),
    };
    cleanup();
    return result;
  }

  it("only the private link page of a live report loads logos; never a synthetic report or the copy Browser Run prints", async () => {
    expect(await shown("link", false)).toEqual({ logos: "true", pdf: "true" });
    expect(await shown("link", true)).toEqual({ logos: "false", pdf: "true" });
    expect(await shown("print", false)).toEqual({
      logos: "false",
      pdf: "false",
    });
  });
});
