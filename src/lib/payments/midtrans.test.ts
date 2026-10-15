import { describe, expect, it } from "vitest";
import { createFakeMidtrans } from "./fake-midtrans.test-helper";
import {
  basicAuth,
  createSnapTransaction,
  getStatus,
  notificationSignatureValid,
  snapStartTime,
} from "./midtrans";

// Spec 017 R-05, R-08, R-09: the Midtrans client against the fake. No network.

const KEY = "SB-Mid-server-offline-key";
const NOW = new Date("2026-10-14T03:04:05.678Z");

describe("Snap create transaction (R-05, AC-01)", () => {
  const request = {
    orderId: "NV-7K3Q9P-1",
    email: "owner@example.com",
    siteOrigin: "https://v2.nuave.test",
    now: NOW,
  };

  it("sends exactly the R-05 body and the override header, with Basic auth", async () => {
    const fake = createFakeMidtrans();
    const snap = await createSnapTransaction(
      { serverKey: KEY, isProduction: false, fetch: fake.fetch },
      request,
    );
    expect(snap).toEqual({
      token: "snap-token-1",
      redirectUrl:
        "https://app.sandbox.midtrans.com/snap/v3/redirection/snap-token-1",
    });
    const [sent] = fake.snapRequests();
    expect(sent!.method).toBe("POST");
    expect(sent!.url).toBe(
      "https://app.sandbox.midtrans.com/snap/v1/transactions",
    );
    expect(sent!.headers.Authorization).toBe(`Basic ${btoa(`${KEY}:`)}`);
    expect(sent!.headers["X-Override-Notification"]).toBe(
      "https://v2.nuave.test/api/payments/midtrans/notification",
    );
    expect(JSON.parse(sent!.body!)).toEqual({
      transaction_details: { order_id: "NV-7K3Q9P-1", gross_amount: 99000 },
      item_details: [
        {
          id: "audit-visibilitas-ai",
          price: 99000,
          quantity: 1,
          name: "Audit visibilitas AI",
        },
      ],
      customer_details: { email: "owner@example.com" },
      enabled_payments: ["other_qris", "bank_transfer", "gopay", "dana"],
      expiry: {
        start_time: "2026-10-14 03:04:05 +0000",
        unit: "minutes",
        duration: 60,
      },
      page_expiry: { duration: 60, unit: "minutes" },
      callbacks: { finish: "https://v2.nuave.test/audit" },
      gopay: {
        enable_callback: true,
        callback_url: "https://v2.nuave.test/audit",
      },
      dana: { callback_url: "https://v2.nuave.test/audit" },
    });
  });

  it("uses the production hosts only when the production switch is true (R-09)", async () => {
    const fake = createFakeMidtrans({ isProduction: true });
    const snap = await createSnapTransaction(
      { serverKey: KEY, isProduction: true, fetch: fake.fetch },
      request,
    );
    expect(fake.snapRequests()[0]!.url).toBe(
      "https://app.midtrans.com/snap/v1/transactions",
    );
    expect(snap?.redirectUrl.startsWith("https://app.midtrans.com/")).toBe(
      true,
    );
    await getStatus(
      { serverKey: KEY, isProduction: true, fetch: fake.fetch },
      "NV-7K3Q9P-1",
    );
    expect(fake.statusRequests()[0]!.url).toBe(
      "https://api.midtrans.com/v2/NV-7K3Q9P-1/status",
    );
  });

  it("returns null for an HTTP error, a dropped connection, a wrong key and a foreign redirect host", async () => {
    for (const mode of [
      "http_error",
      "throw",
      "unauthorized",
      "bad_host",
    ] as const) {
      const fake = createFakeMidtrans();
      fake.snapMode = mode;
      expect(
        await createSnapTransaction(
          { serverKey: KEY, isProduction: false, fetch: fake.fetch },
          request,
        ),
        mode,
      ).toBeNull();
    }
  });

  it("formats Midtrans' start time and Basic auth", () => {
    expect(snapStartTime(NOW)).toBe("2026-10-14 03:04:05 +0000");
    expect(basicAuth("key")).toBe(`Basic ${btoa("key:")}`);
  });
});

describe("Get Status (R-09, R-14)", () => {
  const config = (fake: ReturnType<typeof createFakeMidtrans>) => ({
    serverKey: KEY,
    isProduction: false,
    fetch: fake.fetch,
  });

  it("reads a transaction by transaction_id and by order_id", async () => {
    const fake = createFakeMidtrans();
    fake.addTransaction({ orderId: "NV-AAAAAA-1", transactionId: "tx-1" });
    const byTransaction = await getStatus(config(fake), "tx-1");
    const byOrder = await getStatus(config(fake), "NV-AAAAAA-1");
    expect(byTransaction).toEqual(byOrder);
    expect(byTransaction).toMatchObject({
      kind: "found",
      status: {
        transaction_id: "tx-1",
        order_id: "NV-AAAAAA-1",
        transaction_status: "settlement",
        gross_amount: "99000.00",
        currency: "IDR",
      },
    });
    expect(fake.statusRequests()[0]!.headers.Authorization).toBe(
      `Basic ${btoa(`${KEY}:`)}`,
    );
  });

  it("answers with the latest of several transactions for one order_id", async () => {
    const fake = createFakeMidtrans();
    fake.addTransaction({
      orderId: "NV-AAAAAA-1",
      transactionId: "tx-1",
      status: "deny",
    });
    fake.addTransaction({
      orderId: "NV-AAAAAA-1",
      transactionId: "tx-2",
      status: "pending",
    });
    const answer = await getStatus(config(fake), "NV-AAAAAA-1");
    expect(answer).toMatchObject({
      kind: "found",
      status: { transaction_id: "tx-2" },
    });
  });

  it("says not found for an unknown id (Midtrans' 404 shape), and for DANA by order_id", async () => {
    const fake = createFakeMidtrans();
    fake.addTransaction({
      orderId: "NV-AAAAAA-1",
      transactionId: "tx-dana",
      status: "pending",
      paymentType: "dana",
    });
    expect(await getStatus(config(fake), "nothing")).toEqual({
      kind: "not_found",
    });
    expect(await getStatus(config(fake), "NV-AAAAAA-1")).toEqual({
      kind: "not_found",
    });
    expect(await getStatus(config(fake), "tx-dana")).toMatchObject({
      kind: "found",
    });
  });

  it("is an error for a wrong key, a server error, a dropped connection and an unreadable answer", async () => {
    for (const mode of [
      "unauthorized",
      "http_error",
      "throw",
      "bad_json",
    ] as const) {
      const fake = createFakeMidtrans();
      fake.addTransaction({ orderId: "NV-AAAAAA-1", transactionId: "tx-1" });
      fake.statusMode = mode;
      expect(await getStatus(config(fake), "tx-1"), mode).toEqual({
        kind: "error",
      });
    }
  });
});

describe("notification signature (R-08)", () => {
  it("accepts SHA-512 of order_id, status_code, gross_amount and the server key, joined as received", async () => {
    const fake = createFakeMidtrans();
    fake.addTransaction({ orderId: "NV-AAAAAA-1", transactionId: "tx-1" });
    const body = JSON.parse(fake.notification("tx-1"));
    expect(await notificationSignatureValid(KEY, body)).toBe(true);
    expect(await notificationSignatureValid("another-key", body)).toBe(false);
  });

  it("rejects a changed field, a wrong signature and missing or non-string fields", async () => {
    const fake = createFakeMidtrans();
    fake.addTransaction({ orderId: "NV-AAAAAA-1", transactionId: "tx-1" });
    const body = JSON.parse(fake.notification("tx-1"));
    expect(
      await notificationSignatureValid(KEY, { ...body, gross_amount: "1.00" }),
    ).toBe(false);
    expect(
      await notificationSignatureValid(KEY, {
        ...body,
        order_id: "NV-AAAAAA-2",
      }),
    ).toBe(false);
    expect(
      await notificationSignatureValid(
        KEY,
        JSON.parse(fake.notification("tx-1", { badSignature: true })),
      ),
    ).toBe(false);
    expect(
      await notificationSignatureValid(KEY, { ...body, gross_amount: 99000 }),
    ).toBe(false);
    expect(await notificationSignatureValid(KEY, {})).toBe(false);
  });
});
