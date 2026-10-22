import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none max-sm:min-h-11 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
        // v2: near-black for normal steps, ember only for the commit moments.
        ink: "rounded-button bg-ink-900 text-white transition-[background-color,transform,opacity] duration-150 ease-(--motion-ease-standard) hover:bg-ink-800 active:not-aria-[haspopup]:translate-y-0 active:scale-[0.97] disabled:bg-line-200 disabled:text-ink-400 disabled:opacity-100",
        commit:
          "rounded-button bg-commit text-white transition-[background-color,transform,opacity] duration-150 ease-(--motion-ease-standard) hover:bg-commit-hover active:not-aria-[haspopup]:translate-y-0 active:scale-[0.97] disabled:bg-line-200 disabled:text-ink-400 disabled:opacity-100",
        inkOutline:
          "rounded-button border-[1.5px] border-ink-900 bg-white text-ink-900 transition-[background-color,transform] duration-150 ease-(--motion-ease-standard) hover:bg-stone-50 active:not-aria-[haspopup]:translate-y-0 active:scale-[0.97]",
        inkLink:
          "rounded-md px-1 text-ink-900 underline decoration-1 underline-offset-4 transition-[color,transform] duration-150 hover:text-ink-700 active:not-aria-[haspopup]:translate-y-0 active:scale-[0.97]",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8 max-sm:size-11",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg max-sm:size-11 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg max-sm:size-11",
        "icon-lg": "size-9 max-sm:size-11",
        // v2 thumb-sized actions: 56px with 18px labels, 48px with 16px.
        xl: "h-14 gap-2 px-6 text-lg font-semibold [&_svg:not([class*='size-'])]:size-5",
        touch:
          "h-12 gap-2 px-6 text-base font-semibold [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
