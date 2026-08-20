import React, { forwardRef } from "react";
import clsx from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "surface" | "interactive";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const baseStyles =
      "rounded-md border border-border-default transition-colors";

    const variantStyles = {
      default: "bg-page text-text-heading shadow-card",
      surface: "bg-surface text-text-heading",
      interactive:
        "bg-page text-text-heading shadow-card hover:border-border-strong hover:shadow-subtle cursor-pointer",
    }[variant];

    return (
      <div
        ref={ref}
        className={clsx(baseStyles, variantStyles, className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
