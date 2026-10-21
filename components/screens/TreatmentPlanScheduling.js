"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check, ClipboardList, Loader2, Play, RefreshCw, X } from "lucide-react";
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
    sessionNo: "1",
    totalSessions: "1",
    intervalDays: "0",
    doctor: "",
    therapist: "",
    charges: "",
    durationMins: "",
    remarks: "",
  };
}

const STATUS_STYLE = {
  Scheduled: "bg-sky-50 text-sky-700",
  Executed: "bg-emerald-50 text-emerald-700",
  Allocated: "bg-indigo-50 text-indigo-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        status === "Executed" && "bg-emerald-50 text-emerald-700",
        status === "Scheduled" && "bg-amber-50 text-amber-700",
        status === "Allocated" && "bg-sky-50 text-sky-700",
        status === "Cancelled" && "bg-rose-50 text-rose-700"
      )}
    >
      {status || "-"}
    </span>
  );
}

/**
 * Treatment Plan Scheduling + Execution — one screen for both menu items
 * (legacy `TreatmentPlanActualSchedule` / `TreatmentPlanActualExecution`).
 * Scheduling books a session; execution records the actual session and can
 * shift the remaining sessions of the same plan.
 */
export default function TreatmentPlanScheduling({ item }) {
  const isExecution = item?.slug === "treatment-plan-execution";

  const [patient, setPatient] = useState(null);
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [exec, setExec] = useState({ actualDate: today(), durationMins: "", therapist: "", remarks: "" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
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

  function updateExec(field, value) {
    setExec((prev) => ({ ...prev, [field]: value }));
  }

  function pickPatient(next) {
    setPatient(next);
    setFieldErrors({});
    setNotice(null);
    setForm(blankForm());
    setExec({ actualDate: today(), durationMins: "", therapist: "", remarks: "" });
  }

  function onPlanChange(value) {
    const match = plans.find((p) => p.name.toLowerCase() === value.trim().toLowerCase());
    setForm((prev) => ({ ...prev, plan: value, ...(match?.service ? { service: match.service } : {}) }));
  }

  async function save() {
    const errors = {};
    if (!patient) errors.patient = "Select a patient.";
    if (!form.plan.trim()) errors.plan = "Choose a treatment plan.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.planStartDate)) errors.planStartDate = "Enter a valid date.";
    if (!(Number(form.sessionNo) >= 1)) errors.sessionNo = "Enter the session number.";
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
          mode: "schedule",
          uhid: patient.uhid,
          patientName: patient.patientName,
          ...form,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "The session could not be scheduled." });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      setNotice({
        kind: "success",
        message: `Session ${form.sessionNo} of "${form.plan}" scheduled for ${patient.patientName}.`,
      });
      setFieldErrors({});
      setForm(blankForm());
      await loadSessions(patient.uhid);
    } catch {
      setNotice({ kind: "error", message: "The session could not be scheduled. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function act(row, action) {
    setBusyId(row._id);
    setNotice(null);
    try {
      const res = await fetch("/api/treatment-plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row._id,
          action,
          actualDate: exec.actualDate,
          durationMins: exec.durationMins,
          therapist: exec.therapist || row.therapist,
          remarks: exec.remarks,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "The session could not be updated." });
        return;
      }
      setNotice({
        kind: "success",
        message: `Session ${row.sessionNo} marked ${action === "cancel" ? "cancelled" : "executed"}.`,
      });
      await loadSessions(patient?.uhid);
    } catch {
      setNotice({ kind: "error", message: "The session could not be updated. Please try again." });
    } finally {
      setBusyId("");
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
          subtitle="Whose treatment plan is this?"
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

        {!isExecution ? (
          <PageSection
            title="Schedule session"
            subtitle="Book the next sitting of a treatment plan"
            icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
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
              <Field label="Session no" required error={fieldErrors.sessionNo}>
                <input type="number" min="1" value={form.sessionNo} onChange={(e) => update("sessionNo", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Total sessions">
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
              <Field label="Duration (mins)">
                <input type="number" min="0" value={form.durationMins} onChange={(e) => update("durationMins", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Charges">
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
                  {saving ? "Saving…" : "Schedule session"}
                </button>
              </div>
            </div>
          </PageSection>
        ) : (
          <PageSection
            title="Record actual session"
            subtitle="Defaults applied when you mark a session executed"
            icon={<Play className="h-4 w-4" aria-hidden="true" />}
          >
            <div className="grid gap-3.5 p-5 md:grid-cols-4">
              <Field label="Actual date">
                <input type="date" value={exec.actualDate} onChange={(e) => updateExec("actualDate", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Duration (mins)">
                <input type="number" min="0" value={exec.durationMins} onChange={(e) => updateExec("durationMins", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Therapist">
                <input type="text" value={exec.therapist} onChange={(e) => updateExec("therapist", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Remarks">
                <input type="text" value={exec.remarks} onChange={(e) => updateExec("remarks", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </PageSection>
        )}
      </div>

      <div className="space-y-5">
        <PageSection
          title="Plan sessions"
          subtitle={patient ? `${sessions.length} session(s)` : "Select a patient"}
          icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
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
              <p className="px-5 py-4 text-[12.5px] text-ink-400">Pick a patient to see their plan sessions.</p>
            ) : sessions.length === 0 ? (
              <p className="px-5 py-4 text-[12.5px] text-ink-400">No sessions scheduled for this patient.</p>
            ) : (
              sessions.map((row) => (
                <div key={row._id} className="border-b border-ink-50 px-5 py-3 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-medium text-ink-800">
                      #{row.sessionNo} · {row.plan}
                    </p>
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
                  <p className="mt-0.5 truncate text-[11.5px] text-ink-500">
                    {row.service || row.plan} · {row.planStartDate}
                    {row.actualDate ? ` · done ${row.actualDate}` : ""}
                    {row.charges ? ` · ${formatMoney(row.charges)}` : ""}
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-ink-400">{row.planNo}</p>
                  {isExecution && row.status === "Scheduled" ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => act(row, "execute")}
                        disabled={busyId === row._id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11.5px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {busyId === row._id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Play className="h-3 w-3" aria-hidden="true" />}
                        Execute
                      </button>
                      <button
                        type="button"
                        onClick={() => act(row, "cancel")}
                        disabled={busyId === row._id}
                        className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1 text-[11.5px] font-semibold text-ink-600 transition hover:border-rose-200 hover:text-rose-600 disabled:opacity-60"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </PageSection>
      </div>
    </div>
  );
}
