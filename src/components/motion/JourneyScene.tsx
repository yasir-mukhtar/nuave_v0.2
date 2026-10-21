"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  DURATION_EXIT,
  EASE_EXIT,
  EASE_STANDARD,
  SPRING_SETTLE,
} from "./presets";
import { useMotionAllowed } from "./useMotionAllowed";

/** +1 moves forward through the journey, -1 steps back. */
export type SceneDirection = 1 | -1;

/**
 * `slide`: a new step arrives from the side it is heading to. `fade`: the
 * next view belongs to the same question (J11 → J12), so it changes in place.
 */
export type SceneKind = "slide" | "fade";

type SceneCustom = { direction: SceneDirection; kind: SceneKind };

const sceneVariants = {
  enter: ({ direction, kind }: SceneCustom) =>
    kind === "fade" ? { opacity: 0, y: 6 } : { opacity: 0, x: direction * 28 },
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      x: SPRING_SETTLE,
      y: SPRING_SETTLE,
      opacity: { duration: 0.22, ease: EASE_STANDARD },
    },
  },
  exit: ({ direction, kind }: SceneCustom) => ({
    opacity: 0,
    ...(kind === "fade" ? {} : { x: direction * -18 }),
    transition: { duration: DURATION_EXIT, ease: EASE_EXIT },
  }),
};

/** Runs `onEnter` once, when this scene is the one on screen. */
function Arrival({
  onEnter,
  children,
}: {
  onEnter?: () => void;
  children: ReactNode;
}) {
  const entered = useRef(onEnter);
  useEffect(() => {
    entered.current?.();
  }, []);
  return <>{children}</>;
}

/**
 * One screen of the journey at a time. A new `sceneKey` slides the previous
 * screen out and the next one in, in the direction the person is moving, so
 * forward and back feel different without either feeling slow. `onEnter`
 * runs once the new screen is mounted (focus and scroll reset belong there,
 * not before the old screen has left). With reduced motion the screens
 * simply swap.
 */
export function JourneyScene({
  sceneKey,
  direction,
  kind = "slide",
  onEnter,
  className,
  children,
}: {
  sceneKey: string;
  direction: SceneDirection;
  kind?: SceneKind;
  onEnter?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const animate = useMotionAllowed();
  if (!animate)
    return (
      <div className={className} data-journey-scene={sceneKey}>
        <Arrival key={sceneKey} onEnter={onEnter}>
          {children}
        </Arrival>
      </div>
    );
  return (
    <AnimatePresence mode="wait" initial={false} custom={{ direction, kind }}>
      <motion.div
        key={sceneKey}
        className={className}
        data-journey-scene={sceneKey}
        custom={{ direction, kind }}
        variants={sceneVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <Arrival onEnter={onEnter}>{children}</Arrival>
      </motion.div>
    </AnimatePresence>
  );
}
