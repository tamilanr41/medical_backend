"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  Check,
  Loader2,
  Receipt,
  RefreshCw,
  Save,
  Search,
  SearchX,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";
import { IP_BILLING_MODES, IP_BILLING_TYPES } from "@/config/ip-reports";

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

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toFixed(2);
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
  if (status === "Posted") return "bg-brand-50 text-brand-700 ring-brand-100";
  if (status === "Approved") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "Cancelled") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}

/** Workflow transitions offered per current status. */
function actions(status) {
  if (status === "Pending") return [{ label: "Approve", value: "Approved" }, { label: "Cancel", value: "Cancelled" }];
  if (status === "Approved") return [{ label: "Post", value: "Posted" }, { label: "Cancel", value: "Cancelled" }];
  if (status === "Posted") return [{ label: "Cancel", value: "Cancelled" }];
  return [{ label: "Reopen", value: "Pending" }];
}

/**
 * IP billing transactions — one bespoke screen behind all 9 IPD billing menu
 * items. Each slug maps to a `documentType` on the shared `ip_billing_records`
 * ledger (see config/ip-reports.js), which also feeds the advance / payment /
 * daily-collection reports.
 */
export default function IpBillingRecords({ user, item }) {
  const entry = IP_BILLING_TYPES[item?.slug] || { documentType: "Billing", status: "Pending" };
  return <IpBillingRecordsInner sessionUser={user} documentType={entry.documentType} />;
}

function IpBillingRecordsInner({ sessionUser, documentType }) {
  const [admissions, setAdmissions] = useState([]);
  const [admissionsLoading, setAdmissionsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({ amount: "", mode: "Cash", date: today(), remarks: "" });
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
        `/api/ip-billing-records?documentType=${encodeURIComponent(documentType)}&all=1&limit=100`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      setRecords(res.ok && Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }, [documentType]);

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
        const res = await fetch(
          `/api/ip-billing-records?documentType=${encodeURIComponent(documentType)}&all=1&limit=100`,
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
  }, [documentType]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return admissions;
    return admissions.filter((row) =>
      [row.patientName, row.uhid, row.ipNo, row.ward].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [admissions, query]);

  const total = useMemo(() => records.reduce((sum, row) => sum + (Number(row.amount) || 0), 0), [records]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function pick(admission) {
    setSelected(admission);
    setNotice(null);
    setFieldErrors({});
  }

  async function submit() {
    const errors = {};
    if (!selected) errors.patient = "Select an admitted patient first.";
    if (form.amount === "" || Number(form.amount) < 0 || !Number.isFinite(Number(form.amount))) {
      errors.amount = "Enter a valid amount.";
    }
    if (!form.date) errors.date = "Date is required.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/ip-billing-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uhid: selected.uhid,
          patientName: selected.patientName,
          ipNo: selected.ipNo,
          doctor: selected.doctor || "",
          documentType,
          amount: Number(form.amount),
          mode: form.mode,
          date: form.date,
          remarks: form.remarks,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || `Save failed (${res.status}).` });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      const record = data.record;
      setNotice({
        kind: "success",
        message: `${documentType} saved for ${record.patientName} · ${record.refNo} · ${money(record.amount)}.`,
      });
      setFieldErrors({});
      setForm((prev) => ({ ...prev, amount: "", remarks: "" }));
      loadRecords();
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(record, status) {
    setBusyId(record._id);
    try {
      const res = await fetch(`/api/ip-billing-records/${record._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
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
          documentType={documentType}
        />

        <div className="space-y-6">
          <BillingForm
            documentType={documentType}
            form={form}
            update={update}
            selected={selected}
            saving={saving}
            fieldErrors={fieldErrors}
            onSubmit={submit}
          />

          <RecentBilling
            rows={records}
            total={total}
            loading={recordsLoading}
            busyId={busyId}
            onRefresh={loadRecords}
            onChangeStatus={changeStatus}
          />
        </div>
      </div>

      {sessionUser ? (
        <p className="flex items-center gap-1.5 text-[12px] text-ink-400">
          <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
          Captured by: {sessionUser.name}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------- admission picker ---------------------------- */

function AdmissionPicker({ query, setQuery, loading, rows, selected, onSelect, onRefresh, fieldError, documentType }) {
  return (
    <PageSection
      title="Select admitted patient"
      subtitle={`Choose the admission this ${documentType.toLowerCase()} applies to`}
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
          <p className="text-[13px] text-ink-500">Admit a patient from the Admission Register first.</p>
        </div>
      ) : (
        <ul className="max-h-[320px] divide-y divide-ink-100 overflow-y-auto">
          {rows.map((row) => (
            <li key={row._id}>
              <button
                type="button"
                onClick={() => onSelect(row)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-brand-50/40",
                  selected?._id === row._id && "bg-brand-50/60"
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-[11px] font-bold text-white">
                  {initials(row.patientName)}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[13px] font-semibold text-ink-800">{row.patientName}</span>
                  <span className="block truncate font-mono text-[11px] text-ink-400">
                    {row.ipNo} · {row.uhid} · {row.ward || "—"}
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
          ))}
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

/* ------------------------------- billing form ----------------------------- */

function BillingForm({ documentType, form, update, selected, saving, fieldErrors, onSubmit }) {
  return (
    <PageSection
      title={documentType}
      subtitle={selected ? `For ${selected.patientName}` : "Select a patient to record"}
      icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
    >
      <div className="grid grid-cols-2 gap-3.5 p-4">
        <Field label="Amount" required error={fieldErrors.amount} className="col-span-2 sm:col-span-1">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
        </Field>
        <Field label="Mode" error={fieldErrors.mode} className="col-span-2 sm:col-span-1">
          <select value={form.mode} onChange={(e) => update("mode", e.target.value)} className={selectCls}>
            {IP_BILLING_MODES.map((mode) => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
        </Field>
        <Field label="Date" required error={fieldErrors.date} className="col-span-2 sm:col-span-1">
          <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Remarks" className="col-span-2">
          <textarea
            rows={3}
            value={form.remarks}
            onChange={(e) => update("remarks", e.target.value)}
            placeholder={`Notes for this ${documentType.toLowerCase()}…`}
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
          {saving ? "Saving…" : "Save entry"}
        </button>
        <span className="text-[11.5px] text-ink-400">Reference number is allocated on save.</span>
      </div>
    </PageSection>
  );
}

/* ------------------------------ recent entries ---------------------------- */

function RecentBilling({ rows, total, loading, busyId, onRefresh, onChangeStatus }) {
  return (
    <PageSection
      title="Recent entries"
      subtitle={`${rows.length} · ${money(total)} total`}
      icon={<Receipt className="h-4 w-4" aria-hidden="true" />}
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
          <p className="text-[12.5px] text-ink-500">No entries captured yet.</p>
        </div>
      ) : (
        <ul className="max-h-[320px] divide-y divide-ink-100 overflow-y-auto">
          {rows.map((row) => (
            <li key={row._id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13px] font-semibold text-ink-800">{row.patientName}</p>
                <p className="truncate font-mono text-[11px] text-ink-400">
                  {row.refNo} · {row.date} · {row.mode || "—"} · {money(row.amount)}
                </p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", statusTone(row.status))}>
                {row.status}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {actions(row.status).map((action) => (
                  <button
                    key={action.value}
                    type="button"
                    onClick={() => onChangeStatus(row, action.value)}
                    disabled={busyId === row._id}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-ink-200 px-2 text-[11.5px] font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800 disabled:opacity-50"
                  >
                    {busyId === row._id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
                    {action.label}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
