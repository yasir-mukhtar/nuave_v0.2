import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import styles from "./mention-dot.module.css";

/** The six looks of a question's result for one source (Spec 021, Figma
 * "Legends" 2011:24). Kept as a plain union so the product stays free of the
 * report data module. */
export type MentionLook =
  "noaio" | "none" | "cited" | "mentioned" | "recommended" | "failed";

/**
 * One dot. Rings are drawn inside the circle (no border), so the dash, the
 * centre dot and the check sit exactly in the middle at every size. The dot
 * is drawn for the eye; its meaning is given in words by the caller.
 */
export function MentionDot({
  look,
  size = "md",
  className,
}: {
  look: MentionLook;
  size?: "md" | "sm";
  className?: string;
}) {
  return (
    <span
      className={cn(styles.dot, size === "sm" && styles.sm, className)}
      data-look={look}
      aria-hidden="true"
    >
      {look === "recommended" ? (
        <IconCheck className={styles.check} stroke={3} />
      ) : null}
    </span>
  );
}
