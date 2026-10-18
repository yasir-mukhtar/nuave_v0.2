import { SafeSourceFetchError } from "./safe-source-fetch";

// A slow site can time out once and answer on the next press (seen live,
// 2026-10-18). Only these two codes are transient: the error carries no HTTP
// status, so HTTP_ERROR (a 404 looks the same as a 503) is never retried.
const TRANSIENT_SOURCE_CODES = new Set(["TIMEOUT", "FETCH_FAILED"]);
const SOURCE_RETRY_PAUSE_MS = 500;

// One automatic extra read before the customer sees "unavailable". The caller
// passes the whole safe read, so every attempt runs the full safe fetch,
// including the destination rate limiter. Only used before any AI call, so a
// retry costs no provider spend.
export async function retryTransientSourceRead<T>(
  read: () => Promise<T>,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (
      !(error instanceof SafeSourceFetchError) ||
      !TRANSIENT_SOURCE_CODES.has(error.code)
    )
      throw error;
    await new Promise((resolve) => setTimeout(resolve, SOURCE_RETRY_PAUSE_MS));
    return read();
  }
}
