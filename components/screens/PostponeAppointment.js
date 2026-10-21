"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarX2, Check, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";
import { Field, opInputCls as inputCls } from "./PatientPicker";

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Postpone Appointment (legacy `AppointmentListMassUpdation.jsp`): filter a
 * doctor's day list, tick the appointments to move and push them to a new date
 * in one go.
 */
export default function PostponeAppointment() {
  const [doctors, setDoctors] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ doctor: "", date: today() });
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({ newDate: today(), doctor: "", slotStart: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, rRes] = await Promise.all([
        fetch("/api/resource/op_doctor_schedules?all=1&sort=doctor&dir=asc", { cache: "no-store" }),
        fetch("/api/resource/op_registrations?all=1&sort=visitDate&dir=asc&size=500", { cache: "no-store" }),
      ]);
      const d = await dRes.json().catch(() => ({}));
      const r = await rRes.json().catch(() => ({}));
      setDoctors(dRes.ok && Array.isArray(d.rows) ? d.rows : []);
      setRows(rRes.ok && Array.isArray(r.rows) ? r.rows : []);
    } catch {
      setDoctors([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dRes, rRes] = await Promise.all([
          fetch("/api/resource/op_doctor_schedules?all=1&sort=doctor&dir=asc", { cache: "no-store" }),
          fetch("/api/resource/op_registrations?all=1&sort=visitDate&dir=asc&size=500", { cache: "no-store" }),
        ]);
        const d = await dRes.json().catch(() => ({}));
        const r = await rRes.json().catch(() => ({}));
        if (cancelled) return;
        setDoctors(dRes.ok && Array.isArray(d.rows) ? d.rows : []);
        setRows(rRes.ok && Array.isArray(r.rows) ? r.rows : []);
      } catch {
        if (!cancelled) {
          setDoctors([]);
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!filters.doctor || row.doctor === filters.doctor) &&
          row.visitDate === filters.date &&
          row.status !== "Cancelled"
      ),
    [rows, filters]
  );

  const visibleIds = visible.map((row) => row._id);
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected(allChecked ? [] : visibleIds);
  }

  async function submit() {
    const errors = {};
    if (selected.length === 0) errors.ids = "Select at least one appointment to postpone.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.newDate)) errors.newDate = "Choose the new date.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/appointments/postpone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selected,
          newDate: form.newDate,
          doctor: form.doctor,
          slotStart: form.slotStart,
          reason: form.reason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "The appointments could not be postponed." });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      setNotice({
        kind: "success",
        message: `Postponed ${data.count} appointment(s) to ${data.newDate}.`,
      });
      setSelected([]);
      setFieldErrors({});
      setForm((prev) => ({ ...prev, doctor: "", slotStart: "", reason: "" }));
      await load();
    } catch {
      setNotice({ kind: "error", message: "The appointments could not be postponed. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        {notice ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium",
              notice.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            )}
          >
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            {notice.message}
          </div>
        ) : null}

        <PageSection
          title="Filter appointments"
          subtitle="Choose a doctor and date, then tick the appointments to move"
          icon={<CalendarX2 className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="grid gap-3.5 p-5 md:grid-cols-3">
            <Field label="Doctor">
              <select
                value={filters.doctor}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, doctor: e.target.value }));
                  setSelected([]);
                }}
                className={cn(inputCls, "cursor-pointer")}
              >
                <option value="">All doctors</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d.doctor}>{d.doctor}</option>
                ))}
              </select>
            </Field>
            <Field label="Visit date">
              <input
                type="date"
                value={filters.date}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, date: e.target.value }));
                  setSelected([]);
                }}
                className={inputCls}
              />
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-[12.5px] font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                Refresh
              </button>
            </div>
          </div>
        </PageSection>

        <PageSection title="Appointments" subtitle={`${visible.length} appointment(s) · ${selected.length} selected`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-ink-50/60 text-left text-[11px] uppercase tracking-wide text-ink-500">
                  <th className="w-10 px-3 py-2">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-3.5 w-3.5" />
                  </th>
                  <th className="px-3 py-2 font-semibold">Patient</th>
                  <th className="px-3 py-2 font-semibold">OP No</th>
                  <th className="px-3 py-2 font-semibold">Doctor</th>
                  <th className="px-3 py-2 font-semibold">Slot</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-[12.5px] text-ink-400">
                      No appointments match this doctor and date.
                    </td>
                  </tr>
                ) : (
                  visible.map((row) => (
                    <tr key={row._id} className="border-t border-ink-50">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.includes(row._id)}
                          onChange={() => toggle(row._id)}
                          className="h-3.5 w-3.5"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-ink-800">{row.patientName}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-500">{row.opNo}</td>
                      <td className="px-3 py-2 text-ink-600">{row.doctor}</td>
                      <td className="px-3 py-2 text-ink-600">{row.slotStart || "-"}</td>
                      <td className="px-3 py-2 text-ink-600">{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {fieldErrors.ids ? (
            <p className="px-5 pb-3 text-[12px] font-medium text-danger-500">{fieldErrors.ids}</p>
          ) : null}
        </PageSection>
      </div>

      <div className="space-y-5">
        <PageSection title="Reschedule" subtitle={`${selected.length} selected`}>
          <div className="space-y-3.5 p-5">
            <Field label="New date" required error={fieldErrors.newDate}>
              <input type="date" value={form.newDate} onChange={(e) => setForm((p) => ({ ...p, newDate: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Re-assign doctor">
              <select
                value={form.doctor}
                onChange={(e) => setForm((prev) => ({ ...prev, doctor: e.target.value }))}
                className={cn(inputCls, "cursor-pointer")}
              >
                <option value="">Keep same doctor</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d.doctor}>{d.doctor}</option>
                ))}
              </select>
            </Field>
            <Field label="New slot time">
              <input type="time" value={form.slotStart} onChange={(e) => setForm((prev) => ({ ...prev, slotStart: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Reason">
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g. Doctor on leave"
                className={inputCls}
              />
            </Field>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarX2 className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Postponing…" : "Postpone selected"}
            </button>
          </div>
        </PageSection>
      </div>
    </div>
  );
}
