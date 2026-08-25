import { describe, expect, it } from "vitest";
import { parseSourceInput } from "./source-input";

describe("parseSourceInput canonical source policy", () => {
  it("returns null for empty, whitespace, and oversized input", () => {
    expect(parseSourceInput("")).toBeNull();
    expect(parseSourceInput("   ")).toBeNull();
    expect(parseSourceInput("a".repeat(2001))).toBeNull();
  });

  it.each([
    ["kopitamansenja.example", "https://kopitamansenja.example/"],
    [
      "kopitamansenja.example/beranda",
      "https://kopitamansenja.example/beranda",
    ],
    ["www.kopitamansenja.example", "https://www.kopitamansenja.example/"],
    ["http://kopitamansenja.example", "http://kopitamansenja.example/"],
    [
      "https://kopitamansenja.example/beranda?ref=1",
      "https://kopitamansenja.example/beranda?ref=1",
    ],
    ["https://example.com/maps", "https://example.com/maps"],
    ["https://maps.example.com/", "https://maps.example.com/"],
    ["https://www.google.com/about", "https://www.google.com/about"],
  ])("accepts public website %s", (input, normalizedUrl) => {
    expect(parseSourceInput(input)).toEqual({
      sourceType: "website",
      normalizedUrl,
    });
  });

  it.each([
    ["@kopitamansenja", "https://instagram.com/kopitamansenja"],
    ["@KopiTamanSenja", "https://instagram.com/KopiTamanSenja"],
    ["@kopi.taman_senja", "https://instagram.com/kopi.taman_senja"],
    ["instagram.com/kopitamansenja", "https://instagram.com/kopitamansenja"],
    [
      "www.instagram.com/kopitamansenja",
      "https://instagram.com/kopitamansenja",
    ],
    [
      "https://www.instagram.com/kopitamansenja/?utm=x#f",
      "https://instagram.com/kopitamansenja",
    ],
  ])("accepts Instagram profile %s", (input, normalizedUrl) => {
    expect(parseSourceInput(input)).toEqual({
      sourceType: "instagram",
      normalizedUrl,
    });
  });

  it.each([
    "instagram.com/p/ABC123",
    "https://instagram.com/reel/ABC123",
    "https://instagram.com/reels/ABC123",
    "https://instagram.com/stories/kopitamansenja/123",
    "https://instagram.com/kopitamansenja/extra",
    "instagram.com/p",
    "instagram.com/reel",
  ])("never turns Instagram content path into an account: %s", (input) => {
    expect(parseSourceInput(input)).toBeNull();
  });

  it.each([
    "https://maps.google.com/?q=Kopi",
    "https://maps.google.co.uk/?q=Kopi",
    "https://maps.google.co.id/?q=Kopi",
    "https://www.google.com/maps/place/Kopi",
    "https://www.google.co.uk/maps/place/Kopi",
    "https://google.co.id/maps/place/Kopi",
    "https://maps.app.goo.gl/example",
    "https://g.page/example",
    "https://goo.gl/maps/example",
  ])(
    "does not advertise unsupported Google Business/Maps intake: %s",
    (input) => {
      expect(parseSourceInput(input)).toBeNull();
    },
  );

  it.each([
    "@",
    "instagram.com",
    "https://www.instagram.com/",
    "kopitamansenja",
    "kopitamansenja .example",
    "ftp://kopitamansenja.example",
    "https://user:pass@kopitamansenja.example",
    "http://127.0.0.1",
    "http://localhost",
  ])("rejects unsafe or malformed source %s", (input) => {
    expect(parseSourceInput(input)).toBeNull();
  });
});
