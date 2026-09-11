import type { IntakeScreen } from "@/lib/audit/workflow-authority";

/**
 * Which intake screens render the recovered (prototype-shaped) surface.
 * Unlisted screens fall through to the existing renderer, so a partially
 * converted intake still runs end to end (recovery plan §6.0).
 */
export type IntakeSurface = ReadonlySet<IntakeScreen | "questions">;

/** What production serves. Empty until S6, then every screen. */
export const PRODUCTION_INTAKE_SURFACE: IntakeSurface = new Set();

/** What the preview route serves: the screens implemented so far. */
export const PREVIEW_INTAKE_SURFACE: IntakeSurface = new Set([
  "scope",
  "branch",
  "offerings",
  "review",
  "questions",
]);
