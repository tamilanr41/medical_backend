"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ClipboardList, Layers, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";
import PatientPicker, { Field, opInputCls as inputCls } from "./PatientPicker";
import { formatMoney } from "./MedicineLookup";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function blankForm() {
  return {
    plan: "",
    service: "",
    planStartDate: today(),
    totalSessions: "5",
    intervalDays: "3",
    doctor: "",
    therapist: "",
    charges: "",
    remarks: "",
  };
}

/**
 * Treatment Plan Allocation (legacy `TreatmentPlanActualAllocation`): assigns a
 * treatment plan to a patient and generates every session, spaced `intervalDays`
 * apart, ready for scheduling/execution.
 */
export default function TreatmentPlanAllocation() {
  const [patient, setPatient] = useState(null);
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/resource/op_treatment_plans?all=1&sort=name&dir=asc", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          const rows = res.ok && Array.isArray(data.rows) ? data.rows : [];
          setPlans(rows.map((row) => ({ name: row.name, service: row.service })).filter((r) => r.name));
        }
      } catch {
        if (!cancelled) setPlans([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSessions = useCallback(async (uhid) => {
    if (!uhid) {
      setSessions([]);
      return;
    }
    setSessionsLoading(true);
    try {
      const res = await fetch(`/api/treatment-plans?uhid=${encodeURIComponent(uhid)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setSessions(res.ok && Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadSessions(patient?.uhid);
    })();
    return () => {
      cancelled = true;
    };
  }, [patient, loadSessions]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function pickPatient(next) {
    setPatient(next);
    setFieldErrors({});
    setNotice(null);
    setForm(blankForm());
  }

  function onPlanChange(value) {
    const match = plans.find((p) => p.name.toLowerCase() === value.trim().toLowerCase());
    setForm((prev) => ({ ...prev, plan: value, ...(match?.service ? { service: match.service } : {}) }));
  }

  async function save() {
    const errors = {};
    if (!patient) errors.patient = "Select a patient.";
    if (!form.plan.trim()) errors.plan = "Choose a treatment plan.";
    if (!(Number(form.totalSessions) >= 1)) errors.totalSessions = "Enter at least one session.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.planStartDate)) errors.planStartDate = "Enter a valid date.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/treatment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "allocate",
          uhid: patient.uhid,
          patientName: patient.patientName,
          ...form,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "The plan could not be allocated." });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      setNotice({
        kind: "success",
        message: `Allocated ${data.count} session(s) of "${form.plan}" for ${patient.patientName} (${data.planNo}).`,
      });
      setFieldErrors({});
      setForm(blankForm());
      await loadSessions(patient.uhid);
    } catch {
      setNotice({ kind: "error", message: "The plan could not be allocated. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
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
          title="Patient"
          subtitle="Assign a treatment plan to a patient"
          icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="p-5">
            <PatientPicker
              patient={patient}
              onPick={pickPatient}
              onClear={() => setPatient(null)}
              error={fieldErrors.patient}
            />
          </div>
        </PageSection>

        <PageSection
          title="Allocate plan"
          subtitle="Generates every session with the chosen interval"
          icon={<Layers className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="grid gap-3.5 p-5 md:grid-cols-3">
            <Field label="Treatment plan" required error={fieldErrors.plan} className="md:col-span-2">
              <input
                list="op-plan-options"
                type="text"
                value={form.plan}
                onChange={(e) => onPlanChange(e.target.value)}
                placeholder="e.g. Physiotherapy - Knee"
                className={inputCls}
              />
              <datalist id="op-plan-options">
                {plans.map((p) => <option key={p.name} value={p.name} />)}
              </datalist>
            </Field>
            <Field label="Service">
              <input type="text" value={form.service} onChange={(e) => update("service", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Plan start date" required error={fieldErrors.planStartDate}>
              <input type="date" value={form.planStartDate} onChange={(e) => update("planStartDate", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Total sessions" required error={fieldErrors.totalSessions}>
              <input type="number" min="1" value={form.totalSessions} onChange={(e) => update("totalSessions", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Interval (days)">
              <input type="number" min="0" value={form.intervalDays} onChange={(e) => update("intervalDays", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Doctor">
              <input type="text" value={form.doctor} onChange={(e) => update("doctor", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Therapist">
              <input type="text" value={form.therapist} onChange={(e) => update("therapist", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Charges / session">
              <input type="number" min="0" value={form.charges} onChange={(e) => update("charges", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Remarks" className="md:col-span-3">
              <textarea value={form.remarks} onChange={(e) => update("remarks", e.target.value)} rows={2} className={inputCls} />
            </Field>
            <div className="md:col-span-3">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Allocating…" : "Allocate plan"}
              </button>
            </div>
          </div>
        </PageSection>
      </div>

      <div className="space-y-5">
        <PageSection
          title="Allocated sessions"
          subtitle={patient ? `${sessions.length} session(s)` : "Select a patient"}
          icon={<Layers className="h-4 w-4" aria-hidden="true" />}
          actions={
            <button
              type="button"
              onClick={() => loadSessions(patient?.uhid)}
              disabled={!patient}
              className="rounded-lg border border-ink-200 p-2 text-ink-500 transition hover:border-ink-300 hover:text-ink-700 disabled:opacity-40"
              aria-label="Refresh"
            >
              {sessionsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          }
        >
          <div className="max-h-[520px] overflow-y-auto">
            {!patient ? (
              <p className="px-5 py-4 text-[12.5px] text-ink-400">Pick a patient to see allocated sessions.</p>
            ) : sessions.length === 0 ? (
              <p className="px-5 py-4 text-[12.5px] text-ink-400">No sessions allocated for this patient.</p>
            ) : (
              sessions.map((row) => (
                <div key={row._id} className="flex items-center justify-between gap-3 border-b border-ink-50 px-5 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink-800">
                      #{row.sessionNo} · {row.plan}
                    </p>
                    <p className="truncate text-[11.5px] text-ink-500">
                      {row.service || row.plan} · {row.planStartDate}
                      {row.charges ? ` · ${formatMoney(row.charges)}` : ""}
                    </p>
                    <p className="font-mono text-[10.5px] text-ink-400">{row.planNo}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                      row.status === "Executed"
                        ? "bg-emerald-50 text-emerald-700"
                        : row.status === "Cancelled"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                    )}
                  >
                    {row.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </PageSection>
      </div>
    </div>
  );
}
