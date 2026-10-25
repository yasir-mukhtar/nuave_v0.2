/**
 * Spec 018 R-22: taking orders needs DataForSEO. Payment start reads the free
 * `/v3/appendix/user_data` and refuses a new payment when the credentials are
 * missing or rejected, or the balance is below USD 2.00. The answer is cached
 * for 10 minutes, so a busy page does not ask on every press.
 */
import { dataForSeoCredentialsPresent } from "../discovery/dataforseo";

export const MIN_DATAFORSEO_BALANCE_USD = 2;
export const DATAFORSEO_BALANCE_CACHE_MS = 10 * 60 * 1000;
const USER_DATA_TIMEOUT_MS = 10_000;

export type DataForSeoAvailability =
  | { ok: true; balanceUsd: number | null }
  | {
      ok: false;
      reason: "credentials" | "rejected" | "balance" | "unreachable";
      statusCode: number | null;
      balanceUsd: number | null;
    };

let cached: { at: number; value: DataForSeoAvailability } | null = null;

/** Tests start from an empty cache. */
export function resetDataForSeoAvailabilityCache(): void {
  cached = null;
}

/** The balance in USD from a user_data answer, or null. */
export function readUserDataBalance(json: unknown): {
  statusCode: number | null;
  balanceUsd: number | null;
} {
  const top = json as {
    status_code?: unknown;
    tasks?: {
      status_code?: unknown;
      result?: { money?: { balance?: unknown } }[];
    }[];
  } | null;
  const task = Array.isArray(top?.tasks) ? top.tasks[0] : undefined;
  const statusCode =
    typeof task?.status_code === "number"
      ? task.status_code
      : typeof top?.status_code === "number"
        ? top.status_code
        : null;
  const balance = Array.isArray(task?.result)
    ? task.result[0]?.money?.balance
    : undefined;
  return {
    statusCode,
    balanceUsd: typeof balance === "number" ? balance : null,
  };
}

export async function dataForSeoAvailability(input: {
  now: Date;
  fetchImpl?: typeof fetch;
}): Promise<DataForSeoAvailability> {
  const at = input.now.getTime();
  if (cached && at - cached.at < DATAFORSEO_BALANCE_CACHE_MS)
    return cached.value;
  if (!dataForSeoCredentialsPresent()) {
    const value: DataForSeoAvailability = {
      ok: false,
      reason: "credentials",
      statusCode: null,
      balanceUsd: null,
    };
    cached = { at, value };
    return value;
  }
  const base =
    process.env.DATAFORSEO_BASE_URL?.trim() || "https://api.dataforseo.com/v3";
  let value: DataForSeoAvailability;
  try {
    const response = await (input.fetchImpl ?? fetch)(
      `${base}/appendix/user_data`,
      {
        method: "GET",
        headers: {
          authorization: `Basic ${btoa(`${process.env.DATAFORSEO_LOGIN ?? ""}:${process.env.DATAFORSEO_PASSWORD ?? ""}`)}`,
        },
        signal: AbortSignal.timeout(USER_DATA_TIMEOUT_MS),
        redirect: "manual",
      },
    );
    const read = readUserDataBalance(await response.json().catch(() => null));
    if (
      response.status === 401 ||
      response.status === 403 ||
      (read.statusCode !== null && read.statusCode !== 20000)
    ) {
      value = { ok: false, reason: "rejected", ...read };
    } else if (
      read.balanceUsd === null ||
      read.balanceUsd < MIN_DATAFORSEO_BALANCE_USD
    ) {
      value = { ok: false, reason: "balance", ...read };
    } else {
      value = { ok: true, balanceUsd: read.balanceUsd };
    }
  } catch {
    // Not cached: the next press asks again.
    return {
      ok: false,
      reason: "unreachable",
      statusCode: null,
      balanceUsd: null,
    };
  }
  cached = { at, value };
  return value;
}
