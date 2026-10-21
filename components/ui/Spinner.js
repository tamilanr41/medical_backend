import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
};

/** Brand spinner for loading states. */
export function Spinner({ size = "md", className, label = "Loading…" }) {
  return (
    <span role="status" className="inline-flex flex-col items-center gap-2">
      <span
        className={cn(
          "animate-spin rounded-full border-brand-300 border-t-brand-600",
          SIZES[size] ?? SIZES.md,
          className
        )}
        aria-hidden="true"
      />
      {label ? (
        <span className="text-[12px] font-medium text-ink-400">{label}</span>
      ) : null}
    </span>
  );
}

export default Spinner;