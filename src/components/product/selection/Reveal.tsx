"use client";

import * as React from "react";
import { Collapsible } from "@base-ui/react";
import styles from "./selection.module.css";

/**
 * Progressive disclosure (R-27). Works controlled (`open` + `onOpenChange`)
 * or uncontrolled (`defaultOpen`); the trigger is optional so a selection
 * elsewhere can drive the panel.
 */
export function Reveal({
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  children,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(nextOpen) => onOpenChange?.(nextOpen)}
    >
      {trigger ? (
        <Collapsible.Trigger className={styles.revealTrigger}>
          {trigger}
        </Collapsible.Trigger>
      ) : null}
      <Collapsible.Panel className={styles.revealPanel}>
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
