import { cn } from "@/lib/utils";

const TONE_STYLES = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 ring-rose-100 dark:text-rose-300",
  sky: "bg-sky-50 text-sky-700 ring-sky-100 dark:text-sky-300",
  violet: "bg-violet-50 text-violet-700 ring-violet-100 dark:text-violet-300",
  teal: "bg-teal-50 text-teal-700 ring-teal-100 dark:text-teal-300",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:text-indigo-300",
  orange: "bg-orange-50 text-orange-700 ring-orange-100 dark:text-orange-300",
  muted: "bg-ink-100 text-ink-500 ring-ink-200",
};

const DOT_STYLES = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
  orange: "bg-orange-500",
  muted: "bg-ink-400",
};

/**
 * Pill label with a status dot. `tone` maps to a semantic colour from the
 * design system; anything unknown falls back to "muted".
 */
export function Badge({ tone = "muted", children, className }) {
  const safe = TONE_STYLES[tone] ? tone : "muted";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        TONE_STYLES[safe],
        className
      )}
    >
      {DOT_STYLES[safe] ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[safe])}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}

export default Badge;