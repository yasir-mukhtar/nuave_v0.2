import { describe, expect, it, vi } from "vitest";
import { containsPhoneNumber } from "../checks/phones";
import {
  cappedFetch,
  citedPagesToRead,
  EMAIL_REMOVED,
  patientFetch,
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
    // What stays keeps its encoding, so the same page still matches.
    expect(
      citedPagesToRead(
        [
          {
            prompt_id: "q1",
            url: "https://a.example/cari?q=a%20b&utm_source=x",
          },
          { prompt_id: "q2", url: "https://a.example/cari?q=a%20b" },
          { prompt_id: "q3", url: "https://b.example/p?flag&path=/x" },
        ],
        null,
      ),
    ).toEqual([
      { url: "https://a.example/cari?q=a%20b", cited_in: ["q1", "q2"] },
      { url: "https://b.example/p?flag&path=/x", cited_in: ["q3"] },
    ]);
  });

  it("at most ten cited pages", () => {
    const sources = Array.from({ length: 15 }, (_, i) => ({
      prompt_id: "q1",
      url: `https://situs${i}.example/`,
    }));
    expect(citedPagesToRead(sources, null)).toHaveLength(10);
  });

  it("own-site pages: one of each kind first (offer, branches, doctors, prices, about), list pages before their items, never posts", () => {
    expect(
      ownPagesToRead("https://fiksi.example/", [
        { url: "https://fiksi.example/" },
        { url: "https://fiksi.example/blog/harga-botox" },
        { url: "https://fiksi.example/artikel/tips-kulit" },
        { url: "https://fiksi.example/2025/01/promo-akhir-tahun" },
        { url: "https://fiksi.example/testimoni" },
        { url: "https://fiksi.example/harga" },
        { url: "https://lain.example/cabang" },
        { url: "https://fiksi.example/treatment/botox" },
        { url: "https://fiksi.example/treatment" },
        { url: "https://fiksi.example/lokasi/bandung" },
        { url: "https://fiksi.example/lokasi" },
        { url: "https://fiksi.example/p/123", title: "Tim dokter kami" },
        { url: "https://fiksi.example/tentang-kami" },
      ]),
    ).toEqual([
      "https://fiksi.example/treatment",
      "https://fiksi.example/lokasi",
      "https://fiksi.example/p/123",
      "https://fiksi.example/harga",
    ]);
  });

  it("with fewer kinds than places, a second page of a kind fills the rest", () => {
    expect(
      ownPagesToRead("https://fiksi.example/", [
        { url: "https://fiksi.example/layanan/gigi-anak" },
        { url: "https://fiksi.example/layanan" },
        { url: "https://fiksi.example/cabang" },
        { url: "https://fiksi.example/layanan/implan" },
        { url: "https://fiksi.example/sitemap.xml" },
        { url: "https://fiksi.example/karir/perawat" },
      ]),
    ).toEqual([
      "https://fiksi.example/layanan",
      "https://fiksi.example/cabang",
      "https://fiksi.example/layanan/gigi-anak",
      "https://fiksi.example/layanan/implan",
    ]);
  });

  it("a page's text has no phone number, email or image, and is cut at a line end", () => {
    const text = pageText(
      `# Harga\n\n![logo](https://x/logo.png)\nHubungi 0812-3456-7890 atau dr.sari@klinik-fiksi.co.id.\n\n\n\nBotox mulai Rp 1.500.000\n${"baris\n".repeat(2000)}`,
      400,
    );
    expect(containsPhoneNumber(text)).toBe(false);
    expect(text).not.toContain("@");
    expect(text).toContain(EMAIL_REMOVED);
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

  it("with the own site read at step 3, only the cited pages are read, never the own site's", async () => {
    const f = fetcher();
    const { pages } = await readPagesForReport({
      ownSite: "https://fiksi.example/",
      sources: [
        { prompt_id: "q1", url: "https://hadirr.com/klinik-terbaik" },
        { prompt_id: "q2", url: "https://fiksi.example/harga" },
      ],
      fetcher: f,
      readOwn: false,
    });
    expect(pages.map((p) => [p.kind, p.url])).toEqual([
      ["cited", "https://hadirr.com/klinik-terbaik"],
    ]);
    expect(f.map).not.toHaveBeenCalled();
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

  it("a stop keeps the pages already read; the rest are unread", async () => {
    const stopping: PageFetcher = {
      map: async () => [],
      scrape: async (url) => {
        if (url.includes("b.example")) throw new FirecrawlUnavailable(402);
        return { title: "", markdown: `Isi ${url}` };
      },
    };
    const read = await readPagesForReport({
      ownSite: "https://fiksi.example/",
      sources: ["a", "b", "c"].map((x) => ({
        prompt_id: "q1",
        url: `https://${x}.example/`,
      })),
      fetcher: stopping,
    });
    expect(read.pages.map((p) => p.url)).toEqual([
      "https://fiksi.example/",
      "https://a.example/",
    ]);
    expect(read.unread).toEqual(["https://b.example/", "https://c.example/"]);
    expect(read.stopped).toBe(402);
  });

  it("reads two at a time and keeps the pages in order of importance", async () => {
    let open = 0;
    let most = 0;
    const slow: PageFetcher = {
      map: async () => [],
      scrape: async (url) => {
        open += 1;
        most = Math.max(most, open);
        // The first page is the slowest: it still comes first.
        await new Promise((r) => setTimeout(r, url.includes("fiksi") ? 20 : 1));
        open -= 1;
        return { title: "", markdown: url };
      },
    };
    const read = await readPagesForReport({
      ownSite: "https://fiksi.example/",
      sources: ["a", "b", "c"].map((x) => ({
        prompt_id: "q1",
        url: `https://${x}.example/`,
      })),
      fetcher: slow,
      concurrency: 2,
    });
    expect(most).toBe(2);
    expect(read.pages.map((p) => p.url)).toEqual([
      "https://fiksi.example/",
      "https://a.example/",
      "https://b.example/",
      "https://c.example/",
    ]);
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

  it("a bad key, no credits or too many requests stops the reading", async () => {
    for (const status of [401, 402, 429]) {
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
      expect(
        await readPagesForReport({
          ownSite: "https://x.example/",
          sources: [{ prompt_id: "q1", url: "https://a.example/" }],
          fetcher,
        }),
      ).toEqual({
        pages: [],
        unread: ["https://x.example/", "https://a.example/"],
        stopped: status,
      });
    }
  });

  it("a 403 or an outage is one unread page, not the end of the reading", async () => {
    for (const status of [403, 500, 503]) {
      const fetcher = firecrawlFetcher(
        "k",
        vi.fn(async () => new Response("{}", { status })),
      );
      expect(await fetcher.scrape("https://x.example/")).toBeNull();
      expect(await fetcher.map("https://x.example/")).toEqual([]);
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

describe("the reading's limits", () => {
  it("a wait never runs past the deadline: the page is unread", async () => {
    const deadline = new AbortController();
    const fetchImpl = vi.fn(
      async () =>
        new Response("{}", { status: 429, headers: { "retry-after": "60" } }),
    );
    const patient = patientFetch(
      fetchImpl,
      (_ms, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(signal.reason));
          deadline.abort(new Error("deadline"));
        }),
      deadline.signal,
    );
    const fetcher = firecrawlFetcher("k", patient, deadline.signal);
    expect(await fetcher.scrape("https://x.example/")).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("each retry keeps the deadline with a fresh request time limit", async () => {
    const deadline = new AbortController();
    const signals: AbortSignal[] = [];
    const answers = [429, 200];
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      signals.push(init!.signal!);
      return new Response("{}", { status: answers.shift()! });
    }) as typeof fetch;
    await patientFetch(
      fetchImpl,
      async () => {},
      deadline.signal,
    )("https://api.firecrawl.dev/v2/scrape", {
      signal: AbortSignal.timeout(90_000),
    });
    expect(signals[1]).not.toBe(signals[0]);
    expect(signals[1]!.aborted).toBe(false);
    deadline.abort();
    expect(signals[1]!.aborted).toBe(true);
  });

  it("at most the capped number of requests, retries included", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 429 }));
    const capped = cappedFetch(fetchImpl, 5);
    const patient = patientFetch(capped, async () => {});
    const fetcher = firecrawlFetcher("k", patient);
    // Four tries on the first page (three waits), one on the next, then none.
    await expect(fetcher.scrape("https://x.example/")).rejects.toThrow(
      FirecrawlUnavailable,
    );
    await expect(fetcher.scrape("https://y.example/")).resolves.toBeNull();
    expect(await fetcher.scrape("https://z.example/")).toBeNull();
    expect(capped.sent()).toBe(5);
  });
});
