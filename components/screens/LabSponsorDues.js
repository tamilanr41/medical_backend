"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  Save,
  Search,
  SearchX,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";
import { Field, opInputCls as inputCls } from "./PatientPicker";
import { LAB_MODES } from "@/config/lab-ui";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  return (Number(value) || 0).toFixed(2);
}

function statusTone(status) {
  if (status === "Settled") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "Partially Paid") return "bg-brand-50 text-brand-700 ring-brand-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}

function Notice({ notice }) {
  if (!notice) return null;
  return (
    <div className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-medium", notice.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
      {notice.kind === "success" ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {notice.message}
    </div>
  );
}

const blank = () => ({ uhid: "", patientName: "", sponsor: "", invoiceNo: "", dueAmount: "", collectedAmount: "", mode: "Cash", date: today(), remarks: "" });

/** Laboratory › FrontOffice › Sponsor Due Collection. */
export default function LabSponsorDues({ user }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab-sponsor-dues?all=1&limit=200", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setRows(res.ok && Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/lab-sponsor-dues?all=1&limit=200", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setRows(res.ok && Array.isArray(data.rows) ? data.rows : []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.patientName, row.uhid, row.sponsor, row.invoiceNo, row.receiptNo].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [rows, query]);

  const totals = useMemo(() => {
    const due = filtered.reduce((sum, row) => sum + (Number(row.dueAmount) || 0), 0);
    const collected = filtered.reduce((sum, row) => sum + (Number(row.collectedAmount) || 0), 0);
    return { due, collected, outstanding: due - collected };
  }, [filtered]);

  function pick(row) {
    setSelectedId(row._id);
    setForm({
      uhid: row.uhid || "",
      patientName: row.patientName || "",
      sponsor: row.sponsor || "",
      invoiceNo: row.invoiceNo || "",
      dueAmount: String(row.dueAmount ?? ""),
      collectedAmount: String(row.collectedAmount ?? ""),
      mode: row.mode || "Cash",
      date: row.date || today(),
      remarks: row.remarks || "",
    });
  }

  function newDue() {
    setSelectedId("");
    setForm(blank());
    setNotice(null);
  }

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  async function submit() {
    setNotice(null);
    setSaving(true);
    try {
      let res;
      if (selectedId) {
        res = await fetch(`/api/lab-sponsor-dues/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collectedAmount: Number(form.collectedAmount) || 0, mode: form.mode, remarks: form.remarks }),
        });
      } else {
        res = await fetch("/api/lab-sponsor-dues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, dueAmount: Number(form.dueAmount) || 0, collectedAmount: Number(form.collectedAmount) || 0 }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "Save failed." });
        return;
      }
      setNotice({ kind: "success", message: selectedId ? `Collection updated for ${form.sponsor}.` : `Sponsor due saved for ${form.sponsor}.` });
      newDue();
      load();
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Notice notice={notice} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <PageSection
          title="Sponsor dues"
          subtitle={`${filtered.length} record(s)`}
          icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
          actions={
            <div className="flex items-center gap-2">
              <span className="hidden text-[12px] text-ink-500 sm:inline">Outstanding <span className="font-mono font-semibold text-ink-800">{money(totals.outstanding)}</span></span>
              <button type="button" onClick={load} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" /></button>
            </div>
          }
        >
          <div className="border-b border-ink-100 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, sponsor or invoice…" className={cn(inputCls, "pl-9")} />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-ink-500"><Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden="true" />Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center"><SearchX className="h-8 w-8 text-ink-300" aria-hidden="true" /><p className="text-sm font-medium text-ink-600">No sponsor dues</p></div>
          ) : (
            <ul className="max-h-[560px] divide-y divide-ink-100 overflow-y-auto">
              {filtered.map((row) => (
                <li key={row._id}>
                  <button type="button" onClick={() => pick(row)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-brand-50/40", selectedId === row._id && "bg-brand-50/60")}>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[13px] font-semibold text-ink-800">{row.sponsor}</span>
                      <span className="block truncate font-mono text-[11px] text-ink-400">{row.receiptNo} · {row.patientName || row.uhid || "—"}</span>
                    </span>
                    <span className="shrink-0 text-right text-[12px] font-semibold text-ink-700">
                      {money(row.collectedAmount)} <span className="text-ink-400">/ {money(row.dueAmount)}</span>
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", statusTone(row.status))}>{row.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PageSection>

        <PageSection
          title={selectedId ? "Update collection" : "New sponsor due"}
          subtitle={selectedId ? "Apply a collection against this bill" : "Record a sponsor liability"}
          icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="grid grid-cols-2 gap-3.5 p-4">
            <Field label="Sponsor" required className="col-span-2">
              <input type="text" value={form.sponsor} onChange={(e) => update("sponsor", e.target.value)} readOnly={Boolean(selectedId)} className={cn(inputCls, selectedId && "bg-ink-100/60")} />
            </Field>
            <Field label="Patient" className="col-span-2 sm:col-span-1">
              <input type="text" value={form.patientName} onChange={(e) => update("patientName", e.target.value)} readOnly={Boolean(selectedId)} className={cn(inputCls, selectedId && "bg-ink-100/60")} />
            </Field>
            <Field label="UHID" className="col-span-2 sm:col-span-1">
              <input type="text" value={form.uhid} onChange={(e) => update("uhid", e.target.value)} readOnly={Boolean(selectedId)} className={cn(inputCls, selectedId && "bg-ink-100/60")} />
            </Field>
            <Field label="Invoice no" className="col-span-2 sm:col-span-1">
              <input type="text" value={form.invoiceNo} onChange={(e) => update("invoiceNo", e.target.value)} readOnly={Boolean(selectedId)} className={cn(inputCls, selectedId && "bg-ink-100/60")} />
            </Field>
            <Field label="Date" required className="col-span-2 sm:col-span-1">
              <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} readOnly={Boolean(selectedId)} className={cn(inputCls, selectedId && "bg-ink-100/60")} />
            </Field>
            <Field label="Due amount" required className="col-span-2 sm:col-span-1">
              <input type="number" min="0" step="0.01" value={form.dueAmount} onChange={(e) => update("dueAmount", e.target.value)} readOnly={Boolean(selectedId)} className={cn(inputCls, selectedId && "bg-ink-100/60")} />
            </Field>
            <Field label="Collected amount" className="col-span-2 sm:col-span-1">
              <input type="number" min="0" step="0.01" value={form.collectedAmount} onChange={(e) => update("collectedAmount", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Mode" className="col-span-2 sm:col-span-1">
              <select value={form.mode} onChange={(e) => update("mode", e.target.value)} className={cn(inputCls, "cursor-pointer")}>
                {LAB_MODES.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </Field>
            <Field label="Remarks" className="col-span-2">
              <input type="text" value={form.remarks} onChange={(e) => update("remarks", e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="flex items-center gap-2.5 border-t border-ink-100 p-4">
            <button type="button" onClick={submit} disabled={saving} className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Saving…" : selectedId ? "Apply collection" : "Save sponsor due"}
            </button>
            {selectedId ? (
              <button type="button" onClick={newDue} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800">
                New due
              </button>
            ) : null}
          </div>
        </PageSection>
      </div>
    </div>
  );
}
