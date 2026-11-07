/**
 * Spec 024 F-08: the PDF's fonts are ready only when every PDF family has a
 * face in `document.fonts`, every such face has been asked to load,
 * `document.fonts.ready` has resolved, and no such face has status
 * "error". `document.fonts.check()` is not used: it returns true for a
 * family with no face in the set. A font that fails keeps the page not
 * ready (Q-9: fail closed).
 */

/** The first family of a CSS `font-family` value, unquoted: the name
 * next/font generated for the font. */
export function familyName(fontFamily: string): string {
  return (fontFamily.split(",")[0] ?? "").trim().replace(/^['"]|['"]$/g, "");
}

type FaceLike = Pick<FontFace, "family" | "status" | "load">;
type FaceSetLike = Iterable<FaceLike> & { ready: Promise<unknown> };

export async function pdfFontsReady(
  fonts: FaceSetLike,
  families: readonly string[],
): Promise<boolean> {
  const wanted = new Set(families.map(familyName));
  const faces = [...fonts].filter((face) => wanted.has(familyName(face.family)));
  await Promise.allSettled(faces.map((face) => face.load()));
  await fonts.ready;
  const present = new Set(faces.map((face) => familyName(face.family)));
  return (
    [...wanted].every((family) => present.has(family)) &&
    faces.every((face) => face.status !== "error")
  );
}
