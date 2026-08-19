import { describe, expect, it } from "vitest";
import { parseSourceInput } from "./source-input";

describe("parseSourceInput (Spec 004 R-03, AC-13)", () => {
  it("returns null for empty and whitespace-only input", () => {
    expect(parseSourceInput("")).toBeNull();
    expect(parseSourceInput("   ")).toBeNull();
  });

  it("returns null for input over the 2000-char limit", () => {
    expect(parseSourceInput("a".repeat(2001))).toBeNull();
  });

  it("accepts a bare domain as a website and prepends https", () => {
    expect(parseSourceInput("kopitamansenja.example")).toEqual({
      sourceType: "website",
      normalizedUrl: "https://kopitamansenja.example/",
    });
  });

  it("accepts a bare domain with a path", () => {
    const result = parseSourceInput("kopitamansenja.example/beranda");
    expect(result).toEqual({
      sourceType: "website",
      normalizedUrl: "https://kopitamansenja.example/beranda",
    });
  });

  it("accepts a www-prefixed domain", () => {
    expect(parseSourceInput("www.kopitamansenja.example")).toEqual({
      sourceType: "website",
      normalizedUrl: "https://www.kopitamansenja.example/",
    });
  });

  it("accepts a full http URL as a website", () => {
    expect(parseSourceInput("http://kopitamansenja.example")).toEqual({
      sourceType: "website",
      normalizedUrl: "http://kopitamansenja.example/",
    });
  });

  it("accepts a full https URL and preserves path and query", () => {
    expect(
      parseSourceInput("https://kopitamansenja.example/beranda?ref=1"),
    ).toEqual({
      sourceType: "website",
      normalizedUrl: "https://kopitamansenja.example/beranda?ref=1",
    });
  });

  it("detects an @handle as Instagram", () => {
    expect(parseSourceInput("@kopitamansenja")).toEqual({
      sourceType: "instagram",
      normalizedUrl: "https://instagram.com/kopitamansenja",
    });
  });

  it("preserves an uppercase @handle", () => {
    expect(parseSourceInput("@KopiTamanSenja")).toEqual({
      sourceType: "instagram",
      normalizedUrl: "https://instagram.com/KopiTamanSenja",
    });
  });

  it("accepts @handles with dots and underscores", () => {
    expect(parseSourceInput("@kopi.taman_senja")).toEqual({
      sourceType: "instagram",
      normalizedUrl: "https://instagram.com/kopi.taman_senja",
    });
  });

  it("rejects a bare @ with no handle", () => {
    expect(parseSourceInput("@")).toBeNull();
  });

  it("detects a bare instagram.com handle", () => {
    expect(parseSourceInput("instagram.com/kopitamansenja")).toEqual({
      sourceType: "instagram",
      normalizedUrl: "https://instagram.com/kopitamansenja",
    });
  });

  it("detects a bare www.instagram.com handle", () => {
    expect(parseSourceInput("www.instagram.com/kopitamansenja")).toEqual({
      sourceType: "instagram",
      normalizedUrl: "https://instagram.com/kopitamansenja",
    });
  });

  it("detects a full Instagram URL and drops query and fragment", () => {
    expect(
      parseSourceInput("https://www.instagram.com/kopitamansenja/?utm=x#f"),
    ).toEqual({
      sourceType: "instagram",
      normalizedUrl: "https://instagram.com/kopitamansenja",
    });
  });

  it("rejects instagram.com with no handle", () => {
    expect(parseSourceInput("instagram.com")).toBeNull();
    expect(parseSourceInput("https://www.instagram.com/")).toBeNull();
  });

  it("rejects a word with no dot", () => {
    expect(parseSourceInput("kopitamansenja")).toBeNull();
  });

  it("rejects input containing spaces", () => {
    expect(parseSourceInput("kopitamansenja .example")).toBeNull();
  });

  it("rejects an unsupported scheme", () => {
    expect(parseSourceInput("ftp://kopitamansenja.example")).toBeNull();
  });
});
