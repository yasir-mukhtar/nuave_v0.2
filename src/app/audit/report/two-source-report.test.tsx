// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { presentationFixture } from "@/lib/audit/report-presentation.fixture";
import {
  DIRECT_TEN_CONTEXT_VERSION,
  type DirectTenAuditContext,
} from "@/lib/audit/direct-ten-context-v2";
import type { AuditObservation, AuditReport } from "@/lib/audit/types";
import {
  TWO_SOURCE_REPORT_VERSION,
  type TwoSourceQuestion,
  type TwoSourceReport,
} from "@/lib/audit/two-source-report";
import { DirectTenReportBody } from "./DirectTenReportBody";
import { DirectTenReportPage } from "./DirectTenReportPage";
import type { PdfOutcome } from "./report-pdf";

afterEach(cleanup);

const brief: DirectTenAuditContext = {
  version: DIRECT_TEN_CONTEXT_VERSION,
  identity: {
    name: "Kedai Fiksi",
    source: "https://kedai-fiksi.example/",
    sourceOrigin: "owner",
    aliases: [],
    origin: "owner",
  },
  focus: { value: { kind: "brand" }, origin: "owner" },
  category: { value: "kedai kopi", origin: "website" },
  offerings: { value: ["kopi susu"], origin: "website" },
  serviceChannels: { value: ["on_premise"], origin: "website" },
  market: { value: { reach: "seluruh", areas: [] }, origin: "owner" },
  comparators: { value: { mode: "unknown" }, origin: "nuave" },
} as DirectTenAuditContext;

/* ------------------------------ AC-18 / R-29 ------------------------------ */

describe("a report saved before Spec 018 renders exactly as before (R-29, AC-18)", () => {
  // The snapshots were written from the renderer as it was before Spec 018
  // PR 2, then this change was applied: the markup has not moved.
  it("the body", () => {
    const fixture = presentationFixture();
    const { container } = render(<DirectTenReportBody {...fixture} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("the page", () => {
    const fixture = presentationFixture();
    const { container } = render(
      <DirectTenReportPage
        report={fixture.report}
        brief={brief}
        observations={fixture.observations}
        onDownloadJson={() => {}}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});

/* ------------------------- the two-source report ------------------------- */

/** AC-09's case: question 7's ChatGPT check failed; questions 2 and 9's
 * Google checks failed; question 4 showed no AI Overview; Google named the
 * business in question 1 only, and only as a source in question 3. */
function twoSourceFixture(overrides: Partial<TwoSourceReport> = {}): {
  report: AuditReport;
  observations: AuditObservation[];
} {
  const base = presentationFixture();
  const failedChatGpt = 6;
  const observations = base.observations.map((o, i) =>
    i === failedChatGpt
      ? {
          ...o,
          raw_answer: "",
          sources: [],
          run_status: "failed" as const,
          failure_reason: "DataForSEO asked to try again (status 50000).",
        }
      : o,
  );
  const questions: TwoSourceQuestion[] = observations.map((o, i) => {
    const googleFailed = i === 1 || i === 8;
    const notShown = i === 3;
    return {
      prompt_id: o.prompt_id,
      ordinal: i + 1,
      question: o.question,
      label: i === 0 ? "dicari_di_google" : "disusun_dari_topik",
      label_text:
        i === 0 ? "Dicari di Google" : "Disusun dari topik yang dicari",
      topic_line:
        i === 0
          ? "Topik: kopi susu · ±12.100 pencarian/bulan di Google, seluruh Indonesia (data September 2026)"
          : "Tidak ada data jumlah pencarian",
      topic: i === 0 ? "kopi susu" : `topik ${i + 1}`,
      volume: i === 0 ? 12_100 : null,
      data_month: "2026-09",
      chatgpt:
        i === failedChatGpt
          ? { outcome: "failed", named: null, recommended: null }
          : { outcome: "answered", named: "absent", recommended: false },
      google: googleFailed
        ? {
            outcome: "failed",
            text: "",
            references: [],
            named: null,
            observed_at: null,
          }
        : notShown
          ? {
              outcome: "not_shown",
              text: "",
              references: [],
              named: null,
              observed_at: "2026-09-22T03:04:05.000Z",
            }
          : {
              outcome: "summary",
              text: `Ringkasan Google ${i + 1}${i === 0 ? " menyebut Kedai Fiksi." : "."}`,
              references: [
                { url: "https://ulasan.example/kopi", title: "Ulasan kopi" },
              ],
              named: i === 0 ? "named" : i === 2 ? "source_only" : "absent",
              observed_at: "2026-09-22T03:04:05.000Z",
            },
    };
  });
  const two: TwoSourceReport = {
    version: TWO_SOURCE_REPORT_VERSION,
    order_number: "NV-ABCDEF",
    places: {
      google: { code: 1007715, name: "Surabaya" },
      chatgpt: { code: 2360, name: "Indonesia" },
    },
    checked_from: "2026-09-21T03:04:05.000Z",
    checked_to: "2026-09-22T03:04:05.000Z",
    search_data_available: true,
    questions,
    counts: {
      chatgpt: { completed: 9, named: 0, recommended: 0, failed: 1 },
      google: { completed: 8, summaries: 7, named: 1, failed: 2 },
      failed: 3,
    },
    google_finding:
      "Google tidak menampilkan AI Overview untuk 1 dari 8 pertanyaan ini.",
    topics_missing: [
      {
        prompt_id: questions[1]!.prompt_id,
        ordinal: 2,
        topic: "topik 2",
        volume: null,
        data_month: "2026-09",
        domains: ["source.example"],
      },
    ],
    other_businesses: { chatgpt: ["Kopi Lain"], google: [] },
    ...overrides,
  };
  const report: AuditReport = {
    ...base.report,
    // As the report pipeline saves it: recommendation assessed on the nine
    // completed ChatGPT answers.
    measures: {
      ...base.report.measures,
      recommendation: { recommended: 0, assessed: 9 },
    },
    details: base.report.details.map((d, i) =>
      i === failedChatGpt
        ? {
            ...d,
            run: "failed",
            appearance: "not_assessed",
            recommendation: "not_assessed",
            comparison: "not_assessed",
            information: "not_assessed",
            answer_excerpt: "",
            source_urls: [],
          }
        : d,
    ),
    two_source: two,
  };
  return { report, observations };
}

describe("the two-source report (R-16..R-20, AC-05, AC-09, AC-11)", () => {
  const body = (overrides: Partial<TwoSourceReport> = {}) => {
    const fixture = twoSourceFixture(overrides);
    return render(<DirectTenReportBody {...fixture} names={["Kedai Fiksi"]} />)
      .container;
  };

  it("shows one card per source with its own denominator, and the failed count", () => {
    const container = body();
    expect(container.querySelector("[role=alert]")).toBeNull();
    const chatgpt = container.querySelector<HTMLElement>(
      '[data-source-card="chatgpt"]',
    )!;
    const google = container.querySelector<HTMLElement>(
      '[data-source-card="google"]',
    )!;
    // Spec 021 A-02 sentences, N = 9 (AC-09).
    expect(chatgpt).toHaveTextContent(
      "Bisnis Anda muncul di 0 dari 9 pertanyaan dan direkomendasikan di 0.",
    );
    // M = 8, Z = 7, W = 1; Google has no "direkomendasikan" line.
    expect(google).toHaveTextContent(
      "Google menampilkan AI Overview di 7 dari 8 pertanyaan; bisnis Anda muncul di 1 dari 7.",
    );
    expect(google).not.toHaveTextContent("direkomendasikan");
    // One dot per question on each card (AC-A2).
    expect(chatgpt.querySelectorAll("[data-mention]")).toHaveLength(10);
    expect(google.querySelectorAll("[data-mention]")).toHaveLength(10);
    expect(container.querySelector("[data-failed-count]")).toHaveTextContent(
      "3 pemeriksaan tidak dapat diuji",
    );
    expect(container.textContent).not.toMatch(/0 dari 0/);
  });

  it("AC-A2: each card's headline count equals its dots, and every dot names its look", () => {
    const container = body();
    for (const [source, looks] of [
      ["chatgpt", ["mentioned", "recommended"]],
      ["google", ["mentioned", "recommended"]],
    ] as const) {
      const card = container.querySelector<HTMLElement>(
        `[data-source-card="${source}"]`,
      )!;
      const dots = [...card.querySelectorAll("[data-mention]")];
      const named = dots.filter((dot) =>
        (looks as readonly string[]).includes(
          dot.getAttribute("data-mention")!,
        ),
      ).length;
      const headline = card.querySelector("[aria-hidden] > span");
      expect(headline?.textContent).toBe(String(named));
      for (const dot of dots)
        expect(dot.getAttribute("aria-label")).toMatch(/^Pertanyaan \d+: \S/);
    }
    const google = container.querySelector('[data-source-card="google"]')!;
    expect(google.querySelectorAll('[data-mention="noaio"]')).toHaveLength(1);
    expect(google.querySelectorAll('[data-mention="cited"]')).toHaveLength(1);
    expect(google.querySelectorAll('[data-mention="failed"]')).toHaveLength(2);
    // The legend shows "Tidak dapat diuji" only because a check failed.
    expect(container.querySelector("#summary")).toHaveTextContent(
      "Tidak dapat diuji",
    );
  });

  it("AC-A2: ChatGPT's recommended, named and cited answers each draw their look, and the headline counts named answers", () => {
    const fixture = twoSourceFixture();
    const two = fixture.report.two_source!;
    const looks = [
      { named: "named", recommended: true },
      { named: "named", recommended: false },
      { named: "source_only", recommended: false },
    ] as const;
    looks.forEach((look, i) => {
      two.questions[i]!.chatgpt = { outcome: "answered", ...look };
    });
    two.counts.chatgpt = { ...two.counts.chatgpt, named: 2, recommended: 1 };
    const { container } = render(
      <DirectTenReportBody {...fixture} names={["Kedai Fiksi"]} />,
    );
    const card = container.querySelector<HTMLElement>(
      '[data-source-card="chatgpt"]',
    )!;
    const dots = [...card.querySelectorAll("[data-mention]")].map((dot) =>
      dot.getAttribute("data-mention"),
    );
    expect(dots.slice(0, 3)).toEqual(["recommended", "mentioned", "cited"]);
    expect(
      dots.filter((look) => look === "recommended" || look === "mentioned"),
    ).toHaveLength(2);
    expect(card.querySelector("[aria-hidden] > span")?.textContent).toBe("2");
    expect(card).toHaveTextContent("direkomendasikan di 1.");
    // The recommended dot draws its check.
    expect(
      card.querySelector('[data-mention="recommended"] svg'),
    ).not.toBeNull();
  });

  it("before Part B: findings without a headline number, recommendations as action and why, Penutup with the conclusion and the re-audit card", () => {
    const container = body();
    const finding = container.querySelector("[data-finding]")!;
    expect(finding).toHaveTextContent("Temuan fiktif");
    expect(finding).toHaveTextContent(
      "Keterangan perlu dibaca bersama batasannya.",
    );
    const rec = container.querySelector("[data-recommendation]")!;
    expect(rec).toHaveTextContent("Periksa keterangan contoh.");
    expect(rec).toHaveTextContent("Ada batasan yang harus diperiksa.");
    for (const removed of [
      "Mengapa",
      "Berdasarkan",
      "Penanggung jawab",
      "Selesai ketika",
      "Kerjakan dulu",
      "Bukan diagnosis penyebab.",
    ])
      expect(container.textContent).not.toContain(removed);
    const closing = container.querySelector("#penutup")!;
    expect(closing).toHaveTextContent(
      "Ini contoh fiktif untuk menguji pembacaan bukti",
    );
    expect(closing.querySelector("[data-reaudit]")).toHaveTextContent(
      "Audit ulang setelah 8 minggu",
    );
    expect(closing.querySelector("button")).toBeNull();
    // The verdict is the conclusion's opening, cut at a sentence end.
    expect(container.querySelector("[data-verdict]")?.textContent).toBe(
      "Ini contoh fiktif untuk menguji pembacaan bukti, bukan hasil bisnis nyata.",
    );
  });

  it("AC-20: a clinic's report says Klinik Anda on both cards and in the profile note", () => {
    const container = body({ subject: "klinik", search_data_available: false });
    const chatgpt = container.querySelector<HTMLElement>(
      '[data-source-card="chatgpt"]',
    )!;
    const google = container.querySelector<HTMLElement>(
      '[data-source-card="google"]',
    )!;
    expect(chatgpt).toHaveTextContent(
      "Klinik Anda muncul di 0 dari 9 pertanyaan dan direkomendasikan di 0.",
    );
    expect(google).toHaveTextContent("klinik Anda muncul di 1 dari 7.");
    expect(container.textContent).toContain("disusun dari profil klinik Anda.");
    expect(container.textContent).not.toMatch(/Bisnis Anda|bisnis Anda/);
  });

  it("AC-20: a report saved without a subject keeps Bisnis Anda", () => {
    const container = body({ subject: undefined });
    expect(
      container.querySelector('[data-source-card="chatgpt"]'),
    ).toHaveTextContent("Bisnis Anda muncul di 0 dari 9 pertanyaan");
  });

  it("a denominator of 0 shows Tidak diuji, never 0 dari 0 (R-19)", () => {
    const container = body({
      counts: {
        chatgpt: { completed: 9, named: 0, recommended: 0, failed: 1 },
        google: { completed: 6, summaries: 0, named: 0, failed: 4 },
        failed: 5,
      },
    });
    const google = container.querySelector<HTMLElement>(
      '[data-source-card="google"]',
    )!;
    expect(google).toHaveTextContent(
      "Google menampilkan AI Overview di 0 dari 6 pertanyaan",
    );
    expect(google).toHaveTextContent("Tidak diuji");
    expect(container.textContent).not.toMatch(/0 dari 0/);
  });

  it("each failed slot says Tidak dapat diuji with a Minta bantuan email naming the order (R-20)", () => {
    const container = body();
    const slots = container.querySelectorAll("[data-failed-slot]");
    expect(slots).toHaveLength(3);
    for (const slot of slots) {
      expect(slot).toHaveTextContent("Tidak dapat diuji");
      const link = within(slot as HTMLElement).getByText("Minta bantuan");
      const href = link.getAttribute("href")!;
      expect(href.startsWith("mailto:support@nuave.ai?subject=")).toBe(true);
      expect(decodeURIComponent(href)).toContain("NV-ABCDEF");
    }
    // No button runs a check again.
    expect(container.querySelector("button[data-rerun]")).toBeNull();
    const seven = container.querySelector('[data-report-answer="7"]')!;
    expect(
      seven.querySelector('[data-source-answer="chatgpt"] [data-failed-slot]'),
    ).not.toBeNull();
  });

  it("the print appendix holds each question's context and both answers, with outcomes", () => {
    const container = body();
    const first = container.querySelector<HTMLElement>(
      '[data-report-appendix] [data-report-answer="1"]',
    )!;
    expect(first).toHaveTextContent("Dicari di Google");
    expect(first).toHaveTextContent(
      "±12.100 pencarian/bulan di Google, seluruh Indonesia (data September 2026)",
    );
    expect(
      [...first.querySelectorAll("[data-source-answer]")].map((el) =>
        el.getAttribute("data-source-answer"),
      ),
    ).toEqual(["chatgpt", "google"]);
    expect(first).toHaveTextContent("Ditanya dari Indonesia");
    expect(first).toHaveTextContent("Ditanya dari Surabaya");
    expect(
      container.querySelector('[data-report-answer="4"] [data-not-shown]'),
    ).toHaveTextContent("Google tidak menampilkan AI Overview");
    expect(
      container.querySelector(
        '[data-report-answer="3"] [data-source-answer="google"]',
      ),
    ).toHaveTextContent("Situs dikutip, nama tidak disebut");
    expect(container.querySelector("#jawaban")).toHaveTextContent("Jawaban AI");
  });

  it("Jawaban AI is a table: header row with labelled logos, one row per question with a dot per source (Part D)", () => {
    const container = body();
    const table = container.querySelector<HTMLElement>("[data-answers-table]")!;
    expect(table).toHaveTextContent("#");
    expect(table).toHaveTextContent("Pertanyaan");
    expect(
      [...table.querySelectorAll("[data-source-logo]")].map((el) =>
        el.getAttribute("aria-label"),
      ),
    ).toEqual(["ChatGPT", "Google AI Overview"]);
    const rows = table.querySelectorAll("[data-answer-row]");
    expect(rows).toHaveLength(10);
    const four = table.querySelector<HTMLElement>('[data-answer-row="4"]')!;
    expect(
      four
        .querySelector('[data-source="google"]')
        ?.getAttribute("data-mention"),
    ).toBe("noaio");
    // The row's name says each source's result in words.
    expect(four.getAttribute("aria-label")).toContain(
      "Google AI Overview: Tidak ada AI Overview.",
    );
    // The stacked answers are print only now.
    expect(
      container.querySelector("[data-report-appendix]")?.className,
    ).toMatch(/appendix/);
  });

  it("AC-D1, D-02: a row, a summary dot and a P reference open the panel on that question and source; Escape closes it and focus returns", async () => {
    const user = userEvent.setup();
    const fixture = twoSourceFixture();
    render(<DirectTenReportBody {...fixture} names={["Kedai Fiksi"]} />);
    const row = document.querySelector<HTMLElement>('[data-answer-row="3"]')!;
    expect(row).toHaveAccessibleName(
      expect.stringMatching(
        /^Pertanyaan 3: .+\. ChatGPT: .+\. Google AI Overview: .+\.$/,
      ),
    );
    await user.click(row);
    const dialog = await screen.findByRole("dialog", {
      name: "Pertanyaan 3 dari 10",
    });
    expect(
      within(dialog).getByRole("tab", { name: "ChatGPT" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(dialog).toHaveTextContent("Pertanyaan 3: café lokal");
    // Tabs follow the arrow keys.
    within(dialog).getByRole("tab", { name: "ChatGPT" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(
      within(dialog).getByRole("tab", { name: "Google AI Overview" }),
    ).toHaveFocus();
    await user.click(
      within(dialog).getByRole("tab", { name: "Google AI Overview" }),
    );
    expect(
      dialog.querySelector('[data-source-answer="google"]'),
    ).not.toBeNull();
    // Berikutnya moves to the next question.
    await user.click(
      within(dialog).getByRole("button", { name: /Berikutnya/ }),
    );
    expect(
      screen.getByRole("dialog", { name: "Pertanyaan 4 dari 10" }),
    ).toHaveTextContent("Google tidak menampilkan AI Overview");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(row).toHaveFocus();

    // A Google dot in the summary opens the Google tab.
    const googleDot = within(
      document.querySelector<HTMLElement>('[data-source-card="google"]')!,
    ).getByRole("button", { name: /^Pertanyaan 1:/ });
    await user.click(googleDot);
    const second = await screen.findByRole("dialog", {
      name: "Pertanyaan 1 dari 10",
    });
    expect(
      within(second).getByRole("tab", { name: "Google AI Overview" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      within(second).getByRole("button", { name: /Sebelumnya/ }),
    ).toBeDisabled();
    await user.click(within(second).getByRole("button", { name: "Tutup" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(googleDot).toHaveFocus();

    // A P reference in a finding opens its question.
    await user.click(
      screen.getAllByRole("button", { name: "P2: pertanyaan 2" })[0]!,
    );
    expect(
      await screen.findByRole("dialog", { name: "Pertanyaan 2 dari 10" }),
    ).toBeInTheDocument();
  });

  it("a table dot opens its own source's tab; at the last question focus stays in the panel", async () => {
    const user = userEvent.setup();
    const fixture = twoSourceFixture();
    render(<DirectTenReportBody {...fixture} names={["Kedai Fiksi"]} />);
    await user.click(
      document.querySelector<HTMLElement>(
        '[data-answer-row="9"] [data-source="google"]',
      )!,
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Pertanyaan 9 dari 10",
    });
    expect(
      within(dialog).getByRole("tab", { name: "Google AI Overview" }),
    ).toHaveAttribute("aria-selected", "true");
    // Berikutnya turns off at question 10; focus moves to Sebelumnya.
    await user.click(
      within(dialog).getByRole("button", { name: /Berikutnya/ }),
    );
    expect(
      screen.getByRole("dialog", { name: "Pertanyaan 10 dari 10" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /Berikutnya/ }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: /Sebelumnya/ }),
    ).toHaveFocus();
  });

  it("paging back to question 1 keeps focus in the panel and tells screen readers the new question", async () => {
    const user = userEvent.setup();
    const fixture = twoSourceFixture();
    render(<DirectTenReportBody {...fixture} names={["Kedai Fiksi"]} />);
    await user.click(
      document.querySelector<HTMLElement>('[data-answer-row="2"]')!,
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Pertanyaan 2 dari 10",
    });
    await user.click(
      within(dialog).getByRole("button", { name: /Sebelumnya/ }),
    );
    expect(
      screen.getByRole("dialog", { name: "Pertanyaan 1 dari 10" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /Sebelumnya/ }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: /Berikutnya/ }),
    ).toHaveFocus();
    expect(dialog.querySelector('[aria-live="polite"]')).toHaveTextContent(
      "Pertanyaan 1 dari 10",
    );
  });

  it("reopening the question last read starts at its top", async () => {
    const user = userEvent.setup();
    const fixture = twoSourceFixture();
    render(<DirectTenReportBody {...fixture} names={["Kedai Fiksi"]} />);
    const row = document.querySelector<HTMLElement>('[data-answer-row="2"]')!;
    await user.click(row);
    await screen.findByRole("dialog", { name: "Pertanyaan 2 dari 10" });
    const body = document.querySelector<HTMLElement>("[data-panel-body]")!;
    body.scrollTop = 186;
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(row);
    await screen.findByRole("dialog", { name: "Pertanyaan 2 dari 10" });
    expect(body.scrollTop).toBe(0);
  });

  it("a copied note does not carry over to the next question", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
    const fixture = twoSourceFixture();
    render(<DirectTenReportBody {...fixture} names={["Kedai Fiksi"]} />);
    await user.click(
      document.querySelector<HTMLElement>('[data-answer-row="1"]')!,
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Pertanyaan 1 dari 10",
    });
    await user.click(
      within(dialog).getByRole("button", {
        name: "Salin pertanyaan dan jawaban 1",
      }),
    );
    expect(dialog).toHaveTextContent("tersalin");
    await user.click(
      within(dialog).getByRole("button", { name: /Berikutnya/ }),
    );
    await screen.findByRole("button", {
      name: "Salin pertanyaan dan jawaban 2",
    });
    expect(dialog).not.toHaveTextContent("tersalin");
  });

  it("the panel shows a failed check with its help link, never an empty answer", async () => {
    const user = userEvent.setup();
    const fixture = twoSourceFixture();
    render(<DirectTenReportBody {...fixture} names={["Kedai Fiksi"]} />);
    await user.click(
      document.querySelector<HTMLElement>('[data-answer-row="7"]')!,
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Pertanyaan 7 dari 10",
    });
    expect(dialog.querySelector("[data-failed-slot]")).toHaveTextContent(
      "Tidak dapat diuji",
    );
    expect(
      within(dialog).getByRole("link", { name: "Minta bantuan" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:support@nuave.ai"),
    );
  });

  it("the code-built Google finding, the competitor list and Celah Topik", () => {
    const container = body();
    expect(container.querySelector("[data-google-finding]")).toHaveTextContent(
      "Google tidak menampilkan AI Overview untuk 1 dari 8 pertanyaan ini.",
    );
    const others = container.querySelector("[data-other-businesses]")!;
    expect(others).toHaveTextContent("Kopi Lain");
    // The business itself is highlighted, never listed as a competitor.
    expect(others.querySelector('[data-competitor="own"]')).toHaveTextContent(
      "Kedai Fiksi",
    );
    const topics = container.querySelector("[data-topics-missing]")!;
    expect(container.querySelector("#topik")).toHaveTextContent("Celah Topik");
    expect(topics).toHaveTextContent("topik 2");
    // AC-A4: never "Tidak ada data jumlah pencarian".
    expect(container.textContent).not.toContain(
      "Tidak ada data jumlah pencarian",
    );
    // No AI-assistant estimate (AC-11).
    expect(container.textContent).not.toMatch(/perkiraan.*asisten AI/i);
  });

  it("says once that the questions came from the business profile when search data was missing (AC-05)", () => {
    const missing = body({ search_data_available: false }).textContent ?? "";
    expect(
      missing.split("Data pencarian Google tidak tersedia untuk audit ini")
        .length - 1,
    ).toBe(1);
    cleanup();
    expect(body().textContent).not.toContain(
      "Data pencarian Google tidak tersedia",
    );
  });

  it("the page header names both sources once, and the chips follow the page order (AC-A3)", () => {
    const fixture = twoSourceFixture();
    const { container } = render(
      <DirectTenReportPage
        report={fixture.report}
        brief={brief}
        observations={fixture.observations}
        onDownloadJson={() => {}}
      />,
    );
    const checked = container.querySelector("[data-report-checked]")!;
    expect(checked).toHaveTextContent(
      "Diperiksa 22 September 2026 · ChatGPT dan Google AI Overview",
    );
    expect(container.querySelector("header")).toHaveTextContent("Surabaya");
    expect(
      [...container.querySelectorAll("[data-chip]")].map((chip) =>
        chip.textContent?.trim(),
      ),
    ).toEqual([
      "Temuan Utama",
      "Peta Pesaing",
      "Celah Topik",
      "Rekomendasi",
      "Penutup",
      "Jawaban AI",
    ]);
    // AC-A4: no JSON export and no "Tentang audit ini" on a two-source report.
    expect(container.textContent).not.toContain("Unduh bukti JSON");
    expect(container.textContent).not.toContain("Tentang audit ini");
  });
});

/* ------------------------- Spec 021 Part P, PDF ------------------------- */

describe("Unduh PDF (Part P)", () => {
  function page(onDownloadPdf?: () => Promise<PdfOutcome>) {
    const fixture = twoSourceFixture();
    return render(
      <DirectTenReportPage
        report={fixture.report}
        brief={brief}
        observations={fixture.observations}
        onDownloadJson={() => {}}
        onDownloadPdf={onDownloadPdf}
      />,
    );
  }
  const buttons = () => screen.getAllByRole("button", { name: "Unduh PDF" });

  afterEach(() => vi.restoreAllMocks());

  it("asks for the server PDF with a spinner, once per press, and does not print", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    let finish: (value: PdfOutcome) => void = () => {};
    const download = vi.fn(
      () => new Promise<PdfOutcome>((resolve) => (finish = resolve)),
    );
    page(download);
    expect(buttons()).toHaveLength(2);
    await userEvent.click(buttons()[0]!);
    expect(buttons()[0]).toHaveAttribute("aria-busy", "true");
    expect(buttons()[0]!.querySelector(".animate-spin")).not.toBeNull();
    // A second press while it is being made does nothing.
    await userEvent.click(buttons()[1]!);
    expect(download).toHaveBeenCalledTimes(1);
    finish("saved");
    await waitFor(() => expect(buttons()[0]).not.toHaveAttribute("aria-busy"));
    expect(print).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a failure shows the retry message next to the button pressed; Coba lagi asks again", async () => {
    vi.spyOn(window, "print").mockImplementation(() => {});
    const download = vi
      .fn<() => Promise<PdfOutcome>>()
      .mockResolvedValueOnce("failed")
      .mockResolvedValueOnce("saved");
    const { container } = page(download);
    await userEvent.click(buttons()[1]!);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("PDF belum bisa dibuat. Coba lagi");
    expect(container.querySelectorAll("[data-pdf-failed]")).toHaveLength(1);
    expect(
      alert.closest("[data-pdf-failed]")!.previousElementSibling,
    ).toHaveAttribute("data-pdf-button", "end");
    // The report itself is unaffected.
    expect(container.querySelector("#temuan")).not.toBeNull();
    await userEvent.click(
      within(alert).getByRole("button", { name: "Coba lagi" }),
    );
    expect(download).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("prints when the server has no PDF for it (pdf_unavailable), and when there is no server PDF at all", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    page(async () => "print");
    await userEvent.click(buttons()[0]!);
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    cleanup();
    page();
    await userEvent.click(buttons()[1]!);
    expect(print).toHaveBeenCalledTimes(2);
  });

  it("Temuan Utama, Rekomendasi and Penutup start a new page on paper", () => {
    const { container } = page();
    expect(
      [...container.querySelectorAll("[data-new-page]")].map((band) => band.id),
    ).toEqual(["temuan", "rekomendasi", "penutup"]);
  });
});
