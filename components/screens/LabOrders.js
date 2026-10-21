"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ClipboardList,
  Loader2,
  RefreshCw,
  Save,
  Search,
  SearchX,
  TestTube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";
import { LAB_SAMPLE_TYPES } from "@/config/lab-ui";

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";
const selectCls = cn(inputCls, "cursor-pointer");

const MODE_BY_SLUG = {
  "patient-checkin-register-lab": { mode: "list", title: "Patient Check-in Register (Lab)", subtitle: "Every lab order received" },
  "lab-test-pending": { mode: "pending", title: "Lab Tests Pending", subtitle: "Orders awaiting sample / result" },
  "sample-collection-register": { mode: "collected", title: "Sample Collection Register", subtitle: "Specimens collected" },
  "sample-collection-by-checkin": { mode: "collect", title: "Sample Collection", subtitle: "Record specimen against a check-in" },
};

function Field({ label, error, children, className }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-600">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-medium text-danger-500">{error}</span> : null}
    </label>
  );
}

function statusTone(status) {
  if (status === "Completed" || status === "Reported") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "Processing") return "bg-brand-50 text-brand-700 ring-brand-100";
  if (status === "Cancelled") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}

function priorityTone(priority) {
  if (priority === "STAT") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (priority === "Urgent") return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-ink-100 text-ink-600 ring-ink-200";
}

/** The lab order register and specimen-collection screens. */
export default function LabOrders({ user, item }) {
  const config = MODE_BY_SLUG[item?.slug] || { mode: "list", title: "Lab Orders", subtitle: "" };
  return <LabOrdersInner sessionUser={user} config={config} />;
}

function LabOrdersInner({ sessionUser, config }) {
  const { mode, title, subtitle } = config;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState(null);

  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ sampleType: "Blood", barcode: "", collectedBy: "" });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/lab-orders?all=1&limit=300";
      if (mode === "pending") url = "/api/lab-orders?status=Received&all=1&limit=300";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      let list = res.ok && Array.isArray(data.rows) ? data.rows : [];
      if (mode === "pending") list = list.filter((r) => ["Received", "Processing"].includes(r.status));
      if (mode === "collected") list = list.filter((r) => r.collectedAt || ["Processing", "Reported", "Completed"].includes(r.status));
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let url = "/api/lab-orders?all=1&limit=300";
        if (mode === "pending") url = "/api/lab-orders?status=Received&all=1&limit=300";
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        let list = res.ok && Array.isArray(data.rows) ? data.rows : [];
        if (mode === "pending") list = list.filter((r) => ["Received", "Processing"].includes(r.status));
        if (mode === "collected") list = list.filter((r) => r.collectedAt || ["Processing", "Reported", "Completed"].includes(r.status));
        setRows(list);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.patientName, row.uhid, row.checkinNo, row.doctor].some((value) => String(value || "").toLowerCase().includes(q))
    );
  }, [rows, query]);

  function pick(row) {
    setSelected(row);
    setFieldErrors({});
    setNotice(null);
    setForm({
      sampleType: row.sampleType || "Blood",
      barcode: row.barcode || "",
      collectedBy: row.collectedBy || sessionUser?.name || "",
    });
  }

  async function collect() {
    const errors = {};
    if (!selected) errors.patient = "Select a check-in first.";
    if (!form.collectedBy.trim()) errors.collectedBy = "Collected by is required.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/lab-orders/${selected._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "Processing" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "Update failed." });
        return;
      }
      setNotice({ kind: "success", message: `Sample collected for ${data.order.patientName} · ${data.order.checkinNo}.` });
      setSelected(null);
      setForm({ sampleType: "Blood", barcode: "", collectedBy: sessionUser?.name || "" });
      load();
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setSaving(false);
    }
  }

  if (mode === "collect") {
    return (
      <div className="space-y-6">
        {notice ? <Notice notice={notice} /> : null}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <OrderList
            title="Pending check-ins"
            subtitle="Select the check-in to collect a sample for"
            rows={filtered}
            loading={loading}
            query={query}
            setQuery={setQuery}
            selected={selected}
            onSelect={pick}
            onRefresh={load}
            fieldError={fieldErrors.patient}
            showCollection
          />
          <PageSection title="Sample details" subtitle={selected ? `For ${selected.patientName}` : "Select a check-in"} icon={<TestTube className="h-4 w-4" aria-hidden="true" />}>
            <div className="grid grid-cols-2 gap-3.5 p-4">
              <Field label="Sample type" className="col-span-2 sm:col-span-1">
                <select value={form.sampleType} onChange={(e) => setForm((p) => ({ ...p, sampleType: e.target.value }))} className={selectCls}>
                  {LAB_SAMPLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Barcode" className="col-span-2 sm:col-span-1">
                <input type="text" value={form.barcode} onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))} placeholder="Scan / type" className={inputCls} />
              </Field>
              <Field label="Collected by" error={fieldErrors.collectedBy} className="col-span-2">
                <input type="text" value={form.collectedBy} onChange={(e) => setForm((p) => ({ ...p, collectedBy: e.target.value }))} placeholder="Technician" className={inputCls} />
              </Field>
            </div>
            <div className="flex items-center gap-2.5 border-t border-ink-100 p-4">
              <button type="button" onClick={collect} disabled={saving} className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Saving…" : "Record collection"}
              </button>
              <span className="text-[11.5px] text-ink-400">Sets the order to Processing.</span>
            </div>
          </PageSection>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notice ? <Notice notice={notice} /> : null}
      <OrderList
        title={title}
        subtitle={`${subtitle} · ${filtered.length} shown`}
        rows={filtered}
        loading={loading}
        query={query}
        setQuery={setQuery}
        selected={null}
        onSelect={() => {}}
        onRefresh={load}
        showCollection
      />
      {sessionUser ? <p className="flex items-center gap-1.5 text-[12px] text-ink-400"><ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />Signed in as {sessionUser.name}</p> : null}
    </div>
  );
}

function Notice({ notice }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-medium", notice.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
      {notice.kind === "success" ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {notice.message}
    </div>
  );
}

function OrderList({ title, subtitle, rows, loading, query, setQuery, selected, onSelect, onRefresh, fieldError, showCollection }) {
  return (
    <PageSection
      title={title}
      subtitle={subtitle}
      icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
      actions={<button type="button" onClick={onRefresh} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" /></button>}
    >
      <div className="border-b border-ink-100 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, UHID or check-in no…" className={cn(inputCls, "pl-9")} />
        </div>
      </div>
      {fieldError ? <p className="border-b border-ink-100 px-4 py-2 text-[12.5px] font-medium text-danger-500">{fieldError}</p> : null}
      {loading ? (
        <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-ink-500"><Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden="true" />Loading…</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center"><SearchX className="h-8 w-8 text-ink-300" aria-hidden="true" /><p className="text-sm font-medium text-ink-600">Nothing here</p><p className="text-[13px] text-ink-400">Raise a lab bill to create orders.</p></div>
      ) : (
        <ul className="max-h-[520px] divide-y divide-ink-100 overflow-y-auto">
          {rows.map((row) => (
            <li key={row._id}>
              <button type="button" onClick={() => onSelect?.(row)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-brand-50/40", selected?._id === row._id && "bg-brand-50/60")}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-[11px] font-bold text-white">
                  {String(row.patientName || "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-ink-800">{row.patientName}</span>
                    <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset", priorityTone(row.priority))}>{row.priority}</span>
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[11px] text-ink-400">{row.checkinNo} · {row.uhid} · {(row.tests || []).length} tests{showCollection && row.collectedBy ? ` · ${row.collectedBy}` : ""}</span>
                </span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", statusTone(row.status))}>{row.status}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
