"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Send,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Drawer from "@/components/ui/Drawer";
import PageSection from "@/components/ui/PageSection";
import { formatMoney } from "./MedicineLookup";

const DEPARTMENTS = [
  "General Medicine",
  "Cardiology",
  "Nephrology",
  "Orthopedics",
  "Pathology",
  "Radiology",
];

const PAYMENT_MODES = ["Cash", "Card", "UPI", "Wallet", "Insurance", "Credit", "Sponsor"];
const APPOINTMENT_TYPES = ["OP", "Scan"];
const PURPOSES = ["General", "Health Checkup"];

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
 * OP Register — the reception desk walk-in workflow ported from the legacy
 * `OPRegular.jsp` / `Patient.jsp` screens: search an existing patient (or
 * register a new one with an auto-allocated UHID), capture the visit, collect
 * the consultation fee and save — the OP number and token are generated
 * server-side.
 */
export default function OpRegister({ user, item }) {
  return <OpRegisterInner sessionUser={user} isCollege={item?.slug === "op-register-college"} />;
}

function OpRegisterInner({ sessionUser, isCollege = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [doctors, setDoctors] = useState([]);

  const [form, setForm] = useState({
    department: "",
    doctor: "",
    visitDate: today(),
    appointmentType: "OP",
    purpose: "General",
    referredBy: "",
    college: "",
    paymentMode: "Cash",
    consultationFee: "",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [todayRows, setTodayRows] = useState([]);
  const [todayLoading, setTodayLoading] = useState(true);

  const [newOpen, setNewOpen] = useState(false);

  const loadPatients = useCallback(async (value) => {
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

  const loadToday = useCallback(async () => {
    setTodayLoading(true);
    try {
      const res = await fetch(
        `/api/resource/op_registrations?from=${today()}&to=${today()}&sort=tokenNo&dir=asc&all=1`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      setTodayRows(res.ok && Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setTodayRows([]);
    } finally {
      setTodayLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [patientsRes, todayRes] = await Promise.all([
          fetch("/api/patients?q=", { cache: "no-store" }),
          fetch(
            `/api/resource/op_registrations?from=${today()}&to=${today()}&sort=tokenNo&dir=asc&all=1`,
            { cache: "no-store" }
          ),
        ]);
        const patients = await patientsRes.json().catch(() => ({}));
        const regs = await todayRes.json().catch(() => ({}));
        if (cancelled) return;
        setResults(patientsRes.ok && Array.isArray(patients.rows) ? patients.rows : []);
        setTodayRows(todayRes.ok && Array.isArray(regs.rows) ? regs.rows : []);
      } catch {
        if (!cancelled) {
          setResults([]);
          setSearchError("Patients could not be loaded.");
          setTodayRows([]);
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
          setTodayLoading(false);
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
          setDoctors(
            data.rows
              .filter((row) => row.name)
              .map((row) => ({ name: row.name, department: row.department || "" }))
          );
        }
      } catch {
        if (!cancelled) setDoctors([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const departments = useMemo(() => {
    const set = new Set(DEPARTMENTS);
    for (const doctor of doctors) if (doctor.department) set.add(doctor.department);
    return [...set];
  }, [doctors]);

  const doctorOptions = useMemo(() => {
    const list = form.department
      ? doctors.filter((doctor) => !doctor.department || doctor.department === form.department)
      : doctors;
    return list;
  }, [doctors, form.department]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function pickPatient(patient) {
    setSelectedPatient(patient);
    setNotice(null);
    setFieldErrors({});
  }

  async function submitRegistration() {
    const errors = {};
    if (!selectedPatient) errors.patient = "Select or register a patient first.";
    if (!form.department) errors.department = "Department is required.";
    if (!form.doctor) errors.doctor = "Doctor is required.";
    if (!form.visitDate) errors.visitDate = "Visit date is required.";
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
        department: form.department,
        doctor: form.doctor,
        visitDate: form.visitDate,
        appointmentType: form.appointmentType,
        purpose: form.purpose,
        referredBy: form.referredBy,
        college: form.college,
        paymentMode: form.paymentMode,
        consultationFee: form.consultationFee,
        remarks: form.remarks,
      };
      const res = await fetch("/api/op-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || `Registration failed (${res.status}).` });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      const reg = data.registration;
      setNotice({
        kind: "success",
        message: `Registered ${reg.patientName} · ${reg.opNo} · token ${reg.tokenNo} with ${reg.doctor}.`,
      });
      setSelectedPatient(null);
      setFieldErrors({});
      setForm((prev) => ({
        ...prev,
        doctor: "",
        referredBy: "",
        college: "",
        consultationFee: "",
        remarks: "",
      }));
      loadToday();
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
          onNew={() => setNewOpen(true)}
          fieldError={fieldErrors.patient}
        />

        <div className="space-y-6">
          <RegistrationForm
            form={form}
            update={update}
            departments={departments}
            doctorOptions={doctorOptions}
            selectedPatient={selectedPatient}
            isCollege={isCollege}
            saving={saving}
            fieldErrors={fieldErrors}
            onSubmit={submitRegistration}
          />

          <TodayPanel rows={todayRows} loading={todayLoading} onRefresh={loadToday} />
        </div>
      </div>

      <NewPatientDrawer
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onRegistered={(patient) => {
          setNewOpen(false);
          pickPatient(patient);
          setNotice({ kind: "success", message: `Patient ${patient.patientName} registered as ${patient.uhid}.` });
          loadPatients(query);
        }}
      />

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

/* ---------------------------- registration form --------------------------- */

function RegistrationForm({ form, update, departments, doctorOptions, selectedPatient, isCollege = false, saving, fieldErrors, onSubmit }) {
  return (
    <PageSection
      title="Visit details"
      subtitle={selectedPatient ? `Register ${selectedPatient.patientName}` : "Pick a patient to register their visit"}
      icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
    >
      <div className="grid grid-cols-2 gap-3.5 p-4">
        <Field label="Visit date" required error={fieldErrors.visitDate} className="col-span-2 sm:col-span-1">
          <input type="date" value={form.visitDate} onChange={(e) => update("visitDate", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Appointment type" className="col-span-2 sm:col-span-1">
          <select value={form.appointmentType} onChange={(e) => update("appointmentType", e.target.value)} className={selectCls}>
            {APPOINTMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Department" required error={fieldErrors.department} className="col-span-2 sm:col-span-1">
          <select value={form.department} onChange={(e) => update("department", e.target.value)} className={selectCls}>
            <option value="">Select…</option>
            {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </Field>
        <Field label="Doctor" required error={fieldErrors.doctor} className="col-span-2 sm:col-span-1">
          {doctorOptions.length > 0 ? (
            <select value={form.doctor} onChange={(e) => update("doctor", e.target.value)} className={selectCls}>
              <option value="">Select…</option>
              {doctorOptions.map((doctor) => <option key={doctor.name} value={doctor.name}>{doctor.name}</option>)}
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
        <Field label="Purpose" className="col-span-2 sm:col-span-1">
          <select value={form.purpose} onChange={(e) => update("purpose", e.target.value)} className={selectCls}>
            {PURPOSES.map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}
          </select>
        </Field>
        <Field label="Referred by" className="col-span-2 sm:col-span-1">
          <input type="text" value={form.referredBy} onChange={(e) => update("referredBy", e.target.value)} placeholder="Referral / doctor" className={inputCls} />
        </Field>
        {isCollege ? (
          <Field label="College / Camp" required error={fieldErrors.college} className="col-span-2">
            <input
              type="text"
              value={form.college}
              onChange={(e) => update("college", e.target.value)}
              placeholder="College / camp name"
              className={inputCls}
            />
          </Field>
        ) : null}
        <Field label="Consultation fee" className="col-span-2 sm:col-span-1">
          <input
            type="number"
            min="0"
            value={form.consultationFee}
            onChange={(e) => update("consultationFee", e.target.value)}
            placeholder="0.00"
            className={cn(inputCls, "font-mono")}
          />
        </Field>
        <Field label="Payment mode" className="col-span-2 sm:col-span-1">
          <select value={form.paymentMode} onChange={(e) => update("paymentMode", e.target.value)} className={selectCls}>
            {PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
        </Field>
        <Field label="Remarks" className="col-span-2">
          <textarea rows={2} value={form.remarks} onChange={(e) => update("remarks", e.target.value)} placeholder="Optional note for the visit…" className={inputCls} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-ink-100 px-4 py-3.5">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || !selectedPatient}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:pointer-events-none disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {saving ? "Registering…" : "Register visit"}
        </button>
        <span className="text-[12px] text-ink-400">OP number &amp; token are generated on save.</span>
      </div>
    </PageSection>
  );
}

/* ------------------------------ today panel ------------------------------- */

function TodayPanel({ rows, loading, onRefresh }) {
  const count = rows.length;
  const fee = rows.reduce((sum, row) => sum + (Number(row.consultationFee) || 0), 0);
  return (
    <PageSection
      title="Today's registrations"
      subtitle={`${count} registered · ${formatMoney(fee)} collected`}
      icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
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
        <p className="px-6 py-10 text-center text-[12.5px] text-ink-400">No registrations yet today.</p>
      ) : (
        <ul className="max-h-[300px] divide-y divide-ink-100 overflow-y-auto">
          {rows.map((row) => (
            <li key={row._id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-100 text-[11px] font-bold text-ink-600 tabular-nums">
                {row.tokenNo ?? "—"}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13px] font-semibold text-ink-800">{row.patientName}</p>
                <p className="truncate text-[11.5px] text-ink-400">
                  {row.doctor || "—"}
                  {row.department ? ` · ${row.department}` : ""}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-ink-400">{row.opNo}</span>
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}

/* --------------------------- new patient drawer --------------------------- */

function NewPatientDrawer({ open, onClose, onRegistered }) {
  return (
    <Drawer open={open} onClose={onClose} label="Register new patient" side="right" size="w-full sm:w-[560px]">
      {open ? <NewPatientForm onClose={onClose} onRegistered={onRegistered} /> : null}
    </Drawer>
  );
}

function NewPatientForm({ onClose, onRegistered }) {
  const [form, setForm] = useState(blankPatient);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [duplicates, setDuplicates] = useState([]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save(force = false) {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, autoUhid: true, force }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && Array.isArray(data.duplicates) && data.duplicates.length > 0) {
        setDuplicates(data.duplicates);
        setNotice({ kind: "error", message: data.error });
        return;
      }
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "Could not register the patient." });
        if (data.fields) setErrors(data.fields);
        return;
      }
      onRegistered(data.patient);
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b border-ink-100 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_20px_-10px_rgba(29,111,245,0.9)]">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-bold text-ink-900">New patient</h2>
            <p className="mt-0.5 text-[12px] text-ink-400">A UHID is allocated automatically on save.</p>
          </div>
          <button
            type="button"
            data-drawer-close
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="scrollbar-slim flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Salutation">
              <select value={form.salutation} onChange={(e) => update("salutation", e.target.value)} className={selectCls}>
                {["Mr.", "Mrs.", "Ms.", "Master", "Baby", "Dr."].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Patient name" required error={errors.patientName}>
              <input type="text" value={form.patientName} onChange={(e) => update("patientName", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Sex" required error={errors.gender}>
              <select value={form.gender} onChange={(e) => update("gender", e.target.value)} className={selectCls}>
                {["Male", "Female", "Trans", "Other"].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Age" required error={errors.age}>
              <input type="number" min="0" value={form.age} onChange={(e) => update("age", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Date of birth">
              <input type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Blood group">
              <select value={form.bloodGroup} onChange={(e) => update("bloodGroup", e.target.value)} className={selectCls}>
                {["Unknown", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Patient type">
              <select value={form.patientType} onChange={(e) => update("patientType", e.target.value)} className={selectCls}>
                {["General", "Corporate", "Insurance", "Staff", "Camp", "VIP"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Mobile" required error={errors.mobile}>
              <input type="text" value={form.mobile} onChange={(e) => update("mobile", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input type="text" value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Email" error={errors.email}>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Address" required error={errors.address} className="col-span-2">
              <textarea rows={2} value={form.address} onChange={(e) => update("address", e.target.value)} className={inputCls} />
            </Field>
            <Field label="City">
              <input type="text" value={form.city} onChange={(e) => update("city", e.target.value)} className={inputCls} />
            </Field>
            <Field label="State">
              <input type="text" value={form.state} onChange={(e) => update("state", e.target.value)} className={inputCls} />
            </Field>
            <Field label="PIN code">
              <input type="text" value={form.pincode} onChange={(e) => update("pincode", e.target.value)} className={inputCls} />
            </Field>
            <Field label="ID proof / Aadhaar">
              <input type="text" value={form.idProof} onChange={(e) => update("idProof", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Father / Guardian">
              <input type="text" value={form.guardianName} onChange={(e) => update("guardianName", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Relation">
              <select value={form.relation} onChange={(e) => update("relation", e.target.value)} className={selectCls}>
                {["Father", "Mother", "Spouse", "Son", "Daughter", "Guardian", "Self", "Other"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Occupation">
              <input type="text" value={form.occupation} onChange={(e) => update("occupation", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Marital status">
              <select value={form.maritalStatus} onChange={(e) => update("maritalStatus", e.target.value)} className={selectCls}>
                {["Unknown", "Single", "Married", "Divorced", "Widowed"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>

          {notice ? (
            <div className={cn("mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium", notice.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {notice.message}
            </div>
          ) : null}

          {duplicates.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
              <p className="text-[12.5px] font-semibold text-amber-800">Possible existing patients</p>
              <ul className="mt-2 space-y-1.5">
                {duplicates.map((dup) => (
                  <li key={dup._id} className="flex items-center justify-between gap-2 text-[12.5px] text-amber-900">
                    <span className="truncate">{dup.patientName}</span>
                    <span className="shrink-0 font-mono text-[11px]">{dup.uhid} · {dup.mobile}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11.5px] text-amber-700">Register anyway only if this is genuinely a different person.</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 p-4">
          <button
            type="button"
            onClick={() => save(duplicates.length > 0)}
            disabled={saving}
            className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            {duplicates.length > 0 ? "Register anyway" : saving ? "Saving…" : "Save patient"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800"
          >
            Cancel
          </button>
        </div>
    </div>
  );
}

function blankPatient() {
  return {
    salutation: "Mr.",
    patientName: "",
    gender: "Male",
    age: "",
    dob: "",
    bloodGroup: "Unknown",
    patientType: "General",
    mobile: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    guardianName: "",
    relation: "Self",
    idProof: "",
    occupation: "",
    maritalStatus: "Unknown",
    status: "Active",
  };
}
