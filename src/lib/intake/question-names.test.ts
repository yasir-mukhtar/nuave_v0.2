import { describe, expect, it } from "vitest";
import { nameRanges, withoutNames } from "./SmartQuestionsScreen";

/** The marked text of each range, for readable expectations. */
function marked(text: string, ranges: ReturnType<typeof nameRanges>) {
  return ranges.map((range) => [
    text.slice(range.start, range.end),
    range.kind,
  ]);
}

describe("nameRanges (J28 name marks)", () => {
  it("finds the business name as whole words, in any case", () => {
    const text = "Ada rekomendasi kedai fiksi atau Kedai Fiksi lain di Dago?";
    expect(marked(text, nameRanges(text, ["Kedai Fiksi"], []))).toEqual([
      ["kedai fiksi", "own"],
      ["Kedai Fiksi", "own"],
    ]);
    expect(nameRanges(text, ["Kedai Fiksi"], [])[0]).toEqual({
      start: 16,
      end: 27,
      kind: "own",
    });
  });

  it("finds other names, the website address and comparison businesses", () => {
    const text =
      "Apakah KPF atau kedai-fiksi.example lebih murah dari Kopi Saingan?";
    expect(
      marked(
        text,
        nameRanges(
          text,
          ["Kedai Pelangi Fiksi", "KPF", "kedai-fiksi.example"],
          ["Kopi Saingan"],
        ),
      ),
    ).toEqual([
      ["KPF", "own"],
      ["kedai-fiksi.example", "own"],
      ["Kopi Saingan", "comparator"],
    ]);
  });

  it("never marks a name inside a longer word", () => {
    expect(
      nameRanges("Kedai fiksional mana yang buka malam?", ["Fiksi"], []),
    ).toEqual([]);
    expect(
      nameRanges("Mana kedai kopi sefiksi itu?", ["Fiksi"], ["Kopi"]),
    ).toEqual([{ start: 11, end: 15, kind: "comparator" }]);
  });

  it("keeps only the longest of overlapping names", () => {
    const text = "Menu Kedai Fiksi Dago apa saja?";
    expect(
      marked(text, nameRanges(text, ["Fiksi", "Kedai Fiksi Dago"], ["Dago"])),
    ).toEqual([["Kedai Fiksi Dago", "own"]]);
  });

  it("ignores names too short to tell apart", () => {
    expect(nameRanges("AB kopi enak di mana?", ["AB", ""], ["  "])).toEqual([]);
  });
});

describe("withoutNames (J28 Hapus nama)", () => {
  it("takes the name out with the atau that joined it", () => {
    const text = "Ada rekomendasi Kedai Fiksi atau kedai kopi lain di Dago?";
    expect(withoutNames(text, nameRanges(text, ["Kedai Fiksi"], []))).toBe(
      "Ada rekomendasi kedai kopi lain di Dago?",
    );
  });

  it("takes a joining dan before a name at the end, and tidies the space before ?", () => {
    const text = "Bandingkan kedai kopi di Dago dan Kedai Fiksi?";
    expect(withoutNames(text, nameRanges(text, ["Kedai Fiksi"], []))).toBe(
      "Bandingkan kedai kopi di Dago?",
    );
  });

  it("removes several names in one go", () => {
    const text =
      "Kedai Fiksi dan kedai kopi di Dago maupun Kopi Saingan, mana yang buka 24 jam?";
    expect(
      withoutNames(text, nameRanges(text, ["Kedai Fiksi"], ["Kopi Saingan"])),
    ).toBe("kedai kopi di Dago, mana yang buka 24 jam?");
  });

  it("closes the gap a name leaves inside a sentence", () => {
    const text = "Apa menu Kedai Fiksi yang paling terkenal ?";
    expect(withoutNames(text, nameRanges(text, ["Kedai Fiksi"], []))).toBe(
      "Apa menu yang paling terkenal?",
    );
  });
});
