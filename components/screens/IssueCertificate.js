"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, FileText, Loader2, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Field({ label, required, error, children, className }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-600">
        {label}
        {required ? <span className="ml-0.5 text-danger-500">*</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-medium text-danger-500">{error}</span> : null}
    </label>
  );
}

function blankForm() {
  return {
    certificateDate: today(),
    certificateType: "",
    doctor: "",
    place: "",
    title: "",
    content: "",
    remarks: "",
  };
}

/**
 * Issue Certificate — modern reimplementation of the legacy Certificate flow:
 * pick a patient, choose a certificate type, author the content and issue it.
 * The certificate number is allocated server-side.
 */
export default function IssueCertificate() {
  const [patient, setPatient] = useState(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState("");
  const [types, setTypes] = useState([]);

  const [form, setForm] = useState(blankForm);
  const [recent, setRecent] = useState([]);

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

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/certificates", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setRecent(res.ok && Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, tRes, cRes] = await Promise.all([
          fetch("/api/patients?q=", { cache: "no-store" }),
          fetch("/api/resource/op_certificate_types?all=1&sort=name&dir=asc", { cache: "no-store" }),
          fetch("/api/certificates", { cache: "no-store" }),
        ]);
        const p = await pRes.json().catch(() => ({}));
        const t = await tRes.json().catch(() => ({}));
        const c = await cRes.json().catch(() => ({}));
        if (cancelled) return;
        setResults(pRes.ok && Array.isArray(p.rows) ? p.rows : []);
        setTypes(tRes.ok && Array.isArray(t.rows) ? t.rows.map((row) => row.name).filter(Boolean) : []);
        setRecent(cRes.ok && Array.isArray(c.rows) ? c.rows : []);
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

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function pickPatient(next) {
    setPatient(next);
    setPatientQuery("");
    setFieldErrors({});
    setNotice(null);
  }

  async function save() {
    const errors = {};
    if (!patient) errors.patient = "Select a patient.";
    if (!form.certificateType.trim()) errors.certificateType = "Certificate type is required.";
    if (!form.doctor.trim()) errors.doctor = "Doctor is required.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          uhid: patient?.uhid || "",
          patientName: patient?.patientName || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "The certificate could not be issued." });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      setNotice({
        kind: "success",
        message: `Certificate ${data.certificate?.certificateNo || ""} issued for ${patient.patientName}.`,
      });
      setFieldErrors({});
      setPatient(null);
      setForm(blankForm());
      loadRecent();
    } catch {
      setNotice({ kind: "error", message: "The certificate could not be issued. Please try again." });
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

        <PageSection title="Patient" subtitle="Whom is the certificate for?" icon={<UserRound className="h-4 w-4" aria-hidden="true" />}>
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
                  onClick={() => setPatient(null)}
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
                <div className="max-h-44 overflow-y-auto rounded-xl border border-ink-100">
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
              </>
            )}
          </div>
        </PageSection>

        <PageSection title="Certificate" subtitle="Type, content and authority" icon={<FileText className="h-4 w-4" aria-hidden="true" />}>
          <div className="grid gap-3.5 p-5 md:grid-cols-2">
            <Field label="Date" required error={fieldErrors.certificateDate}>
              <input type="date" value={form.certificateDate} onChange={(e) => update("certificateDate", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Certificate type" required error={fieldErrors.certificateType}>
              <input
                list="op-cert-types"
                type="text"
                value={form.certificateType}
                onChange={(e) => update("certificateType", e.target.value)}
                placeholder="e.g. Medical Fitness"
                className={inputCls}
              />
              <datalist id="op-cert-types">
                {types.map((name) => <option key={name} value={name} />)}
              </datalist>
            </Field>
            <Field label="Doctor" required error={fieldErrors.doctor}>
              <input type="text" value={form.doctor} onChange={(e) => update("doctor", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Place">
              <input type="text" value={form.place} onChange={(e) => update("place", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Title" className="md:col-span-2">
              <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Certificate heading" className={inputCls} />
            </Field>
            <Field label="Content" className="md:col-span-2">
              <textarea rows={6} value={form.content} onChange={(e) => update("content", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Remarks" className="md:col-span-2">
              <textarea rows={2} value={form.remarks} onChange={(e) => update("remarks", e.target.value)} className={inputCls} />
            </Field>
          </div>
        </PageSection>
      </div>

      <div className="space-y-5">
        <PageSection title="Issue" subtitle="Certificate number is generated on save">
          <div className="p-5">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Issuing…" : "Issue certificate"}
            </button>
          </div>
        </PageSection>

        <PageSection title="Recent certificates" subtitle={`${recent.length} record(s)`} icon={<FileText className="h-4 w-4" aria-hidden="true" />}>
          <div className="max-h-[440px] overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-5 py-4 text-[12.5px] text-ink-400">No certificates issued yet.</p>
            ) : (
              recent.map((row) => (
                <div key={row._id} className="border-b border-ink-50 px-5 py-2.5 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-medium text-ink-800">{row.patientName}</p>
                    <p className="shrink-0 font-mono text-[11px] text-ink-400">{row.certificateNo}</p>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-ink-500">{row.certificateType}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">{row.certificateDate}</p>
                </div>
              ))
            )}
          </div>
        </PageSection>
      </div>
    </div>
  );
}
