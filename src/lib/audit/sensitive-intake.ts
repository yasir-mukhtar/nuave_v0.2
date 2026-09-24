/** Conservative mechanical screen for free text retained in an audit. */
export function isSensitiveIntakeText(value: string): boolean {
  return /https?:\/\/|www\.|<[^>]*>|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\d(?:[\s-]?\d){12,18}|(?:\+62|0)8[\d\s-]{7,}|\b(?:api[_ -]?key|access[_ -]?token|password|kata sandi|nomor rekening|nomor ktp|ktp|cvv|cvc|nomor kartu|kartu kredit|credit card|rekam medis|data pasien|riwayat penyakit|medical record|diagnosis (?:saya|pasien)|hiv|aids)\b|(?:hasil|riwayat|kondisi|diagnosis|diagnosa|tes|test|lab|laboratorium|penyakit|gejala|obat)\b[^.\n]{0,60}?\b(?:saya|pribadi|keluarga)\b|\b(?:saya|pribadi|keluarga)\b[^.\n]{0,60}?\b(?:positif|negatif|kanker|diabetes|hiv|aids|didiagnosis|penyakit|stroke|jantung|depresi|gangguan jiwa|mental)\b|\bi (?:have|am|was|tested)\b[^.\n]{0,60}?\b(?:positive|negative|cancer|diabetes|hiv|aids)\b|\bmy\b[^.\n]{0,40}?\b(?:diagnosis|medical record|test result|hiv)\b/i.test(
    value,
  );
}

/** Public URLs can be retained, but credential-like parts cannot. */
export function unsafePublicSource(value: string): boolean {
  return (
    /https?:\/\/[^/?#]*@|[?&](?:api[_-]?key|access[_-]?token|token|password|secret|auth|session|code|key)=/i.test(
      value,
    ) ||
    isSensitiveIntakeText(
      value.replace(/^https?:\/\//i, "").replace(/^www\./i, ""),
    )
  );
}

export function unsafeConfirmedContext(value: unknown): boolean {
  function visit(item: unknown, key = ""): boolean {
    if (typeof item === "string")
      return key === "source"
        ? unsafePublicSource(item)
        : isSensitiveIntakeText(item);
    if (Array.isArray(item)) return item.some((child) => visit(child));
    if (item && typeof item === "object")
      return Object.entries(item).some(([childKey, child]) =>
        visit(child, childKey),
      );
    return false;
  }
  return visit(value);
}
