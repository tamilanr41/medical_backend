"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  CalendarClock,
  ClipboardList,
  DatabaseZap,
  DoorOpen,
  FileText,
  FlaskConical,
  PackageSearch,
  Pill,
  Receipt,
  RefreshCw,
  Siren,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";

const ICONS = {
  users: Users,
  activity: Activity,
  receipt: Receipt,
  bed: BedDouble,
  door: DoorOpen,
  siren: Siren,
  flask: FlaskConical,
  clipboard: ClipboardList,
  pill: Pill,
  file: FileText,
};

const TONES = {
  brand: {
    chip: "bg-brand-50 text-brand-600 dark:text-brand-400",
    bar: "bg-brand-500",
    stroke: "#1d6ff5",
  },
  emerald: {
    chip: "bg-emerald-50 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    stroke: "#10b981",
  },
  amber: {
    chip: "bg-amber-50 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    stroke: "#f59e0b",
  },
  rose: {
    chip: "bg-rose-50 text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
    stroke: "#f43f5e",
  },
  violet: {
    chip: "bg-violet-50 text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
    stroke: "#8b5cf6",
  },
};

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatValue(kpi) {
  return kpi.format === "currency"
    ? formatMoney(kpi.value)
    : Number(kpi.value || 0).toLocaleString("en-IN");
}

function KpiCard({ kpi }) {
  const Icon = ICONS[kpi.icon] || Activity;
  const tone = TONES[kpi.tone] || TONES.brand;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-ink-200 bg-panel p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-ink-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            {kpi.label}
          </p>
          <p className="mt-1.5 text-[24px] font-bold leading-none tracking-tight text-ink-900 tabular-nums">
            {formatValue(kpi)}
          </p>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tone.chip
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-400">
        {kpi.detail !== undefined ? (
          <span className="font-mono tabular-nums text-ink-500">
            {formatMoney(kpi.detail)}
          </span>
        ) : null}
        <span className={cn(kpi.detail !== undefined && "text-ink-300")}>
          {kpi.hint}
        </span>
      </p>
    </div>
  );
}

function Card({ children, className }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-200 bg-panel p-5 shadow-[var(--shadow-card)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
        <div className="leading-tight">
          <h2 className="text-[14px] font-bold text-ink-900">{title}</h2>
          {subtitle ? (
            <p className="text-[11.5px] text-ink-400">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-lg border border-ink-200 bg-panel px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </p>
      <p className="text-[14px] font-bold text-ink-900 tabular-nums">
        {currency ? formatMoney(value) : `${value} visits`}
      </p>
    </div>
  );
}

function TrendChart({ data }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const grid = dark ? "#1f2b3f" : "#eceef2";
  const axis = dark ? "#8a97ac" : "#7a8698";

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        icon={TrendingUp}
        title="Out-Patient Footfall"
        subtitle="Consultations over the last 7 days"
      />
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="opTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d6ff5" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#1d6ff5" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: axis, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: axis, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: grid }} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#1d6ff5"
              strokeWidth={2.5}
              fill="url(#opTrend)"
              dot={{ r: 3, fill: "#1d6ff5", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function DepartmentChart({ data }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const grid = dark ? "#1f2b3f" : "#eceef2";
  const axis = dark ? "#8a97ac" : "#7a8698";

  return (
    <Card>
      <CardHeader
        icon={Activity}
        title="Department Load"
        subtitle="OP visits · last 30 days"
      />
      {data.length === 0 ? (
        <EmptyNote label="No department activity recorded." />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="department"
                tick={{ fill: axis, fontSize: 11.5 }}
                axisLine={false}
                tickLine={false}
                width={104}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: grid }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
                {data.map((entry, index) => (
                  <Cell
                    key={entry.department}
                    fill={["#1d6ff5", "#59afff", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e"][index % 6]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function ActivityFeed({ items }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader
        icon={CalendarClock}
        title="Recent Activity"
        subtitle="Latest operational events across your modules"
      />
      {items.length === 0 ? (
        <EmptyNote label="No recent activity to display." />
      ) : (
        <ul className="divide-y divide-ink-100">
          {items.map((item) => {
            const tone = TONES[item.tone] || TONES.brand;
            return (
              <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.bar)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink-800">
                    {item.title}
                  </p>
                  <p className="truncate text-[11.5px] text-ink-400">
                    {item.kind}
                    {item.meta ? ` · ${item.meta}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-right">
                  {item.amount !== undefined ? (
                    <span className="block font-mono text-[12.5px] font-semibold text-ink-700 tabular-nums">
                      {formatMoney(item.amount)}
                    </span>
                  ) : null}
                  <span className="block text-[11px] text-ink-400">{item.date}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function StockWatch({ stock }) {
  if (!stock) return null;
  const { lowStock, expiring } = stock;
  const healthy = lowStock.length === 0 && expiring.length === 0;

  return (
    <Card className="lg:col-span-1">
      <CardHeader
        icon={PackageSearch}
        title="Pharmacy Stock Watch"
        subtitle="Reorder & expiry alerts"
        action={
          <Link
            href="/pharmacy/reports/stock-reports"
            className="text-[12px] font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
          >
            View
          </Link>
        }
      />
      {healthy ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <PackageSearch className="h-8 w-8 text-ink-300" aria-hidden="true" />
          <p className="text-[13px] font-medium text-ink-600">Stock levels healthy</p>
          <p className="text-[12px] text-ink-400">No reorder or expiry alerts.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {lowStock.length > 0 ? (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Low Stock
              </p>
              <ul className="space-y-1.5">
                {lowStock.map((row) => (
                  <li key={row.itemCode} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[13px] text-ink-700">
                      {row.medicineName}
                    </span>
                    <span className="shrink-0 font-mono text-[12px] font-semibold text-amber-600 tabular-nums dark:text-amber-400">
                      {row.quantity}/{row.reorderLevel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {expiring.length > 0 ? (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                Expiring Soon
              </p>
              <ul className="space-y-1.5">
                {expiring.map((row) => (
                  <li key={row.batchNo} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[13px] text-ink-700">
                      {row.medicineName}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[12px] font-semibold tabular-nums",
                        row.expired
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-ink-500"
                      )}
                    >
                      {row.expiryDate}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function EmptyNote({ label }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <PackageSearch className="h-7 w-7 text-ink-300" aria-hidden="true" />
      <p className="text-[13px] text-ink-400">{label}</p>
    </div>
  );
}

function UnavailableState() {
  return (
    <Card className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:text-amber-400">
        <DatabaseZap className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="text-[16px] font-bold text-ink-900">Live analytics unavailable</h2>
      <p className="max-w-md text-[13px] text-ink-500">
        The dashboard reads live operational data from MongoDB, which is not
        reachable right now. Once the database connection is restored the
        metrics will populate automatically.
      </p>
    </Card>
  );
}

export default function DashboardView({ user, data }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

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

  const refresh = () => startTransition(() => router.refresh());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
            {todayLabel}
          </p>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-ink-900 sm:text-[26px]">
            {greeting}, {user.name}
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Here is a live snapshot of hospital operations for your role.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-panel px-3.5 py-2 text-[13px] font-semibold text-ink-600 shadow-sm transition hover:border-ink-300 hover:text-ink-900 disabled:opacity-60"
        >
          <RefreshCw
            className={cn("h-4 w-4", pending && "animate-spin")}
            aria-hidden="true"
          />
          Refresh
        </button>
      </div>

      {!data.available ? (
        <UnavailableState />
      ) : (
        <>
          {data.kpis.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.kpis.map((kpi) => (
                <KpiCard key={kpi.key} kpi={kpi} />
              ))}
            </div>
          ) : (
            <Card>
              <p className="py-6 text-center text-[13px] text-ink-400">
                No operational modules are assigned to your role.
              </p>
            </Card>
          )}

          {data.access?.opd ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <TrendChart data={data.trend} />
              <DepartmentChart data={data.departments} />
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <ActivityFeed items={data.activity} />
            <StockWatch stock={data.stock} />
          </div>
        </>
      )}
    </div>
  );
}
