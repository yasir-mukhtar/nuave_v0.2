import React, { forwardRef } from "react";
import clsx from "clsx";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "brand" | "default" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-base ease-out focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.985] cursor-pointer select-none";

    const variantStyles = {
      brand:
        "bg-brand text-white hover:bg-brand-dark border border-transparent shadow-subtle",
      default:
        "bg-page border border-border-default text-text-body hover:bg-surface hover:border-border-strong hover:text-text-heading shadow-subtle",
      secondary:
        "bg-surface-raised border border-transparent text-text-body hover:bg-neutral hover:text-text-heading",
      ghost:
        "bg-transparent border border-transparent text-text-muted hover:bg-surface hover:text-text-heading",
      destructive:
        "bg-error text-white hover:bg-red-700 border border-transparent shadow-subtle",
    }[variant];

    const sizeStyles = {
      sm: "h-8 px-2.5 text-xs rounded-sm min-h-[32px]",
      default: "h-10 px-4 text-sm rounded-sm min-h-[40px]",
      lg: "h-12 px-6 text-base rounded-md min-h-[48px]",
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(baseStyles, variantStyles, sizeStyles, className)}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
