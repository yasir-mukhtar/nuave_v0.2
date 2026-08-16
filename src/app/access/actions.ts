"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AccessState = { error: string | null };

/**
 * Compares the submitted code against the server-only `NUAVE_ACCESS_CODE`.
 * On match, sets the httpOnly `nuave_access` cookie (~30 days) and redirects
 * to `/audit`. On mismatch, returns an error state for the form to show.
 */
export async function verifyAccessCode(
  _prev: AccessState,
  formData: FormData,
): Promise<AccessState> {
  const code = String(formData.get("code") ?? "");
  const expected = process.env.NUAVE_ACCESS_CODE;

  if (!expected || code !== expected) {
    return { error: "Kode tidak sesuai." };
  }

  const cookieStore = await cookies();
  cookieStore.set("nuave_access", code, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect("/audit");
}
