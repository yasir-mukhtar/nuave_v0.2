import { describe, expect, it } from "vitest";
import { emailCompletions, emailTypoSuggestion } from "./email-assist";

describe("emailTypoSuggestion (J08 Maksud Anda)", () => {
  it("corrects a known misspelling of a big mail domain", () => {
    expect(emailTypoSuggestion("pemilik@gmial.com")).toBe("pemilik@gmail.com");
    expect(emailTypoSuggestion("pemilik@yahoo.co.od")).toBe(
      "pemilik@yahoo.co.id",
    );
    expect(emailTypoSuggestion("Pemilik.Kedai@hotmial.com")).toBe(
      "Pemilik.Kedai@hotmail.com",
    );
  });

  it("reads the domain in any case and ignores outer spaces", () => {
    expect(emailTypoSuggestion("  pemilik@GMAIL.CON ")).toBe(
      "pemilik@gmail.com",
    );
  });

  it("says nothing for a correct or unknown domain", () => {
    expect(emailTypoSuggestion("pemilik@gmail.com")).toBeNull();
    expect(emailTypoSuggestion("pemilik@kedai-fiksi.example")).toBeNull();
  });

  it("says nothing before there is an address", () => {
    expect(emailTypoSuggestion("")).toBeNull();
    expect(emailTypoSuggestion("pemilik")).toBeNull();
    expect(emailTypoSuggestion("@gmial.com")).toBeNull();
  });
});

describe("emailCompletions (J08 keyboard bar)", () => {
  it("offers the most common domains before the @", () => {
    expect(emailCompletions("pemilik")).toEqual([
      { label: "@gmail.com", value: "pemilik@gmail.com" },
      { label: "@yahoo.com", value: "pemilik@yahoo.com" },
    ]);
    expect(emailCompletions(" pemilik ", 3).map((item) => item.value)).toEqual([
      "pemilik@gmail.com",
      "pemilik@yahoo.com",
      "pemilik@yahoo.co.id",
    ]);
  });

  it("offers the domains the typed part can still become after the @", () => {
    expect(emailCompletions("pemilik@ya")).toEqual([
      { label: "@yahoo.com", value: "pemilik@yahoo.com" },
      { label: "@yahoo.co.id", value: "pemilik@yahoo.co.id" },
    ]);
    expect(emailCompletions("pemilik@GM")).toEqual([
      { label: "@gmail.com", value: "pemilik@gmail.com" },
    ]);
    expect(emailCompletions("pemilik@").map((item) => item.label)).toEqual([
      "@gmail.com",
      "@yahoo.com",
    ]);
  });

  it("offers nothing once the domain is complete or cannot match", () => {
    expect(emailCompletions("pemilik@gmail.com")).toEqual([]);
    expect(emailCompletions("pemilik@kedai")).toEqual([]);
  });

  it("offers nothing for empty, spaced or malformed text", () => {
    expect(emailCompletions("")).toEqual([]);
    expect(emailCompletions("pemilik kedai")).toEqual([]);
    expect(emailCompletions("@gmail")).toEqual([]);
    expect(emailCompletions("a@b@gmail")).toEqual([]);
  });
});
