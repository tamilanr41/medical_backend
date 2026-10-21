"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ClipboardList,
  Loader2,
  Pill,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";
const selectCls = cn(inputCls, "cursor-pointer");
const cellCls =
  "w-full rounded-lg border bg-white px-2 py-1.5 text-[13px] text-ink-800 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200";

const FREQUENCIES = ["1-0-0", "0-1-0", "0-0-1", "1-0-1", "1-1-1", "1-1-1-1", "SOS", "Stat"];
const TIMINGS = ["Before food", "After food", "Any time", "Bedtime"];

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

function blankMedicine(id) {
  return {
    id,
    medicineName: "",
    dose: "",
    frequency: "1-0-1",
    duration: "",
    timing: "After food",
    instructions: "",
  };
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
    temperature: "",
    bp: "",
    pulse: "",
    weight: "",
    height: "",
    provisionalDiagnosis: "",
    diagnosis: "",
    advice: "",
    nextVisitDate: "",
  };
}

/**
 * Doctor Consultation — modern reimplementation of the legacy OPPrescriptionMain
 * flow: pick a registered patient, record the clinical note (complaints, vitals,
 * examination, diagnosis, advice) and prescribe medicines, then save the visit
 * and prescription together.
 */
export default function DoctorConsultation() {
  const idRef = useRef(1);
  const [patient, setPatient] = useState(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState("");
  const [todayOp, setTodayOp] = useState([]);

  const [form, setForm] = useState(blankForm);
  const [medicines, setMedicines] = useState([blankMedicine(0)]);
  const [medicineNames, setMedicineNames] = useState([]);
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
        const [pRes, oRes, mRes] = await Promise.all([
          fetch("/api/patients?q=", { cache: "no-store" }),
          fetch(`/api/resource/op_registrations?from=${today()}&to=${today()}&all=1&sort=tokenNo&dir=asc`, { cache: "no-store" }),
          fetch("/api/resource/medicines?all=1&sort=name&dir=asc", { cache: "no-store" }),
        ]);
        const p = await pRes.json().catch(() => ({}));
        const o = await oRes.json().catch(() => ({}));
        const m = await mRes.json().catch(() => ({}));
        if (cancelled) return;
        setResults(pRes.ok && Array.isArray(p.rows) ? p.rows : []);
        setTodayOp(oRes.ok && Array.isArray(o.rows) ? o.rows : []);
        setMedicineNames(
          mRes.ok && Array.isArray(m.rows) ? m.rows.map((row) => row.name).filter(Boolean) : []
        );
      } catch {
        if (!cancelled) {
          setResults([]);
          setSearchError("Patients could not be loaded.");
        }
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

  function updateMedicine(id, field, value) {
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
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
          medicines: medicines
            .filter((m) => m.medicineName.trim())
            .map((m) => ({
              medicineName: m.medicineName,
              dose: m.dose,
              frequency: m.frequency,
              duration: m.duration,
              timing: m.timing,
              instructions: m.instructions,
            })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "The consultation could not be saved." });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      setNotice({
        kind: "success",
        message: `Consultation saved for ${patient.patientName}${data.rxNo ? ` · ${data.rxNo}` : ""}.`,
      });
      setFieldErrors({});
      setPatient(null);
      setHistory([]);
      setMedicines([blankMedicine(idRef.current++)]);
      setForm(blankForm());
    } catch {
      setNotice({ kind: "error", message: "The consultation could not be saved. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <PageSection title="Patient" subtitle="Search or pick today's OP visit" icon={<UserRound className="h-4 w-4" aria-hidden="true" />}>
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

          <PageSection title="Clinical note" subtitle="Complaint, examination, vitals and diagnosis" icon={<Stethoscope className="h-4 w-4" aria-hidden="true" />}>
            <div className="grid gap-3.5 p-5 md:grid-cols-3">
              <Field label="Complaint" className="md:col-span-3">
                <textarea rows={2} value={form.complaint} onChange={(e) => update("complaint", e.target.value)} className={inputCls} />
              </Field>
              <Field label="History" className="md:col-span-3">
                <textarea rows={2} value={form.history} onChange={(e) => update("history", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Examination" className="md:col-span-3">
                <textarea rows={2} value={form.examination} onChange={(e) => update("examination", e.target.value)} className={inputCls} />
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
              <Field label="Weight">
                <input type="text" value={form.weight} onChange={(e) => update("weight", e.target.value)} placeholder="kg" className={inputCls} />
              </Field>
              <Field label="Height">
                <input type="text" value={form.height} onChange={(e) => update("height", e.target.value)} placeholder="cm" className={inputCls} />
              </Field>
              <Field label="Next visit">
                <input type="date" value={form.nextVisitDate} onChange={(e) => update("nextVisitDate", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Provisional diagnosis">
                <input type="text" value={form.provisionalDiagnosis} onChange={(e) => update("provisionalDiagnosis", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Final diagnosis">
                <input type="text" value={form.diagnosis} onChange={(e) => update("diagnosis", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Doctor" error={fieldErrors.doctor}>
                <input type="text" value={form.doctor} onChange={(e) => update("doctor", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Advice / instructions" className="md:col-span-3">
                <textarea rows={2} value={form.advice} onChange={(e) => update("advice", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </PageSection>

          <PageSection
            title="Prescription"
            subtitle="Medicines and dosage"
            icon={<Pill className="h-4 w-4" aria-hidden="true" />}
            actions={
              <button
                type="button"
                onClick={() => setMedicines((prev) => [...prev, blankMedicine(idRef.current++)])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700 transition hover:bg-brand-100"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add medicine
              </button>
            }
          >
            <div className="overflow-x-auto p-5">
              <table className="w-full min-w-[780px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ink-500">
                    <th className="pb-2 pr-2 font-semibold">Medicine</th>
                    <th className="w-24 px-2 pb-2 font-semibold">Dose</th>
                    <th className="w-28 px-2 pb-2 font-semibold">Frequency</th>
                    <th className="w-20 px-2 pb-2 font-semibold">Days</th>
                    <th className="w-32 px-2 pb-2 font-semibold">Timing</th>
                    <th className="px-2 pb-2 font-semibold">Instructions</th>
                    <th className="w-10 px-2 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((med) => (
                    <tr key={med.id} className="border-t border-ink-50">
                      <td className="px-1 py-1.5">
                        <input
                          list="op-medicine-options"
                          value={med.medicineName}
                          onChange={(e) => updateMedicine(med.id, "medicineName", e.target.value)}
                          placeholder="Medicine name"
                          className={cellCls}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="text" value={med.dose} onChange={(e) => updateMedicine(med.id, "dose", e.target.value)} className={cellCls} />
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={med.frequency} onChange={(e) => updateMedicine(med.id, "frequency", e.target.value)} className={selectCls}>
                          {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0" value={med.duration} onChange={(e) => updateMedicine(med.id, "duration", e.target.value)} className={cellCls} />
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={med.timing} onChange={(e) => updateMedicine(med.id, "timing", e.target.value)} className={selectCls}>
                          {TIMINGS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="text" value={med.instructions} onChange={(e) => updateMedicine(med.id, "instructions", e.target.value)} className={cellCls} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => setMedicines((prev) => (prev.length <= 1 ? prev : prev.filter((m) => m.id !== med.id)))}
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-rose-50 hover:text-rose-500"
                          aria-label="Remove medicine"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="op-medicine-options">
                {medicineNames.map((name) => <option key={name} value={name} />)}
              </datalist>
            </div>
          </PageSection>
        </div>

        <div className="space-y-5">
          <PageSection title="Save" subtitle="Visit and prescription">
            <div className="p-5">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Saving…" : "Save consultation"}
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
                      <p className="font-mono text-[11px] text-ink-400">{row.rxNo || ""}</p>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-500">
                      {row.provisionalDiagnosis || row.diagnosis || row.complaint || "—"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-400">{row.doctor || ""}</p>
                  </div>
                ))
              )}
            </div>
          </PageSection>
        </div>
      </div>
    </div>
  );
}
