"use client";

import { forwardRef, useId, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const boxClass =
  "group/field relative grid w-full gap-0.5 rounded-input border border-line-300 bg-white px-4 py-2.5 text-left transition-[border-color,box-shadow] duration-150 ease-(--motion-ease-standard) focus-within:border-ink-900 focus-within:shadow-(--edge-ink) has-[[aria-invalid=true]]:border-error-edge has-[[aria-invalid=true]]:shadow-(--edge-error)";

const controlClass =
  "h-auto min-h-0 w-full rounded-none border-0 bg-transparent p-0 text-base text-ink-900 shadow-none outline-none placeholder:text-ink-500 focus-visible:border-0 focus-visible:ring-0 aria-invalid:ring-0 md:text-base";

/**
 * The v2 field ("v2/Field"): the label sits small inside the box and the
 * value below it, so a filled form still reads at a glance. Focus draws the
 * 2px ink edge; an error draws it in red with the message underneath.
 */
export const FloatingField = forwardRef<
  HTMLInputElement,
  {
    label: string;
    hint?: ReactNode;
    error?: string | null;
    leading?: ReactNode;
    trailing?: ReactNode;
    className?: string;
  } & Omit<React.ComponentProps<"input">, "className">
>(function FloatingField(
  { label, hint, error, leading, trailing, className, id, ...input },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={inputId} className={boxClass}>
        <span className="type-label-sm text-ink-500">{label}</span>
        <span className="flex items-center gap-2">
          {leading}
          <Input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              [error ? errorId : null, hint ? hintId : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={controlClass}
            {...input}
          />
          {trailing}
        </span>
      </label>
      {error ? (
        <p id={errorId} role="alert" className="type-copy-sm m-0 text-error">
          {error}
        </p>
      ) : null}
      {hint ? (
        <div id={hintId} className="type-copy-sm m-0 text-ink-500">
          {hint}
        </div>
      ) : null}
    </div>
  );
});

/**
 * Multi-line v2 field (J22, J28): grows with its text, shows a counter and
 * an optional provenance tag in its footer.
 */
export const FloatingTextarea = forwardRef<
  HTMLTextAreaElement,
  {
    label?: string;
    labelHidden?: boolean;
    hint?: ReactNode;
    error?: string | null;
    footer?: ReactNode;
    maxLength: number;
    value: string;
    className?: string;
  } & Omit<React.ComponentProps<"textarea">, "className" | "value">
>(function FloatingTextarea(
  {
    label,
    labelHidden = false,
    hint,
    error,
    footer,
    maxLength,
    value,
    className,
    id,
    ...textarea
  },
  ref,
) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const hintId = `${textareaId}-hint`;
  const errorId = `${textareaId}-error`;
  return (
    <div className={cn("grid gap-2", className)}>
      <label
        htmlFor={textareaId}
        className={cn(boxClass, "gap-2 rounded-tile px-4 pt-3.5 pb-3")}
      >
        {label ? (
          <span
            className={cn(
              "type-label-sm text-ink-500",
              labelHidden && "sr-only",
            )}
          >
            {label}
          </span>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          rows={2}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className="type-copy field-sizing-content min-h-12 w-full resize-none border-0 bg-transparent p-0 text-ink-900 outline-none placeholder:text-ink-500"
          {...textarea}
        />
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0">{footer}</span>
          <span
            className="type-caption shrink-0 text-ink-500 tabular-nums"
            aria-hidden="true"
          >
            {value.length}/{maxLength}
          </span>
        </span>
      </label>
      {error ? (
        <p id={errorId} role="alert" className="type-copy-sm m-0 text-error">
          {error}
        </p>
      ) : null}
      {hint ? (
        <div id={hintId} className="type-copy-sm m-0 text-ink-500">
          {hint}
        </div>
      ) : null}
    </div>
  );
});
