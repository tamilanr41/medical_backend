"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  Check,
  ClipboardList,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Search,
  SearchX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";
import { IP_CLINICAL_TYPES } from "@/config/ip-reports";

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";
const selectCls = cn(inputCls, "cursor-pointer");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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

function statusTone(status) {
  if (status === "Closed") return "bg-ink-100 text-ink-600 ring-ink-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

/**
 * IP clinical records — a single bespoke screen behind every IPD clinical menu
 * item (Initial Assessment, Doctor's Order, Case Sheet, Doctor Visit, Discharge
 * Advice / Summary, Patient Feedback). The record type is derived from the menu
 * slug; Case Sheets route to `case_sheets` so the case-sheet report stays live.
 */
export default function IpClinicalRecords({ user, item }) {
  const recordType = IP_CLINICAL_TYPES[item?.slug] || "Case Sheet";
  return <IpClinicalRecordsInner sessionUser={user} recordType={recordType} />;
}

function IpClinicalRecordsInner({ sessionUser, recordType }) {
  const isCaseSheet = recordType === "Case Sheet";

  const [admissions, setAdmissions] = useState([]);
  const [admissionsLoading, setAdmissionsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    doctor: "",
    ward: "",
    date: today(),
    department: "",
    diagnosis: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const loadAdmissions = useCallback(async () => {
    setAdmissionsLoading(true);
    try {
      const res = await fetch("/api/ip-admissions?all=1&limit=200", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setAdmissions(res.ok && Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setAdmissions([]);
    } finally {
      setAdmissionsLoading(false);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await fetch(
        `/api/ip-clinical-records?recordType=${encodeURIComponent(recordType)}&all=1&limit=50`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      setRecords(res.ok && Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }, [recordType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ip-admissions?all=1&limit=200", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setAdmissions(Array.isArray(data.rows) ? data.rows : []);
      } catch {
        if (!cancelled) setAdmissions([]);
      } finally {
        if (!cancelled) setAdmissionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/resource/op_consultant_doctors?all=1&sort=name&dir=asc", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(data.rows)) {
          setDoctors(data.rows.filter((row) => row.name).map((row) => row.name));
        }
      } catch {
        if (!cancelled) setDoctors([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/ip-clinical-records?recordType=${encodeURIComponent(recordType)}&all=1&limit=100`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setRecords(res.ok && Array.isArray(data.rows) ? data.rows : []);
      } catch {
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recordType]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = admissions;
    if (!q) return list;
    return list.filter((row) =>
      [row.patientName, row.uhid, row.ipNo, row.ward].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [admissions, query]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function pick(admission) {
    setSelected(admission);
    setNotice(null);
    setFieldErrors({});
    setForm((prev) => ({
      ...prev,
      doctor: prev.doctor || admission.doctor || "",
      ward: prev.ward || admission.ward || "",
    }));
  }

  async function submit() {
    const errors = {};
    if (!selected) errors.patient = "Select an admitted patient first.";
    if (isCaseSheet && !form.doctor.trim()) errors.doctor = "Doctor is required.";
    if (!form.date) errors.date = "Date is required.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/ip-clinical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uhid: selected.uhid,
          patientName: selected.patientName,
          recordType,
          doctor: form.doctor,
          ward: form.ward,
          date: form.date,
          department: form.department,
          diagnosis: form.diagnosis,
          notes: form.notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || `Save failed (${res.status}).` });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      const record = data.record;
      setNotice({ kind: "success", message: `${recordType} saved for ${record.patientName} · ${record.refNo}.` });
      setFieldErrors({});
      setForm((prev) => ({ ...prev, diagnosis: "", notes: "" }));
      loadRecords();
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(record) {
    setBusyId(record._id);
    try {
      const next = record.status === "Closed" ? "Open" : "Closed";
      const res = await fetch(`/api/ip-clinical-records/${record._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: record.source, status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "Update failed." });
        return;
      }
      setRecords((prev) => prev.map((row) => (row._id === record._id ? data.record : row)));
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-medium",
            notice.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          )}
        >
          {notice.kind === "success" ? (
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {notice.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <AdmissionPicker
          query={query}
          setQuery={setQuery}
          loading={admissionsLoading}
          rows={filtered}
          selected={selected}
          onSelect={pick}
          onRefresh={loadAdmissions}
          fieldError={fieldErrors.patient}
          recordType={recordType}
        />

        <div className="space-y-6">
          <RecordForm
            recordType={recordType}
            isCaseSheet={isCaseSheet}
            form={form}
            update={update}
            doctors={doctors}
            selected={selected}
            saving={saving}
            fieldErrors={fieldErrors}
            onSubmit={submit}
          />

          <RecentRecords
            rows={records}
            loading={recordsLoading}
            busyId={busyId}
            onRefresh={loadRecords}
            onToggle={toggleStatus}
          />
        </div>
      </div>

      {sessionUser ? (
        <p className="flex items-center gap-1.5 text-[12px] text-ink-400">
          <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
          Recorded by: {sessionUser.name}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------- admission picker ---------------------------- */

function AdmissionPicker({ query, setQuery, loading, rows, selected, onSelect, onRefresh, fieldError, recordType }) {
  return (
    <PageSection
      title="Select admitted patient"
      subtitle={`Choose the admission this ${recordType.toLowerCase()} belongs to`}
      icon={<BedDouble className="h-4 w-4" aria-hidden="true" />}
      actions={
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" />
        </button>
      }
    >
      <div className="border-b border-ink-100 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, UHID or IP number…"
            className={cn(inputCls, "pl-9")}
          />
        </div>
      </div>

      {fieldError ? (
        <p className="border-b border-ink-100 px-4 py-2 text-[12.5px] font-medium text-danger-500">{fieldError}</p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden="true" />
          Loading admissions…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <SearchX className="h-8 w-8 text-ink-300" aria-hidden="true" />
          <p className="text-sm font-medium text-ink-600">No admissions found</p>
          <p className="text-[13px] text-ink-400">Admit a patient first from the Admission Register.</p>
        </div>
      ) : (
        <ul className="max-h-[460px] divide-y divide-ink-100 overflow-y-auto">
          {rows.map((row) => {
            const active = selected?._id === row._id;
            return (
              <li key={row._id}>
                <button
                  type="button"
                  onClick={() => onSelect(row)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-brand-50/50",
                    active && "bg-brand-50/70"
                  )}
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-[12px] font-bold text-white", active && "bg-brand-700")}>
                    {initials(row.patientName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-ink-900">{row.patientName}</span>
                      <span className="shrink-0 font-mono text-[11.5px] text-ink-400">{row.ipNo}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-ink-500">
                      {row.ward || "—"}
                      {row.bed ? ` · ${row.bed}` : ""}
                      {row.doctor ? ` · ${row.doctor}` : ""}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                      row.status === "Admitted"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                        : "bg-ink-100 text-ink-600 ring-ink-200"
                    )}
                  >
                    {row.status}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected ? (
        <div className="flex items-center gap-3 border-t border-brand-100 bg-brand-50/60 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-[11px] font-bold text-white">
            {initials(selected.patientName)}
          </span>
          <p className="min-w-0 flex-1 truncate text-[12.5px] text-ink-700">
            <span className="font-semibold">{selected.patientName}</span> · {selected.uhid} · {selected.ipNo}
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
            <Check className="h-3 w-3" aria-hidden="true" />
            Selected
          </span>
        </div>
      ) : null}
    </PageSection>
  );
}

/* ------------------------------- record form ------------------------------ */

function RecordForm({ recordType, isCaseSheet, form, update, doctors, selected, saving, fieldErrors, onSubmit }) {
  return (
    <PageSection
      title={recordType}
      subtitle={selected ? `For ${selected.patientName}` : "Select a patient to record"}
      icon={<FileText className="h-4 w-4" aria-hidden="true" />}
    >
      <div className="grid grid-cols-2 gap-3.5 p-4">
        <Field label="Date" required error={fieldErrors.date} className="col-span-2 sm:col-span-1">
          <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Doctor" required={isCaseSheet} error={fieldErrors.doctor} className="col-span-2 sm:col-span-1">
          {doctors.length > 0 ? (
            <select value={form.doctor} onChange={(e) => update("doctor", e.target.value)} className={selectCls}>
              <option value="">Select…</option>
              {doctors.map((doctor) => <option key={doctor} value={doctor}>{doctor}</option>)}
            </select>
          ) : (
            <input type="text" value={form.doctor} onChange={(e) => update("doctor", e.target.value)} placeholder="Doctor name" className={inputCls} />
          )}
        </Field>
        <Field label="Ward" className="col-span-2 sm:col-span-1">
          <input type="text" value={form.ward} onChange={(e) => update("ward", e.target.value)} placeholder="Ward" className={inputCls} />
        </Field>
        {isCaseSheet ? (
          <Field label="Department" className="col-span-2 sm:col-span-1">
            <input type="text" value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="Department" className={inputCls} />
          </Field>
        ) : null}
        {isCaseSheet ? (
          <Field label="Diagnosis" className="col-span-2">
            <input type="text" value={form.diagnosis} onChange={(e) => update("diagnosis", e.target.value)} placeholder="Working diagnosis" className={inputCls} />
          </Field>
        ) : null}
        <Field label="Notes" className="col-span-2">
          <textarea
            rows={5}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder={`Clinical notes for this ${recordType.toLowerCase()}…`}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-ink-100 p-4">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {saving ? "Saving…" : "Save record"}
        </button>
        <span className="text-[11.5px] text-ink-400">Reference number is allocated on save.</span>
      </div>
    </PageSection>
  );
}

/* ----------------------------- recent records ----------------------------- */

function RecentRecords({ rows, loading, busyId, onRefresh, onToggle }) {
  return (
    <PageSection
      title="Recent records"
      subtitle={`${rows.length} captured`}
      icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
      actions={
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" />
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin text-brand-500" aria-hidden="true" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <SearchX className="h-7 w-7 text-ink-300" aria-hidden="true" />
          <p className="text-[12.5px] text-ink-400">No records captured yet.</p>
        </div>
      ) : (
        <ul className="max-h-[320px] divide-y divide-ink-100 overflow-y-auto">
          {rows.map((row) => (
            <li key={row._id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13px] font-semibold text-ink-800">{row.patientName}</p>
                <p className="truncate font-mono text-[11px] text-ink-400">
                  {row.refNo} · {row.date}
                </p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", statusTone(row.status))}>
                {row.status}
              </span>
              <button
                type="button"
                onClick={() => onToggle(row)}
                disabled={busyId === row._id}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-ink-200 px-2 text-[11.5px] font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800 disabled:opacity-50"
              >
                {busyId === row._id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Save className="h-3 w-3" aria-hidden="true" />}
                {row.status === "Closed" ? "Reopen" : "Close"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
