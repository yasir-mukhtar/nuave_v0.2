import { Buffer } from "node:buffer";
import { promises as dns } from "node:dns";

export const MAX_SOURCE_RESPONSE_BYTES = 512 * 1024;
export const MAX_SOURCE_REDIRECT_HOPS = 3;
export const SOURCE_REQUEST_TIMEOUT_MS = 5_000;
export const SOURCE_TOTAL_TIMEOUT_MS = 10_000;

export type SourceResourceKind = "html" | "image";

export interface SourceDestinationRateLimiter {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

export interface SourceDnsResolvers {
  resolve4(hostname: string): Promise<readonly string[]>;
  resolve6(hostname: string): Promise<readonly string[]>;
}

export interface SafeFetchOptions {
  kind: SourceResourceKind;
  destinationRateLimiter: SourceDestinationRateLimiter;
  fetchImpl?: typeof fetch;
  dns?: SourceDnsResolvers;
  now?: () => number;
  timeoutSignal?: (milliseconds: number) => AbortSignal;
}

export interface SafeFetchedResource {
  bytes: Uint8Array;
  contentType: string;
  url: string;
}

export type SafeSourceFetchErrorCode =
  | "UNSUPPORTED_PROTOCOL"
  | "INVALID_URL"
  | "CREDENTIALS_NOT_ALLOWED"
  | "RESERVED_ADDRESS"
  | "DNS_FAILURE"
  | "DNS_NO_ANSWERS"
  | "RATE_LIMIT_UNAVAILABLE"
  | "RATE_LIMITED"
  | "FETCH_FAILED"
  | "TIMEOUT"
  | "REDIRECT_LIMIT"
  | "INVALID_REDIRECT"
  | "CONTENT_TYPE_NOT_ALLOWED"
  | "RESPONSE_TOO_LARGE"
  | "EMPTY_RESPONSE";

export class SafeSourceFetchError extends Error {
  constructor(
    public readonly code: SafeSourceFetchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SafeSourceFetchError";
  }
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const HTML_CONTENT_TYPES = new Set(["text/html", "application/xhtml+xml"]);

const defaultDns: SourceDnsResolvers = {
  resolve4: (hostname) => dns.resolve4(hostname),
  resolve6: (hostname) => dns.resolve6(hostname),
};

const IPV4_RESERVED_RANGES = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.31.196.0", 24],
  ["192.52.193.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["192.175.48.0", 24],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const;

const IPV6_RESERVED_RANGES = [
  ["::", 128],
  ["::", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3ffe::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasDnsNoAnswersCode(error: unknown): boolean {
  return (
    isRecord(error) && (error.code === "ENODATA" || error.code === "ENOTFOUND")
  );
}

function normalizeHostname(hostname: string): string {
  return hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
}

function parseIpv4(value: string): number | null {
  const octets = value.split(".");
  if (octets.length !== 4 || octets.some((octet) => !/^\d{1,3}$/.test(octet))) {
    return null;
  }

  const numbers = octets.map(Number);
  if (numbers.some((octet) => octet > 255)) return null;

  return (
    (((numbers[0] << 24) >>> 0) |
      (numbers[1] << 16) |
      (numbers[2] << 8) |
      numbers[3]) >>>
    0
  );
}

function parseIpv6(value: string): number[] | null {
  const normalized = value.toLowerCase();
  if (normalized.includes("%")) return null;

  const sections = normalized.split("::");
  if (sections.length > 2) return null;

  const parseSection = (section: string): number[] | null => {
    if (!section) return [];
    const tokens = section.split(":");
    const groups: number[] = [];

    for (const token of tokens) {
      if (token.includes(".")) {
        const ipv4 = parseIpv4(token);
        if (ipv4 === null) return null;
        groups.push((ipv4 >>> 16) & 0xffff, ipv4 & 0xffff);
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/i.test(token)) return null;
      groups.push(Number.parseInt(token, 16));
    }

    return groups;
  };

  const left = parseSection(sections[0]);
  const right = parseSection(sections[1] ?? "");
  if (!left || !right) return null;

  if (sections.length === 1) {
    return left.length === 8 ? left : null;
  }

  const missing = 8 - left.length - right.length;
  if (missing < 1) return null;
  return [...left, ...Array.from({ length: missing }, () => 0), ...right];
}

type ParsedIp = { family: 4; value: number } | { family: 6; groups: number[] };

function parseIp(value: string): ParsedIp | null {
  const ipv4 = parseIpv4(value);
  if (ipv4 !== null) return { family: 4, value: ipv4 };

  const ipv6 = parseIpv6(value);
  return ipv6 ? { family: 6, groups: ipv6 } : null;
}

function ipv4InCidr(
  value: number,
  base: string,
  prefixLength: number,
): boolean {
  const parsedBase = parseIpv4(base);
  if (parsedBase === null) return false;
  if (prefixLength === 0) return true;

  const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
  return (value & mask) === (parsedBase & mask);
}

function ipv6InCidr(
  groups: number[],
  base: string,
  prefixLength: number,
): boolean {
  const parsedBase = parseIpv6(base);
  if (!parsedBase) return false;

  const completeGroups = Math.floor(prefixLength / 16);
  for (let index = 0; index < completeGroups; index += 1) {
    if (groups[index] !== parsedBase[index]) return false;
  }

  const remainingBits = prefixLength % 16;
  if (remainingBits === 0) return true;

  const mask = (0xffff << (16 - remainingBits)) & 0xffff;
  return (
    (groups[completeGroups] & mask) === (parsedBase[completeGroups] & mask)
  );
}

function mappedIpv4(groups: number[]): number | null {
  const isMapped =
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0xffff;
  if (!isMapped) return null;
  return ((groups[6] << 16) | groups[7]) >>> 0;
}

export function isReservedAddress(value: string): boolean {
  const parsed = parseIp(value);
  if (!parsed) return true;

  if (parsed.family === 4) {
    return IPV4_RESERVED_RANGES.some(([base, prefixLength]) =>
      ipv4InCidr(parsed.value, base, prefixLength),
    );
  }

  const mapped = mappedIpv4(parsed.groups);
  if (mapped !== null) {
    return IPV4_RESERVED_RANGES.some(([base, prefixLength]) =>
      ipv4InCidr(mapped, base, prefixLength),
    );
  }

  return IPV6_RESERVED_RANGES.some(([base, prefixLength]) =>
    ipv6InCidr(parsed.groups, base, prefixLength),
  );
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

function parseHttpUrl(input: string | URL): URL {
  let parsed: URL;
  try {
    parsed = input instanceof URL ? new URL(input.toString()) : new URL(input);
  } catch {
    throw new SafeSourceFetchError("INVALID_URL", "The source URL is invalid.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SafeSourceFetchError(
      "UNSUPPORTED_PROTOCOL",
      "The source protocol is not allowed.",
    );
  }
  if (parsed.username || parsed.password) {
    throw new SafeSourceFetchError(
      "CREDENTIALS_NOT_ALLOWED",
      "Source credentials are not allowed.",
    );
  }
  if (!parsed.hostname) {
    throw new SafeSourceFetchError("INVALID_URL", "The source URL is invalid.");
  }

  return parsed;
}

async function resolveFamily(
  resolver: (hostname: string) => Promise<readonly string[]>,
  hostname: string,
): Promise<readonly string[]> {
  try {
    const answers = await resolver(hostname);
    if (!Array.isArray(answers)) {
      throw new Error("DNS resolver returned an invalid answer.");
    }
    return answers;
  } catch (error) {
    if (hasDnsNoAnswersCode(error)) return [];
    throw new SafeSourceFetchError(
      "DNS_FAILURE",
      "The source hostname could not be checked.",
    );
  }
}

async function validateDestination(
  url: URL,
  resolvers: SourceDnsResolvers,
): Promise<string> {
  const hostname = normalizeHostname(url.hostname);
  if (isLocalHostname(hostname)) {
    throw new SafeSourceFetchError(
      "RESERVED_ADDRESS",
      "The source hostname is not public.",
    );
  }

  const literalAddress = parseIp(hostname);
  if (literalAddress && isReservedAddress(hostname)) {
    throw new SafeSourceFetchError(
      "RESERVED_ADDRESS",
      "The source address is not public.",
    );
  }

  const [ipv4Answers, ipv6Answers] = await Promise.all([
    resolveFamily(resolvers.resolve4, hostname),
    resolveFamily(resolvers.resolve6, hostname),
  ]);
  const answers = [...ipv4Answers, ...ipv6Answers];
  if (answers.length === 0) {
    throw new SafeSourceFetchError(
      "DNS_NO_ANSWERS",
      "The source hostname has no public address.",
    );
  }

  for (const answer of answers) {
    if (typeof answer !== "string" || isReservedAddress(answer)) {
      throw new SafeSourceFetchError(
        "RESERVED_ADDRESS",
        "The source hostname resolves to a non-public address.",
      );
    }
  }

  return hostname;
}

function mediaType(contentType: string | null): string {
  return (contentType?.split(";", 1)[0] || "").trim().toLowerCase();
}

function allowedContentType(kind: SourceResourceKind, contentType: string) {
  return kind === "html"
    ? HTML_CONTENT_TYPES.has(contentType)
    : contentType.startsWith("image/");
}

async function cancelReader(reader: ReadableStreamDefaultReader<Uint8Array>) {
  try {
    await reader.cancel();
  } catch {
    // The request is already being rejected; cancellation is best effort.
  }
}

type DecodedChunkStopper = (chunk: Uint8Array) => number | null;

/**
 * Identity parsing only needs the document head. Stop after its closing tag so
 * a large page body cannot make a valid metadata response fail the 512 KiB
 * decoded-byte bound. The matcher carries state across stream chunks and only
 * accepts a real `</head>` tag, including ASCII case and whitespace variants.
 */
function createHtmlHeadStopper(): DecodedChunkStopper {
  const marker = [60, 47, 104, 101, 97, 100]; // </head
  let matched = 0;

  return (chunk) => {
    for (let index = 0; index < chunk.byteLength; index += 1) {
      const byte = chunk[index];
      const lowerByte = byte >= 65 && byte <= 90 ? byte + (97 - 65) : byte;

      if (matched < marker.length) {
        if (lowerByte === marker[matched]) {
          matched += 1;
        } else {
          matched = byte === 60 ? 1 : 0;
        }
        continue;
      }

      if (byte === 62) return index + 1; // >
      if (
        byte === 32 ||
        byte === 9 ||
        byte === 10 ||
        byte === 12 ||
        byte === 13
      ) {
        continue;
      }
      matched = byte === 60 ? 1 : 0;
    }

    return null;
  };
}

async function readDecodedBytes(
  body: ReadableStream<Uint8Array> | null,
  deadline: number,
  now: () => number,
  stopAt?: DecodedChunkStopper,
) {
  if (!body) {
    throw new SafeSourceFetchError(
      "EMPTY_RESPONSE",
      "The source response has no readable body.",
    );
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      if (now() >= deadline) {
        await cancelReader(reader);
        throw new SafeSourceFetchError(
          "TIMEOUT",
          "Membaca sumber membutuhkan waktu terlalu lama.",
        );
      }

      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await reader.read();
      } catch (error) {
        if (isAbortError(error)) {
          throw new SafeSourceFetchError(
            "TIMEOUT",
            "Membaca sumber membutuhkan waktu terlalu lama.",
          );
        }
        throw new SafeSourceFetchError(
          "FETCH_FAILED",
          "The source response body is invalid.",
        );
      }

      if (now() >= deadline) {
        await cancelReader(reader);
        throw new SafeSourceFetchError(
          "TIMEOUT",
          "Membaca sumber membutuhkan waktu terlalu lama.",
        );
      }
      const { done, value } = result;
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        throw new SafeSourceFetchError(
          "FETCH_FAILED",
          "The source response body is invalid.",
        );
      }

      const stopLength = stopAt?.(value);
      if (stopLength !== undefined && stopLength !== null) {
        total += stopLength;
        if (total > MAX_SOURCE_RESPONSE_BYTES) {
          await cancelReader(reader);
          throw new SafeSourceFetchError(
            "RESPONSE_TOO_LARGE",
            "The source response is too large.",
          );
        }
        chunks.push(value.slice(0, stopLength));
        await cancelReader(reader);
        break;
      }

      total += value.byteLength;
      if (total > MAX_SOURCE_RESPONSE_BYTES) {
        await cancelReader(reader);
        throw new SafeSourceFetchError(
          "RESPONSE_TOO_LARGE",
          "The source response is too large.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function isAbortError(error: unknown): boolean {
  return (
    isRecord(error) &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

async function consumeDestinationRateLimit(
  limiter: SourceDestinationRateLimiter,
  hostname: string,
): Promise<void> {
  if (!limiter || typeof limiter.limit !== "function") {
    throw new SafeSourceFetchError(
      "RATE_LIMIT_UNAVAILABLE",
      "Perlindungan akses sumber sedang tidak tersedia.",
    );
  }

  try {
    const result = await limiter.limit({ key: hostname });
    if (!result || result.success !== true) {
      throw new SafeSourceFetchError(
        "RATE_LIMITED",
        "Permintaan ke sumber ini terlalu sering.",
      );
    }
  } catch (error) {
    if (error instanceof SafeSourceFetchError) throw error;
    throw new SafeSourceFetchError(
      "RATE_LIMITED",
      "Permintaan ke sumber ini terlalu sering.",
    );
  }
}

export async function safeFetchPublicResource(
  input: string | URL,
  options: SafeFetchOptions,
): Promise<SafeFetchedResource> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new SafeSourceFetchError(
      "FETCH_FAILED",
      "Public source fetching is unavailable.",
    );
  }

  const resolvers = options.dns ?? defaultDns;
  const now = options.now ?? Date.now;
  const timeoutSignal =
    options.timeoutSignal ??
    ((milliseconds) => AbortSignal.timeout(milliseconds));
  const startedAt = now();
  let currentUrl = parseHttpUrl(input);
  let redirects = 0;

  while (true) {
    const elapsed = now() - startedAt;
    const remaining = SOURCE_TOTAL_TIMEOUT_MS - elapsed;
    if (remaining <= 0) {
      throw new SafeSourceFetchError(
        "TIMEOUT",
        "Membaca sumber membutuhkan waktu terlalu lama.",
      );
    }

    const hostname = await validateDestination(currentUrl, resolvers);
    const remainingAfterValidation =
      SOURCE_TOTAL_TIMEOUT_MS - (now() - startedAt);
    if (remainingAfterValidation <= 0) {
      throw new SafeSourceFetchError(
        "TIMEOUT",
        "Membaca sumber membutuhkan waktu terlalu lama.",
      );
    }

    // Keep this call directly before fetch: every submitted, redirect, and icon
    // destination gets its own hostname charge.
    await consumeDestinationRateLimit(options.destinationRateLimiter, hostname);

    const remainingBeforeFetch = SOURCE_TOTAL_TIMEOUT_MS - (now() - startedAt);
    if (remainingBeforeFetch <= 0) {
      throw new SafeSourceFetchError(
        "TIMEOUT",
        "Membaca sumber membutuhkan waktu terlalu lama.",
      );
    }
    const requestTimeout = Math.min(
      SOURCE_REQUEST_TIMEOUT_MS,
      remainingBeforeFetch,
    );

    let response: Response;
    try {
      response = await fetchImpl(currentUrl.toString(), {
        redirect: "manual",
        headers: {
          Accept:
            options.kind === "html"
              ? "text/html, application/xhtml+xml"
              : "image/*",
        },
        signal: timeoutSignal(requestTimeout),
      });
    } catch (error) {
      throw new SafeSourceFetchError(
        isAbortError(error) || now() - startedAt >= SOURCE_TOTAL_TIMEOUT_MS
          ? "TIMEOUT"
          : "FETCH_FAILED",
        isAbortError(error)
          ? "Membaca sumber membutuhkan waktu terlalu lama."
          : "Sumber publik tidak dapat dibaca.",
      );
    }

    if (now() - startedAt >= SOURCE_TOTAL_TIMEOUT_MS) {
      throw new SafeSourceFetchError(
        "TIMEOUT",
        "Membaca sumber membutuhkan waktu terlalu lama.",
      );
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      if (redirects >= MAX_SOURCE_REDIRECT_HOPS) {
        throw new SafeSourceFetchError(
          "REDIRECT_LIMIT",
          "Sumber memiliki terlalu banyak pengalihan.",
        );
      }

      const location = response.headers.get("location");
      if (!location) {
        throw new SafeSourceFetchError(
          "INVALID_REDIRECT",
          "Pengalihan sumber tidak valid.",
        );
      }

      let redirectUrl: URL;
      try {
        redirectUrl = new URL(location, currentUrl);
      } catch {
        throw new SafeSourceFetchError(
          "INVALID_REDIRECT",
          "Pengalihan sumber tidak valid.",
        );
      }
      currentUrl = parseHttpUrl(redirectUrl);
      redirects += 1;
      continue;
    }

    const contentType = mediaType(response.headers.get("content-type"));
    if (!allowedContentType(options.kind, contentType)) {
      throw new SafeSourceFetchError(
        "CONTENT_TYPE_NOT_ALLOWED",
        "Jenis konten sumber tidak didukung.",
      );
    }

    const bytes = await readDecodedBytes(
      response.body,
      startedAt + SOURCE_TOTAL_TIMEOUT_MS,
      now,
      options.kind === "html" ? createHtmlHeadStopper() : undefined,
    );
    return {
      bytes,
      contentType,
      url: currentUrl.toString(),
    };
  }
}

export function bytesToDataUrl(bytes: Uint8Array, contentType: string): string {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}
