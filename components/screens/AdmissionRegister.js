"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bed,
  Check,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Drawer from "@/components/ui/Drawer";
import PageSection from "@/components/ui/PageSection";

const ADMISSION_TYPES = ["Emergency", "Elective", "Day Care"];
const WARDS = ["General Ward", "ICU", "HDU", "Maternity", "Pediatric", "Private"];

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

function PatientAvatar({ name, className }) {
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-[12px] font-bold text-white", className)}>
      {initials(name)}
    </span>
  );
}

/**
 * Admission Register — the IPD counterpart of the OP desk: search an existing
 * patient, capture the admission (ward / room / bed / doctor / type) and the
 * server allocates the IP number. Writes to the shared `admissions` collection
 * so the IP reports pick the admission up immediately.
 */
export default function AdmissionRegister({ user, item }) {
  return (
    <AdmissionRegisterInner
      sessionUser={user}
      isCollege={item?.slug === "admission-register-college"}
    />
  );
}

function AdmissionRegisterInner({ sessionUser, isCollege = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [doctors, setDoctors] = useState([]);

  const [form, setForm] = useState({
    admissionType: "Elective",
    ward: "",
    room: "",
    bed: "",
    doctor: "",
    admissionDate: today(),
    referredBy: "",
    college: "",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const loadPatients = useCallback(async (value) => {
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(value)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setResults(res.ok && Array.isArray(data.rows) ? data.rows : []);
      if (!res.ok) setSearchError(data.error || "Patients could not be loaded.");
    } catch {
      setResults([]);
      setSearchError("Patients could not be loaded.");
    } finally {
      setSearching(false);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await fetch("/api/ip-admissions?all=1&limit=12", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setRecent(res.ok && Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setRecent([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [patientsRes, recentRes] = await Promise.all([
          fetch("/api/patients?q=", { cache: "no-store" }),
          fetch("/api/ip-admissions?all=1&limit=12", { cache: "no-store" }),
        ]);
        const patients = await patientsRes.json().catch(() => ({}));
        const admissions = await recentRes.json().catch(() => ({}));
        if (cancelled) return;
        setResults(patientsRes.ok && Array.isArray(patients.rows) ? patients.rows : []);
        setRecent(res && Array.isArray(admissions.rows) ? admissions.rows : []);
      } catch {
        if (!cancelled) {
          setResults([]);
          setSearchError("Patients could not be loaded.");
          setRecent([]);
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
          setRecentLoading(false);
        }
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

  const admittedCount = useMemo(
    () => recent.filter((row) => row.status === "Admitted").length,
    [recent]
  );

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function pickPatient(patient) {
    setSelectedPatient(patient);
    setNotice(null);
    setFieldErrors({});
  }

  async function submitAdmission() {
    const errors = {};
    if (!selectedPatient) errors.patient = "Select or register a patient first.";
    if (!form.admissionType) errors.admissionType = "Admission type is required.";
    if (!form.ward) errors.ward = "Ward is required.";
    if (!form.doctor) errors.doctor = "Attending doctor is required.";
    if (!form.admissionDate) errors.admissionDate = "Admission date is required.";
    if (isCollege && !form.college.trim()) errors.college = "College / camp is required.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        uhid: selectedPatient.uhid,
        patientName: selectedPatient.patientName,
        gender: selectedPatient.gender,
        age: selectedPatient.age,
        mobile: selectedPatient.mobile,
        address: selectedPatient.address,
        admissionType: form.admissionType,
        ward: form.ward,
        room: form.room,
        bed: form.bed,
        doctor: form.doctor,
        admissionDate: form.admissionDate,
        referredBy: form.referredBy,
        college: form.college,
        remarks: form.remarks,
      };
      const res = await fetch("/api/ip-admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || `Admission failed (${res.status}).` });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      const admission = data.admission;
      setNotice({
        kind: "success",
        message: `Admitted ${admission.patientName} · ${admission.ipNo} to ${admission.ward}${admission.bed ? ` (${admission.bed})` : ""}.`,
      });
      setSelectedPatient(null);
      setFieldErrors({});
      setForm((prev) => ({
        ...prev,
        room: "",
        bed: "",
        doctor: "",
        referredBy: "",
        college: "",
        remarks: "",
      }));
      loadRecent();
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setSaving(false);
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
        <PatientLookupPanel
          query={query}
          setQuery={setQuery}
          onSubmit={() => loadPatients(query)}
          searching={searching}
          error={searchError}
          results={results}
          selectedPatient={selectedPatient}
          onSelect={pickPatient}
          onClear={() => {
            setQuery("");
            loadPatients("");
          }}
          onNew={() => loadPatients(query)}
          fieldError={fieldErrors.patient}
        />

        <div className="space-y-6">
          <AdmissionForm
            form={form}
            update={update}
            doctors={doctors}
            selectedPatient={selectedPatient}
            isCollege={isCollege}
            saving={saving}
            fieldErrors={fieldErrors}
            onSubmit={submitAdmission}
          />

          <RecentPanel
            rows={recent}
            loading={recentLoading}
            admittedCount={admittedCount}
            onRefresh={loadRecent}
          />
        </div>
      </div>

      {sessionUser ? (
        <p className="flex items-center gap-1.5 text-[12px] text-ink-400">
          <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
          Desk operator: {sessionUser.name}
        </p>
      ) : null}
    </div>
  );
}

/* ----------------------------- patient lookup ----------------------------- */

function PatientLookupPanel({ query, setQuery, onSubmit, searching, error, results, selectedPatient, onSelect, onClear, onNew, fieldError }) {
  return (
    <PageSection
      title="Find patient"
      subtitle="Search by UHID, name or mobile number"
      icon={<Users className="h-4 w-4" aria-hidden="true" />}
      actions={
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-[12.5px] font-semibold text-white transition hover:bg-brand-700"
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
          New patient
        </button>
      }
    >
      <form
        className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Rajesh, UH-2026-1001 or 98xxxxxx…"
            className={cn(inputCls, "pl-9 pr-9")}
          />
          {query ? (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </button>
      </form>

      {fieldError ? (
        <p className="border-b border-ink-100 px-4 py-2 text-[12.5px] font-medium text-danger-500">{fieldError}</p>
      ) : null}

      {selectedPatient ? (
        <div className="flex items-center gap-3 border-b border-brand-100 bg-brand-50/60 px-4 py-3">
          <PatientAvatar name={selectedPatient.patientName} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13.5px] font-semibold text-ink-900">{selectedPatient.patientName}</p>
            <p className="truncate font-mono text-[11px] text-ink-500">
              {selectedPatient.uhid} · {selectedPatient.gender} · {selectedPatient.age}y
              {selectedPatient.mobile ? ` · ${selectedPatient.mobile}` : ""}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
            <Check className="h-3 w-3" aria-hidden="true" />
            Selected
          </span>
        </div>
      ) : null}

      {searching ? (
        <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden="true" />
          Searching patients…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <SearchX className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-ink-700">{error}</p>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <SearchX className="h-8 w-8 text-ink-300" aria-hidden="true" />
          <p className="text-sm font-medium text-ink-600">No patients found</p>
          <p className="text-[13px] text-ink-400">Adjust the search or register a new patient.</p>
        </div>
      ) : (
        <ul className="max-h-[420px] divide-y divide-ink-100 overflow-y-auto">
          {results.map((patient) => {
            const active = selectedPatient?._id === patient._id;
            return (
              <li key={patient._id}>
                <button
                  type="button"
                  onClick={() => onSelect(patient)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-brand-50/50",
                    active && "bg-brand-50/70"
                  )}
                >
                  <PatientAvatar name={patient.patientName} className={active ? "bg-brand-700" : ""} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-ink-900">{patient.patientName}</span>
                      <span className="shrink-0 font-mono text-[11.5px] text-ink-400">{patient.uhid}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-ink-500">
                      {patient.gender} · {patient.age}y
                      {patient.mobile ? ` · ${patient.mobile}` : ""}
                      {patient.patientType ? ` · ${patient.patientType}` : ""}
                    </span>
                  </span>
                  {active ? (
                    <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                  ) : (
                    <Plus className="h-4 w-4 shrink-0 text-ink-300" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PageSection>
  );
}

/* ----------------------------- admission form ----------------------------- */

function AdmissionForm({ form, update, doctors, selectedPatient, isCollege, saving, fieldErrors, onSubmit }) {
  return (
    <PageSection
      title="Admission details"
      subtitle={selectedPatient ? `Admit ${selectedPatient.patientName}` : "Select a patient to admit"}
      icon={<Bed className="h-4 w-4" aria-hidden="true" />}
    >
      <div className="grid grid-cols-2 gap-3.5 p-4">
        <Field label="Admission date" required error={fieldErrors.admissionDate} className="col-span-2 sm:col-span-1">
          <input type="date" value={form.admissionDate} onChange={(e) => update("admissionDate", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Admission type" required error={fieldErrors.admissionType} className="col-span-2 sm:col-span-1">
          <select value={form.admissionType} onChange={(e) => update("admissionType", e.target.value)} className={selectCls}>
            {ADMISSION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Ward" required error={fieldErrors.ward} className="col-span-2 sm:col-span-1">
          <select value={form.ward} onChange={(e) => update("ward", e.target.value)} className={selectCls}>
            <option value="">Select…</option>
            {WARDS.map((ward) => <option key={ward} value={ward}>{ward}</option>)}
          </select>
        </Field>
        <Field label="Attending doctor" required error={fieldErrors.doctor} className="col-span-2 sm:col-span-1">
          {doctors.length > 0 ? (
            <select value={form.doctor} onChange={(e) => update("doctor", e.target.value)} className={selectCls}>
              <option value="">Select…</option>
              {doctors.map((doctor) => <option key={doctor} value={doctor}>{doctor}</option>)}
            </select>
          ) : (
            <input
              type="text"
              value={form.doctor}
              onChange={(e) => update("doctor", e.target.value)}
              placeholder="Doctor name"
              className={inputCls}
            />
          )}
        </Field>
        <Field label="Room" className="col-span-2 sm:col-span-1">
          <input type="text" value={form.room} onChange={(e) => update("room", e.target.value)} placeholder="e.g. GW-12" className={inputCls} />
        </Field>
        <Field label="Bed" className="col-span-2 sm:col-span-1">
          <input type="text" value={form.bed} onChange={(e) => update("bed", e.target.value)} placeholder="e.g. GW-12-B" className={inputCls} />
        </Field>
        <Field label="Referred by" className="col-span-2 sm:col-span-1">
          <input type="text" value={form.referredBy} onChange={(e) => update("referredBy", e.target.value)} placeholder="Referral / doctor" className={inputCls} />
        </Field>
        {isCollege ? (
          <Field label="College / Camp" required error={fieldErrors.college} className="col-span-2 sm:col-span-1">
            <input
              type="text"
              value={form.college}
              onChange={(e) => update("college", e.target.value)}
              placeholder="College / camp name"
              className={inputCls}
            />
          </Field>
        ) : null}
        <Field label="Remarks" className="col-span-2">
          <textarea rows={2} value={form.remarks} onChange={(e) => update("remarks", e.target.value)} placeholder="Optional note for the admission…" className={inputCls} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-ink-100 px-4 py-2.5">
        <p className="text-[11.5px] text-ink-400">The IP number is allocated server-side on save.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-ink-100 p-4">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Bed className="h-4 w-4" aria-hidden="true" />}
          {saving ? "Saving…" : "Admit patient"}
        </button>
      </div>
    </PageSection>
  );
}

/* ------------------------------ recent panel ------------------------------ */

function RecentPanel({ rows, loading, admittedCount, onRefresh }) {
  return (
    <PageSection
      title="Recent admissions"
      subtitle={`${admittedCount} admitted in view`}
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
        <p className="px-6 py-10 text-center text-[12.5px] text-ink-400">No admissions yet.</p>
      ) : (
        <ul className="max-h-[300px] divide-y divide-ink-100 overflow-y-auto">
          {rows.map((row) => (
            <li key={row._id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex h-7 shrink-0 items-center justify-center rounded-md bg-ink-100 px-1.5 font-mono text-[10.5px] font-bold text-ink-600">
                {row.bed || "—"}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13px] font-semibold text-ink-800">{row.patientName}</p>
                <p className="truncate text-[11.5px] text-ink-400">
                  {row.ward || "—"}
                  {row.doctor ? ` · ${row.doctor}` : ""}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-ink-400">{row.ipNo}</span>
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
