import { describe, expect, it, vi } from "vitest";
import {
  MAX_SOURCE_REDIRECT_HOPS,
  MAX_SOURCE_RESPONSE_BYTES,
  SOURCE_REQUEST_TIMEOUT_MS,
  SOURCE_TOTAL_TIMEOUT_MS,
  SafeSourceFetchError,
  isReservedAddress,
  safeFetchPublicResource,
} from "./safe-source-fetch";

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

function limiter(success = true) {
  return {
    limit: vi.fn(async () => ({ success })),
  };
}

function htmlResponse(
  body = "<html><head><title>Example</title></head></html>",
  status = 200,
  headers: HeadersInit = { "content-type": "text/html; charset=utf-8" },
) {
  return new Response(body, { status, headers });
}

function safeFetchOptions(
  overrides: Partial<Parameters<typeof safeFetchPublicResource>[1]> = {},
) {
  return {
    kind: "html" as const,
    dns: publicDns(),
    destinationRateLimiter: limiter(),
    fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(htmlResponse()),
    timeoutSignal: vi.fn(() => new AbortController().signal),
    ...overrides,
  };
}

describe("safe public source fetch DNS preflight", () => {
  it("rejects a public A answer when any AAAA answer is private", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const resolve4 = vi
      .fn<(hostname: string) => Promise<string[]>>()
      .mockResolvedValue(["93.184.216.34"]);
    const resolve6 = vi
      .fn<(hostname: string) => Promise<string[]>>()
      .mockResolvedValue(["fd00::1"]);

    await expect(
      safeFetchPublicResource("https://mixed-family.example", {
        kind: "html",
        fetchImpl,
        dns: { resolve4, resolve6 },
        destinationRateLimiter: limiter(),
      }),
    ).rejects.toMatchObject({ code: "RESERVED_ADDRESS" });

    expect(resolve4).toHaveBeenCalledWith("mixed-family.example");
    expect(resolve6).toHaveBeenCalledWith("mixed-family.example");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a private A answer when any AAAA answer is public", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const resolve4 = vi
      .fn<(hostname: string) => Promise<string[]>>()
      .mockResolvedValue(["192.168.1.20"]);
    const resolve6 = vi
      .fn<(hostname: string) => Promise<string[]>>()
      .mockResolvedValue(["2001:4860:4860::8888"]);

    await expect(
      safeFetchPublicResource("https://mixed-family.example", {
        kind: "html",
        fetchImpl,
        dns: { resolve4, resolve6 },
        destinationRateLimiter: limiter(),
      }),
    ).rejects.toMatchObject({ code: "RESERVED_ADDRESS" });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(["ENODATA", "ENOTFOUND"])(
    "allows a valid IPv4-only host when resolve6 reports %s",
    async (code) => {
      const dns = publicDns();
      dns.resolve6.mockRejectedValue({ code });
      const options = safeFetchOptions({ dns });
      const result = await safeFetchPublicResource(
        "https://ipv4-only.example",
        options,
      );

      expect(result.contentType).toBe("text/html");
      expect(new TextDecoder().decode(result.bytes)).toContain("Example");
      expect(options.dns?.resolve4).toHaveBeenCalledWith("ipv4-only.example");
      expect(options.dns?.resolve6).toHaveBeenCalledWith("ipv4-only.example");
      expect(options.fetchImpl).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["ENODATA", "ENOTFOUND"])(
    "rejects when both DNS families report no answers: %s",
    async (code) => {
      const options = safeFetchOptions({
        dns: {
          resolve4: vi.fn().mockRejectedValue({ code }),
          resolve6: vi.fn().mockRejectedValue({ code }),
        },
      });

      await expect(
        safeFetchPublicResource("https://no-address.example", options),
      ).rejects.toMatchObject({ code: "DNS_NO_ANSWERS" });
      expect(options.fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("rejects an unexpected DNS failure rather than treating it as no answers", async () => {
    const options = safeFetchOptions({
      dns: {
        resolve4: vi.fn().mockRejectedValue({ code: "EAI_AGAIN" }),
        resolve6: vi.fn().mockResolvedValue(["2001:4860:4860::8888"]),
      },
    });

    await expect(
      safeFetchPublicResource("https://dns-failure.example", options),
    ).rejects.toMatchObject({ code: "DNS_FAILURE" });
    expect(options.fetchImpl).not.toHaveBeenCalled();
  });

  it("bounds a hanging DNS preflight by the remaining total deadline", async () => {
    const options = safeFetchOptions({
      now: vi
        .fn()
        .mockReturnValueOnce(0)
        .mockReturnValue(SOURCE_TOTAL_TIMEOUT_MS - 1),
      dns: {
        resolve4: vi.fn(() => new Promise<readonly string[]>(() => {})),
        resolve6: vi.fn(() => new Promise<readonly string[]>(() => {})),
      },
    });

    const outcome = await Promise.race([
      safeFetchPublicResource("https://hanging-dns.example", options).then(
        () => ({ kind: "resolved" as const }),
        (error: unknown) => ({
          kind: "error" as const,
          code:
            error instanceof SafeSourceFetchError
              ? error.code
              : error instanceof Error
                ? error.message
                : String(error),
        }),
      ),
      new Promise<{ kind: "hung" }>((resolve) =>
        setTimeout(() => resolve({ kind: "hung" }), 50),
      ),
    ]);

    expect(outcome).toEqual({
      kind: "error",
      code: "TIMEOUT",
    });
    expect(options.fetchImpl).not.toHaveBeenCalled();
  });

  it("bounds a hanging destination limiter by the remaining total deadline", async () => {
    const options = safeFetchOptions({
      now: vi
        .fn()
        .mockReturnValueOnce(0)
        .mockReturnValue(SOURCE_TOTAL_TIMEOUT_MS - 1),
      destinationRateLimiter: {
        limit: vi.fn(() => new Promise<{ success: boolean }>(() => {})),
      },
    });

    const outcome = await Promise.race([
      safeFetchPublicResource("https://hanging-limiter.example", options).then(
        () => ({ kind: "resolved" as const }),
        (error: unknown) => ({
          kind: "error" as const,
          code:
            error instanceof SafeSourceFetchError
              ? error.code
              : error instanceof Error
                ? error.message
                : String(error),
        }),
      ),
      new Promise<{ kind: "hung" }>((resolve) =>
        setTimeout(() => resolve({ kind: "hung" }), 50),
      ),
    ]);

    expect(outcome).toEqual({
      kind: "error",
      code: "TIMEOUT",
    });
    expect(options.fetchImpl).not.toHaveBeenCalled();
  });
});

describe("safe public source reserved-address policy", () => {
  it.each([
    "0.0.0.1",
    "10.1.2.3",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.0.0.9",
    "192.0.2.1",
    "192.31.196.1",
    "192.52.193.1",
    "192.88.99.1",
    "192.168.1.1",
    "192.175.48.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "240.0.0.1",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:192.168.1.1",
    "64:ff9b::0808:0808",
    "64:ff9b:1::1",
    "100::1",
    "2001::1",
    "2001:db8::1",
    "2002::1",
    "3ffe::1",
    "fc00::1",
    "fe80::1",
    "fec0::1",
    "ff00::1",
  ])("classifies reserved address %s as disallowed", (address) => {
    expect(isReservedAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "93.184.216.34", "2001:4860:4860::8888"])(
    "allows public address %s",
    (address) => {
      expect(isReservedAddress(address)).toBe(false);
    },
  );

  it("rejects every address returned by DNS when one answer is reserved", async () => {
    const options = safeFetchOptions({
      dns: {
        resolve4: vi.fn().mockResolvedValue(["93.184.216.34", "10.0.0.1"]),
        resolve6: vi.fn().mockRejectedValue({ code: "ENODATA" }),
      },
    });

    await expect(
      safeFetchPublicResource("https://mixed-answers.example", options),
    ).rejects.toMatchObject({ code: "RESERVED_ADDRESS" });
    expect(options.fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects localhost names before DNS lookup", async () => {
    const options = safeFetchOptions();

    await expect(
      safeFetchPublicResource("https://service.localhost", options),
    ).rejects.toMatchObject({ code: "RESERVED_ADDRESS" });
    expect(options.dns?.resolve4).not.toHaveBeenCalled();
    expect(options.dns?.resolve6).not.toHaveBeenCalled();
    expect(options.fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects unsupported protocols before DNS lookup", async () => {
    const options = safeFetchOptions();

    await expect(
      safeFetchPublicResource("ftp://public.example/file", options),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_PROTOCOL" });
    expect(options.dns?.resolve4).not.toHaveBeenCalled();
    expect(options.dns?.resolve6).not.toHaveBeenCalled();
    expect(options.fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects URL credentials before DNS lookup", async () => {
    const options = safeFetchOptions();

    await expect(
      safeFetchPublicResource("https://user:secret@public.example", options),
    ).rejects.toMatchObject({ code: "CREDENTIALS_NOT_ALLOWED" });
    expect(options.dns?.resolve4).not.toHaveBeenCalled();
    expect(options.fetchImpl).not.toHaveBeenCalled();
  });
});

describe("safe public source redirects and destination limiting", () => {
  it("uses manual redirects and charges each actual destination hostname", async () => {
    const options = safeFetchOptions();
    const destinationLimiter = limiter();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://second.example/" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 307,
          headers: { location: "https://third.example/" },
        }),
      )
      .mockResolvedValueOnce(htmlResponse("<title>Done</title>"));

    const result = await safeFetchPublicResource("https://first.example/", {
      ...options,
      fetchImpl,
      destinationRateLimiter: destinationLimiter,
    });

    expect(result.url).toBe("https://third.example/");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      "https://first.example/",
      "https://second.example/",
      "https://third.example/",
    ]);
    expect(fetchImpl.mock.calls.map(([, init]) => init?.redirect)).toEqual([
      "manual",
      "manual",
      "manual",
    ]);
    expect(destinationLimiter.limit.mock.calls).toEqual([
      [{ key: "first.example" }],
      [{ key: "second.example" }],
      [{ key: "third.example" }],
    ]);
  });

  it("revalidates a redirect destination before following it", async () => {
    const options = safeFetchOptions({
      dns: {
        resolve4: vi
          .fn()
          .mockResolvedValueOnce(["93.184.216.34"])
          .mockResolvedValueOnce(["10.0.0.1"]),
        resolve6: vi.fn().mockRejectedValue({ code: "ENODATA" }),
      },
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "https://private-target.example/" },
        }),
      ),
    });

    await expect(
      safeFetchPublicResource("https://first.example/", options),
    ).rejects.toMatchObject({ code: "RESERVED_ADDRESS" });
    expect(options.fetchImpl).toHaveBeenCalledTimes(1);
    expect(options.destinationRateLimiter?.limit).toHaveBeenCalledTimes(1);
  });

  it("allows at most three redirect hops and rejects hop four", async () => {
    const options = safeFetchOptions();
    const fetchImpl = vi.fn<typeof fetch>();
    for (let index = 0; index <= MAX_SOURCE_REDIRECT_HOPS; index += 1) {
      fetchImpl.mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            location: `https://hop-${index + 1}.example/`,
          },
        }),
      );
    }

    await expect(
      safeFetchPublicResource("https://hop-0.example/", {
        ...options,
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "REDIRECT_LIMIT" });
    expect(fetchImpl).toHaveBeenCalledTimes(MAX_SOURCE_REDIRECT_HOPS + 1);
  });

  it("does not follow a redirect containing credentials", async () => {
    const options = safeFetchOptions({
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "https://user:secret@next.example/" },
        }),
      ),
    });

    await expect(
      safeFetchPublicResource("https://first.example/", options),
    ).rejects.toMatchObject({ code: "CREDENTIALS_NOT_ALLOWED" });
    expect(options.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("ends the attempt when the destination limiter refuses", async () => {
    const options = safeFetchOptions({
      destinationRateLimiter: limiter(false),
    });

    await expect(
      safeFetchPublicResource("https://limited.example/", options),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(options.fetchImpl).not.toHaveBeenCalled();
  });

  it("maps a limiter runtime error to an unavailable rate-limit failure", async () => {
    const options = safeFetchOptions({
      destinationRateLimiter: {
        limit: vi.fn().mockRejectedValue(new Error("internal binding detail")),
      },
    });

    await expect(
      safeFetchPublicResource("https://limited.example/", options),
    ).rejects.toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE" });
    expect(options.fetchImpl).not.toHaveBeenCalled();
  });

  it("maps a malformed limiter result to an unavailable rate-limit failure", async () => {
    const options = safeFetchOptions({
      destinationRateLimiter: {
        limit: vi.fn().mockResolvedValue({}),
      },
    });

    await expect(
      safeFetchPublicResource("https://limited.example/", options),
    ).rejects.toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE" });
    expect(options.fetchImpl).not.toHaveBeenCalled();
  });
});

describe("safe public source response bounds", () => {
  it.each([
    [403, "403 Forbidden"],
    [404, "404 Not Found"],
  ])(
    "rejects an unsuccessful HTML response before reading its error page: %s",
    async (status, title) => {
      const options = safeFetchOptions({
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
          new Response(`<html><head><title>${title}</title></head></html>`, {
            status,
            headers: { "content-type": "text/html" },
          }),
        ),
      });

      await expect(
        safeFetchPublicResource("https://error-page.example/", options),
      ).rejects.toMatchObject({ code: "HTTP_ERROR" });
      expect(options.fetchImpl).toHaveBeenCalledTimes(1);
    },
  );

  it("passes only non-credentialed headers to fetch", async () => {
    const options = safeFetchOptions();

    await safeFetchPublicResource("https://headers.example/", options);

    const fetchMock = options.fetchImpl as typeof options.fetchImpl & {
      mock: { calls: Array<[unknown, RequestInit?]> };
    };
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.redirect).toBe("manual");
    const headers = new Headers(init?.headers);
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("proxy-authorization")).toBeNull();
    expect(headers.get("accept")).toBe("text/html, application/xhtml+xml");
  });

  it("uses a five-second request signal and enforces the ten-second total budget", async () => {
    expect(SOURCE_REQUEST_TIMEOUT_MS).toBe(5_000);
    expect(SOURCE_TOTAL_TIMEOUT_MS).toBe(10_000);

    const timeoutSignal = vi.fn(() => new AbortController().signal);
    const options = safeFetchOptions({ timeoutSignal });
    await safeFetchPublicResource("https://timeout.example/", options);
    expect(timeoutSignal).toHaveBeenCalledWith(SOURCE_REQUEST_TIMEOUT_MS);

    const now = vi
      .fn()
      .mockReturnValueOnce(0)
      .mockReturnValue(SOURCE_TOTAL_TIMEOUT_MS + 1);
    const expired = safeFetchOptions({ now });
    await expect(
      safeFetchPublicResource("https://expired.example/", expired),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(expired.fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a non-HTML response before reading its body", async () => {
    const getReader = vi.fn();
    const response = {
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: { getReader },
    } as unknown as Response;
    const options = safeFetchOptions({
      fetchImpl: vi.fn().mockResolvedValue(response),
    });

    await expect(
      safeFetchPublicResource("https://json.example/", options),
    ).rejects.toMatchObject({ code: "CONTENT_TYPE_NOT_ALLOWED" });
    expect(getReader).not.toHaveBeenCalled();
  });

  it("accepts the other approved HTML media type", async () => {
    const options = safeFetchOptions({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
        htmlResponse("<html></html>", 200, {
          "content-type": "application/xhtml+xml; charset=utf-8",
        }),
      ),
    });

    const result = await safeFetchPublicResource(
      "https://xhtml.example/",
      options,
    );
    expect(result.contentType).toBe("application/xhtml+xml");
  });

  it("allows exactly 512 KiB of decoded response bytes", async () => {
    const body = new Uint8Array(MAX_SOURCE_RESPONSE_BYTES);
    const options = safeFetchOptions({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(body, {
          headers: { "content-type": "text/html" },
        }),
      ),
    });

    const result = await safeFetchPublicResource(
      "https://size.example/",
      options,
    );
    expect(result.bytes.byteLength).toBe(MAX_SOURCE_RESPONSE_BYTES);
  });

  it("rejects as soon as streamed decoded bytes exceed 512 KiB", async () => {
    const cancel = vi.fn(async () => undefined);
    const releaseLock = vi.fn();
    const read = vi.fn().mockResolvedValue({
      done: false,
      value: new Uint8Array(MAX_SOURCE_RESPONSE_BYTES + 1),
    });
    const response = {
      status: 200,
      headers: new Headers({ "content-type": "text/html" }),
      body: { getReader: () => ({ read, cancel, releaseLock }) },
    } as unknown as Response;
    const options = safeFetchOptions({
      fetchImpl: vi.fn().mockResolvedValue(response),
    });

    await expect(
      safeFetchPublicResource("https://too-large.example/", options),
    ).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("stops an HTML response after </head> before the 512 KiB body cap", async () => {
    const head = "<!doctype html><head><title>Instagram</title></head>";
    const body = `${head}${"x".repeat(MAX_SOURCE_RESPONSE_BYTES + 1)}`;
    const options = safeFetchOptions({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(body, {
          headers: { "content-type": "text/html" },
        }),
      ),
    });

    const result = await safeFetchPublicResource(
      "https://instagram.example/",
      options,
    );

    expect(new TextDecoder().decode(result.bytes)).toBe(head);
    expect(result.bytes.byteLength).toBe(head.length);
  });

  it("uses image content types for icon fetches", async () => {
    const options = safeFetchOptions({
      kind: "image",
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "image/png" },
        }),
      ),
    });

    const result = await safeFetchPublicResource(
      "https://images.example/icon.png",
      options,
    );
    expect(result.contentType).toBe("image/png");
    expect([...result.bytes]).toEqual([1, 2, 3]);
  });
});
