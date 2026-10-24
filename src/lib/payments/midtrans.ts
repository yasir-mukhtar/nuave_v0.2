/**
 * Midtrans client (spec 017 R-05, R-08, R-09). Three calls only: create a Snap
 * transaction (redirect URL), Get Status, and the notification signature check.
 * `fetch` is injected so offline tests use a fake Midtrans. Every call has a
 * timeout. Nothing here logs, and no error carries a key, an email or a body.
 *
 * Addresses (R-09, docs.midtrans.com, read 2026-10-14): Snap
 * `app.sandbox.midtrans.com` (production `app.midtrans.com`); API
 * `api.sandbox.midtrans.com` (production `api.midtrans.com`).
 */

export type MidtransConfig = {
  serverKey: string;
  isProduction: boolean;
  /** Tests inject a fake; the default is the global `fetch` at call time. */
  fetch?: typeof fetch;
  /** Overrides the Get Status timeout (a caller with a time budget). */
  timeoutMs?: number;
};

export const SNAP_TIMEOUT_MS = 15_000;
export const STATUS_TIMEOUT_MS = 10_000;

/** R-05: the one price, in rupiah, and how Midtrans writes it back (R-09). */
export const ORDER_GROSS_AMOUNT = 249000;
export const ORDER_GROSS_AMOUNT_TEXT = "249000.00";
export const ORDER_CURRENCY = "IDR";
/** R-05 / Q3: one 60-minute window for every method. */
export const PAYMENT_WINDOW_MINUTES = 60;

const hosts = (isProduction: boolean) => ({
  snap: isProduction ? "app.midtrans.com" : "app.sandbox.midtrans.com",
  api: isProduction ? "api.midtrans.com" : "api.sandbox.midtrans.com",
});

/** R-09: Basic auth is the base64 of the server key followed by ":". */
export function basicAuth(serverKey: string): string {
  return `Basic ${btoa(`${serverKey}:`)}`;
}

/** The fields of a Get Status answer or a notification that Nuave reads. Midtrans
 * sends strings; anything else is treated as missing. */
export type MidtransStatus = {
  transaction_id: string;
  order_id: string;
  transaction_status: string;
  fraud_status: string | null;
  gross_amount: string | null;
  currency: string | null;
  payment_type: string | null;
};

export type StatusAnswer =
  | { kind: "found"; status: MidtransStatus }
  /** Midtrans answered "Transaction doesn't exist". */
  | { kind: "not_found" }
  /** Timeout, network error, wrong key, 5xx or an answer Nuave cannot read. */
  | { kind: "error" };

const text = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

/** R-14: Get Status by `transaction_id` or `order_id`. DANA answers only by
 * `transaction_id`. */
export async function getStatus(
  config: MidtransConfig,
  id: string,
): Promise<StatusAnswer> {
  const doFetch = config.fetch ?? fetch;
  try {
    const response = await doFetch(
      `https://${hosts(config.isProduction).api}/v2/${encodeURIComponent(id)}/status`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: basicAuth(config.serverKey),
        },
        signal: AbortSignal.timeout(config.timeoutMs ?? STATUS_TIMEOUT_MS),
      },
    );
    const body = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body || typeof body !== "object") return { kind: "error" };
    const statusWord = text(body.transaction_status);
    if (statusWord) {
      const transactionId = text(body.transaction_id);
      const orderId = text(body.order_id);
      if (!transactionId || !orderId) return { kind: "error" };
      return {
        kind: "found",
        status: {
          transaction_id: transactionId,
          order_id: orderId,
          transaction_status: statusWord,
          fraud_status: text(body.fraud_status),
          gross_amount: text(body.gross_amount),
          currency: text(body.currency),
          payment_type: text(body.payment_type),
        },
      };
    }
    // Midtrans says "not found" with HTTP 404 or with 200 and status_code 404.
    if (String(body.status_code) === "404") return { kind: "not_found" };
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}

export type SnapRequest = {
  orderId: string;
  email: string;
  /** The site origin: finish, GoPay and DANA return to `/audit` (R-05). */
  siteOrigin: string;
  now: Date;
};

const pad = (value: number) => String(value).padStart(2, "0");

/** Midtrans' `start_time`: `YYYY-MM-DD HH:MM:SS +0000`. */
export function snapStartTime(at: Date): string {
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())} ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}:${pad(at.getUTCSeconds())} +0000`;
}

export function notificationUrl(siteOrigin: string): string {
  return `${siteOrigin}/api/payments/midtrans/notification`;
}

/** R-05: exactly this body and header, nothing else. The item name is fixed so
 * Midtrans never receives business details. Returns the Snap redirect URL, or
 * null on any failure (the caller voids the attempt). */
export async function createSnapTransaction(
  config: MidtransConfig,
  input: SnapRequest,
): Promise<{ token: string; redirectUrl: string } | null> {
  const doFetch = config.fetch ?? fetch;
  const page = `${input.siteOrigin}/audit`;
  const body = {
    transaction_details: {
      order_id: input.orderId,
      gross_amount: ORDER_GROSS_AMOUNT,
    },
    item_details: [
      {
        id: "audit-visibilitas-ai",
        price: ORDER_GROSS_AMOUNT,
        quantity: 1,
        name: "Audit visibilitas AI",
      },
    ],
    customer_details: { email: input.email },
    enabled_payments: ["other_qris", "bank_transfer", "gopay", "dana"],
    expiry: {
      start_time: snapStartTime(input.now),
      unit: "minutes",
      duration: PAYMENT_WINDOW_MINUTES,
    },
    page_expiry: { duration: PAYMENT_WINDOW_MINUTES, unit: "minutes" },
    callbacks: { finish: page },
    gopay: { enable_callback: true, callback_url: page },
    dana: { callback_url: page },
  };
  try {
    const response = await doFetch(
      `https://${hosts(config.isProduction).snap}/snap/v1/transactions`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: basicAuth(config.serverKey),
          "X-Override-Notification": notificationUrl(input.siteOrigin),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(SNAP_TIMEOUT_MS),
      },
    );
    if (response.status !== 201 && response.status !== 200) return null;
    const answer = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const token = text(answer?.token);
    const redirectUrl = text(answer?.redirect_url);
    if (!token || !redirectUrl) return null;
    // Only Midtrans' own https page is ever handed to the customer.
    const url = new URL(redirectUrl);
    if (
      url.protocol !== "https:" ||
      url.hostname !== hosts(config.isProduction).snap
    ) {
      return null;
    }
    return { token, redirectUrl };
  } catch {
    return null;
  }
}

/** The notification fields the signature covers, as received (strings). */
export type MidtransNotification = {
  order_id?: unknown;
  status_code?: unknown;
  gross_amount?: unknown;
  signature_key?: unknown;
};

async function sha512Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-512",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** R-08: SHA-512 of the raw strings `order_id`, `status_code`, `gross_amount`
 * and the server key, joined as received, compared without stopping at the
 * first difference. Missing or non-string fields never match. */
export async function notificationSignatureValid(
  serverKey: string,
  notification: MidtransNotification,
): Promise<boolean> {
  const { order_id, status_code, gross_amount, signature_key } = notification;
  if (
    typeof order_id !== "string" ||
    typeof status_code !== "string" ||
    typeof gross_amount !== "string" ||
    typeof signature_key !== "string"
  ) {
    return false;
  }
  const expected = await sha512Hex(
    `${order_id}${status_code}${gross_amount}${serverKey}`,
  );
  const given = signature_key.toLowerCase();
  if (given.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ given.charCodeAt(index);
  }
  return difference === 0;
}
