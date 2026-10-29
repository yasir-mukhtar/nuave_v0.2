/** Plain text from a fragment of page markup: tags dropped, entities decoded. */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(x[\da-f]+|\d+);?/gi, (_match, digits: string) => {
      const radix = digits.toLowerCase().startsWith("x") ? 16 : 10;
      const number = Number.parseInt(
        radix === 16 ? digits.slice(1) : digits,
        radix,
      );
      return Number.isInteger(number) && number >= 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : "";
    })
    .replace(/&([a-z][a-z\d]+);?/gi, (match, name: string) => {
      return NAMED_ENTITIES[name.toLowerCase()] ?? match;
    });
}

export function cleanText(value: string | undefined): string {
  if (!value) return "";
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}
