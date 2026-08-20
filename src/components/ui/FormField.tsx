import React, { forwardRef, useId } from "react";
import clsx from "clsx";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  accessory?: React.ReactNode;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      label,
      hint,
      error,
      required = false,
      accessory,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    const id = useId();
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    return (
      <div
        ref={ref}
        className={clsx("flex flex-col gap-1.5", className)}
        {...props}
      >
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={id}
            className="text-xs font-semibold text-text-heading select-none cursor-default"
          >
            {label}
            {required && <span className="text-error ml-0.5">*</span>}
          </label>
          {accessory && <div>{accessory}</div>}
        </div>

        <div>{children}</div>

        {error ? (
          <p
            id={errorId}
            role="alert"
            className="text-xs text-error font-medium"
          >
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

FormField.displayName = "FormField";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        className={clsx(
          "w-full h-11 min-h-[44px] px-3 text-sm bg-page text-text-heading placeholder:text-text-placeholder rounded-sm border border-border-default transition-[border-color,box-shadow] duration-fast ease-out",
          "focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface",
          error && "border-error focus:border-error focus:ring-error",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
