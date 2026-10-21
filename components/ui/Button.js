import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:pointer-events-none disabled:opacity-55 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-[var(--shadow-lift)]",
        secondary:
          "border border-ink-200 bg-panel text-ink-700 shadow-sm hover:border-ink-300 hover:bg-ink-50",
        soft: "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-200",
        ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
        danger:
          "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-3.5 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export default Button;
