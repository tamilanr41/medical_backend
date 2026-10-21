"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DatabaseZap,
  ListOrdered,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_META = {
  "In queue": { tone: "brand", dot: "bg-brand-500" },
  "In consultation": { tone: "amber", dot: "bg-amber-500" },
  Done: { tone: "emerald", dot: "bg-emerald-500" },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META["In queue"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        meta.tone === "brand" &&
          "bg-brand-50 text-brand-700 ring-brand-100 dark:text-brand-300",
        meta.tone === "amber" &&
          "bg-amber-50 text-amber-700 ring-amber-100 dark:text-amber-300",
        meta.tone === "emerald" &&
          "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:text-emerald-300"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {status}
    </span>
  );
}

function SummaryChip({ icon: Icon, label, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-left shadow-[var(--shadow-card)] transition",
        active
          ? "border-brand-300 bg-brand-50 dark:bg-brand-500/10"
          : "border-ink-200 bg-panel hover:border-ink-300"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          active
            ? "bg-brand-600 text-white"
            : "bg-ink-100 text-ink-500"
        )}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block text-[18px] font-bold tracking-tight text-ink-900 tabular-nums">
          {value}
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-400">
          {label}
        </span>
      </span>
    </button>
  );
}

function Empty({ icon: Icon, title, note }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <Icon className="h-8 w-8 text-ink-300" aria-hidden="true" />
      <p className="text-sm font-medium text-ink-600">{title}</p>
      <p className="text-[13px] text-ink-400">{note}</p>
    </div>
  );
}

export default function WaitlistView({ user, data }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All");
  const [status, setStatus] = useState("All");

  const queue = useMemo(() => data.queue ?? [], [data.queue]);

  const departments = useMemo(() => {
    const set = new Set(queue.map((row) => row.department).filter(Boolean));
    return ["All", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [queue]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return queue.filter((row) => {
      if (department !== "All" && row.department !== department) return false;
      if (status !== "All" && row.status !== status) return false;
      if (!q) return true;
      return [row.name, row.uhid, row.token, row.doctor]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [queue, query, department, status]);

  const hasFilters = query || department !== "All" || status !== "All";

  function clearFilters() {
    setQuery("");
    setDepartment("All");
    setStatus("All");
  }

  const refresh = () => startTransition(() => router.refresh());

  const lastUpdated = data.generatedAt
    ? new Date(data.generatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
            Out-Patient Department
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-[22px] font-bold tracking-tight text-ink-900 sm:text-[26px]">
            Waitlist
            <ListOrdered className="h-6 w-6 text-brand-500" aria-hidden="true" />
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-500">
            {`Today's patient queue for ${user.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[12px] text-ink-400 sm:block">
            Updated {lastUpdated || "—"}
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-panel px-3.5 py-2 text-[13px] font-semibold text-ink-600 shadow-sm transition hover:border-ink-300 hover:text-ink-900 disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {!data.available ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-ink-200 bg-panel px-6 py-16 text-center shadow-[var(--shadow-card)]">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:text-amber-400">
            <DatabaseZap className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="text-[16px] font-bold text-ink-900">Waitlist unavailable</h2>
          <p className="max-w-md text-[13px] text-ink-500">
            {`The queue reads today's registrations from MongoDB, which is not`}
            reachable right now.
          </p>
        </div>
      ) : data.access === false ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-ink-200 bg-panel px-6 py-16 text-center shadow-[var(--shadow-card)]">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="text-[16px] font-bold text-ink-900">OPD access required</h2>
          <p className="max-w-md text-[13px] text-ink-500">
            The waitlist is available to staff assigned to the Out-Patient
            Department module.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2.5">
            <SummaryChip
              icon={ListOrdered}
              label="In queue"
              value={
                queue.filter((row) => row.status === "In queue").length
              }
              active={status === "In queue"}
              onClick={() => setStatus(status === "In queue" ? "All" : "In queue")}
            />
            <SummaryChip
              icon={UserRound}
              label="In consultation"
              value={
                queue.filter((row) => row.status === "In consultation").length
              }
              active={status === "In consultation"}
              onClick={() =>
                setStatus(status === "In consultation" ? "All" : "In consultation")
              }
            />
            <SummaryChip
              icon={Loader2}
              label="Done"
              value={queue.filter((row) => row.status === "Done").length}
              active={status === "Done"}
              onClick={() => setStatus(status === "Done" ? "All" : "Done")}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-ink-200 bg-panel shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-2.5 border-b border-ink-100 p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by patient, UHID, token or doctor..."
                  aria-label="Search the waitlist"
                  className="h-10 w-full rounded-xl border border-ink-200 bg-field pl-9 pr-9 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative">
                  <span className="sr-only">Filter by department</span>
                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="h-10 cursor-pointer appearance-none rounded-xl border border-ink-200 bg-field pl-3 pr-8 text-[12.5px] font-medium text-ink-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                  >
                    {departments.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </label>

                {hasFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-ink-200 px-3 text-[12.5px] font-semibold text-ink-500 transition hover:text-rose-600"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            {filtered.length === 0 ? (
              <Empty
                icon={Search}
                title="No patients in the queue"
                note={
                  hasFilters
                    ? "Try adjusting the search or filters."
                    : "Today's OPD queue is empty so far."
                }
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink-100 text-[11px] uppercase tracking-wide text-ink-400">
                        <th scope="col" className="px-4 py-3 font-semibold">#</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Token</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Patient</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Department</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Doctor</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, index) => (
                        <tr
                          key={row.id}
                          className="border-b border-ink-100 transition last:border-0 hover:bg-brand-50/40"
                        >
                          <td className="px-4 py-3 text-ink-400 tabular-nums">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-brand-50 px-1.5 font-mono text-[12.5px] font-bold text-brand-700 dark:text-brand-300">
                              {row.token}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-ink-800">{row.name}</p>
                            <p className="font-mono text-[11px] text-ink-400">
                              {row.uhid}
                              {row.age ? ` · ${row.age}/${row.gender?.[0] ?? ""}` : ""}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-ink-600">{row.department}</td>
                          <td className="px-4 py-3 text-ink-600">{row.doctor}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="divide-y divide-ink-100 md:hidden">
                  {filtered.map((row, index) => (
                    <li key={row.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 px-1.5 font-mono text-[12.5px] font-bold text-brand-700 dark:text-brand-300">
                        {row.token}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-ink-800">
                            #{index + 1} {row.name}
                          </span>
                          <StatusBadge status={row.status} />
                        </span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-ink-500">
                          {row.department} · {row.doctor}
                        </span>
                        <span className="font-mono text-[11px] text-ink-400">
                          {row.uhid}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-ink-100 px-4 py-2.5 text-[12px] text-ink-400">
                  Showing {filtered.length} of {queue.length} patients today
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}