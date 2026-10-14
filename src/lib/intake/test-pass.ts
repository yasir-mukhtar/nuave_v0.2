/**
 * Spec 017 R-20 (Q6): the founder test pass code. It is typed on `/uji`, kept in
 * session storage for that tab only (never local storage, never a URL, never a
 * cookie) and sent only in the body of the order request. Storage can be
 * blocked: every access is guarded and a failure means "no code".
 */
export const TEST_PASS_STORAGE_KEY = "nuave.testPass.v1" as const;

function tabStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readTestPassCode(): string | null {
  try {
    return tabStorage()?.getItem(TEST_PASS_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/** True when the code was kept (storage works). */
export function writeTestPassCode(code: string): boolean {
  try {
    const storage = tabStorage();
    if (!storage) return false;
    storage.setItem(TEST_PASS_STORAGE_KEY, code);
    return true;
  } catch {
    return false;
  }
}
