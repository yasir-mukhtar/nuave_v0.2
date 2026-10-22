import { describe, expect, it } from "vitest";
import { customerParts, withPhrase } from "./smart-customer-screens";

describe("customerParts (J16 stored phrase → chips)", () => {
  it("reads one stored phrase back as its parts, without the joining dan", () => {
    expect(customerParts("Mahasiswa, pekerja kantoran, dan keluarga")).toEqual([
      "Mahasiswa",
      "pekerja kantoran",
      "keluarga",
    ]);
  });

  it("drops serta and atau the same way, in any case", () => {
    expect(
      customerParts("wisatawan, Serta komunitas, ATAU pelaku usaha"),
    ).toEqual(["wisatawan", "komunitas", "pelaku usaha"]);
  });

  it("keeps words that only start like a joiner", () => {
    expect(customerParts("penari, dancer, atlet")).toEqual([
      "penari",
      "dancer",
      "atlet",
    ]);
  });

  it("removes repeats left once the joiner is gone", () => {
    expect(customerParts("keluarga, dan Keluarga,  mahasiswa ")).toEqual([
      "keluarga",
      "mahasiswa",
    ]);
  });

  it("gives back the chips the screen saved", () => {
    const chips = ["keluarga", "pekerja remote", "wisatawan"];
    expect(customerParts(chips.join(", "))).toEqual(chips);
  });

  it("has no parts for an empty answer", () => {
    expect(customerParts("")).toEqual([]);
    expect(customerParts(" , ")).toEqual([]);
  });
});

describe("withPhrase (J23 starter phrases)", () => {
  it("completes words the owner has begun", () => {
    expect(withPhrase("Buka sampai", "buka sampai malam")).toBe(
      "Buka sampai malam",
    );
    expect(withPhrase("Kami buka", "buka sampai malam")).toBe(
      "Kami buka sampai malam",
    );
    expect(withPhrase("Kopi enak, bisa pesan", "bisa pesan antar")).toBe(
      "Kopi enak, bisa pesan antar",
    );
  });

  it("never completes the end of a longer word", () => {
    expect(withPhrase("Kami terbuka", "buka sampai malam")).toBe(
      "Kami terbuka, buka sampai malam",
    );
  });

  it("opens a new sentence after a full stop", () => {
    expect(withPhrase("Kopi enak.", "harga terjangkau")).toBe(
      "Kopi enak. Harga terjangkau",
    );
    expect(withPhrase("Buka setiap hari!", "bahan lokal")).toBe(
      "Buka setiap hari! Bahan lokal",
    );
  });

  it("continues the sentence with a comma otherwise", () => {
    expect(withPhrase("Kopi enak", "harga terjangkau")).toBe(
      "Kopi enak, harga terjangkau",
    );
    expect(withPhrase("Kopi enak   ", "bahan lokal")).toBe(
      "Kopi enak, bahan lokal",
    );
  });

  it("starts with a capital when nothing is written yet", () => {
    expect(withPhrase("", "bahan lokal")).toBe("Bahan lokal");
    expect(withPhrase("  \n", "berdiri sejak")).toBe("Berdiri sejak");
  });
});
