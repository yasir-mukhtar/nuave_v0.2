import { describe, expect, it, vi } from "vitest";
import { containsPhoneNumber } from "../checks/phones";
import {
  citedPagesToRead,
  FirecrawlUnavailable,
  MAX_REQUESTS_PER_ORDER,
  firecrawlFetcher,
  ownPagesToRead,
  pageText,
  readPagesForReport,
  type PageFetcher,
} from "./page-reader";

describe("which pages are read (the reading test)", () => {
  it("the most-cited pages first, never the own site, a social profile or a map", () => {
    const pages = citedPagesToRead(
      [
        { prompt_id: "q1", url: "https://hadirr.com/klinik-terbaik" },
        { prompt_id: "q1", url: "https://alodokter.com/jerawat" },
        { prompt_id: "q2", url: "https://hadirr.com/klinik-terbaik#daftar" },
        { prompt_id: "q3", url: "https://hadirr.com/klinik-terbaik" },
        { prompt_id: "q2", url: "https://fiksi.example/harga" },
        { prompt_id: "q2", url: "https://www.instagram.com/klinik" },
        { prompt_id: "q2", url: "https://maps.google.com/?cid=1" },
        { prompt_id: "q4", url: "mailto:a@b.c" },
      ],
      "fiksi.example",
    );
    expect(pages).toEqual([
      {
        url: "https://hadirr.com/klinik-terbaik",
        cited_in: ["q1", "q2", "q3"],
      },
      { url: "https://alodokter.com/jerawat", cited_in: ["q1"] },
    ]);
  });

  it("one page cited with and without tracking tags is read once", () => {
    expect(
      citedPagesToRead(
        [
          {
            prompt_id: "q1",
            url: "https://erhaultimate.co.id/find-clinic/845",
          },
          {
            prompt_id: "q2",
            url: "https://erhaultimate.co.id/find-clinic/845?utm_source=chatgpt.com",
          },
          {
            prompt_id: "q3",
            url: "https://klinik.example/harga?id=2&utm_medium=x&gclid=abc",
          },
        ],
        null,
      ),
    ).toEqual([
      {
        url: "https://erhaultimate.co.id/find-clinic/845",
        cited_in: ["q1", "q2"],
      },
      // A real query stays: it may be the page itself.
      { url: "https://klinik.example/harga?id=2", cited_in: ["q3"] },
    ]);
  });

  it("at most ten cited pages", () => {
    const sources = Array.from({ length: 15 }, (_, i) => ({
      prompt_id: "q1",
      url: `https://situs${i}.example/`,
    }));
    expect(citedPagesToRead(sources, null)).toHaveLength(10);
  });

  it("own-site pages about prices, doctors, treatments or the business, up to four", () => {
    expect(
      ownPagesToRead("https://fiksi.example/", [
        { url: "https://fiksi.example/" },
        { url: "https://fiksi.example/blog/tips-kulit" },
        { url: "https://fiksi.example/harga" },
        { url: "https://fiksi.example/p/123", title: "Dokter kami" },
        { url: "https://lain.example/harga" },
        { url: "https://fiksi.example/tentang-kami" },
        { url: "https://fiksi.example/treatment/botox" },
        { url: "https://fiksi.example/cabang" },
      ]),
    ).toEqual([
      "https://fiksi.example/harga",
      "https://fiksi.example/p/123",
      "https://fiksi.example/tentang-kami",
      "https://fiksi.example/treatment/botox",
    ]);
  });

  it("a page's text has no phone number or image, and is cut at a line end", () => {
    const text = pageText(
      `# Harga\n\n![logo](https://x/logo.png)\nHubungi 0812-3456-7890.\n\n\n\nBotox mulai Rp 1.500.000\n${"baris\n".repeat(2000)}`,
      400,
    );
    expect(containsPhoneNumber(text)).toBe(false);
    expect(text).not.toContain("logo.png");
    expect(text).toContain("Botox mulai Rp 1.500.000");
    expect(text.length).toBeLessThanOrEqual(402);
    expect(text.endsWith("\n…")).toBe(true);
  });
});

describe("reading an order's pages", () => {
  const fetcher = (fail: string[] = []): PageFetcher => ({
    scrape: vi.fn(async (url: string) =>
      fail.includes(url)
        ? null
        : { title: `Judul ${url}`, markdown: `Isi ${url} 75+ cabang` },
    ),
    map: vi.fn(async () => [{ url: "https://fiksi.example/harga" }]),
  });

  it("reads the own site and its useful pages, then the cited pages; unread pages are listed", async () => {
    const f = fetcher(["https://alodokter.com/jerawat"]);
    const { pages, unread } = await readPagesForReport({
      ownSite: "https://fiksi.example/",
      sources: [
        { prompt_id: "q1", url: "https://hadirr.com/klinik-terbaik" },
        { prompt_id: "q2", url: "https://alodokter.com/jerawat" },
      ],
      fetcher: f,
    });
    expect(pages.map((p) => [p.kind, p.url, p.cited_in])).toEqual([
      ["own", "https://fiksi.example/", []],
      ["own", "https://fiksi.example/harga", []],
      ["cited", "https://hadirr.com/klinik-terbaik", ["q1"]],
    ]);
    expect(pages[2]!.domain).toBe("hadirr.com");
    expect(unread).toEqual(["https://alodokter.com/jerawat"]);
  });

  it("an own site given as a bare domain is read; forums and Q&A sites are not", async () => {
    const f = fetcher();
    const { pages } = await readPagesForReport({
      ownSite: "fiksi.example",
      sources: [
        { prompt_id: "q1", url: "https://www.reddit.com/r/skincare/x" },
        { prompt_id: "q1", url: "https://id.quora.com/x" },
        { prompt_id: "q1", url: "https://www.kaskus.co.id/thread/x" },
      ],
      fetcher: f,
    });
    expect(pages.map((p) => p.url)).toEqual([
      "https://fiksi.example/",
      "https://fiksi.example/harga",
    ]);
  });

  it("at most sixteen Firecrawl requests for one order", async () => {
    let requests = 0;
    const counting: PageFetcher = {
      scrape: async (url) => {
        requests += 1;
        return { title: "", markdown: url };
      },
      map: async () => {
        requests += 1;
        return Array.from({ length: 30 }, (_, i) => ({
          url: `https://fiksi.example/harga-${i}`,
        }));
      },
    };
    await readPagesForReport({
      ownSite: "https://fiksi.example/",
      sources: Array.from({ length: 30 }, (_, i) => ({
        prompt_id: "q1",
        url: `https://situs${i}.example/`,
      })),
      fetcher: counting,
    });
    expect(MAX_REQUESTS_PER_ORDER).toBe(16);
    expect(requests).toBe(MAX_REQUESTS_PER_ORDER);
  });

  it("an Instagram profile as the own site is not read", async () => {
    const f = fetcher();
    const { pages } = await readPagesForReport({
      ownSite: "https://www.instagram.com/klinikfiksi",
      sources: [{ prompt_id: "q1", url: "https://hadirr.com/a" }],
      fetcher: f,
    });
    expect(pages.map((p) => p.url)).toEqual(["https://hadirr.com/a"]);
    expect(f.map).not.toHaveBeenCalled();
  });
});

describe("Firecrawl (v2)", () => {
  it("scrapes as Indonesia with the key, and gives the page's title and text", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              markdown: "# Klinik\nIsi",
              metadata: { title: "Klinik", statusCode: 200 },
            },
          }),
        ),
    );
    const read = await firecrawlFetcher("fc-test", fetchImpl).scrape(
      "https://fiksi.example/",
    );
    expect(read).toEqual({ title: "Klinik", markdown: "# Klinik\nIsi" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.firecrawl.dev/v2/scrape");
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer fc-test",
    );
    expect(JSON.parse(init.body as string)).toMatchObject({
      url: "https://fiksi.example/",
      formats: ["markdown"],
      onlyMainContent: true,
      location: { country: "ID" },
      proxy: "basic",
    });
  });

  it("a bad key, no credits, too many requests or an outage stops the reading", async () => {
    for (const status of [401, 402, 403, 429, 500, 503]) {
      const fetcher = firecrawlFetcher(
        "k",
        vi.fn(async () => new Response("{}", { status })),
      );
      await expect(fetcher.scrape("https://x.example/")).rejects.toThrow(
        FirecrawlUnavailable,
      );
      await expect(fetcher.map("https://x.example/")).rejects.toThrow(
        FirecrawlUnavailable,
      );
      await expect(
        readPagesForReport({
          ownSite: "https://x.example/",
          sources: [],
          fetcher,
        }),
      ).rejects.toThrow(FirecrawlUnavailable);
    }
  });

  it("a page that answers 404, an empty page or a failed request gives nothing", async () => {
    const answer = (body: unknown, status = 200) =>
      firecrawlFetcher(
        "k",
        vi.fn(async () => new Response(JSON.stringify(body), { status })),
      ).scrape("https://x.example/");
    expect(
      await answer({
        success: true,
        data: { markdown: "Not found", metadata: { statusCode: 404 } },
      }),
    ).toBeNull();
    expect(await answer({ success: true, data: { markdown: " " } })).toBeNull();
    // Firecrawl could not read this one page.
    expect(await answer({ success: false }, 400)).toBeNull();
    expect(
      await answer({
        success: true,
        data: { markdown: "x", metadata: { title: 42 } },
      }),
    ).toEqual({ title: "", markdown: "x" });
    expect(
      await firecrawlFetcher(
        "k",
        vi.fn(async () => {
          throw new Error("network");
        }),
      ).scrape("https://x.example/"),
    ).toBeNull();
  });

  it("maps a site to its links", async () => {
    const fetcher = firecrawlFetcher(
      "k",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: true,
              links: [{ url: "https://x.example/harga", title: "Harga" }, {}],
            }),
          ),
      ),
    );
    expect(await fetcher.map("https://x.example/")).toEqual([
      { url: "https://x.example/harga", title: "Harga" },
    ]);
  });
});
