import { describe, expect, it, vi } from "vitest";
import {
  failureEmail,
  readyEmail,
  RESEND_ENDPOINT,
  resendMailSender,
  retryWaitMs,
  RETRY_MAX_WAIT_MS,
  sendWithinAttempt,
  type MailMessage,
} from "./mail";

// Spec 016 R-25, R-28, AC-16: the real Resend sender, with a fake `fetch`. No
// request ever leaves this process.

const KEY = "re_offline_test_key";
const message: MailMessage = {
  to: "pemilik@example.com",
  subject: "Laporan audit Nuave Anda sudah siap",
  text: "teks",
  html: "<p>html</p>",
  idempotencyKey: "nuave-order-abc-ready-1",
};

function sender(respond: (call: number) => Response | Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return respond(calls.length);
    },
  ) as unknown as typeof fetch;
  return {
    calls,
    send: resendMailSender({
      apiKey: KEY,
      from: "Nuave <laporan@nuave.test>",
      fetchImpl,
    }),
  };
}

describe("resendMailSender", () => {
  it("posts to Resend's HTTP API with the key, the idempotency key and the message, and reports the id", async () => {
    const s = sender(() => Response.json({ id: "re-msg-1" }));
    const result = await s.send(message);
    expect(result).toEqual({ accepted: true, messageId: "re-msg-1" });
    expect(s.calls).toHaveLength(1);
    const { url, init } = s.calls[0]!;
    expect(url).toBe(RESEND_ENDPOINT);
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(headers["Idempotency-Key"]).toBe(message.idempotencyKey);
    expect(JSON.parse(String(init.body))).toEqual({
      from: "Nuave <laporan@nuave.test>",
      to: ["pemilik@example.com"],
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  });

  it("does not accept an error status or an answer without an id", async () => {
    for (const response of [
      new Response("{}", { status: 400 }),
      new Response("{}", { status: 422 }),
      new Response("{}", { status: 429 }),
      new Response("{}", { status: 500 }),
      Response.json({}),
      new Response("not json"),
    ]) {
      expect(await sender(() => response.clone()).send(message)).toEqual({
        accepted: false,
      });
    }
  });

  it("inside one attempt a failed send is retried with the same key and body, and a later accept stops it (AC-16)", async () => {
    const s = sender((call) =>
      call === 1
        ? new Response("{}", { status: 500 })
        : call === 2
          ? Promise.reject(new Error("network"))
          : Response.json({ id: "re-msg-9" }),
    );
    expect(await sendWithinAttempt(s.send, message)).toEqual({
      accepted: true,
      messageId: "re-msg-9",
    });
    expect(s.calls).toHaveLength(3);
    const keys = s.calls.map(
      (call) =>
        (call.init.headers as Record<string, string>)["Idempotency-Key"],
    );
    expect(new Set(keys)).toEqual(new Set([message.idempotencyKey]));
    expect(new Set(s.calls.map((call) => String(call.init.body))).size).toBe(1);
  });

  it("never puts the key in an error or a log line", async () => {
    const logs: string[] = [];
    for (const method of ["log", "info", "warn", "error"] as const) {
      vi.spyOn(console, method).mockImplementation((...args) => {
        logs.push(args.join(" "));
      });
    }
    const s = sender(() => Promise.reject(new Error("socket closed")));
    const result = await sendWithinAttempt(s.send, message);
    expect(result).toEqual({ accepted: false });
    expect(logs.join("\n")).not.toContain(KEY);
    vi.restoreAllMocks();
  });
});

describe("email wording", () => {
  it("escapes the business name in the HTML, and the text keeps it as typed", () => {
    const name = `<script>alert("x")</script> & Kopi 'Nuave'`;
    const ready = readyEmail({
      businessName: name,
      link: "https://v2.nuave.test/r#abc",
      orderNumber: "NV-7K3Q9P",
    });
    expect(ready.html).not.toContain("<script>");
    expect(ready.html).toContain(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Kopi &#39;Nuave&#39;",
    );
    expect(ready.text).toContain(name);
    const failed = failureEmail({
      businessName: name,
      orderNumber: "NV-7K3Q9P",
    });
    expect(failed.html).not.toContain("<script>");
  });

  it("the ready email carries the link, the 12-month note, the order number and the support address", () => {
    const ready = readyEmail({
      businessName: "Kopi Nuave",
      link: "https://v2.nuave.test/r#abc",
      orderNumber: "NV-7K3Q9P",
    });
    expect(ready.text).toContain("Nomor pesanan: NV-7K3Q9P");
    expect(ready.html).toContain("NV-7K3Q9P");
    const failed = failureEmail({
      businessName: "Kopi Nuave",
      orderNumber: "NV-7K3Q9P",
    });
    expect(failed.text).toContain("Nomor pesanan: NV-7K3Q9P");
    expect(ready.text).toContain("https://v2.nuave.test/r#abc");
    expect(ready.text).toContain("Link berlaku 12 bulan");
    expect(ready.text).toContain("support@nuave.ai");
  });

  it("J31: names the business, the place and the observation day, with one action and the site's own pictures", () => {
    const ready = readyEmail({
      businessName: "Kedai Fiksi",
      link: "https://v2.nuave.test/r#abc",
      orderNumber: "NV-7K3Q9P",
      scope: "Kedai Fiksi Dago",
      observedAt: "2026-10-18T03:10:00.000Z",
    });
    expect(ready.subject).toBe(
      "AI Visibility Report untuk Kedai Fiksi sudah siap",
    );
    // The location's own name repeats the business; the email says it once.
    expect(ready.text).toContain(
      "AI Visibility Report untuk Kedai Fiksi, Dago. Jawaban diamati pada 18 Oktober 2026.",
    );
    expect(ready.html.match(/>Buka laporan</g)).toHaveLength(1);
    expect(ready.html).toContain('href="https://v2.nuave.test/r#abc"');
    expect(ready.html).toContain(
      "https://v2.nuave.test/v2/email/nuave-logo.png",
    );
    expect(ready.html).toContain(
      "https://v2.nuave.test/v2/email/kedai-busy.jpg",
    );
    expect(ready.text).toContain("Download PDF");
    expect(ready.text).toContain("Jawaban dapat berubah.");
  });

  it("J31: leaves out what it cannot read instead of guessing", () => {
    const ready = readyEmail({
      businessName: "Kedai Fiksi",
      link: "https://v2.nuave.test/r#abc",
      orderNumber: "NV-7K3Q9P",
      scope: null,
      observedAt: "bukan-tanggal",
    });
    expect(ready.text).toContain("AI Visibility Report untuk Kedai Fiksi.");
    expect(ready.text).not.toContain("Jawaban diamati");
    expect(ready.text).not.toContain("Invalid");
  });
});

describe("the wait between tries inside one attempt", () => {
  it("grows 0.5 s then 1 s, obeys Retry-After, and never passes the cap", () => {
    expect(retryWaitMs(1)).toBe(500);
    expect(retryWaitMs(2)).toBe(1000);
    expect(retryWaitMs(1, 2000)).toBe(2000);
    expect(retryWaitMs(1, 60_000)).toBe(RETRY_MAX_WAIT_MS);
    expect(retryWaitMs(5)).toBe(RETRY_MAX_WAIT_MS);
  });

  it("a 429 with Retry-After is reported, and the next try waits for it (capped)", async () => {
    const s = sender((call) =>
      call === 1
        ? new Response("{}", { status: 429, headers: { "retry-after": "2" } })
        : call === 2
          ? new Response("{}", {
              status: 429,
              headers: { "retry-after": "90" },
            })
          : Response.json({ id: "ok" }),
    );
    expect(
      await resendMailSender({
        apiKey: KEY,
        from: "n@x.test",
        fetchImpl: (async () =>
          new Response("{}", {
            status: 429,
            headers: { "retry-after": "2" },
          })) as typeof fetch,
      })(message),
    ).toEqual({ accepted: false, retryAfterMs: 2000 });
    const waits: number[] = [];
    const result = await sendWithinAttempt(s.send, message, {
      sleep: async (ms) => {
        waits.push(ms);
      },
    });
    expect(result.accepted).toBe(true);
    expect(waits).toEqual([2000, RETRY_MAX_WAIT_MS]);
  });

  it("waits between tries of a plain failure, and not before the first", async () => {
    const waits: number[] = [];
    const s = sender(() => new Response("{}", { status: 500 }));
    await sendWithinAttempt(s.send, message, {
      sleep: async (ms) => {
        waits.push(ms);
      },
    });
    expect(s.calls).toHaveLength(3);
    expect(waits).toEqual([500, 1000]);
  });
});
