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
import {
  DIRECT_TEN_CONTEXT_VERSION,
  type DirectTenAuditContext,
} from "@/lib/audit/direct-ten-context-v2";
import {
  REPORT_DISPLAY_TIMEZONE,
  formatObservationWindow,
  observationWindow,
} from "./report-header";

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
    async (method) => {
      const user = userEvent.setup();
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
      // Exercise retained rendering directly, without reopening held v1 sessions.
      const before = JSON.stringify(fixture);
      const urlBefore = window.location.href;
      const historyLength = window.history.length;
      const contents = screen.getByRole("navigation", {
        name: "Report contents",
      });
      for (const id of [
        "summary",
        "findings",
        "priorities",
        "detail",
        "method",
      ]) {
        const target = container.querySelector<HTMLElement>(`#${id}`)!;
        const scroll = vi.fn();
        target.scrollIntoView = scroll;
        const link = contents.querySelector<HTMLAnchorElement>(
          `a[href="#${id}"]`,
        )!;
        await user.click(link);
        expect(target).toHaveFocus();
        link.focus();
        await user.keyboard("{Enter}");
        expect(target).toHaveFocus();
        expect(scroll).toHaveBeenCalledTimes(2);
        expect(window.location.href).toBe(urlBefore);
        expect(window.history.length).toBe(historyLength);
      }
      expect(JSON.stringify(fixture)).toBe(before);
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

describe("Spec 012 B1 final header and contents (AC-13)", () => {
  const context = (
    focus: DirectTenAuditContext["focus"]["value"],
  ): DirectTenAuditContext => ({
    version: DIRECT_TEN_CONTEXT_VERSION,
    identity: {
      name: "Kedai Fiksi",
      source: "https://kedai-fiksi.example/",
      sourceOrigin: "owner",
      aliases: [],
      origin: "owner",
    },
    focus: { value: focus, origin: "owner" },
    category: { value: "kedai kopi", origin: "website" },
    offerings: {
      value: focus.kind === "produk" ? [focus.name] : ["kopi susu"],
      origin: "website",
    },
    serviceChannels: { value: ["on_premise"], origin: "website" },
    market:
      focus.kind === "cabang"
        ? null
        : { value: { reach: "seluruh", areas: [] }, origin: "owner" },
    comparators: { value: { mode: "unknown" }, origin: "nuave" },
  });
  // Retained order is deliberately nonchronological; creation is later.
  const times = [
    "2026-09-22T09:30:00.000Z",
    "2026-09-21T23:05:00.000Z",
    "2026-09-22T10:45:00.000Z",
    "2026-09-22T00:00:00.000Z",
    "2026-09-22T01:00:00.000Z",
    "2026-09-22T02:00:00.000Z",
    "2026-09-22T03:00:00.000Z",
    "2026-09-22T04:00:00.000Z",
    "2026-09-22T05:00:00.000Z",
    "2026-09-22T06:00:00.000Z",
  ];
  function directTen(focus: DirectTenAuditContext["focus"]["value"]) {
    const fixture = presentationFixture();
    fixture.observations.forEach((o, i) => (o.observed_at = times[i]!));
    fixture.report.generated_at = "2026-09-24T07:00:00.000Z";
    return { ...fixture, brief: context(focus) };
  }

  it("derives the observation window from retained instants without reordering", () => {
    const retained = [...times];
    expect(observationWindow(retained)).toEqual({
      start: "2026-09-21T23:05:00.000Z",
      end: "2026-09-22T10:45:00.000Z",
    });
    expect(retained).toEqual(times);
    expect(
      observationWindow(["2026-09-22T09:30:00.000Z", "bukan-tanggal"]),
    ).toBeNull();
    expect(observationWindow([])).toBeNull();
    expect(
      formatObservationWindow({
        start: "2026-09-22T04:10:00.000Z",
        end: "2026-09-22T04:10:00.000Z",
      }),
    ).toBe("22 September 2026, 04.10 UTC");
    expect(
      formatObservationWindow({
        start: "2026-09-22T04:10:00.000Z",
        end: "2026-09-22T04:12:00.000Z",
      }),
    ).toBe("22 September 2026, 04.10–04.12 UTC");
    expect(
      formatObservationWindow({
        start: "2026-09-21T23:05:00.000Z",
        end: "2026-09-22T10:45:00.000Z",
      }),
    ).toBe("21 September 2026, 23.05 – 22 September 2026, 10.45 UTC");
    expect(REPORT_DISPLAY_TIMEZONE).toBe("UTC");
  });

  it("shows exact identity, whole-brand scope, observation range and separate creation time", () => {
    const fixture = directTen({ kind: "brand" });
    const { container } = render(
      <ReportView {...fixture} onDownloadJson={() => {}} />,
    );
    const header = container.querySelector("header")!;
    expect(within(header).getByText("AI Visibility Report")).toBeVisible();
    expect(
      within(header).getByRole("heading", { level: 1, name: "Kedai Fiksi" }),
    ).toBeVisible();
    expect(header).toHaveTextContent(
      "Seluruh brand Kedai Fiksi · seluruh Indonesia",
    );
    expect(header).not.toHaveTextContent("Dibuat oleh");
    expect(header.querySelector("img")).toBeNull();
    const facts = header.querySelector("[data-report-header-facts]")!;
    expect(facts).toHaveTextContent(
      "Tanggal pengamatan21 September 2026, 23.05 – 22 September 2026, 10.45 UTC",
    );
    expect(facts.querySelector("time")).toHaveAttribute(
      "datetime",
      "2026-09-21T23:05:00.000Z",
    );
    // Creation time is not the observation date; it stays in the method section.
    expect(facts).not.toHaveTextContent("24 September 2026");
    expect(container.querySelector("#method")).toHaveTextContent(
      "Laporan dibuat: 24 September 2026",
    );
    expect(facts).toHaveTextContent("Sistem yang diujisynthetic-local-fixture");
    expect(facts).toHaveTextContent(
      "Model jawabanfictional-answer-0, fictional-answer-1",
    );
    expect(facts).not.toHaveTextContent("fictional-answer-requested");
    // Retained answer order is untouched by the header's earliest/latest.
    expect(
      [...container.querySelectorAll("[data-report-answer] time")].map((el) =>
        el.getAttribute("datetime"),
      ),
    ).toEqual(times);
  });

  it("lists contents in the body's exact order and keeps navigation report-local", async () => {
    const user = userEvent.setup();
    const fixture = directTen({ kind: "brand" });
    const { container } = render(
      <ReportView {...fixture} onDownloadJson={() => {}} />,
    );
    const nav = screen.getByRole("navigation", { name: "Report contents" });
    const links = within(nav).getAllByRole("link");
    expect(
      links.map((link) => [link.getAttribute("href"), link.textContent]),
    ).toEqual([
      ["#summary", "Hasil singkat"],
      ["#detail", "Jawaban model AI"],
      ["#findings", "Analisis Nuave"],
      ["#priorities", "Yang dapat dilakukan"],
      ["#method", "Tentang audit ini"],
    ]);
    const bodyOrder = [
      ...container.querySelectorAll("[data-direct-ten-report] > section[id]"),
    ].map((section) => section.id);
    expect(bodyOrder).toEqual(
      links.map((l) => l.getAttribute("href")!.slice(1)),
    );
    for (const id of ["summary", "detail", "findings", "priorities", "method"])
      expect(container.querySelectorAll(`#${id}`)).toHaveLength(1);
    const urlBefore = window.location.href;
    const historyLength = window.history.length;
    for (const link of links) {
      const target = container.querySelector<HTMLElement>(
        link.getAttribute("href")!,
      )!;
      target.scrollIntoView = vi.fn();
      await user.click(link);
      expect(target).toHaveFocus();
      link.focus();
      await user.keyboard("{Enter}");
      expect(target).toHaveFocus();
    }
    expect(window.location.href).toBe(urlBefore);
    expect(window.history.length).toBe(historyLength);
    expect(
      within(container.querySelector("#priorities")!).getAllByText(
        "Penanggung jawab yang disarankan",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("shows product and location scope without invented optional meaning", () => {
    const product = directTen({ kind: "produk", name: "kopi susu" });
    const { container, unmount } = render(
      <ReportView {...product} onDownloadJson={() => {}} />,
    );
    const header = () => container.querySelector("header")!;
    expect(header()).toHaveTextContent(
      "Produk atau layanan: kopi susu · seluruh Indonesia",
    );
    unmount();
    const location = directTen({
      kind: "cabang",
      name: "Kedai Fiksi Dago",
      address: "Jl. Fiksi 1, Bandung",
    });
    const view = render(<ReportView {...location} onDownloadJson={() => {}} />);
    const locationHeader = view.container.querySelector("header")!;
    expect(locationHeader.querySelector("p:nth-of-type(2)")?.textContent).toBe(
      "Lokasi: Kedai Fiksi Dago — Jl. Fiksi 1, Bandung",
    );
    for (const invented of ["undefined", "null", "Pelanggan", "Pembanding"])
      expect(locationHeader).not.toHaveTextContent(invented);
  });

  it("shows no invented date when the retained binding is invalid", () => {
    const fixture = directTen({ kind: "brand" });
    fixture.observations[3]!.observed_at = "bukan-tanggal";
    const { container } = render(
      <ReportView {...fixture} onDownloadJson={() => {}} />,
    );
    const facts = container.querySelector("[data-report-header-facts]")!;
    expect(facts).toHaveTextContent("Tanggal pengamatanTidak tersedia");
    expect(facts).not.toHaveTextContent("Sistem yang diuji");
    expect(facts).not.toHaveTextContent("September");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bukti laporan tidak tersedia",
    );
  });

  it("keeps the historical header and contents unchanged", () => {
    const fixture = presentationFixture();
    Object.assign(fixture.report.provenance, { question_method: "canonical" });
    const { container } = render(
      <ReportView {...fixture} onDownloadJson={() => {}} />,
    );
    const header = container.querySelector("header")!;
    expect(header).toHaveTextContent("Laporan visibilitas AI");
    expect(header).toHaveTextContent("Dibuat oleh");
    expect(header).toHaveTextContent("Tanggal audit");
    expect(header.querySelector("[data-report-header-facts]")).toBeNull();
    expect(
      within(screen.getByRole("navigation", { name: "Report contents" }))
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Hasil utama",
      "Temuan utama",
      "Langkah berikutnya",
      "Hasil tiap pertanyaan",
      "Cara kerja audit",
    ]);
  });
});
