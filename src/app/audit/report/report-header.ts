/**
 * Spec 012 R-12 (B1): the header's observation date/range comes only from the
 * retained answers' `observed_at` instants, shown in one named display
 * timezone. Report creation time (`generated_at`) is never used here.
 */
export const REPORT_DISPLAY_TIMEZONE = "UTC" as const;

export type ObservationWindow = { start: string; end: string };

/**
 * Earliest and latest retained instants. The input order is left untouched;
 * any unparsable value makes the window unavailable instead of guessing.
 */
export function observationWindow(
  observedAt: readonly string[],
): ObservationWindow | null {
  if (!observedAt.length) return null;
  const instants = observedAt.map((value) => Date.parse(value));
  if (instants.some((value) => !Number.isFinite(value))) return null;
  let start = 0;
  let end = 0;
  instants.forEach((value, index) => {
    if (value < instants[start]) start = index;
    if (value > instants[end]) end = index;
  });
  return { start: observedAt[start], end: observedAt[end] };
}

const day = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeZone: REPORT_DISPLAY_TIMEZONE,
});
const clock = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: REPORT_DISPLAY_TIMEZONE,
});

/** `25 September 2026, 04.10–04.12 UTC` or a two-day range. */
export function formatObservationWindow(window: ObservationWindow): string {
  const start = new Date(window.start);
  const end = new Date(window.end);
  const startDay = day.format(start);
  const endDay = day.format(end);
  const zone = REPORT_DISPLAY_TIMEZONE;
  if (startDay !== endDay)
    return `${startDay}, ${clock.format(start)} – ${endDay}, ${clock.format(end)} ${zone}`;
  const startClock = clock.format(start);
  const endClock = clock.format(end);
  return startClock === endClock
    ? `${startDay}, ${startClock} ${zone}`
    : `${startDay}, ${startClock}–${endClock} ${zone}`;
}
