"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BedDouble,
  CalendarDays,
  DatabaseZap,
  DoorOpen,
  FileText,
  FlaskConical,
  Inbox,
  Pill,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  activity: Activity,
  bed: BedDouble,
  door: DoorOpen,
  flask: FlaskConical,
  pill: Pill,
  file: FileText,
};

const TONES = {
  brand: "bg-brand-50 text-brand-600 dark:text-brand-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-50 text-rose-600 dark:text-rose-400",
  violet: "bg-violet-50 text-violet-600 dark:text-violet-400",
};

const STATUS_STYLES = {
  Closed: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:text-emerald-300",
  Open: "bg-amber-50 text-amber-700 ring-amber-100 dark:text-amber-300",
  Received: "bg-brand-50 text-brand-700 ring-brand-100 dark:text-brand-300",
  Processing: "bg-amber-50 text-amber-700 ring-amber-100 dark:text-amber-300",
  Reported: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:text-emerald-300",
  Admitted: "bg-violet-50 text-violet-700 ring-violet-100 dark:text-violet-300",
  Discharged: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:text-emerald-300",
  Emergency: "bg-rose-50 text-rose-700 ring-rose-100 dark:text-rose-300",
  Elective: "bg-brand-50 text-brand-700 ring-brand-100 dark:text-brand-300",
  Home: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:text-emerald-300",
};

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatValue(kpi) {
  return kpi.format === "currency"
    ? money(kpi.value)
    : Number(kpi.value || 0).toLocaleString("en-IN");
}

function StatusChip({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Received;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        style
      )}
    >
      {status || "—"}
    </span>
  );
}

function KpiChip({ kpi }) {
  const Icon = ICONS[kpi.icon] || Activity;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-panel px-4 py-3 shadow-[var(--shadow-card)]">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          TONES[kpi.tone]
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[19px] font-bold tracking-tight text-ink-900 tabular-nums">
          {formatValue(kpi)}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
          {kpi.label}
        </p>
      </div>
    </div>
  );
}

function SectionCard({ section }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-ink-200 bg-panel shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-ink-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-500">
            {section.moduleTitle}
          </span>
          <h2 className="text-[14px] font-bold text-ink-900">{section.title}</h2>
          <span className="text-[12px] font-semibold text-ink-400 tabular-nums">
            {section.count}
          </span>
        </div>
        <Link
          href={`/${section.module}`}
          className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {section.rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Inbox className="h-6 w-6 text-ink-300" aria-hidden="true" />
          <p className="text-[13px] text-ink-400">{section.empty}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-[11px] uppercase tracking-wide text-ink-400">
                {section.columns.map((column) => (
                  <th key={column} scope="col" className="px-4 py-2.5 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-ink-100 transition last:border-0 hover:bg-brand-50/40"
                >
                  <td className="px-4 py-2.5 font-mono text-[12.5px] text-ink-500">
                    {row.token}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-ink-800">{row.name}</p>
                    <p className="font-mono text-[11px] text-ink-400">{row.meta}</p>
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">{row.department}</td>
                  <td className="px-4 py-2.5 text-ink-600">{row.doctor}</td>
                  <td className="px-4 py-2.5">
                    {row.amount !== undefined ? (
                      <span className="font-mono font-semibold text-ink-800 tabular-nums">
                        {money(row.amount)}
                      </span>
                    ) : (
                      <StatusChip status={row.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Unavailable() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-ink-200 bg-panel px-6 py-16 text-center shadow-[var(--shadow-card)]">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:text-amber-400">
        <DatabaseZap className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="text-[16px] font-bold text-ink-900">{`Today's digest unavailable`}</h2>
      <p className="max-w-md text-[13px] text-ink-500">
        {`This screen reads today's`} operational data from MongoDB, which is not
        reachable right now. It will populate once the connection is restored.
      </p>
    </div>
  );
}

export default function TodayView({ user, data }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  if (!data.available) {
    return (
      <div className="space-y-6">
        <TodayHeader
          todayLabel={todayLabel}
          userName={user.name}
          onRefresh={() => startTransition(() => router.refresh())}
          pending={pending}
        />
        <Unavailable />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TodayHeader
        todayLabel={todayLabel}
        userName={user.name}
        onRefresh={() => startTransition(() => router.refresh())}
        pending={pending}
      />

      {data.kpis.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {data.kpis.map((kpi) => (
            <KpiChip key={kpi.key} kpi={kpi} />
          ))}
        </div>
      ) : null}

      <div className="space-y-5">
        {data.sections.map((section) => (
          <SectionCard key={section.key} section={section} />
        ))}
      </div>
    </div>
  );
}

function TodayHeader({ todayLabel, userName, onRefresh, pending }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
          {todayLabel}
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-[22px] font-bold tracking-tight text-ink-900 sm:text-[26px]">
          Today
          <CalendarDays className="h-6 w-6 text-brand-500" aria-hidden="true" />
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-500">
          Everything logged today for {userName}
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-panel px-3.5 py-2 text-[13px] font-semibold text-ink-600 shadow-sm transition hover:border-ink-300 hover:text-ink-900 disabled:opacity-60"
      >
        <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} aria-hidden="true" />
        Refresh
      </button>
    </div>
  );
}