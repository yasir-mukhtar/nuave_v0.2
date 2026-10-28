"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";

/**
 * The custom 3D miniatures from the v2 violet journey (Figma page 11),
 * served from `public/v2/3d/` as WebP at about twice their largest
 * on-screen size. The kedai is now a small clinic, built up across the three
 * steps; the names stay so every screen keeps its picture slot.
 */
export const ART = {
  /** Step 1: the bare clinic (business check). */
  kedaiBare: { src: "/v2/3d/kedai-bare.webp", width: 300, height: 211 },
  /** Step 2 cover: awning, chairs and scooter. */
  kedaiOpen: { src: "/v2/3d/kedai-open.webp", width: 390, height: 229 },
  /** Step 3 cover and landing hero: the busy clinic with AI chat bubbles. */
  kedaiBusy: { src: "/v2/3d/kedai-busy.webp", width: 390, height: 262 },
  magnifier: { src: "/v2/3d/magnifier.webp", width: 122, height: 117 },
  phoneChat: { src: "/v2/3d/phone-chat.webp", width: 141, height: 314 },
  website: { src: "/v2/3d/website.webp", width: 300, height: 216 },
  form: { src: "/v2/3d/form.webp", width: 64, height: 78 },
  magnifierCheck: { src: "/v2/3d/magnifier-check.webp", width: 92, height: 64 },
  envelope: { src: "/v2/3d/envelope.webp", width: 153, height: 183 },
  /* The three J11 option pictures keep Figma's clear space (untrimmed), so
     the card's 64 x 64 contain box shows them at Figma's size. */
  focusBrand: { src: "/v2/3d/focus-brand.webp", width: 62, height: 64 },
  focusBranch: { src: "/v2/3d/focus-branch.webp", width: 57, height: 64 },
  focusProduct: { src: "/v2/3d/focus-product.webp", width: 51, height: 64 },
} as const;

export type ArtName = keyof typeof ART;

/**
 * One miniature. Decorative by default (the words around it carry the
 * meaning). `enter` lets it settle in with a soft rise and scale the first
 * time it appears; reduced motion shows it in place.
 */
export function Art({
  name,
  width,
  height,
  className,
  enter = false,
  delay = 0,
  priority = false,
}: {
  name: ArtName;
  width?: number;
  height?: number;
  className?: string;
  enter?: boolean;
  delay?: number;
  priority?: boolean;
}) {
  const animate = useMotionAllowed();
  const art = ART[name];
  const w = width ?? art.width;
  const h = height ?? Math.round((art.height / art.width) * w);
  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- static art from /public, sized on purpose
    <img
      src={art.src}
      width={w}
      height={h}
      alt=""
      aria-hidden="true"
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      draggable={false}
      className={cn(
        "pointer-events-none select-none object-contain",
        className,
      )}
    />
  );
  if (!enter || !animate) return image;
  return (
    <motion.span
      className="inline-flex"
      initial={{ opacity: 0, y: 12, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING_SETTLE, delay }}
    >
      {image}
    </motion.span>
  );
}
