"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ClipboardList, Loader2, Search, Stethoscope, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Field({ label, error, children, className }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-600">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-medium text-danger-500">{error}</span> : null}
    </label>
  );
}

function blankForm() {
  return {
    opNo: "",
    doctor: "",
    department: "",
    visitDate: today(),
    complaint: "",
    history: "",
    examination: "",
    drugAllergy: "",
    temperature: "",
    bp: "",
    pulse: "",
    spo2: "",
    weight: "",
    height: "",
    bloodSugar: "",
    provisionalDiagnosis: "",
    nextVisitDate: "",
  };
}

/**
 * Patient Clinical Info — modern reimplementation of the legacy OPVital flow:
 * capture vitals, complaint, allergy and examination for an OP patient before
 * the consultation. Saved as an OP visit note.
 */
export default function OpClinicalInfo() {
  const [patient, setPatient] = useState(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState("");
  const [todayOp, setTodayOp] = useState([]);

  const [form, setForm] = useState(blankForm);
  const [history, setHistory] = useState([]);

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const searchPatients = useCallback(async (value) => {
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(value)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Patients could not be loaded.");
      setResults(Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
      setResults([]);
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, oRes] = await Promise.all([
          fetch("/api/patients?q=", { cache: "no-store" }),
          fetch(`/api/resource/op_registrations?from=${today()}&to=${today()}&all=1&sort=tokenNo&dir=asc`, { cache: "no-store" }),
        ]);
        const p = await pRes.json().catch(() => ({}));
        const o = await oRes.json().catch(() => ({}));
        if (cancelled) return;
        setResults(pRes.ok && Array.isArray(p.rows) ? p.rows : []);
        setTodayOp(oRes.ok && Array.isArray(o.rows) ? o.rows : []);
      } catch {
        if (!cancelled) setSearchError("Patients could not be loaded.");
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadHistory = useCallback(async (uhid) => {
    if (!uhid) {
      setHistory([]);
      return;
    }
    try {
      const res = await fetch(`/api/consultations?uhid=${encodeURIComponent(uhid)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setHistory(res.ok && Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setHistory([]);
    }
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function pickPatient(next) {
    setPatient(next);
    setPatientQuery("");
    setFieldErrors({});
    setNotice(null);
    setForm((prev) => ({
      ...prev,
      opNo: next.opNo ?? prev.opNo,
      doctor: next.doctor ?? prev.doctor,
      department: next.department ?? prev.department,
    }));
    loadHistory(next.uhid);
  }

  async function save() {
    const errors = {};
    if (!patient) errors.patient = "Select a registered patient or today's OP visit first.";
    if (!form.doctor) errors.doctor = "Doctor is required.";
    if (!form.visitDate) errors.visitDate = "Visit date is required.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          uhid: patient.uhid,
          patientName: patient.patientName,
          gender: patient.gender,
          age: patient.age,
          mobile: patient.mobile,
          status: "Open",
          mode: "In-Person",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "Clinical info could not be saved." });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      setNotice({ kind: "success", message: `Clinical info saved for ${patient.patientName}.` });
      setFieldErrors({});
      setPatient(null);
      setHistory([]);
      setForm(blankForm());
    } catch {
      setNotice({ kind: "error", message: "Clinical info could not be saved. Please try again." });
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

        <PageSection title="Patient" subtitle="Find a patient or today's OP visit" icon={<UserRound className="h-4 w-4" aria-hidden="true" />}>
          <div className="space-y-3 p-5">
            {patient ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/50 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-800">{patient.patientName}</p>
                  <p className="truncate font-mono text-[11.5px] text-ink-500">
                    {patient.uhid} · {patient.gender || "-"} · {patient.age || "-"} yrs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPatient(null); setHistory([]); }}
                  className="text-[12px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-xl border bg-ink-50/40 px-3 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
                  <Search className="h-4 w-4 text-ink-400" aria-hidden="true" />
                  <input
                    type="text"
                    value={patientQuery}
                    onChange={(e) => {
                      setPatientQuery(e.target.value);
                      searchPatients(e.target.value);
                    }}
                    placeholder="Search UHID, name or mobile"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-ink-300"
                  />
                  {searching ? <Loader2 className="h-4 w-4 animate-spin text-ink-400" aria-hidden="true" /> : null}
                </div>
                {fieldErrors.patient ? (
                  <span className="block text-[12px] font-medium text-danger-500">{fieldErrors.patient}</span>
                ) : null}
                <div className="max-h-40 overflow-y-auto rounded-xl border border-ink-100">
                  {results.length === 0 ? (
                    <p className="px-3.5 py-3 text-[12.5px] text-ink-400">{searchError || "No patient found."}</p>
                  ) : (
                    results.map((row) => (
                      <button
                        key={row._id}
                        type="button"
                        onClick={() => pickPatient(row)}
                        className="flex w-full items-center justify-between gap-3 border-b border-ink-50 px-3.5 py-2.5 text-left transition last:border-0 hover:bg-brand-50/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-ink-800">{row.patientName}</span>
                          <span className="block truncate font-mono text-[11px] text-ink-400">{row.uhid} · {row.mobile || "-"}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
                {todayOp.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold text-ink-500">Today&apos;s OP registrations</p>
                    <div className="flex flex-wrap gap-2">
                      {todayOp.slice(0, 8).map((row) => (
                        <button
                          key={row._id}
                          type="button"
                          onClick={() => pickPatient(row)}
                          className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-[11.5px] font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
                        >
                          {row.tokenNo != null ? `#${row.tokenNo} ` : ""}{row.patientName}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </PageSection>

        <PageSection title="Clinical information" subtitle="Vitals, complaint and examination" icon={<Stethoscope className="h-4 w-4" aria-hidden="true" />}>
          <div className="grid gap-3.5 p-5 md:grid-cols-3">
            <Field label="Visit date">
              <input type="date" value={form.visitDate} onChange={(e) => update("visitDate", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Doctor" error={fieldErrors.doctor}>
              <input type="text" value={form.doctor} onChange={(e) => update("doctor", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Department">
              <input type="text" value={form.department} onChange={(e) => update("department", e.target.value)} className={inputCls} />
            </Field>

            <Field label="Complaint" className="md:col-span-3">
              <textarea rows={2} value={form.complaint} onChange={(e) => update("complaint", e.target.value)} className={inputCls} />
            </Field>
            <Field label="History" className="md:col-span-3">
              <textarea rows={2} value={form.history} onChange={(e) => update("history", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Drug allergy" className="md:col-span-3">
              <textarea rows={2} value={form.drugAllergy} onChange={(e) => update("drugAllergy", e.target.value)} className={inputCls} />
            </Field>

            <Field label="Temperature">
              <input type="text" value={form.temperature} onChange={(e) => update("temperature", e.target.value)} placeholder="°F" className={inputCls} />
            </Field>
            <Field label="Blood pressure">
              <input type="text" value={form.bp} onChange={(e) => update("bp", e.target.value)} placeholder="120/80" className={inputCls} />
            </Field>
            <Field label="Pulse">
              <input type="text" value={form.pulse} onChange={(e) => update("pulse", e.target.value)} placeholder="/min" className={inputCls} />
            </Field>
            <Field label="SpO2">
              <input type="text" value={form.spo2} onChange={(e) => update("spo2", e.target.value)} placeholder="%" className={inputCls} />
            </Field>
            <Field label="Weight">
              <input type="text" value={form.weight} onChange={(e) => update("weight", e.target.value)} placeholder="kg" className={inputCls} />
            </Field>
            <Field label="Height">
              <input type="text" value={form.height} onChange={(e) => update("height", e.target.value)} placeholder="cm" className={inputCls} />
            </Field>
            <Field label="Blood sugar">
              <input type="text" value={form.bloodSugar} onChange={(e) => update("bloodSugar", e.target.value)} placeholder="mg/dL" className={inputCls} />
            </Field>
            <Field label="Provisional diagnosis">
              <input type="text" value={form.provisionalDiagnosis} onChange={(e) => update("provisionalDiagnosis", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Next visit">
              <input type="date" value={form.nextVisitDate} onChange={(e) => update("nextVisitDate", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Examination" className="md:col-span-3">
              <textarea rows={2} value={form.examination} onChange={(e) => update("examination", e.target.value)} className={inputCls} />
            </Field>
          </div>
        </PageSection>
      </div>

      <div className="space-y-5">
        <PageSection title="Save" subtitle="Vitals & clinical note">
          <div className="p-5">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Saving…" : "Save clinical info"}
            </button>
          </div>
        </PageSection>

        <PageSection title="Previous visits" subtitle={patient ? patient.patientName : "Select a patient"} icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}>
          <div className="max-h-[420px] overflow-y-auto">
            {history.length === 0 ? (
              <p className="px-5 py-4 text-[12.5px] text-ink-400">
                {patient ? "No previous visits recorded." : "Select a patient to see visit history."}
              </p>
            ) : (
              history.map((row) => (
                <div key={row._id} className="border-b border-ink-50 px-5 py-2.5 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-ink-700">{row.visitDate}</p>
                    <p className="font-mono text-[11px] text-ink-400">{row.opNo || row.rxNo || ""}</p>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-500">
                    {row.provisionalDiagnosis || row.complaint || "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-400">{row.doctor || ""}</p>
                </div>
              ))
            )}
          </div>
        </PageSection>
      </div>
    </div>
  );
}
