// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { presentationFixture } from "@/lib/audit/report-presentation.fixture";
import { makeCustomerEvidenceExport } from "@/lib/audit/customer-evidence-export";
import { AnswerMarkdown } from "./AnswerMarkdown";
import { DirectTenReportBody } from "./DirectTenReportBody";
import ReportView from "../ReportView";
import { ReportToolbar } from "@/components/product/ReportToolbar";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("evidence-first body", () => {
  it("shows all ten full answers, late caveats and questions once, in order, before analysis", () => {
    const fixture = presentationFixture();
    const { container } = render(<DirectTenReportBody {...fixture} />);
    expect(
      [...container.querySelectorAll("[data-report-answer]")].map((el) =>
        el.getAttribute("data-report-answer"),
      ),
    ).toEqual(Array.from({ length: 10 }, (_, i) => String(i + 1)));
    fixture.observations.forEach((o, i) => {
      expect(
        container.querySelector(`#report-question-${i + 1}`)?.textContent,
      ).toBe(o.question);
      expect(
        container.querySelectorAll(`#report-question-${i + 1}`),
      ).toHaveLength(1);
      expect(
        container.querySelector(
          `[data-report-answer="${i + 1}"] [data-answer-body]`,
        ),
      ).toHaveTextContent(
        `Namun, keterangan terakhir ${i + 1} perlu dikonfirmasi.`,
      );
    });
    expect(
      [...container.querySelectorAll("[data-direct-ten-report] > section")].map(
        (s) => s.id,
      ),
    ).toEqual(["summary", "detail", "findings", "priorities", "method"]);
    expect(container.querySelectorAll("[data-answer-body]")).toHaveLength(10);
    expect(
      screen.queryByText("Analisis per pertanyaan tidak boleh diulang."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Catatan berulang tidak ditampilkan."),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText(fixture.report.priorities[0].action),
    ).toHaveLength(1);
    expect(container.querySelector("#findings blockquote")).toBeNull();
    expect(
      screen.getByText("Bisnis Anda direkomendasikan di 1 dari 10 pertanyaan"),
    ).toBeVisible();
    expect(
      screen.getAllByText("Tidak dinilai dari jawaban yang tersedia"),
    ).toHaveLength(9);
    expect(screen.queryByText("Tidak diuji")).not.toBeInTheDocument();
  });
  it("shows honest zero and keeps mention distinct from non-recommendation", () => {
    const fixture = presentationFixture();
    fixture.report.measures.overall.appeared = 0;
    fixture.report.measures.unbranded.appeared = 0;
    fixture.report.measures.recommendation.recommended = 0;
    fixture.report.details.forEach((d) => {
      d.appearance = "absent";
      d.recommendation = "not_assessed";
    });
    const { rerender, container } = render(
      <DirectTenReportBody {...fixture} />,
    );
    expect(
      screen.getByText("Bisnis Anda muncul di 0 dari 10 pertanyaan"),
    ).toBeVisible();
    fixture.report.measures.overall.appeared = 1;
    fixture.report.measures.unbranded.appeared = 1;
    fixture.report.details[0].appearance = "mentioned";
    fixture.report.details[0].recommendation = "not_recommended";
    rerender(<DirectTenReportBody {...fixture} />);
    const first = within(
      container.querySelector('[data-report-answer="1"]') as HTMLElement,
    );
    expect(first.getByText("Disebut")).toBeVisible();
    expect(first.getByText("Tidak direkomendasikan")).toBeVisible();
    expect(
      screen.getByText("Bisnis Anda direkomendasikan di 0 dari 10 pertanyaan"),
    ).toBeVisible();
  });
  it("links every finding/action/comparator reference and moves keyboard focus to the exact question", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DirectTenReportBody {...presentationFixture()} />,
    );
    for (const section of ["findings", "priorities"]) {
      for (const link of within(
        container.querySelector(`#${section}`) as HTMLElement,
      ).getAllByRole("link")) {
        link.focus();
        await user.keyboard("{Enter}");
        expect(document.activeElement?.id).toBe(
          link.getAttribute("href")!.slice(1),
        );
      }
    }
    expect(
      within(
        container.querySelector("#priorities") as HTMLElement,
      ).getAllByRole("link"),
    ).toHaveLength(2);
  });
  it("omits empty comparator data even when another name occurs in prose; rejects invalid references", () => {
    const fixture = presentationFixture();
    fixture.observations[0].raw_answer += " Usaha Lain ada dalam jawaban.";
    fixture.report.observed_competitors = [];
    const { rerender } = render(<DirectTenReportBody {...fixture} />);
    expect(
      screen.queryByText("Bisnis lain yang disebut"),
    ).not.toBeInTheDocument();
    fixture.report.key_findings[0].evidence_prompt_ids.push("unknown");
    rerender(<DirectTenReportBody {...fixture} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bukti laporan tidak tersedia",
    );
    expect(
      screen.queryByText(fixture.report.conclusion),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Usaha Lain ada/)).not.toBeInTheDocument();
  });
  it("shows retained sources and observation models/time without fetching or synthesis substitution", () => {
    const fixture = presentationFixture();
    fixture.observations[0].sources = [
      { title: "Aman", url: "https://source.example/" },
      { title: "Tidak aktif", url: "javascript:alert(1)" },
    ];
    fixture.observations[1].sources = [];
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<DirectTenReportBody {...fixture} />);
    const link = within(
      container.querySelector('[data-report-answer="1"]') as HTMLElement,
    ).getByRole("link");
    expect(link).toHaveAttribute("href", "https://source.example/");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(
      screen.getByText(/Tidak ada tautan sumber yang tersimpan/),
    ).toBeVisible();
    expect(screen.getAllByText("fictional-answer-0")).toHaveLength(5);
    expect(screen.queryByText("fictional-synthesis")).not.toBeInTheDocument();
    expect(
      container.querySelector('time[datetime="2026-09-21T03:04:05.000Z"]'),
    ).toBeVisible();
    expect(container.querySelector("#method time")).toHaveAttribute(
      "datetime",
      fixture.report.generated_at,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("copies exact CRLF/Unicode/repeated spaces, exposes raw unchanged and preserves JSON", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-22T00:00:00.000Z"));
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    const fixture = presentationFixture();
    const before = JSON.stringify(
      makeCustomerEvidenceExport(
        fixture.brief,
        [],
        fixture.observations,
        fixture.report,
      ),
    );
    const { container } = render(<DirectTenReportBody {...fixture} />);
    await user.click(
      screen.getByRole("button", {
        name: "Teks asli pertanyaan 1",
      }),
    );
    expect(container.querySelector("[data-raw-answer]")?.textContent).toBe(
      fixture.observations[0].raw_answer,
    );
    expect(container.querySelectorAll("[data-answer-body]")).toHaveLength(10);
    await user.click(
      screen.getByRole("button", {
        name: "Salin pertanyaan dan jawaban 1",
      }),
    );
    const copied = writeText.mock.calls[0][0];
    expect(copied).toContain(fixture.observations[0].question);
    expect(copied).toContain(fixture.observations[0].raw_answer);
    expect(copied).toContain(fixture.observations[0].observed_at);
    expect(
      JSON.stringify(
        makeCustomerEvidenceExport(
          fixture.brief,
          [],
          fixture.observations,
          fixture.report,
        ),
      ),
    ).toBe(before);
  });
  it("opens selectable original text and reports clipboard failure without a request", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied"),
    );
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const fixture = presentationFixture();
    const { container } = render(<DirectTenReportBody {...fixture} />);
    await user.click(
      screen.getByRole("button", {
        name: "Salin pertanyaan dan jawaban 1",
      }),
    );
    expect(screen.getByText(/Tidak dapat menyalin otomatis/)).toBeVisible();
    expect(container.querySelector("[data-raw-answer]")?.textContent).toBe(
      fixture.observations[0].raw_answer,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([undefined, "canonical", "glm-indonesian-slots"] as const)(
    "keeps the historical renderer/denominator for method %s",
    (method) => {
      const fixture = presentationFixture();
      Object.assign(fixture.report.provenance, { question_method: method });
      fixture.report.measures.recommendation.assessed = 3;
      const { container } = render(
        <ReportView {...fixture} onDownloadJson={() => {}} />,
      );
      expect(container.querySelector("[data-direct-ten-report]")).toBeNull();
      expect(
        screen.getByText(
          "Direkomendasikan di 1 dari 3 pertanyaan yang dinilai",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Download PDF" }),
      ).toBeVisible();
    },
  );
  it("changes the shared default while preserving PDF and JSON callbacks", async () => {
    const user = userEvent.setup();
    const pdf = vi.fn();
    const json = vi.fn();
    render(<ReportToolbar onDownloadPdf={pdf} onDownloadJson={json} />);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await user.click(screen.getByRole("button", { name: "Unduh bukti JSON" }));
    expect(pdf).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledTimes(1);
  });
});

describe("inert Markdown policy", () => {
  it("keeps root HTML as a paragraph and inline HTML in its original paragraph without changing text", () => {
    const raw =
      "Pembuka.\n\n<div>Blok HTML tetap terbaca.</div>\n\nKalimat dengan <span>HTML inline</span> tetap utuh.";
    const { container } = render(<AnswerMarkdown raw={raw} />);
    expect(container.textContent).toBe(
      "Pembuka.\n<div>Blok HTML tetap terbaca.</div>\nKalimat dengan <span>HTML inline</span> tetap utuh.",
    );
    expect(
      [...container.querySelectorAll("[data-answer-body] > p")].map(
        (paragraph) => paragraph.textContent,
      ),
    ).toEqual([
      "Pembuka.",
      "<div>Blok HTML tetap terbaca.</div>",
      "Kalimat dengan <span>HTML inline</span> tetap utuh.",
    ]);
    expect(container.querySelector("[data-answer-body] div, span")).toBeNull();
  });
  it("retains formatting, caveats and inert resource notation without links, controls, IDs or loads", () => {
    const raw =
      '# Heading {#report-question-1}\n\nYa. **tebal** *miring* ~~coret~~\n\n- satu\n  - dua\n\n> Namun, batas akhir tetap berlaku.\n\n| Hal | Keterangan |\n| --- | --- |\n| Satu | teks |\n\n```html\nhttps://source.example/code\n```\n\n[Label](https://source.example/ "judul") <https://source.example/auto> www.example.com\n\n[Referensi][r]\n\n[r]: https://source.example/ref\n\n![Gambar penting](https://source.example/tracker.png)\n\n<script>alert("XSS")</script>\n\n<iframe src="https://source.example/frame">keterangan</iframe>\n\n<input type="checkbox" checked onmouseover="alert(1)">\n\n- [x] selesai\n- [ ] perlu diperiksa\n\nCatatan[^1]\n\n[^1]: Batasan catatan kaki.\n\n[unsafe](javascript:alert%281%29)';
    const { container } = render(<AnswerMarkdown raw={raw} />);
    expect(
      container.querySelectorAll(
        "a,img,script,style,iframe,input,video,audio,embed,form,object,[id],h1,h2,h3",
      ),
    ).toHaveLength(0);
    expect(container.querySelector("h4")).toHaveTextContent("Heading");
    expect(container.querySelector("strong")).toHaveTextContent("tebal");
    expect(container.querySelector("table")).toHaveTextContent("Keterangan");
    expect(container.textContent).toContain(
      "Namun, batas akhir tetap berlaku.",
    );
    expect(container.textContent).toContain("Label (https://source.example/)");
    expect(container.textContent).toContain(
      "Referensi (https://source.example/ref)",
    );
    expect(container.textContent).toContain(
      "![Gambar penting](https://source.example/tracker.png)",
    );
    expect(container.textContent).toContain('<script>alert("XSS")</script>');
    expect(container.textContent).toContain("[x] selesai");
    expect(container.textContent).toContain("[ ] perlu diperiksa");
    expect(container.textContent).toContain("Batasan catatan kaki.");
    expect(container.textContent).toContain("javascript:alert%281%29");
  });
});
