"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";

/**
 * The custom 3D miniatures from the v2 kit, served from `public/v2/3d/` as
 * WebP at twice their largest on-screen size. Names follow what each object
 * shows; the kedai is the same shop built up across the three steps.
 */
export const ART = {
  /** Step 1: the bare shop (business check). */
  kedaiBare: { src: "/v2/3d/kedai-bare.webp", width: 300, height: 218 },
  /** Step 2 cover: awning, chairs and scooter. */
  kedaiOpen: { src: "/v2/3d/kedai-open.webp", width: 390, height: 241 },
  /** Step 3 cover and landing hero: the busy shop with AI chat bubbles. */
  kedaiBusy: { src: "/v2/3d/kedai-busy.webp", width: 390, height: 277 },
  magnifier: { src: "/v2/3d/magnifier.webp", width: 122, height: 127 },
  phoneChat: { src: "/v2/3d/phone-chat.webp", width: 150, height: 242 },
  website: { src: "/v2/3d/website.webp", width: 300, height: 246 },
  form: { src: "/v2/3d/form.webp", width: 92, height: 76 },
  magnifierCheck: { src: "/v2/3d/magnifier-check.webp", width: 92, height: 67 },
  envelope: { src: "/v2/3d/envelope.webp", width: 260, height: 240 },
  focusBrand: { src: "/v2/3d/focus-brand.webp", width: 64, height: 67 },
  focusBranch: { src: "/v2/3d/focus-branch.webp", width: 64, height: 73 },
  focusProduct: { src: "/v2/3d/focus-product.webp", width: 64, height: 82 },
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
