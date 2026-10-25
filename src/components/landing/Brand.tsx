import { NuaveMark } from "@/components/product/journey/NuaveLogo";
import { cn } from "@/lib/utils";
import styles from "./Brand.module.css";

/** The landing's logo as drawn in Figma: the violet mark and "Nuave". */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn(styles.brand, className)}>
      <NuaveMark className={styles.mark} />
      <span className={styles.name}>Nuave</span>
    </span>
  );
}
