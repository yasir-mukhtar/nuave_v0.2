/**
 * Shared motion values for the v2 journey (Airbnb benchmark): quick, soft
 * springs that settle without bouncing on ordinary steps, a little overshoot
 * only for small confirmations (a tick, a badge). Durations mirror the
 * `--motion-*` tokens in `src/styles/tokens.css`.
 */
export const EASE_STANDARD = [0.2, 0, 0, 1] as const;
export const EASE_EXIT = [0.4, 0, 1, 1] as const;

/** Screen content and cards settling into place. */
export const SPRING_SETTLE = {
  type: "spring",
  stiffness: 380,
  damping: 36,
  mass: 1,
} as const;

/** Bottom sheets: a confident rise that does not wobble. */
export const SPRING_SHEET = {
  type: "spring",
  stiffness: 420,
  damping: 40,
  mass: 0.9,
} as const;

/** Small confirmations (check badges, chips dropping in). */
export const SPRING_POP = {
  type: "spring",
  stiffness: 520,
  damping: 22,
  mass: 0.8,
} as const;

export const DURATION_FAST = 0.15;
export const DURATION_BASE = 0.25;
export const DURATION_EXIT = 0.12;
