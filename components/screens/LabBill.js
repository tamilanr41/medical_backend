"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  FlaskConical,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";
import { LAB_MODES, LAB_PRIORITIES } from "@/config/lab-ui";

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";
const selectCls = cn(inputCls, "cursor-pointer");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
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

/** Laboratory front-office bill — raises a lab order (`lab_checkins`). */
export default function LabBill({ user }) {
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const [catalog, setCatalog] = useState([]);
  const [lines, setLines] = useState([]);
  const [draftTest, setDraftTest] = useState("");
  const [draftRate, setDraftRate] = useState("");

  const [form, setForm] = useState({ doctor: "", priority: "Routine", receivedAt: today(), paymentMode: "Cash", paidAmount: "", sponsor: "" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await fetch("/api/lab-orders?all=1&limit=20", { cache: "no-store" });
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
        const [pRes, tRes, rRes] = await Promise.all([
          fetch("/api/patients?all=1&limit=300", { cache: "no-store" }),
          fetch("/api/resource/lab_test_masters?all=1&limit=500", { cache: "no-store" }),
          fetch("/api/lab-orders?all=1&limit=20", { cache: "no-store" }),
        ]);
        const pData = await pRes.json().catch(() => ({}));
        const tData = await tRes.json().catch(() => ({}));
        const rData = await rRes.json().catch(() => ({}));
        if (cancelled) return;
        setPatients(Array.isArray(pData.rows) ? pData.rows : []);
        setCatalog(Array.isArray(tData.rows) ? tData.rows.filter((row) => row.name) : []);
        setRecent(Array.isArray(rData.rows) ? rData.rows : []);
      } catch {
        if (!cancelled) {
          setPatients([]);
          setCatalog([]);
          setRecent([]);
        }
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients.slice(0, 60);
    return patients
      .filter((row) =>
        [row.patientName, row.name, row.uhid, row.uhId, row.phone].some((value) =>
          String(value || "").toLowerCase().includes(q)
        )
      )
      .slice(0, 60);
  }, [patients, query]);

  const netAmount = useMemo(() => lines.reduce((sum, line) => sum + (Number(line.rate) || 0), 0), [lines]);

  function addLine() {
    const name = (draftTest || "").trim();
    if (!name) return;
    setLines((prev) => [...prev, { name, rate: Number(draftRate) || 0 }]);
    setDraftTest("");
    setDraftRate("");
  }

  async function submit() {
    const errors = {};
    if (!selected) errors.patient = "Select a patient first.";
    if (lines.length === 0) errors.tests = "Add at least one test.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/lab-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uhid: selected.uhid || selected.patientId || selected._id,
          patientName: selected.name || selected.patientName,
          gender: selected.gender || "",
          age: selected.age || "",
          doctor: form.doctor,
          receivedAt: form.receivedAt,
          priority: form.priority,
          tests: lines,
          netAmount: lines.reduce((sum, line) => sum + (Number(line.rate) || 0), 0),
          paidAmount: form.paidAmount,
          paymentMode: form.paymentMode,
          sponsor: form.sponsor,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || `Save failed (${res.status}).` });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      setNotice({
        kind: "success",
        message: `Lab bill ${data.order.checkinNo} raised for ${data.order.patientName} · ${money(data.order.netAmount)}.`,
      });
      setFieldErrors({});
      setLines([]);
      setForm((prev) => ({ ...prev, paidAmount: "", sponsor: "" }));
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
        <div className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-medium", notice.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
          {notice.kind === "success" ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />}
          {notice.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <PageSection
          title="Select patient"
          subtitle="Choose the patient this lab bill is raised for"
          icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="border-b border-ink-100 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, UHID or phone…" className={cn(inputCls, "pl-9")} />
            </div>
          </div>
          {fieldErrors.patient ? <p className="border-b border-ink-100 px-4 py-2 text-[12.5px] font-medium text-danger-500">{fieldErrors.patient}</p> : null}
          <ul className="max-h-[340px] divide-y divide-ink-100 overflow-y-auto">
            {filtered.map((row) => {
              const id = row._id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSelected(row)}
                    className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-brand-50/40", selected?._id === row._id && "bg-brand-50/60")}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-[11px] font-bold text-white">
                      {String(row.name || row.patientName || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[13px] font-semibold text-ink-800">{row.name || row.patientName}</span>
                      <span className="block truncate font-mono text-[11px] text-ink-400">{row.uhid || row.patientId || ""}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? <li className="px-4 py-10 text-center text-[12.5px] text-ink-400">No patients found.</li> : null}
          </ul>
        </PageSection>

        <div className="space-y-6">
          <PageSection title="Lab Bill" subtitle={selected ? `For ${selected.name || selected.patientName}` : "Select a patient to bill"} icon={<Receipt className="h-4 w-4" aria-hidden="true" />}>
            <div className="grid grid-cols-2 gap-3.5 p-4">
              <Field label="Received date" required error={fieldErrors.receivedAt} className="col-span-2 sm:col-span-1">
                <input type="date" value={form.receivedAt} onChange={(e) => setForm((p) => ({ ...p, receivedAt: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Priority" className="col-span-2 sm:col-span-1">
                <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} className={selectCls}>
                  {LAB_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Referring doctor" className="col-span-2">
                <input type="text" value={form.doctor} onChange={(e) => setForm((p) => ({ ...p, doctor: e.target.value }))} placeholder="Doctor name" className={inputCls} />
              </Field>
            </div>

            <div className="border-t border-ink-100 p-4">
              <p className="mb-2 text-[12.5px] font-semibold text-ink-600">Tests</p>
              <div className="mb-3 flex flex-wrap gap-2">
                <input list="lab-test-catalog" value={draftTest} onChange={(e) => setDraftTest(e.target.value)} placeholder="Test name" className={cn(inputCls, "max-w-[240px] flex-1")} />
                <datalist id="lab-test-catalog">
                  {catalog.map((t) => <option key={t._id || t.name} value={t.name} />)}
                </datalist>
                <input type="number" min="0" step="0.01" value={draftRate} onChange={(e) => setDraftRate(e.target.value)} placeholder="Rate" className={cn(inputCls, "w-24")} />
                <button type="button" onClick={() => (draftTest.trim() ? addLine() : null)} className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[12.5px] font-semibold text-brand-700 transition hover:bg-brand-100">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
                </button>
              </div>
              {fieldErrors.tests ? <p className="mb-2 text-[12px] font-medium text-danger-500">{fieldErrors.tests}</p> : null}
              {lines.length === 0 ? (
                <p className="rounded-lg border border-dashed border-ink-200 px-3 py-6 text-center text-[12.5px] text-ink-400">No tests added yet.</p>
              ) : (
                <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100">
                  {lines.map((line, index) => (
                    <li key={`${line.name}-${index}`} className="flex items-center gap-3 px-3 py-2">
                      <FlaskConical className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink-700">{line.name}</span>
                      <span className="font-mono text-[12px] text-ink-500">{money(line.rate)}</span>
                      <button type="button" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} className="text-ink-400 transition hover:text-rose-500" title="Remove">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3.5 border-t border-ink-100 p-4">
              <Field label="Payment mode" className="col-span-2 sm:col-span-1">
                <select value={form.paymentMode} onChange={(e) => setForm((p) => ({ ...p, paymentMode: e.target.value }))} className={selectCls}>
                  {LAB_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Paid amount" className="col-span-2 sm:col-span-1">
                <input type="number" min="0" step="0.01" value={form.paidAmount} onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))} placeholder="0.00" className={inputCls} />
              </Field>
              <Field label="Sponsor" className="col-span-2">
                <input type="text" value={form.sponsor} onChange={(e) => setForm((p) => ({ ...p, sponsor: e.target.value }))} placeholder="Sponsor / payer" className={inputCls} />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-ink-100 p-4">
              <span className="text-[12.5px] text-ink-500">Net amount <span className="font-mono font-semibold text-ink-800">{money(lines.reduce((s, l) => s + (Number(l.rate) || 0), 0))}</span></span>
              <button type="button" onClick={submit} disabled={saving} className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Saving…" : "Raise lab bill"}
              </button>
            </div>
          </PageSection>

          <PageSection title="Recent lab bills" subtitle={`${recent.length} latest`} icon={<Receipt className="h-4 w-4" aria-hidden="true" />} actions={<button type="button" onClick={loadRecent} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"><RefreshCw className={cn("h-3.5 w-3.5", recentLoading && "animate-spin")} aria-hidden="true" /></button>}>
            {recentLoading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-ink-400"><Loader2 className="h-4 w-4 animate-spin text-brand-500" aria-hidden="true" />Loading…</div>
            ) : recent.length === 0 ? (
              <p className="px-4 py-10 text-center text-[12.5px] text-ink-400">No lab bills yet.</p>
            ) : (
              <ul className="max-h-[280px] divide-y divide-ink-100 overflow-y-auto">
                {recent.map((row) => (
                  <li key={row._id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-[13px] font-semibold text-ink-800">{row.patientName}</p>
                      <p className="truncate font-mono text-[11px] text-ink-400">{row.checkinNo} · {(row.tests || []).length} tests · {money(row.netAmount)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600 ring-1 ring-inset ring-ink-200">{row.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </PageSection>
        </div>
      </div>

      {user ? <p className="text-[12px] text-ink-400">Billed by: {user.name}</p> : null}
    </div>
  );
}
