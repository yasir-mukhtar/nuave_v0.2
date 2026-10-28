"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

/**
 * Every Motion animation follows the visitor's reduced-motion setting: with
 * it on, movement and scaling are dropped and only fades remain. The journey
 * also checks the setting itself (`useMotionAllowed`); this is the net under
 * anything that does not.
 */
export function MotionPreferences({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
