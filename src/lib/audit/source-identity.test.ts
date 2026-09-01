import { describe, expect, it, vi } from "vitest";
import { parseSourceMetadata, fetchSourceIdentity } from "./source-identity";

function publicDns() {
  return {
    resolve4: vi
      .fn<(hostname: string) => Promise<readonly string[]>>()
      .mockResolvedValue(["93.184.216.34"]),
    resolve6: vi
      .fn<(hostname: string) => Promise<readonly string[]>>()
      .mockRejectedValue({ code: "ENODATA" }),
  };
}

function identityOptions(
  fetchImpl: typeof fetch,
  destinationRateLimiter = { limit: vi.fn(async () => ({ success: true })) },
) {
  return {
    destinationRateLimiter,
    fetchImpl,
    dns: publicDns(),
    timeoutSignal: vi.fn(() => new AbortController().signal),
  };
}

describe("source identity metadata", () => {
  it("uses website metadata precedence and inlines the declared icon", async () => {
    const pageUrl = "https://business.example/about";
    const iconUrl = "https://business.example/brand.png";
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          `<!doctype html><head>
            <meta property="og:site_name" content="Kopi &amp; Taman" />
            <meta property="og:title" content="Fallback title" />
            <meta property="og:description" content="Coffee &amp; food" />
            <meta name="description" content="Fallback description" />
            <link rel="icon" href="/brand.png" />
            <title>Document title</title>
          </head>`,
          { headers: { "content-type": "text/html; charset=utf-8" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "image/png" },
        }),
      );
    const destinationRateLimiter = {
      limit: vi.fn(async () => ({ success: true })),
    };

    const identity = await fetchSourceIdentity(
      {
        sourceType: "website",
        normalizedUrl: pageUrl,
      },
      {
        ...identityOptions(fetchImpl, destinationRateLimiter),
      },
    );

    expect(identity).toEqual({
      display_name: "Kopi & Taman",
      description: "Coffee & food",
      canonical_url: pageUrl,
      icon_data_url: "data:image/png;base64,AQID",
      source_type: "website",
      confidence: true,
    });
    expect(Object.keys(identity).sort()).toEqual([
      "canonical_url",
      "confidence",
      "description",
      "display_name",
      "icon_data_url",
      "source_type",
    ]);
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      pageUrl,
      iconUrl,
    ]);
    expect(destinationRateLimiter.limit.mock.calls).toEqual([
      [{ key: "business.example" }],
      [{ key: "business.example" }],
    ]);
  });

  it("falls back through website title and description metadata", () => {
    const metadata = parseSourceMetadata(
      `<head>
        <meta property="og:site_name" content="  " />
        <meta property="og:title" content="  " />
        <meta name="description" content="Meta description" />
        <title>  Document &amp; title  </title>
      </head>`,
      "website",
    );

    expect(metadata).toEqual({
      displayName: "Document & title",
      description: "Meta description",
      iconHref: null,
    });
  });

  it("uses Instagram og:title before the handle and never uses its description metadata", () => {
    const metadata = parseSourceMetadata(
      `<head>
        <meta property="og:site_name" content="Instagram" />
        <meta property="og:title" content="Kopi Taman Senja (@kopitamansenja)" />
        <meta property="og:description" content="12K followers · 48 posts" />
        <meta name="description" content="Wrong description" />
        <meta property="og:image" content="https://cdn.example/profile.jpg" />
        <title>Instagram</title>
      </head>`,
      "instagram",
    );

    expect(metadata).toEqual({
      displayName: "Kopi Taman Senja",
      description: "",
      iconHref: null,
    });
  });

  it("does not send Instagram og:image to the browser and may inline a safe favicon", async () => {
    const profileUrl = "https://instagram.com/kopitamansenja";
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          `<head>
            <meta property="og:title" content="Kopi Taman Senja (@kopitamansenja)" />
            <meta property="og:image" content="https://cdn.example/expired.jpg" />
          </head>`,
          { headers: { "content-type": "text/html" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([9, 8]), {
          headers: { "content-type": "image/x-icon" },
        }),
      );

    const identity = await fetchSourceIdentity(
      { sourceType: "instagram", normalizedUrl: profileUrl },
      identityOptions(fetchImpl),
    );

    expect(identity).toMatchObject({
      display_name: "Kopi Taman Senja",
      description: "",
      canonical_url: profileUrl,
      source_type: "instagram",
      confidence: true,
      icon_data_url: "data:image/x-icon;base64,CQg=",
    });
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      profileUrl,
      "https://instagram.com/favicon.ico",
    ]);
    expect(
      fetchImpl.mock.calls.some(([url]) => String(url).includes("cdn.example")),
    ).toBe(false);
  });

  it("returns an unconfident identity when no name metadata is available", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          '<head><meta name=description content="Public page"></head>',
          {
            headers: { "content-type": "text/html" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response("not an image", {
          headers: { "content-type": "text/plain" },
        }),
      );

    const identity = await fetchSourceIdentity(
      { sourceType: "website", normalizedUrl: "https://empty.example/" },
      identityOptions(fetchImpl),
    );

    expect(identity).toMatchObject({
      display_name: "",
      description: "Public page",
      confidence: false,
      icon_data_url: null,
    });
  });

  it("ends the identity attempt when the icon destination limiter refuses", async () => {
    const destinationRateLimiter = {
      limit: vi
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false }),
    };
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          `<head><title>Business</title><link rel="icon" href="/icon.png"></head>`,
          { headers: { "content-type": "text/html" } },
        ),
      );

    await expect(
      fetchSourceIdentity(
        { sourceType: "website", normalizedUrl: "https://business.example/" },
        identityOptions(fetchImpl, destinationRateLimiter),
      ),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(destinationRateLimiter.limit).toHaveBeenCalledTimes(2);
  });

  it("returns unavailable protection when the destination limiter throws", async () => {
    const destinationRateLimiter = {
      limit: vi.fn().mockRejectedValue(new Error("binding unavailable")),
    };
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(
      fetchSourceIdentity(
        { sourceType: "website", normalizedUrl: "https://business.example/" },
        identityOptions(fetchImpl, destinationRateLimiter),
      ),
    ).rejects.toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(destinationRateLimiter.limit).toHaveBeenCalledTimes(1);
  });
});
