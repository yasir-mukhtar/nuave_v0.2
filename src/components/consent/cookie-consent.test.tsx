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
  screen.queryByRole("region", { name: "Cookie untuk iklan" });

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

  it("asks first and loads nothing from Meta before a choice (R-02)", () => {
    app();
    expect(notice()).not.toBeNull();
    expect(screen.getByText(/sebagai kode acak \(hash\)/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Kebijakan Privasi" })
        .getAttribute("href"),
    ).toBe("/privacy#cookie");
    expect(metaScripts()).toHaveLength(0);
    expect(window.fbq).toBeUndefined();
  });

  it("Setuju loads the Pixel with automatic configuration off and sends PageView", () => {
    app();
    act(() => screen.getByRole("button", { name: "Setuju" }).click());
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

  it("a stored Setuju loads the Pixel without asking, one PageView per page", () => {
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

  it("Tolak loads nothing, now or on the next visit (R-11)", () => {
    app();
    act(() => screen.getByRole("button", { name: "Tolak" }).click());
    expect(notice()).toBeNull();
    expect(window.fbq).toBeUndefined();
    cleanup();
    app();
    expect(notice()).toBeNull();
    expect(window.fbq).toBeUndefined();
    trackJourneyEvent("Lead", "https://klinik.example/");
    expect(window.fbq).toBeUndefined();
  });

  it("Pengaturan cookie reopens the notice; Tolak then stops every event", () => {
    storeChoice("yes");
    app();
    expect(notice()).toBeNull();
    act(() =>
      screen.getByRole("button", { name: "Pengaturan cookie" }).click(),
    );
    expect(notice()).not.toBeNull();
    expect(screen.getByText(/Pilihan Anda sekarang:/).textContent).toContain(
      "Setuju",
    );
    expect(
      screen.getByText(/bisa Anda hapus lewat pengaturan browser/),
    ).toBeTruthy();
    expect(document.activeElement?.id).toBe("cookie-notice-title");
    act(() => screen.getByRole("button", { name: "Tolak" }).click());
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

  it("with storage blocked, Setuju loads nothing and the notice comes back (R-03)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    app();
    act(() => screen.getByRole("button", { name: "Setuju" }).click());
    expect(window.fbq).toBeUndefined();
    cleanup();
    app();
    expect(notice()).not.toBeNull();
  });

  it.each(["/r", "/uji", "/uji/x"])(
    "never on %s, even with a stored Setuju (R-04)",
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

  it("Tolak chosen in another tab stops this tab at once (privacy page section 10)", () => {
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

  it("removes what it no longer needs: an expired choice, old codes, and all codes on Tolak", () => {
    storeChoice("yes", new Date(Date.now() - 400 * 86_400_000));
    window.localStorage.setItem(
      "nuave-pixel-sent",
      JSON.stringify({ abc: Date.now() - 30 * 86_400_000 }),
    );
    app();
    expect(window.localStorage.getItem(COOKIE_CHOICE_KEY)).toBeNull();
    expect(window.localStorage.getItem("nuave-pixel-sent")).toBeNull();
    act(() => screen.getByRole("button", { name: "Setuju" }).click());
    trackJourneyEvent("Lead", "https://klinik.example/");
    expect(window.localStorage.getItem("nuave-pixel-sent")).not.toBeNull();
    act(() =>
      screen.getByRole("button", { name: "Pengaturan cookie" }).click(),
    );
    act(() => screen.getByRole("button", { name: "Tolak" }).click());
    expect(window.localStorage.getItem("nuave-pixel-sent")).toBeNull();
  });

  it("gives focus back to Pengaturan cookie after a choice", () => {
    storeChoice("no");
    app();
    const link = screen.getByRole("button", { name: "Pengaturan cookie" });
    link.focus();
    act(() => link.click());
    expect(document.activeElement?.id).toBe("cookie-notice-title");
    act(() => screen.getByRole("button", { name: "Tolak" }).click());
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
