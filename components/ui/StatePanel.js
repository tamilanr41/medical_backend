import { cn } from "@/lib/utils";

const TONES = {
  info: {
    panel: "bg-navy-50 border-navy-100",
    icon: "bg-navy-100 text-navy-700",
    title: "text-navy-900",
    body: "text-navy-800/80",
  },
  warning: {
    panel: "bg-amber-50 border-amber-100",
    icon: "bg-amber-100 text-amber-700",
    title: "text-amber-900",
    body: "text-amber-800/80",
  },
  danger: {
    panel: "bg-rose-50 border-rose-100",
    icon: "bg-rose-100 text-rose-700",
    title: "text-rose-900",
    body: "text-rose-800/80",
  },
  neutral: {
    panel: "bg-panel border-ink-200 shadow-[var(--shadow-card)]",
    icon: "bg-ink-100 text-ink-600",
    title: "text-ink-900",
    body: "text-ink-500",
  },
};

/**
 * Professional inline state panel used for permission errors, disabled
 * modules, development placeholders and page-level errors.
 */
export default function StatePanel({
  icon: Icon,
  eyebrow,
  title,
  description,
  details,
  tone = "neutral",
  actions,
  className,
}) {
  const toneClasses = TONES[tone] ?? TONES.neutral;

  return (
    <section
      className={cn(
        "anim-fade-up rounded-2xl border p-6 sm:p-8",
        toneClasses.panel,
        className
      )}
      aria-labelledby="state-panel-title"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {Icon ? (
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              toneClasses.icon
            )}
            aria-hidden="true"
          >
            <Icon className="h-6 w-6" />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">
              {eyebrow}
            </p>
          ) : null}
          <h1
            id="state-panel-title"
            className={cn(
              "mt-1 text-xl font-semibold tracking-tight sm:text-2xl",
              toneClasses.title
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className={cn("mt-2 max-w-2xl text-sm leading-relaxed", toneClasses.body)}>
              {description}
            </p>
          ) : null}

          {details?.length ? (
            <dl className="mt-4 grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2">
              {details.map((detail) => (
                <div
                  key={detail.label}
                  className="flex items-center justify-between gap-4 border-b border-black/10 pb-1.5"
                >
                  <dt className="font-medium opacity-70">{detail.label}</dt>
                  <dd className="font-semibold tabular-nums">{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {actions ? (
            <div className="mt-5 flex flex-wrap gap-3">{actions}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
