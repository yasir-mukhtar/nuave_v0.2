/**
 * The short order number (spec 017 R-01): "NV-" and 6 characters without
 * look-alike letters (no 0, 1, I, L, O), such as `NV-7K3Q9P`. It is made by the
 * server, is unique through a unique index (a collision is retried), and
 * unlocks nothing (R-02). No imports, so the founder's support script can
 * bundle it.
 */

export const ORDER_NUMBER_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ORDER_NUMBER_PATTERN = /^NV-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

export function isOrderNumber(value: unknown): value is string {
  return typeof value === "string" && ORDER_NUMBER_PATTERN.test(value);
}

/** 6 characters, each drawn without bias (a byte above 247 is thrown away:
 * 248 is the largest multiple of 31 under 256). */
export function newOrderNumber(): string {
  const size = ORDER_NUMBER_ALPHABET.length;
  const limit = 256 - (256 % size);
  let characters = "";
  while (characters.length < 6) {
    for (const byte of crypto.getRandomValues(new Uint8Array(12))) {
      if (byte < limit && characters.length < 6) {
        characters += ORDER_NUMBER_ALPHABET[byte % size];
      }
    }
  }
  return `NV-${characters}`;
}

/** True when a database error is the unique index on the order number. */
export function isOrderNumberCollision(error: unknown): boolean {
  return (
    error instanceof Error &&
    /UNIQUE constraint failed:\s*orders\.order_number/i.test(error.message)
  );
}
