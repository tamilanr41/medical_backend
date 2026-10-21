"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Unlock,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Dialog from "@/components/ui/Dialog";
import Drawer from "@/components/ui/Drawer";
import PageSection from "@/components/ui/PageSection";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  GENDERS,
  PURPOSES,
  STATUS_LEGEND,
  nextStatuses,
  statusMeta,
} from "@/lib/appointment-constants";

const TYPE_FILTERS = ["All", ...APPOINTMENT_TYPES];

const MODE_TABS = [
  { key: "op-register", label: "OP Register", href: "/opd/transaction/op-register", icon: ClipboardList },
  { key: "appointment", label: "Appointment", icon: Stethoscope },
  { key: "prescription", label: "Prescription", href: "#prescription", icon: Activity },
  { key: "tplan", label: "T.Plan", href: "/opd/transaction/treatment-plan-scheduling", icon: Calendar },
];

const ACTION_LABELS = {
  Tentative: "Mark tentative",
  Confirmed: "Confirm",
  Arrived: "Mark arrived",
  Scan: "Send to scan",
  "Checked-in": "Check in",
  "Checked-out": "Check out",
  Cancelled: "Cancel",
};

const CARD_TONE = {
  emerald: "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300",
  amber: "border-amber-200 bg-amber-50/60",
  sky: "border-sky-200 bg-sky-50/60",
  indigo: "border-indigo-200 bg-indigo-50/60",
  violet: "border-violet-200 bg-violet-50/60",
  teal: "border-teal-200 bg-teal-50/60",
  rose: "border-rose-200 bg-rose-50/60",
  muted: "border-ink-200 bg-ink-50/60",
};

const DANGER_TARGETS = new Set(["Cancelled"]);

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";

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

function initials(name) {
  return (name || "?").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

/**
 * Doctor-wise appointment scheduling: loads a real slot grid for the selected
 * doctor/day, books into op_registrations, drives the appointment lifecycle
 * and blocks unavailable ranges. Selected appointments feed the prescription
 * workflow in the parent screen.
 */
export default function AppointmentSchedule({
  defaultDoctor,
  doctor,
  onDoctorChange,
  date,
  onDateChange,
  type,
  onTypeChange,
  selectedAppt,
  onSelect,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  const [patients, setPatients] = useState([]);
  const [newSlot, setNewSlot] = useState(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const [lookupDraft, setLookupDraft] = useState(null);
  const [department, setDepartment] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [listPage, setListPage] = useState(1);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams();
        if (doctor) params.set("doctor", doctor);
        if (date) params.set("date", date);
        if (type) params.set("type", type);
        if (department) params.set("department", department);
        if (statusFilter) params.set("status", statusFilter);
        const res = await fetch(`/api/appointments/schedule?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || "The schedule could not be loaded.");
        if (!cancelled) {
          setData(payload);
          setError("");
        }
      } catch (err) {
        if (!cancelled && err.name !== "AbortError") setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [doctor, date, type, department, statusFilter, nonce]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/resource/op_registrations?all=1&sort=visitDate&dir=desc", {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const seen = new Set();
        const list = [];
        for (const row of payload.rows ?? []) {
          if (!row.uhid || seen.has(row.uhid)) continue;
          seen.add(row.uhid);
          list.push({
            uhid: row.uhid,
            patientName: row.patientName,
            gender: row.gender,
            age: row.age,
            department: row.department,
          });
        }
        if (!cancelled) setPatients(list);
      } catch {
        /* patient picker is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (doctor || !defaultDoctor) return;
    const list = data?.doctors ?? [];
    if (list.some((entry) => entry.name === defaultDoctor)) {
      onDoctorChange(defaultDoctor);
    }
  }, [doctor, defaultDoctor, data, onDoctorChange]);

  const doctors = data?.doctors ?? [];
  const departments = data?.departments ?? [];
  const schedule = data?.schedule ?? null;
  const slots = data?.slots ?? [];
  const appointments = data?.appointments ?? [];
  const counts = data?.counts ?? { total: 0, available: 0, booked: 0, blocked: 0 };
  const hasSchedule = Boolean(data?.hasSchedule);

  const selectedDoctorEntry = doctors.find((entry) => entry.name === doctor) || null;
  const draftActive = Boolean(lookupDraft) && lookupDraft.baseDoctor === doctor;
  const doctorIdValue = draftActive ? lookupDraft.id : selectedDoctorEntry?.id || "";
  const doctorNameValue = draftActive ? lookupDraft.name : doctor || "";

  function editLookupId(value) {
    setLookupDraft({ baseDoctor: doctor, id: value, name: draftActive ? lookupDraft.name : doctorNameValue });
  }

  function editLookupName(value) {
    setLookupDraft({ baseDoctor: doctor, id: draftActive ? lookupDraft.id : doctorIdValue, name: value });
  }

  const term = searchTerm.trim().toLowerCase();
  const visibleAppointments = term
    ? appointments.filter((row) =>
        [row.tokenNo, row.uhid, row.patientName, row.slotStart, row.inTime, row.appointmentType, row.status]
          .some((value) => String(value ?? "").toLowerCase().includes(term))
      )
    : appointments;

  const LIST_PAGE_SIZE = 8;
  const listTotalPages = Math.max(1, Math.ceil(visibleAppointments.length / LIST_PAGE_SIZE));
  const listSafePage = Math.min(listPage, listTotalPages);
  const pagedAppointments = visibleAppointments.slice(
    (listSafePage - 1) * LIST_PAGE_SIZE,
    listSafePage * LIST_PAGE_SIZE
  );

  function applyDoctor(entry) {
    setLookupDraft(null);
    setListPage(1);
    onDoctorChange(entry.name);
  }

  function lookupDoctor() {
    const list = data?.doctors ?? [];
    const idValue = doctorIdValue.trim();
    const nameValue = doctorNameValue.trim().toLowerCase();
    let match = null;
    if (idValue) {
      match =
        list.find((entry) => entry.id && entry.id === idValue) ||
        list.find((entry) => entry.name.toLowerCase() === idValue.toLowerCase()) ||
        null;
    }
    if (!match && nameValue) {
      match =
        list.find((entry) => entry.name.toLowerCase() === nameValue) ||
        list.find((entry) => entry.name.toLowerCase().includes(nameValue)) ||
        null;
    }
    if (!match) {
      setNotice({ kind: "error", message: "No doctor matched that ID or name." });
      return;
    }
    setNotice(null);
    applyDoctor(match);
  }

  function openNew() {
    const slot = slots.find((entry) => entry.status === "Available");
    if (!slot) {
      setNotice({ kind: "error", message: "No available slots to book for this doctor and date." });
      return;
    }
    setNewSlot(slot);
  }

  async function runAction(promiseFactory, successMessage) {
    setBusy(true);
    setNotice(null);
    try {
      const result = await promiseFactory();
      if (result?.error) {
        setNotice({ kind: "error", message: result.error });
        return null;
      }
      if (successMessage) setNotice({ kind: "success", message: successMessage });
      refresh();
      return result;
    } catch {
      setNotice({ kind: "error", message: "Network error. Please retry." });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createAppointment(payload) {
    const result = await runAction(async () => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { error: body.error || `Booking failed (${res.status}).` };
      return body;
    }, `Appointment booked for ${payload.patientName}.`);
    if (result?.appointment) {
      setNewSlot(null);
      onSelect(result.appointment);
    }
  }

  async function applyStatus(appointment, status) {
    const result = await runAction(async () => {
      const res = await fetch(`/api/appointments/${appointment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { error: body.error || `Update failed (${res.status}).` };
      return body;
    }, `${appointment.patientName} → ${status}.`);
    if (result?.appointment && selectedAppt?._id === appointment._id) {
      onSelect(result.appointment);
    }
  }

  async function reschedule(appointment, slotStart, appointmentType) {
    const result = await runAction(async () => {
      const res = await fetch(`/api/appointments/${appointment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", slotStart, appointmentType }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { error: body.error || `Reschedule failed (${res.status}).` };
      return body;
    }, `Moved to ${slotStart}.`);
    if (result?.appointment) {
      setRescheduleOpen(false);
      if (selectedAppt?._id === appointment._id) onSelect(result.appointment);
    }
  }

  async function createBlock(payload) {
    const result = await runAction(async () => {
      const res = await fetch("/api/appointments/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { error: body.error || `Block failed (${res.status}).` };
      return body;
    }, "Time range blocked.");
    if (result?.ok) setBlockOpen(false);
  }

  async function releaseBlock(block) {
    await runAction(async () => {
      const res = await fetch(`/api/appointments/blocks/${block._id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { error: body.error || `Unblock failed (${res.status}).` };
      return body;
    }, "Blocked range released.");
  }

  return (
    <>
      <PageSection
        title="Doctor schedule"
        subtitle="Doctor lookup, organization unit, date and status — click a free slot to book"
        icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openNew}
              disabled={!doctor || !hasSchedule}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              aria-pressed={searchOpen}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition",
                searchOpen ? "border-brand-200 bg-brand-50 text-brand-700 dark:text-brand-300" : "border-ink-200 text-ink-600 hover:border-ink-300"
              )}
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Search
            </button>
            <button
              type="button"
              onClick={() => setBlockOpen(true)}
              disabled={!doctor || !hasSchedule}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[12px] font-semibold text-ink-600 transition hover:border-ink-300 disabled:opacity-40"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Blk App
            </button>
            <button
              type="button"
              onClick={refresh}
              aria-label="Refresh schedule"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" />
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-5">
          <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-ink-200 bg-ink-50/60 p-1" aria-label="Appointment sections">
            {MODE_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tab.key === "appointment";
              const cls = cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition",
                active ? "bg-panel text-brand-700 shadow-sm dark:text-brand-300" : "text-ink-500 hover:text-ink-800"
              );
              return tab.href ? (
                <Link key={tab.key} href={tab.href} className={cls}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {tab.label}
                </Link>
              ) : (
                <span key={tab.key} className={cls} aria-current="page">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {tab.label}
                </span>
              );
            })}
          </nav>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <Field label="Doctor ID">
              <input
                type="text"
                value={doctorIdValue}
                onChange={(event) => editLookupId(event.target.value)}
                placeholder="Doctor reference ID"
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field label="Doctor name">
              <input
                type="text"
                list="doctor-directory"
                value={doctorNameValue}
                onChange={(event) => editLookupName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    lookupDoctor();
                  }
                }}
                placeholder="Type or pick a doctor…"
                className={inputCls}
              />
              <datalist id="doctor-directory">
                {doctors.map((entry) => (
                  <option key={entry.name} value={entry.name}>
                    {entry.department || "—"}
                    {entry.hasSchedule ? "" : " · no schedule"}
                  </option>
                ))}
              </datalist>
            </Field>
            <button
              type="button"
              onClick={lookupDoctor}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Lookup
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Organization unit">
              <select
                value={department}
                onChange={(event) => {
                  setDepartment(event.target.value);
                  setListPage(1);
                }}
                className={cn(inputCls, "cursor-pointer")}
              >
                <option value="">All units</option>
                {departments.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setListPage(1);
                  onDateChange(event.target.value);
                }}
                className={inputCls}
              />
            </Field>
            <Field label="Appointment status">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setListPage(1);
                }}
                className={cn(inputCls, "cursor-pointer")}
              >
                <option value="All">All statuses</option>
                {APPOINTMENT_STATUSES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Appointment type">
              <div className="flex flex-wrap gap-1.5">
                {TYPE_FILTERS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setListPage(1);
                      onTypeChange(option);
                    }}
                    aria-pressed={type === option}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition",
                      type === option
                        ? "border-brand-200 bg-brand-50 text-brand-700 dark:text-brand-300"
                        : "border-ink-200 text-ink-500 hover:border-ink-300 hover:text-ink-700"
                    )}
                  >
                    {option === "All" ? "All types" : option}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {searchOpen ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setListPage(1);
                }}
                placeholder="Search appointments by token, UHID, name, time or status…"
                className={cn(inputCls, "pl-9")}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-3">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">Status legend</span>
            {STATUS_LEGEND.map((entry) => (
              <span key={entry.label} title={`Stored value: ${entry.value}`}>
                <Badge tone={entry.tone}>{entry.label}</Badge>
              </span>
            ))}
          </div>

          {notice ? (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium",
                notice.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              )}
            >
              {notice.kind === "success" ? (
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <span className="shrink-0" aria-hidden="true">!</span>
              )}
              {notice.message}
            </div>
          ) : null}

          {error ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[12px] font-semibold"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Retry
              </button>
            </div>
          ) : !doctor ? (
            <EmptyState icon={UserRound} title="Select a doctor" description="Choose a doctor to load their schedule and available slots." />
          ) : !hasSchedule ? (
            <EmptyState icon={Calendar} title="No schedule configured" description={`${doctor} has no active session. Add a schedule to enable slot booking.`} />
          ) : slots.length === 0 ? (
            <EmptyState icon={Clock} title="No slots" description="No slots match the current date and appointment-type filters." />          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="emerald">{counts.available} available</Badge>
                <Badge tone="sky">{counts.booked} booked</Badge>
                <Badge tone="rose">{counts.blocked} blocked</Badge>
                {schedule ? (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-ink-400">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {schedule.sessionStart}–{schedule.sessionEnd} · {schedule.slotMinutes} min slots
                  </span>
                ) : null}
              </div>

              <SlotGrid
                slots={slots}
                selectedId={selectedAppt?._id}
                busy={busy}
                onPickAvailable={(slot) => setNewSlot(slot)}
                onPickAppointment={(appointment) => onSelect(appointment)}
                onReleaseBlock={releaseBlock}
              />

              <AppointmentList
                appointments={pagedAppointments}
                total={visibleAppointments.length}
                page={listSafePage}
                totalPages={listTotalPages}
                onPage={setListPage}
                selectedId={selectedAppt?._id}
                busy={busy}
                onSelect={onSelect}
              />
            </>
          )}
        </div>
      </PageSection>

      <AppointmentDetail
        open={Boolean(selectedAppt)}
        appointment={selectedAppt}
        busy={busy}
        onClose={() => onSelect(null)}
        onStatus={applyStatus}
        onReschedule={() => setRescheduleOpen(true)}
      />

      {newSlot ? (
        <NewAppointmentDialog
          key={`${newSlot.start}-${doctor}-${date}`}
          open
          slot={newSlot}
          doctor={doctor}
          date={date}
          department={schedule?.department || ""}
          type={type}
          patients={patients}
          busy={busy}
          onClose={() => setNewSlot(null)}
          onSubmit={createAppointment}
        />
      ) : null}

      {rescheduleOpen && selectedAppt ? (
        <RescheduleDialog
          key={`${selectedAppt._id}-${selectedAppt.slotStart}-${selectedAppt.appointmentType}`}
          open
          busy={busy}
          slots={slots}
          appointment={selectedAppt}
          onClose={() => setRescheduleOpen(false)}
          onSubmit={reschedule}
        />
      ) : null}

      {blockOpen ? (
        <BlockDialog
          key={`${doctor}-${date}`}
          open
          doctor={doctor}
          date={date}
          schedule={schedule}
          busy={busy}
          onClose={() => setBlockOpen(false)}
          onSubmit={createBlock}
        />
      ) : null}
    </>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-ink-200 px-4 py-10 text-center">
      <Icon className="h-6 w-6 text-ink-300" aria-hidden="true" />
      <p className="text-sm font-medium text-ink-600">{title}</p>
      <p className="max-w-md text-[12.5px] text-ink-400">{description}</p>
    </div>
  );
}

function SlotGrid({ slots, selectedId, busy, onPickAvailable, onPickAppointment, onReleaseBlock }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {slots.map((slot) => {
        const appointment = slot.appointment;
        const meta = statusMeta(slot.status);
        const card = CARD_TONE[meta.tone] ?? CARD_TONE.muted;
        const isSelected = appointment && appointment._id === selectedId;

        if (slot.block && !appointment) {
          return (
            <li key={slot.start}>
              <div className={cn("flex h-full w-full flex-col gap-1.5 rounded-xl border px-3 py-2.5", card)}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12.5px] font-semibold text-ink-800">{slot.start}</span>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </span>
                <span className="block truncate text-[12px] font-medium text-ink-600">{slot.block.reason || "Blocked"}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onReleaseBlock(slot.block)}
                  className="mt-0.5 inline-flex items-center gap-1 self-start text-[11px] font-semibold text-rose-600 transition hover:underline disabled:opacity-50"
                >
                  <Unlock className="h-3 w-3" aria-hidden="true" />
                  Unblock
                </button>
              </div>
            </li>
          );
        }

        return (
          <li key={slot.start}>
            <button
              type="button"
              disabled={busy}
              onClick={() => (appointment ? onPickAppointment(appointment) : onPickAvailable(slot))}
              className={cn(
                "flex h-full w-full flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition hover:-translate-y-0.5 disabled:opacity-70",
                card,
                isSelected && "ring-2 ring-brand-300"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-[12.5px] font-semibold text-ink-800">{slot.start}</span>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </span>
              {appointment ? (
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-semibold text-ink-800">{appointment.patientName}</span>
                  <span className="block truncate font-mono text-[10.5px] text-ink-400">
                    {appointment.appointmentType} · {appointment.uhid}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Book slot
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AppointmentList({ appointments, total, page, totalPages, onPage, selectedId, busy, onSelect }) {
  if (!total) {
    return (
      <p className="rounded-xl border border-dashed border-ink-200 px-3 py-6 text-center text-[12.5px] text-ink-400">
        No appointments match the current filters.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-ink-200">
      <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50/60 text-[11px] uppercase tracking-wide text-ink-400">
            <th scope="col" className="px-3 py-2 font-semibold">Sel</th>
            <th scope="col" className="px-3 py-2 font-semibold">T.No</th>
            <th scope="col" className="px-3 py-2 font-semibold">UHID</th>
            <th scope="col" className="px-3 py-2 font-semibold">Name</th>
            <th scope="col" className="px-3 py-2 font-semibold">Time</th>
            <th scope="col" className="px-3 py-2 font-semibold">InTime</th>
            <th scope="col" className="px-3 py-2 font-semibold">Type</th>
            <th scope="col" className="px-3 py-2 font-semibold">Status</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">View App</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appt) => {
            const active = appt._id === selectedId;
            const meta = statusMeta(appt.status);
            return (
              <tr
                key={appt._id}
                tabIndex={0}
                onClick={() => onSelect(appt)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(appt);
                  }
                }}
                className={cn(
                  "cursor-pointer border-b border-ink-100 transition last:border-0 focus-visible:bg-brand-50/60 focus-visible:outline-none",
                  active ? "bg-brand-50/60" : "hover:bg-ink-50/60"
                )}
              >
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded-full border",
                      active ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300"
                    )}
                    aria-hidden="true"
                  >
                    {active ? <Check className="h-3 w-3" /> : null}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono tabular-nums text-ink-700">{appt.tokenNo ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-ink-600">{appt.uhid || "—"}</td>
                <td className="px-3 py-2 font-semibold text-ink-800">{appt.patientName || "—"}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-ink-700">{appt.slotStart || "—"}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-ink-700">{appt.inTime || "—"}</td>
                <td className="px-3 py-2">
                  <Badge tone={appt.appointmentType === "Scan" ? "violet" : "sky"}>{appt.appointmentType || "OP"}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(appt);
                    }}
                    className="rounded-lg border border-ink-200 px-2.5 py-1 text-[12px] font-semibold text-ink-600 transition hover:border-ink-300"
                  >
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-3 py-2 text-[12px] text-ink-400">
        <span>
          Page {page} of {totalPages} · {total} appointment{total === 1 ? "" : "s"}
        </span>
        {totalPages > 1 ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1 font-semibold text-ink-600 transition hover:border-ink-300 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => onPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1 font-semibold text-ink-600 transition hover:border-ink-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AppointmentDetail({ open, appointment, busy, onClose, onStatus, onReschedule }) {
  if (!appointment) return null;
  const meta = statusMeta(appointment.status);
  const targets = nextStatuses(appointment.status);

  return (
    <Drawer open={open} onClose={onClose} label="Appointment detail" side="right" size="w-full sm:w-[460px]">
      <div className="flex h-full flex-col">
        <div className="flex items-start gap-3 border-b border-ink-100 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-[12px] font-bold text-white">
            {initials(appointment.patientName)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] font-bold text-ink-900">{appointment.patientName}</h2>
            <p className="mt-0.5 font-mono text-[12px] text-ink-400">{appointment.uhid} · {appointment.opNo}</p>
          </div>
          <button type="button" data-drawer-close onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="scrollbar-slim flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <Badge tone={appointment.appointmentType === "Scan" ? "violet" : "sky"}>{appointment.appointmentType}</Badge>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-ink-200 bg-ink-50/60 p-4">
            <Detail label="Token" value={appointment.tokenNo ? `#${appointment.tokenNo}` : "—"} mono />
            <Detail label="Slot" value={appointment.slotStart ? `${appointment.slotStart} – ${appointment.slotEnd}` : "—"} mono />
            <Detail label="Doctor" value={appointment.doctor} />
            <Detail label="Department" value={appointment.department} />
            <Detail label="Date" value={appointment.visitDate} mono />
            <Detail label="Gender / Age" value={`${appointment.gender} · ${appointment.age}`} />
          </dl>

          {targets.length > 0 ? (
            <div className="mt-5">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">Lifecycle</h3>
              <div className="flex flex-wrap gap-2">
                {targets.map((target) => (
                  <button
                    key={target}
                    type="button"
                    disabled={busy}
                    onClick={() => onStatus(appointment, target)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition disabled:opacity-50",
                      DANGER_TARGETS.has(target)
                        ? "border border-rose-200 text-rose-600 hover:bg-rose-50"
                        : "bg-brand-600 text-white hover:bg-brand-700"
                    )}
                  >
                    {ACTION_LABELS[target] ?? target}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <button
              type="button"
              disabled={busy || appointment.status === "Cancelled"}
              onClick={onReschedule}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-[12.5px] font-semibold text-ink-600 transition hover:border-ink-300 disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Reschedule
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className={cn("truncate text-[13px] text-ink-800", mono && "font-mono")}>{value || "—"}</dd>
    </div>
  );
}

function NewAppointmentDialog({ open, slot, doctor, date, department, type, patients, busy, onClose, onSubmit }) {
  const [mode, setMode] = useState(patients.length > 0 ? "existing" : "new");
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState(null);
  const [manual, setManual] = useState({ uhid: "", patientName: "", gender: "Male", age: "", department: department || "" });
  const [details, setDetails] = useState({ mobile: "", address: "", remarks: "", purpose: "General", status: "Tentative" });
  const [appointmentType, setAppointmentType] = useState(type && type !== "All" ? type : "OP");
  const [errors, setErrors] = useState({});

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients.slice(0, 6);
    return patients
      .filter((row) => [row.uhid, row.patientName].some((value) => String(value || "").toLowerCase().includes(q)))
      .slice(0, 8);
  }, [patients, query]);

  if (!open || !slot) return null;

  function submit() {
    const source = mode === "existing" ? patient : manual;
    const nextErrors = {};
    if (!source) nextErrors.patient = "Select or enter a patient.";
    if (source) {
      if (!String(source.uhid ?? "").trim()) nextErrors.uhid = "UHID is required.";
      if (!String(source.patientName ?? "").trim()) nextErrors.patientName = "Patient name is required.";
      if (!String(source.age ?? "").trim()) nextErrors.age = "Age is required.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onSubmit({
      doctor,
      date,
      slotStart: slot.start,
      appointmentType,
      uhid: String(source.uhid).trim(),
      patientName: String(source.patientName).trim(),
      gender: source.gender || "Male",
      age: Number(source.age),
      department: String(source.department || department || "").trim(),
      mobile: String(details.mobile ?? "").trim(),
      address: String(details.address ?? "").trim(),
      remarks: String(details.remarks ?? "").trim(),
      purpose: details.purpose,
      status: details.status,
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title="New appointment" description={`${doctor} · ${date} · ${slot.start}–${slot.end}`} className="max-w-xl">
      <div className="scrollbar-slim max-h-[70vh] overflow-y-auto p-5">
        <div className="mb-4 grid grid-cols-2 gap-4">
          <Field label="Slot">
            <input type="text" value={`${slot.start} – ${slot.end}`} readOnly className={cn(inputCls, "font-mono")} />
          </Field>
          <Field label="Appointment type" required>
            <select value={appointmentType} onChange={(event) => setAppointmentType(event.target.value)} className={cn(inputCls, "cursor-pointer")}>
              {APPOINTMENT_TYPES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mb-3 flex items-center gap-1.5">
          {["existing", "new"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              aria-pressed={mode === option}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] font-semibold transition",
                mode === option
                  ? "border-brand-200 bg-brand-50 text-brand-700 dark:text-brand-300"
                  : "border-ink-200 text-ink-500 hover:border-ink-300"
              )}
            >
              {option === "existing" ? "Existing patient" : "New patient"}
            </button>
          ))}
        </div>

        {mode === "existing" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search patient by name or UHID…"
                className={cn(inputCls, "pl-9")}
              />
            </div>
            <ul className="scrollbar-slim max-h-52 space-y-1.5 overflow-y-auto pr-1">
              {matches.length === 0 ? (
                <li className="rounded-xl border border-dashed border-ink-200 px-3 py-4 text-center text-[12.5px] text-ink-400">
                  No matching patient. Switch to “New patient”.
                </li>
              ) : (
                matches.map((row) => {
                  const active = patient?.uhid === row.uhid;
                  return (
                    <li key={row.uhid}>
                      <button
                        type="button"
                        onClick={() => {
                          setPatient(row);
                          setErrors({});
                          setDetails((prev) => ({ ...prev, mobile: row.mobile || "", address: row.address || "" }));
                        }}
                        aria-pressed={active}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition",
                          active ? "border-brand-300 bg-brand-50/70 ring-2 ring-brand-100" : "border-ink-200 hover:border-brand-200 hover:bg-ink-50/60"
                        )}
                      >
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold", active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500")}>
                          {initials(row.patientName)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-ink-800">{row.patientName}</span>
                          <span className="block truncate font-mono text-[11px] text-ink-400">{row.uhid} · {row.gender} · {row.age}</span>
                        </span>
                        {active ? <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" /> : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            {errors.patient ? <p className="text-[12.5px] font-medium text-danger-500">{errors.patient}</p> : null}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="UHID" required error={errors.uhid}>
              <input type="text" value={manual.uhid} onChange={(event) => setManual((prev) => ({ ...prev, uhid: event.target.value }))} className={cn(inputCls, "font-mono")} />
            </Field>
            <Field label="Patient name" required error={errors.patientName}>
              <input type="text" value={manual.patientName} onChange={(event) => setManual((prev) => ({ ...prev, patientName: event.target.value }))} className={inputCls} />
            </Field>
            <Field label="Sex">
              <select value={manual.gender} onChange={(event) => setManual((prev) => ({ ...prev, gender: event.target.value }))} className={cn(inputCls, "cursor-pointer")}>
                {GENDERS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Age" required error={errors.age}>
              <input type="number" min="0" value={manual.age} onChange={(event) => setManual((prev) => ({ ...prev, age: event.target.value }))} className={inputCls} />
            </Field>
            <Field label="Department" className="sm:col-span-2">
              <input type="text" value={manual.department} onChange={(event) => setManual((prev) => ({ ...prev, department: event.target.value }))} className={inputCls} />
            </Field>
          </div>
        )}

        <div className="mt-4 border-t border-ink-100 pt-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-400">Appointment details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Purpose">
              <select value={details.purpose} onChange={(event) => setDetails((prev) => ({ ...prev, purpose: event.target.value }))} className={cn(inputCls, "cursor-pointer")}>
                {PURPOSES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={details.status} onChange={(event) => setDetails((prev) => ({ ...prev, status: event.target.value }))} className={cn(inputCls, "cursor-pointer")}>
                {["Tentative", "Confirmed", "Arrived", "Checked-in", "Checked-out", "Cancelled"].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Mobile">
              <input type="tel" value={details.mobile} onChange={(event) => setDetails((prev) => ({ ...prev, mobile: event.target.value }))} className={inputCls} />
            </Field>
            <Field label="Address">
              <input type="text" value={details.address} onChange={(event) => setDetails((prev) => ({ ...prev, address: event.target.value }))} className={inputCls} />
            </Field>
            <Field label="Remarks" className="sm:col-span-2">
              <textarea rows={2} value={details.remarks} onChange={(event) => setDetails((prev) => ({ ...prev, remarks: event.target.value }))} className={cn(inputCls, "resize-none")} />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 p-4">
        <button type="button" onClick={onClose} className="rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300">
          Close
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
          Save
        </button>
      </div>
    </Dialog>
  );
}

function RescheduleDialog({ open, appointment, slots, busy, onClose, onSubmit }) {
  const [slotStart, setSlotStart] = useState("");
  const [appointmentType, setAppointmentType] = useState(appointment?.appointmentType || "OP");

  if (!open || !appointment) return null;

  const available = slots.filter(
    (slot) => slot.status === "Available" && slot.start !== appointment.slotStart
  );

  return (
    <Dialog open={open} onClose={onClose} title="Reschedule appointment" description={`${appointment.patientName} · ${appointment.opNo}`} className="max-w-lg">
      <div className="p-5">
        <Field label="Appointment type">
          <select value={appointmentType} onChange={(event) => setAppointmentType(event.target.value)} className={cn(inputCls, "cursor-pointer")}>
            {APPOINTMENT_TYPES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>

        <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">Available slots</p>
        {available.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-200 px-3 py-6 text-center text-[12.5px] text-ink-400">
            No free slots remain on this day. Change the date and try again.
          </p>
        ) : (
          <div className="scrollbar-slim grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pr-1">
            {available.map((slot) => (
              <button
                key={slot.start}
                type="button"
                onClick={() => setSlotStart(slot.start)}
                aria-pressed={slotStart === slot.start}
                className={cn(
                  "rounded-lg border px-2 py-2 text-[12.5px] font-semibold transition",
                  slotStart === slot.start
                    ? "border-brand-300 bg-brand-50 text-brand-700 dark:text-brand-300"
                    : "border-ink-200 text-ink-600 hover:border-brand-200"
                )}
              >
                {slot.start}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-ink-100 p-4">
        <button type="button" onClick={onClose} className="rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300">
          Cancel
        </button>
        <button
          type="button"
          disabled={busy || !slotStart}
          onClick={() => onSubmit(appointment, slotStart, appointmentType)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
          Move
        </button>
      </div>
    </Dialog>
  );
}

function BlockDialog({ open, doctor, date, schedule, busy, onClose, onSubmit }) {
  const [startTime, setStartTime] = useState(schedule?.sessionStart || "09:00");
  const [endTime, setEndTime] = useState(schedule?.sessionEnd || "10:00");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});

  if (!open) return null;

  function submit() {
    const nextErrors = {};
    if (!startTime) nextErrors.startTime = "Start time is required.";
    if (!endTime) nextErrors.endTime = "End time is required.";
    if (startTime && endTime && endTime <= startTime) nextErrors.endTime = "End time must be after the start time.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onSubmit({ doctor, date, startTime, endTime, reason });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Block time range" description={`${doctor} · ${date}`} className="max-w-md">
      <div className="grid grid-cols-2 gap-3 p-5">
        <Field label="From" required error={errors.startTime}>
          <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={cn(inputCls, "font-mono")} />
        </Field>
        <Field label="To" required error={errors.endTime}>
          <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={cn(inputCls, "font-mono")} />
        </Field>
        <Field label="Reason" className="col-span-2">
          <input type="text" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. OT / procedure, meeting…" className={inputCls} />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-ink-100 p-4">
        <button type="button" onClick={onClose} className="rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
          Block range
        </button>
      </div>
    </Dialog>
  );
}
