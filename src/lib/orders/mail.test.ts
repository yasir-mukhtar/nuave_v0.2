import { describe, expect, it, vi } from "vitest";
import {
  failureEmail,
  readyEmail,
  RESEND_ENDPOINT,
  resendMailSender,
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
    });
    expect(ready.html).not.toContain("<script>");
    expect(ready.html).toContain(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Kopi &#39;Nuave&#39;",
    );
    expect(ready.text).toContain(name);
    const failed = failureEmail({ businessName: name });
    expect(failed.html).not.toContain("<script>");
  });

  it("the ready email carries the link, the 12-month note and the support address", () => {
    const ready = readyEmail({
      businessName: "Kopi Nuave",
      link: "https://v2.nuave.test/r#abc",
    });
    expect(ready.text).toContain("https://v2.nuave.test/r#abc");
    expect(ready.text).toContain("Link berlaku 12 bulan");
    expect(ready.text).toContain("support@nuave.ai");
  });
});
