// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COOKIE_CHOICE_KEY,
  grantTracking,
  resetTrackingForTests,
  trackJourneyEvent,
} from "@/lib/consent/meta-pixel";
import { PRIVACY_VERSION } from "@/lib/legal";
import { CookieConsent, CookieSettingsLink } from "./CookieConsent";

// Spec 019 in the browser: the notice, the choice, the footer link, and what
// reaches the Pixel. The Pixel script never loads in jsdom; `window.fbq`'s
// queue records every call Meta would receive.

const PIXEL_ID = "123456789012345";
let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const metaScripts = () =>
  Array.from(document.querySelectorAll("script")).filter((script) =>
    script.src.includes("facebook"),
  );
const calls = () => (window.fbq?.queue ?? []) as unknown[][];
const tracked = () => calls().filter((call) => call[0] === "track");

function setUp(id = PIXEL_ID) {
  vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", id);
}

function storeChoice(
  choice: string,
  at = new Date(),
  version = PRIVACY_VERSION,
) {
  window.localStorage.setItem(
    COOKIE_CHOICE_KEY,
    JSON.stringify({ choice, at: at.toISOString(), version }),
  );
}

function app() {
  return render(
    <>
      <CookieSettingsLink />
      <CookieConsent />
    </>,
  );
}

beforeEach(() => {
  pathname = "/";
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
  window.sessionStorage.clear();
  delete window.fbq;
  delete window._fbq;
  for (const script of metaScripts()) script.remove();
  resetTrackingForTests();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const notice = () =>
  screen.queryByRole("region", { name: "Help us understand what works" });

const normalised = (text: string | null | undefined) =>
  (text ?? "").replace(/\s+/g, " ").trim();
/** Spec 022 Q-1 and Q-9, exactly as approved on 2026-10-26. */
const FIRST_LAYER =
  "We use cookies and limited purchase information to measure which ads lead to sales. Your report and business answers are never shared with advertising partners. How it works";
const HOW_IT_WORKS = [
  "If you allow, Meta (Facebook and Instagram), our advertising partner, sets cookies and learns which Nuave pages you open and when you finish the free check or open checkout, with your IP address and device type, so we can see which ads bring visitors.",
  "If you buy, we also send Meta that a purchase happened and its value (Rp249.000), your IP address, browser type and Meta cookie codes, and your order email in coded (hashed) form, never as readable text. Meta uses these to match the purchase to your Facebook or Instagram account and the ad you saw, and to show our ads to people similar to our buyers.",
  "We never send Meta your report, your questions, AI answers or your business details.",
  "If you don't allow, none of your data is sent to Meta, from your browser or from our server. You can change your choice anytime under Pengaturan cookie, at the bottom of our home page and privacy page.",
];

describe("without a Pixel ID (R-01)", () => {
  it("shows no notice and no link, and loads nothing from Meta", () => {
    setUp("");
    storeChoice("yes");
    app();
    expect(notice()).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Pengaturan cookie" }),
    ).toBeNull();
    expect(metaScripts()).toHaveLength(0);
    expect(window.fbq).toBeUndefined();
  });

  it("ignores an ID that is not digits", () => {
    setUp("abc<script>");
    app();
    expect(notice()).toBeNull();
  });
});

describe("with a Pixel ID", () => {
  beforeEach(() => setUp());

  describe("keeps focused controls clear of the open notice (R-14)", () => {
    const root = document.documentElement;
    const clear = () => root.style.getPropertyValue("--cookie-notice-clear");
    const room = () =>
      document.querySelector('div[aria-hidden="true"][style*="notice-clear"]');

    afterEach(() => {
      root.style.scrollPaddingBottom = "";
    });

    it("pads the page above the notice and the /audit bar, then puts it back", () => {
      root.style.scrollPaddingBottom = "3px";
      app();
      expect(notice()).not.toBeNull();
      // jsdom lays nothing out: the notice measures 0, so only the 8px margin.
      expect(clear()).toBe("8px");
      expect(root.style.scrollPaddingBottom).toBe(
        "calc(var(--cookie-notice-clear) + var(--journey-bottom-bar, 0px))",
      );
      expect(room()).not.toBeNull();
      act(() => screen.getByRole("button", { name: "Don't allow" }).click());
      expect(notice()).toBeNull();
      expect(clear()).toBe("");
      expect(root.style.scrollPaddingBottom).toBe("3px");
      expect(room()).toBeNull();
    });

    it("lets go on a page without the notice and pads again on the way back", () => {
      const view = app();
      expect(clear()).toBe("8px");
      pathname = "/uji";
      view.rerender(
        <>
          <CookieSettingsLink />
          <CookieConsent />
        </>,
      );
      expect(notice()).toBeNull();
      expect(clear()).toBe("");
      expect(root.style.scrollPaddingBottom).toBe("");
      pathname = "/faq";
      view.rerender(
        <>
          <CookieSettingsLink />
          <CookieConsent />
        </>,
      );
      expect(notice()).not.toBeNull();
      expect(clear()).toBe("8px");
    });
  });

  it("asks first and loads nothing from Meta before a choice (R-02)", () => {
    app();
    expect(notice()).not.toBeNull();
    // Spec 022 Q-1: the first layer, word for word (AC-11).
    expect(normalised(screen.getByText(/We use cookies/).textContent)).toBe(
      FIRST_LAYER,
    );
    expect(metaScripts()).toHaveLength(0);
    expect(window.fbq).toBeUndefined();
  });

  it("Allow loads the Pixel with automatic configuration off and sends PageView", () => {
    app();
    act(() => screen.getByRole("button", { name: "Allow" }).click());
    expect(notice()).toBeNull();
    expect(metaScripts()).toHaveLength(1);
    expect(metaScripts()[0].src).toBe(
      "https://connect.facebook.net/en_US/fbevents.js",
    );
    expect(window.fbq?.disablePushState).toBe(true);
    expect(calls().slice(0, 2)).toEqual([
      ["set", "autoConfig", false, PIXEL_ID],
      ["init", PIXEL_ID],
    ]);
    expect(tracked()).toEqual([["track", "PageView"]]);
    const saved = JSON.parse(window.localStorage.getItem(COOKIE_CHOICE_KEY)!);
    expect(saved).toMatchObject({ choice: "yes", version: PRIVACY_VERSION });
  });

  it("a stored Allow loads the Pixel without asking, one PageView per page", () => {
    storeChoice("yes");
    const view = app();
    expect(notice()).toBeNull();
    expect(tracked()).toEqual([["track", "PageView"]]);
    pathname = "/audit";
    view.rerender(
      <>
        <CookieSettingsLink />
        <CookieConsent />
      </>,
    );
    expect(tracked()).toEqual([
      ["track", "PageView"],
      ["track", "PageView"],
    ]);
  });

  it("Don't allow loads nothing, now or on the next visit (R-11)", () => {
    app();
    act(() => screen.getByRole("button", { name: "Don't allow" }).click());
    expect(notice()).toBeNull();
    expect(window.fbq).toBeUndefined();
    cleanup();
    app();
    expect(notice()).toBeNull();
    expect(window.fbq).toBeUndefined();
    trackJourneyEvent("Lead", "https://klinik.example/");
    expect(window.fbq).toBeUndefined();
  });

  it("Pengaturan cookie reopens the notice; Don't allow then stops every event", () => {
    storeChoice("yes");
    app();
    expect(notice()).toBeNull();
    act(() =>
      screen.getByRole("button", { name: "Pengaturan cookie" }).click(),
    );
    expect(notice()).not.toBeNull();
    expect(screen.getByText(/Your choice now:/).textContent).toContain("Allow");
    expect(
      screen.getByText(/can be removed in your browser settings/),
    ).toBeTruthy();
    expect(document.activeElement?.id).toBe("cookie-notice-title");
    act(() => screen.getByRole("button", { name: "Don't allow" }).click());
    expect(calls()).toContainEqual(["consent", "revoke"]);
    const before = tracked().length;
    trackJourneyEvent("Purchase", "order-1");
    expect(tracked()).toHaveLength(before);
  });

  it("asks again after 12 months or a new privacy version (R-03)", () => {
    storeChoice("yes", new Date(Date.now() - 366 * 86_400_000));
    app();
    expect(notice()).not.toBeNull();
    expect(window.fbq).toBeUndefined();
    cleanup();
    storeChoice("yes", new Date(), "1.0");
    app();
    expect(notice()).not.toBeNull();
  });

  it("with storage blocked, Allow loads nothing and the notice comes back (R-03)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    app();
    act(() => screen.getByRole("button", { name: "Allow" }).click());
    expect(window.fbq).toBeUndefined();
    cleanup();
    app();
    expect(notice()).not.toBeNull();
  });

  it.each(["/r", "/uji", "/uji/x"])(
    "never on %s, even with a stored Allow (R-04)",
    (path) => {
      pathname = path;
      window.history.replaceState(null, "", path);
      storeChoice("yes");
      app();
      expect(notice()).toBeNull();
      expect(window.fbq).toBeUndefined();
      trackJourneyEvent("Lead", "https://klinik.example/");
      expect(window.fbq).toBeUndefined();
      window.history.replaceState(null, "", "/");
    },
  );

  it("journey events: once each, value and currency only, nothing readable kept (R-07..R-10)", () => {
    storeChoice("yes");
    app();
    trackJourneyEvent("Lead", "https://klinik.example/");
    trackJourneyEvent("Lead", "https://klinik.example/");
    trackJourneyEvent("InitiateCheckout", "https://klinik.example/");
    trackJourneyEvent("Purchase", "0123456789abcdef");
    trackJourneyEvent("Purchase", "0123456789abcdef");
    expect(tracked()).toEqual([
      ["track", "PageView"],
      ["track", "Lead"],
      ["track", "InitiateCheckout", { value: 249000, currency: "IDR" }],
      ["track", "Purchase", { value: 249000, currency: "IDR" }],
    ]);
    const stored = JSON.stringify({ ...window.localStorage });
    expect(stored).not.toContain("klinik");
    expect(stored).not.toContain("0123456789abcdef");
  });

  it("sends a journey event again after 7 days", () => {
    storeChoice("yes");
    app();
    const now = Date.now();
    trackJourneyEvent("Lead", "https://klinik.example/", now);
    trackJourneyEvent("Lead", "https://klinik.example/", now + 8 * 86_400_000);
    expect(tracked().filter((call) => call[1] === "Lead")).toHaveLength(2);
  });

  it("never sends the Midtrans return address: the order number leaves the address first (R-10)", () => {
    const hrefs: string[] = [];
    window.history.replaceState(
      null,
      "",
      "/audit?order_id=NV-ABC123-1&status_code=200&transaction_status=settlement&utm_source=meta",
    );
    pathname = "/audit";
    storeChoice("yes");
    app();
    // Every call the Pixel made saw the cleaned address.
    window.fbq!.callMethod = () => hrefs.push(window.location.href);
    trackJourneyEvent("Purchase", "order-1");
    expect(window.location.search).toBe("?utm_source=meta");
    expect(tracked()).toEqual([["track", "PageView"]]);
    expect(hrefs).toHaveLength(1);
    expect(hrefs.join(" ")).not.toContain("NV-");
    expect(hrefs.join(" ")).not.toContain("settlement");

    // An address that gains them later is cleaned before the next event.
    window.history.replaceState(null, "", "/audit?order_id=NV-XYZ999-1");
    trackJourneyEvent("Purchase", "order-2");
    expect(window.location.search).toBe("");
    expect(hrefs.at(-1)).not.toContain("NV-");
  });

  it("Don't allow chosen in another tab stops this tab at once (privacy page section 10)", () => {
    storeChoice("yes");
    app();
    // The other tab writes the choice; this tab may not have heard yet.
    storeChoice("no");
    trackJourneyEvent("Purchase", "order-1");
    expect(tracked()).toEqual([["track", "PageView"]]);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: COOKIE_CHOICE_KEY }),
      );
    });
    expect(calls()).toContainEqual(["consent", "revoke"]);
    storeChoice("yes");
    trackJourneyEvent("Purchase", "order-1");
    expect(tracked()).toEqual([["track", "PageView"]]);
  });

  it.each(["/r", "/uji"])(
    "a first visit to %s shows no notice (R-04)",
    (path) => {
      pathname = path;
      window.history.replaceState(null, "", path);
      app();
      expect(notice()).toBeNull();
      expect(window.fbq).toBeUndefined();
    },
  );

  it("the founder's test runs send no journey events", () => {
    storeChoice("yes");
    app();
    window.sessionStorage.setItem("nuave.testPass.v1", "a-test-pass-code");
    trackJourneyEvent("Lead", "https://klinik.example/");
    trackJourneyEvent("Purchase", "order-1");
    expect(tracked()).toEqual([["track", "PageView"]]);
  });

  it("keeps a choice for up to 12 months and an event code for up to 7 days", () => {
    storeChoice("yes", new Date(Date.now() - 364 * 86_400_000));
    app();
    expect(notice()).toBeNull();
    const now = Date.now();
    trackJourneyEvent("Lead", "https://klinik.example/", now);
    trackJourneyEvent("Lead", "https://klinik.example/", now + 6 * 86_400_000);
    expect(tracked().filter((call) => call[1] === "Lead")).toHaveLength(1);
  });

  it("removes what it no longer needs: an expired choice, old codes, and all codes on Don't allow", () => {
    storeChoice("yes", new Date(Date.now() - 400 * 86_400_000));
    window.localStorage.setItem(
      "nuave-pixel-sent",
      JSON.stringify({ abc: Date.now() - 30 * 86_400_000 }),
    );
    app();
    expect(window.localStorage.getItem(COOKIE_CHOICE_KEY)).toBeNull();
    expect(window.localStorage.getItem("nuave-pixel-sent")).toBeNull();
    act(() => screen.getByRole("button", { name: "Allow" }).click());
    trackJourneyEvent("Lead", "https://klinik.example/");
    expect(window.localStorage.getItem("nuave-pixel-sent")).not.toBeNull();
    act(() =>
      screen.getByRole("button", { name: "Pengaturan cookie" }).click(),
    );
    act(() => screen.getByRole("button", { name: "Don't allow" }).click());
    expect(window.localStorage.getItem("nuave-pixel-sent")).toBeNull();
  });

  it("gives focus back to Pengaturan cookie after a choice", () => {
    storeChoice("no");
    app();
    const link = screen.getByRole("button", { name: "Pengaturan cookie" });
    link.focus();
    act(() => link.click());
    expect(document.activeElement?.id).toBe("cookie-notice-title");
    act(() => screen.getByRole("button", { name: "Don't allow" }).click());
    expect(document.activeElement).toBe(link);
  });

  it("cleans the address before the Pixel loads, keeping the page's own history state (R-10a)", () => {
    const state = { nuaveIntake: true, step: 3 };
    window.history.replaceState(
      state,
      "",
      "/audit?result=%7B%7D&order_id=NV-ABC123-1&fbclid=abc",
    );
    expect(grantTracking("/audit")).toBe(true);
    expect(window.location.search).toBe("?fbclid=abc");
    expect(window.history.state).toEqual(state);
    expect(metaScripts()).toHaveLength(1);
  });
});

describe("Spec 022: the layered notice (R-19, R-19a, AC-11, AC-11a)", () => {
  beforeEach(() => setUp());

  it("How it works opens the Q-9 text inside the notice, before the choice, with nothing from Meta", () => {
    app();
    const toggle = screen.getByRole("button", { name: "How it works" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("cookie-notice-how")).toBeNull();
    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const panel = document.getElementById("cookie-notice-how")!;
    expect(notice()!.contains(panel)).toBe(true);
    const items = Array.from(panel.querySelectorAll("li"), (item) =>
      normalised(item.textContent),
    );
    expect(items).toEqual(HOW_IT_WORKS);
    expect(
      screen.getByRole("link", { name: "Privacy policy" }).getAttribute("href"),
    ).toBe("/privacy#cookie");
    // Both choices stay in reach, and nothing loaded from Meta.
    expect(screen.getByRole("button", { name: "Allow" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Don't allow" })).toBeTruthy();
    expect(metaScripts()).toHaveLength(0);
    expect(window.fbq).toBeUndefined();
  });

  it("is the same when the notice is reopened from Pengaturan cookie", () => {
    storeChoice("no");
    app();
    act(() =>
      screen.getByRole("button", { name: "Pengaturan cookie" }).click(),
    );
    act(() => screen.getByRole("button", { name: "How it works" }).click());
    const panel = document.getElementById("cookie-notice-how")!;
    expect(
      Array.from(panel.querySelectorAll("li"), (item) =>
        normalised(item.textContent),
      ),
    ).toEqual(HOW_IT_WORKS);
  });
});

describe("Spec 022: the server Purchase from the browser (R-01, R-05, R-09, R-11, R-19b, AC-07, AC-08)", () => {
  const EVENT_ID = "6f1c2b9e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";
  let fetchCalls: Array<{ url: string; init?: RequestInit }>;

  beforeEach(() => {
    setUp();
    fetchCalls = [];
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
      fetchCalls.push({ url, init });
      return Promise.reject(new Error("offline"));
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("the Pixel Purchase carries the event code, and one background call asks the server", async () => {
    storeChoice("yes");
    pathname = "/audit";
    window.history.replaceState(null, "", "/audit");
    app();
    trackJourneyEvent("Purchase", "0123456789abcdef", Date.now(), EVENT_ID);
    trackJourneyEvent("Purchase", "0123456789abcdef", Date.now(), EVENT_ID);
    expect(tracked()).toContainEqual([
      "track",
      "Purchase",
      { value: 249000, currency: "IDR" },
      { eventID: EVENT_ID },
    ]);
    expect(fetchCalls).toHaveLength(1);
    const { url, init } = fetchCalls[0]!;
    expect(url).toBe("/api/meta/purchase");
    expect(init?.method).toBe("POST");
    expect(init?.keepalive).toBe(true);
    expect(JSON.parse(String(init?.body))).toEqual({
      order_id: "0123456789abcdef",
      consent_version: PRIVACY_VERSION,
    });
    // A failed call changes nothing on screen and throws nowhere.
    await Promise.resolve();
  });

  it("an order paid before Spec 022 (no code) sends the Pixel Purchase as before and asks nothing", () => {
    storeChoice("yes");
    app();
    trackJourneyEvent("Purchase", "0123456789abcdef");
    expect(tracked()).toContainEqual([
      "track",
      "Purchase",
      { value: 249000, currency: "IDR" },
    ]);
    expect(fetchCalls).toHaveLength(0);
  });

  it.each([
    ["no choice", () => undefined],
    ["Don't allow", () => storeChoice("no")],
    [
      "a choice under an older privacy version",
      () => storeChoice("yes", new Date(), "1.3"),
    ],
  ])(
    "with %s, neither the Pixel nor the server gets the Purchase",
    (_, before) => {
      before();
      app();
      trackJourneyEvent("Purchase", "0123456789abcdef", Date.now(), EVENT_ID);
      expect(tracked()).toEqual([]);
      expect(fetchCalls).toHaveLength(0);
    },
  );

  it("Don't allow chosen in another tab before the paid screen stops both", () => {
    storeChoice("yes");
    app();
    storeChoice("no");
    trackJourneyEvent("Purchase", "0123456789abcdef", Date.now(), EVENT_ID);
    expect(tracked()).toEqual([["track", "PageView"]]);
    expect(fetchCalls).toHaveLength(0);
  });

  it("a tab with the founder's test-pass code asks nothing", () => {
    storeChoice("yes");
    app();
    window.sessionStorage.setItem(
      "nuave.testPass.v1",
      "test-pass-code-of-at-least-24-chars",
    );
    trackJourneyEvent("Purchase", "0123456789abcdef", Date.now(), EVENT_ID);
    expect(fetchCalls).toHaveLength(0);
  });

  it.each(["/r/secret", "/uji"])("on %s nothing is asked", (path) => {
    storeChoice("yes");
    app();
    window.history.replaceState(null, "", path);
    trackJourneyEvent("Purchase", "0123456789abcdef", Date.now(), EVENT_ID);
    expect(fetchCalls).toHaveLength(0);
  });
});
