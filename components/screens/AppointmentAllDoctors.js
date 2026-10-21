"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import PageSection from "@/components/ui/PageSection";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  STATUS_META,
  nextStatuses,
  statusMeta,
} from "@/lib/appointment-constants";

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";
const selectCls = cn(inputCls, "cursor-pointer");

function Field({ label, children, className }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-600">{label}</span>
      {children}
    </label>
  );
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

const TONE = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  teal: "bg-teal-50 text-teal-700 ring-teal-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  muted: "bg-ink-100 text-ink-600 ring-ink-200",
};

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        TONE[meta.tone] || TONE.muted
      )}
    >
      {meta.label}
    </span>
  );
}

/**
 * Appointment - All Doctors: the day's OP appointments across every doctor,
 * grouped by consultant. Reads the live `op_registrations` for the chosen day,
 * reconciles each doctor's booked/available counts against their schedule and
 * lets the desk advance an appointment through its lifecycle.
 */
export default function AppointmentAllDoctors() {
  const [date, setDate] = useState(today());
  const [appointments, setAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/resource/op_registrations?all=1&sort=slotStart&dir=asc&from=${encodeURIComponent(
          date
        )}&to=${encodeURIComponent(date)}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      setAppointments(res.ok && Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setAppointments([]);
      setNotice({ kind: "error", message: "Network error. Please retry." });
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/appointments/schedule", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setDepartments(res.ok && Array.isArray(data.departments) ? data.departments : []);
      } catch {
        if (!cancelled) setDepartments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function applyStatus(appointment, target) {
    setBusyId(String(appointment._id));
    setNotice(null);
    try {
      const res = await fetch(`/api/appointments/${appointment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status: target }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: body.error || `Update failed (${res.status}).` });
        return;
      }
      setNotice({
        kind: "success",
        message: `${appointment.patientName} → ${target}.`,
      });
      await load();
    } catch {
      setNotice({ kind: "error", message: "Network error. Please retry." });
    } finally {
      setBusyId("");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments.filter((row) => {
      if (department && row.department !== department) return false;
      if (status !== "All" && row.status !== status) return false;
      if (type !== "All" && row.appointmentType !== type) return false;
      if (q) {
        const haystack = [row.opNo, row.uhid, row.patientName, row.doctor, row.mobile]
          .map((value) => String(value || "").toLowerCase());
        if (!haystack.some((value) => value.includes(q))) return false;
      }
      return true;
    });
  }, [appointments, department, status, type, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const row of filtered) {
      const key = row.doctor || "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return [...map.entries()]
      .map(([doctor, rows]) => ({ doctor, rows }))
      .sort((a, b) => a.doctor.localeCompare(b.doctor));
  }, [filtered]);

  const summary = useMemo(() => {
    const counts = { total: filtered.length };
    for (const statusName of APPOINTMENT_STATUSES) {
      counts[statusName] = filtered.filter((row) => row.status === statusName).length;
    }
    return counts;
  }, [filtered]);

  return (
    <PageSection
      title="Appointment - All Doctors"
      subtitle="Every OP appointment for the day, grouped by consultant"
      icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
      actions={
        <button
          type="button"
          onClick={load}
          aria-label="Refresh appointments"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" />
        </button>
      }
    >
      <div className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={cn(inputCls, "cursor-pointer")}
            />
          </Field>
          <Field label="Department">
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className={selectCls}
            >
              <option value="">All departments</option>
              {departments.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={selectCls}
            >
              <option value="All">All statuses</option>
              {APPOINTMENT_STATUSES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={selectCls}
            >
              <option value="All">All types</option>
              {APPOINTMENT_TYPES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search OP number, UHID, patient, doctor or mobile…"
            className={cn(inputCls, "pl-9")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="font-semibold text-ink-600">{summary.total} appointments</span>
          {APPOINTMENT_STATUSES.filter((entry) => summary[entry] > 0).map((entry) => (
            <span
              key={entry}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1",
                TONE[STATUS_META[entry]?.tone] || TONE.muted
              )}
            >
              {entry} · {summary[entry]}
            </span>
          ))}
        </div>

        {notice ? (
          <div
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-medium",
              notice.kind === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
          >
            {notice.message}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading appointments…
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 py-10 text-center text-sm text-ink-500">
            No appointments match these filters.
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ doctor, rows }) => (
              <div key={doctor} className="overflow-hidden rounded-xl border border-ink-200">
                <div className="flex items-center justify-between gap-3 border-b border-ink-200 bg-ink-50/60 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    <span className="text-sm font-semibold text-ink-800">{doctor}</span>
                    {rows[0]?.department ? (
                      <span className="text-[12px] text-ink-500">· {rows[0].department}</span>
                    ) : null}
                  </div>
                  <span className="text-[12px] font-semibold text-ink-600">
                    {rows.length} appointment{rows.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="divide-y divide-ink-100">
                  {rows.map((row) => (
                    <div
                      key={row._id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[12px] font-semibold text-ink-500">
                            {row.opNo}
                          </span>
                          <StatusBadge status={row.status} />
                          {row.appointmentType ? (
                            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
                              {row.appointmentType}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                          <UserRound className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
                          {row.patientName}
                          <span className="font-normal text-ink-500">
                            · {row.uhid} · {row.gender} · {row.age}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {row.slotStart || "—"}
                            {row.slotEnd ? `–${row.slotEnd}` : ""}
                          </span>
                          {row.tokenNo ? <span>Token {row.tokenNo}</span> : null}
                          {row.mobile ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                              {row.mobile}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {nextStatuses(row.status).length > 0 ? (
                          nextStatuses(row.status).map((target) => (
                            <button
                              key={target}
                              type="button"
                              disabled={busyId === String(row._id)}
                              onClick={() => applyStatus(row, target)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition disabled:opacity-40",
                                target === "Cancelled"
                                  ? "border-rose-200 text-rose-600 hover:border-rose-300"
                                  : "border-ink-200 text-ink-600 hover:border-ink-300 hover:text-ink-800"
                              )}
                            >
                              {busyId === String(row._id) ? (
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                              ) : null}
                              {target}
                            </button>
                          ))
                        ) : (
                          <Badge tone="muted">Closed</Badge>
                        )}
                        <Link
                          href="/opd/transaction/appointment-by-doctor"
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700 transition hover:bg-brand-100 dark:text-brand-300"
                        >
                          Schedule
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageSection>
  );
}
