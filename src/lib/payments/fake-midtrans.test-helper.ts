import { createHash } from "node:crypto";

/**
 * A fake Midtrans for offline tests (spec 017): Snap create transaction, Get
 * Status with several transactions per `order_id`, and a notification builder
 * with valid or invalid signatures. Pass `fake.fetch` to the code under test, or
 * stub it as the global `fetch`. It never touches the network.
 */

export type FakeTransaction = {
  transaction_id: string;
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  gross_amount: string;
  currency?: string;
  payment_type: string;
};

export type FakeRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
};

type SnapMode = "ok" | "http_error" | "throw" | "unauthorized" | "bad_host";
type StatusMode = "ok" | "http_error" | "throw" | "unauthorized" | "bad_json";

const STATUS_CODE: Record<string, string> = {
  settlement: "200",
  capture: "200",
  pending: "201",
  deny: "202",
  expire: "407",
};

export function createFakeMidtrans(
  options: { serverKey?: string; isProduction?: boolean } = {},
) {
  const serverKey = options.serverKey ?? "SB-Mid-server-offline-key";
  const snapHost = options.isProduction
    ? "app.midtrans.com"
    : "app.sandbox.midtrans.com";
  const requests: FakeRequest[] = [];
  const transactions: FakeTransaction[] = [];
  const state = {
    snapMode: "ok" as SnapMode,
    statusMode: "ok" as StatusMode,
  };
  let snapCount = 0;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  const authorized = (headers: Record<string, string>) =>
    headers.Authorization === `Basic ${btoa(`${serverKey}:`)}`;

  const fetchImpl = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const headers = Object.fromEntries(
      Object.entries((init?.headers ?? {}) as Record<string, string>),
    );
    requests.push({
      method: init?.method ?? "GET",
      url,
      headers,
      body: typeof init?.body === "string" ? init.body : null,
    });
    const parsed = new URL(url);
    if (parsed.pathname === "/snap/v1/transactions") {
      if (state.snapMode === "throw") throw new Error("connection dropped");
      if (state.snapMode === "http_error") return json({ error: "x" }, 500);
      if (state.snapMode === "unauthorized" || !authorized(headers)) {
        return json({ error_messages: ["unauthorized"] }, 401);
      }
      snapCount += 1;
      const token = `snap-token-${snapCount}`;
      const host = state.snapMode === "bad_host" ? "evil.example" : snapHost;
      return json(
        {
          token,
          redirect_url: `https://${host}/snap/v3/redirection/${token}`,
        },
        201,
      );
    }
    const match = /^\/v2\/([^/]+)\/status$/.exec(parsed.pathname);
    if (match) {
      if (state.statusMode === "throw") throw new Error("connection dropped");
      if (state.statusMode === "http_error") return json({}, 500);
      if (state.statusMode === "bad_json") return new Response("<html>");
      if (state.statusMode === "unauthorized" || !authorized(headers)) {
        return json(
          { status_code: "401", status_message: "Unauthorized" },
          401,
        );
      }
      const id = decodeURIComponent(match[1]!);
      let found = transactions.find((tx) => tx.transaction_id === id);
      if (!found) {
        // By order_id: the latest transaction of that order. DANA answers only by
        // transaction_id (docs.midtrans.com, Get Status).
        const byOrder = transactions.filter((tx) => tx.order_id === id);
        const latest = byOrder[byOrder.length - 1];
        found = latest?.payment_type === "dana" ? undefined : latest;
      }
      if (!found) {
        return json({
          status_code: "404",
          status_message: "Transaction doesn't exist.",
          id: "fake-404",
        });
      }
      return json({
        status_code: STATUS_CODE[found.transaction_status] ?? "200",
        status_message: "Success, transaction is found",
        ...found,
      });
    }
    return json({}, 404);
  }) as typeof fetch;

  return {
    serverKey,
    fetch: fetchImpl,
    requests,
    transactions,
    /** Every request as one string, for "never contains X" checks. */
    everything: () => JSON.stringify(requests),
    set snapMode(mode: SnapMode) {
      state.snapMode = mode;
    },
    set statusMode(mode: StatusMode) {
      state.statusMode = mode;
    },
    snapRequests: () =>
      requests.filter((request) => request.url.includes("/snap/v1/")),
    statusRequests: () =>
      requests.filter((request) => request.url.includes("/status")),
    /** Add (or replace) a transaction under an `order_id`. */
    addTransaction(input: {
      orderId: string;
      transactionId?: string;
      status?: string;
      fraud?: string;
      amount?: string;
      /** `null` leaves `currency` out of the answer, as Midtrans sometimes does. */
      currency?: string | null;
      paymentType?: string;
    }): FakeTransaction {
      const transaction: FakeTransaction = {
        transaction_id:
          input.transactionId ??
          `tx-${transactions.length + 1}-${input.orderId}`,
        order_id: input.orderId,
        transaction_status: input.status ?? "settlement",
        ...(input.fraud ? { fraud_status: input.fraud } : {}),
        gross_amount: input.amount ?? "249000.00",
        ...(input.currency === null
          ? {}
          : { currency: input.currency ?? "IDR" }),
        payment_type: input.paymentType ?? "qris",
      };
      const index = transactions.findIndex(
        (tx) => tx.transaction_id === transaction.transaction_id,
      );
      if (index >= 0) transactions[index] = transaction;
      else transactions.push(transaction);
      return transaction;
    },
    setStatus(transactionId: string, status: string, fraud?: string) {
      const found = transactions.find(
        (tx) => tx.transaction_id === transactionId,
      );
      if (!found) throw new Error("unknown fake transaction");
      found.transaction_status = status;
      if (fraud) found.fraud_status = fraud;
    },
    /** A notification request body, signed with the server key (or not). */
    notification(
      transactionId: string,
      overrides: {
        badSignature?: boolean;
        orderId?: string;
        statusCode?: string;
        grossAmount?: string;
        key?: string;
      } = {},
    ): string {
      const found = transactions.find(
        (tx) => tx.transaction_id === transactionId,
      );
      const orderId = overrides.orderId ?? found?.order_id ?? "NV-UNKNOWN-1";
      const statusCode = overrides.statusCode ?? "200";
      const gross = overrides.grossAmount ?? found?.gross_amount ?? "249000.00";
      const signature = createHash("sha512")
        .update(`${orderId}${statusCode}${gross}${overrides.key ?? serverKey}`)
        .digest("hex");
      return JSON.stringify({
        transaction_id: transactionId,
        order_id: orderId,
        status_code: statusCode,
        gross_amount: gross,
        transaction_status: found?.transaction_status ?? "settlement",
        payment_type: found?.payment_type ?? "qris",
        signature_key: overrides.badSignature ? "0".repeat(128) : signature,
      });
    },
  };
}

export type FakeMidtrans = ReturnType<typeof createFakeMidtrans>;
