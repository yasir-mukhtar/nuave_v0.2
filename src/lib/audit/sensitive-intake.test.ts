import { describe, expect, it } from "vitest";
import {
  isSensitiveIntakeText,
  unsafePublicSource,
  unsafeConfirmedContext,
} from "./sensitive-intake";

// Fictional R3 acceptance matrix, including retained mixed baseline M1.
const cases = [
  ["P1", "Hasil panen petani lokal untuk keluarga Indonesia.", false],
  ["P2", "Tes rasa menu baru bersama keluarga Anda.", false],
  ["P3", "Obat herbal tradisional untuk keluarga sejak 1990.", false],
  ["P4", "Kondisi ruangan nyaman untuk keluarga dan teman.", false],
  ["P5", "Paket hemat untuk keluarga setiap akhir pekan.", false],
  ["P6", "Kontes foto untuk keluarga setiap bulan.", false],
  ["P7", "Kolab spesial untuk keluarga.", false],
  ["P8", "Menu sehat keluarga, baik untuk jantung.", false],
  ["P9", "Keluarga kami menyajikan menu sehat untuk jantung.", true],
  ["P10", "Keluarga kami membuka kedai di jantung kota.", false],
  ["P11", "Kontes foto untuk saya dan keluarga.", false],
  ["P12", "Kolab spesial untuk keluarga saya.", false],
  ["P13", "Protes? Kami siap membantu keluarga Anda.", false],
  [
    "P14",
    "Keluarga kami menyajikan kopi sejak 1990, positif dan hangat.",
    true,
  ],
  ["B1", "Hasil tes darah keluarga saya menunjukkan anemia.", true],
  ["B2", "Kondisi keluarga saya setelah perawatan kanker.", true],
  [
    "B3",
    "Obat keluarga saya diminum dua kali sehari sesuai resep dokter.",
    true,
  ],
  ["B4", "Hasil tes HIV saya positif", true],
  ["B5", "Hasil saya untuk keluarga.", true],
  ["B8", "Keluarga kami menderita penyakit jantung.", true],
  ["B9", "Riwayat penyakit keluarga.", true],
  ["B10", "Keluarga mengalami penyakit jantung.", true],
  ["B11", "Keluarga kami positif.", true],
  [
    "M1",
    "Keluarga kami membuka kedai di jantung kota. Hasil tes darah keluarga saya menunjukkan anemia.",
    true,
  ],
] as const;

describe("R3 shared privacy rules", () => {
  it.each(cases)(
    "%s keeps its approved result and case/spacing/punctuation variants",
    (_id, text, blocked) => {
      for (const variant of [
        text,
        text.toUpperCase().replaceAll(" ", "\t "),
        `(${text.toLowerCase()})`,
      ]) {
        expect(isSensitiveIntakeText(variant), variant).toBe(blocked);
        expect(
          unsafeConfirmedContext({
            publicFact: { value: variant, origin: "owner" },
          }),
        ).toBe(blocked);
      }
    },
  );
  it.each([
    "diagnosis",
    "diagnosa",
    "penyakit",
    "gejala",
    "kanker",
    "diabetes",
    "hiv",
    "aids",
    "didiagnosis",
    "menderita",
    "stroke",
    "depresi",
    "gangguan jiwa",
  ])(
    "clear term %s blocks both orders with family or personal cues",
    (term) => {
      for (const cue of [
        "keluarga",
        "saya",
        "pribadi",
        "aku",
        "keluarga saya",
        "keluarga aku",
        "keluarga kami",
        "keluargaku",
      ])
        for (const text of [`${term} bagi ${cue}`, `${cue}: ${term}`])
          expect(isSensitiveIntakeText(text), text).toBe(true);
    },
  );
  it.each([
    "hasil",
    "riwayat",
    "kondisi",
    "tes",
    "test",
    "lab",
    "laboratorium",
    "obat",
    "positif",
    "negatif",
    "jantung",
    "mental",
  ])("ambiguous term %s requires a personal cue in either order", (term) => {
    for (const cue of [
      "saya",
      "pribadi",
      "aku",
      "keluarga saya",
      "keluarga aku",
      "keluarga kami",
      "keluargaku",
    ])
      for (const text of [`${term}: ${cue}`, `${cue}: ${term}`])
        expect(isSensitiveIntakeText(text), text).toBe(true);
    for (const cue of [
      "keluarga",
      "kami",
      "keluarganya",
      "sayang",
      "pengakuan",
    ])
      for (const text of [`${term}: ${cue}`, `${cue}: ${term}`])
        expect(isSensitiveIntakeText(text), text).toBe(false);
  });
  it.each(["gejala", "hasil"])(
    "%s honors 60 intervening characters, full words, periods and newlines",
    (term) => {
      for (const [left, right] of [
        [term, "aku"],
        ["aku", term],
      ]) {
        expect(isSensitiveIntakeText(`${left}${"-".repeat(60)}${right}`)).toBe(
          true,
        );
        expect(isSensitiveIntakeText(`${left}${"-".repeat(61)}${right}`)).toBe(
          false,
        );
        for (const separator of [". ", "\n", "\r\n", "\r"])
          expect(isSensitiveIntakeText(`${left}${separator}${right}`)).toBe(
            false,
          );
        expect(isSensitiveIntakeText(`x${left} x${right}`)).toBe(false);
        expect(isSensitiveIntakeText(`${left}x ${right}x`)).toBe(false);
      }
      expect(isSensitiveIntakeText(`keluarga\nkami ${term}`)).toBe(false);
    },
  );
  it("exempts only a complete horizontal jantung kota occurrence, preserving every other trigger", () => {
    for (const text of [
      "Keluarga kami di JANTUNG  KOTA.",
      "Jantung\tkota untuk keluarga kami.",
    ])
      expect(isSensitiveIntakeText(text)).toBe(false);
    for (const text of [
      "Keluarga kami di jantung kota, jantung memburuk.",
      "Jantung memburuk, keluarga kami di jantung kota.",
      "Keluarga kami di jantung kotanya.",
      "Keluarga kami: jantung\nkota.",
      "Keluarga kami di jantung kota, gejala.",
      "Keluarga kami di jantung kota. Password: fictional-secret",
    ])
      expect(isSensitiveIntakeText(text), text).toBe(true);
    expect(isSensitiveIntakeText(`aku${"-".repeat(60)}jantung kota`)).toBe(
      false,
    );
    expect(isSensitiveIntakeText(`aku${"-".repeat(61)}jantung`)).toBe(false);
  });
  it.each([
    "Password: fictional-secret",
    "API key: fictional-key",
    "access_token: fictional",
    "nomor rekening 12345",
    "Nomor KTP 1234567890123456",
    "nomor kartu 1234 5678 9012 3456",
    "Rekam medis pasien: fiksi",
    "data pasien fiktif",
    "I tested positive",
    "I have cancer",
    "my test result",
    "Hasil tes HIV saya positif",
    "hello@example.test",
    "081234567890",
  ])("retains strong/contact protection: %s", (text) => {
    expect(isSensitiveIntakeText(text)).toBe(true);
    expect(isSensitiveIntakeText(`Paket keluarga. ${text}`)).toBe(true);
  });
  it("retains credential URL and recursive context protection without rejecting an ordinary public source", () => {
    for (const url of [
      "https://user:pass@kedai.example/",
      "https://kedai.example/?token=fictional",
      "https://kedai.example/?api_key=fictional",
    ])
      expect(unsafePublicSource(url)).toBe(true);
    expect(unsafePublicSource("https://kedai.example/menu")).toBe(false);
    expect(
      unsafeConfirmedContext({
        identity: { source: "https://kedai.example/menu" },
      }),
    ).toBe(false);
    expect(
      unsafeConfirmedContext({
        identity: { source: "https://kedai.example/?token=fictional" },
      }),
    ).toBe(true);
  });
});
