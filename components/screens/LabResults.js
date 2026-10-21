"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Save,
  Search,
  SearchX,
  Send,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";

const MODE_BY_SLUG = {
  "labresult-register": { mode: "entry", title: "LabResult Register", subtitle: "Enter results for a collected order" },
  "directresult-register": { mode: "direct", title: "DirectResult Register", subtitle: "Enter a walk-in result" },
  "lab-result-approval": { mode: "approval", title: "Lab Result Approval", subtitle: "Pending results awaiting validation" },
  "lab-result-dispatch": { mode: "dispatch", title: "Lab Result Dispatch", subtitle: "Final results ready to release" },
  "lab-test-repeat": { mode: "repeat", title: "Lab Test Repeat", subtitle: "Re-order tests for a patient" },
};

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

function statusTone(status) {
  if (status === "Dispatched") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "Final") return "bg-brand-50 text-brand-700 ring-brand-100";
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

/** Lab result entry, approval, dispatch and repeat. */
export default function LabResults({ user, item }) {
  const config = MODE_BY_SLUG[item?.slug] || MODE_BY_SLUG["labresult-register"];
  return <LabResultsInner sessionUser={user} config={config} />;
}

function LabResultsInner({ sessionUser, config }) {
  const { mode, title, subtitle } = config;
  const [notice, setNotice] = useState(null);

  if (mode === "entry") return <ResultEntry sessionUser={sessionUser} title={title} subtitle={subtitle} notice={notice} setNotice={setNotice} />;
  if (mode === "direct") return <DirectResult sessionUser={sessionUser} title={title} subtitle={subtitle} notice={notice} setNotice={setNotice} />;
  if (mode === "repeat") return <RepeatOrder sessionUser={sessionUser} title={title} subtitle={subtitle} notice={notice} setNotice={setNotice} />;
  return <ResultQueue mode={mode} title={title} subtitle={subtitle} notice={notice} setNotice={setNotice} />;
}

function useResultQueue(status) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lab-results?status=${status}&all=1&limit=200`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setRows(res.ok && Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lab-results?status=${status}&all=1&limit=200`, { cache: "no-store" });
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
  }, [status]);
  return { rows, setRows, loading, load };
}

function ResultQueue({ mode, title, subtitle, notice, setNotice }) {
  const status = mode === "approval" ? "Pending" : "Final";
  const next = mode === "approval" ? "Final" : "Dispatched";
  const actionLabel = mode === "approval" ? "Approve" : "Dispatch";
  const { rows, setRows, loading, load } = useResultQueue(status);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.patientName, row.uhid, row.testName, row.resultNo].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [rows, query]);

  async function advance(row) {
    setBusyId(row._id);
    try {
      const res = await fetch(`/api/lab-results/${row._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "Update failed." });
        return;
      }
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      <Notice notice={notice} />
      <PageSection
        title={title}
        subtitle={`${subtitle} · ${filtered.length}`}
        icon={mode === "approval" ? <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
        actions={<button type="button" onClick={load} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" /></button>}
      >
        <div className="border-b border-ink-100 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, test or result no…" className={cn(inputCls, "pl-9")} />
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-ink-500"><Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden="true" />Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center"><SearchX className="h-8 w-8 text-ink-300" aria-hidden="true" /><p className="text-sm font-medium text-ink-600">Queue is clear</p></div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {filtered.map((row) => (
              <li key={row._id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[13px] font-semibold text-ink-800">{row.patientName} <span className="font-normal text-ink-500">· {row.testName}</span></p>
                  <p className="truncate font-mono text-[11px] text-ink-400">{row.resultNo} · {row.result || "—"} {row.unit || ""} · {row.resultDate}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", statusTone(row.status))}>{row.status}</span>
                <button type="button" onClick={() => advance(row)} disabled={busyId === row._id} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-ink-200 px-2 text-[11.5px] font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800 disabled:opacity-50">
                  {busyId === row._id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
                  {actionLabel}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </div>
  );
}

function ResultEntry({ sessionUser, title, subtitle, notice, setNotice }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab-orders?all=1&limit=300", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data.rows) ? data.rows : [];
      setRows(list.filter((r) => ["Received", "Processing"].includes(r.status)));
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
        const res = await fetch("/api/lab-orders?all=1&limit=300", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        const list = Array.isArray(data.rows) ? data.rows : [];
        setRows(list.filter((r) => ["Received", "Processing"].includes(r.status)));
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
    return rows.filter((row) => [row.patientName, row.uhid, row.checkinNo].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [rows, query]);

  function pick(row) {
    setSelected(row);
    setNotice(null);
    const seed = {};
    for (const test of row.tests || []) seed[test.name] = "";
    setValues(seed);
  }

  async function submit() {
    if (!selected) {
      setNotice({ kind: "error", message: "Select an order first." });
      return;
    }
    const results = (selected.tests || []).map((test) => ({ testName: test.name, result: values[test.name] || "" }));
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/lab-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uhid: selected.uhid,
          patientName: selected.patientName,
          checkinNo: selected.checkinNo,
          resultDate: today(),
          pathologist: sessionUser?.name || "",
          results,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "Save failed." });
        return;
      }
      await fetch(`/api/lab-orders/${selected._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Reported" }),
      });
      setNotice({ kind: "success", message: `Results saved for ${selected.patientName} · ${results.length} test(s).` });
      setSelected(null);
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
        <PageSection title="Orders awaiting results" subtitle={`${filtered.length} pending`} icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />} actions={<button type="button" onClick={load} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" /></button>}>
          <div className="border-b border-ink-100 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, UHID or check-in no…" className={cn(inputCls, "pl-9")} />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-ink-500"><Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden="true" />Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center"><SearchX className="h-8 w-8 text-ink-300" aria-hidden="true" /><p className="text-sm font-medium text-ink-600">No pending orders</p></div>
          ) : (
            <ul className="max-h-[520px] divide-y divide-ink-100 overflow-y-auto">
              {filtered.map((row) => (
                <li key={row._id}>
                  <button type="button" onClick={() => pick(row)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-brand-50/40", selected?._id === row._id && "bg-brand-50/60")}>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[13px] font-semibold text-ink-800">{row.patientName}</span>
                      <span className="block truncate font-mono text-[11px] text-ink-400">{row.checkinNo} · {(row.tests || []).length} tests</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600 ring-1 ring-inset ring-ink-200">{row.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PageSection>

        <PageSection title={title} subtitle={selected ? `For ${selected.patientName}` : subtitle} icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />}>
          {selected ? (
            <>
              <div className="grid grid-cols-2 gap-3.5 border-b border-ink-100 p-4">
                <Field label="Result date" className="col-span-2 sm:col-span-1">
                  <input type="date" value={today()} readOnly className={cn(inputCls, "bg-ink-100/60")} />
                </Field>
                <Field label="Pathologist" className="col-span-2 sm:col-span-1">
                  <input type="text" value={sessionUser?.name || ""} readOnly className={cn(inputCls, "bg-ink-100/60")} />
                </Field>
              </div>
              <div className="space-y-3 p-4">
                {(selected.tests || []).map((test) => (
                  <Field key={test.name} label={test.name}>
                    <input type="text" value={values[test.name] || ""} onChange={(e) => setValues((p) => ({ ...p, [test.name]: e.target.value }))} placeholder="Result value" className={inputCls} />
                  </Field>
                ))}
              </div>
              <div className="flex items-center gap-2.5 border-t border-ink-100 p-4">
                <button type="button" onClick={submit} disabled={saving} className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                  {saving ? "Saving…" : "Save results"}
                </button>
              </div>
            </>
          ) : (
            <p className="px-4 py-14 text-center text-[12.5px] text-ink-400">Select an order to enter results.</p>
          )}
        </PageSection>
      </div>
    </div>
  );
}

function DirectResult({ sessionUser, title, subtitle, notice, setNotice }) {
  const [form, setForm] = useState({ uhid: "", patientName: "", testName: "", result: "", unit: "", normalRange: "" });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  async function submit() {
    const errors = {};
    if (!form.uhid.trim()) errors.uhid = "Required.";
    if (!form.patientName.trim()) errors.patientName = "Required.";
    if (!form.testName.trim()) errors.testName = "Required.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/lab-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, resultDate: today(), pathologist: sessionUser?.name || "", status: "Pending" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "Save failed." });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      setNotice({ kind: "success", message: `Direct result saved for ${form.patientName} · ${form.testName}.` });
      setFieldErrors({});
      setForm({ uhid: "", patientName: "", testName: "", result: "", unit: "", normalRange: "" });
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Notice notice={notice} />
      <PageSection title={title} subtitle={subtitle} icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />}>
        <div className="grid grid-cols-2 gap-3.5 p-4">
          <Field label="UHID" required error={fieldErrors.uhid} className="col-span-2 sm:col-span-1">
            <input type="text" value={form.uhid} onChange={(e) => setForm((p) => ({ ...p, uhid: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Patient name" required error={fieldErrors.patientName} className="col-span-2 sm:col-span-1">
            <input type="text" value={form.patientName} onChange={(e) => setForm((p) => ({ ...p, patientName: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Test" required error={fieldErrors.testName} className="col-span-2">
            <input type="text" value={form.testName} onChange={(e) => setForm((p) => ({ ...p, testName: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Result" className="col-span-2 sm:col-span-1">
            <input type="text" value={form.result} onChange={(e) => setForm((p) => ({ ...p, result: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Unit" className="col-span-2 sm:col-span-1">
            <input type="text" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Normal range" className="col-span-2">
            <input type="text" value={form.normalRange} onChange={(e) => setForm((p) => ({ ...p, normalRange: e.target.value }))} className={inputCls} />
          </Field>
        </div>
        <div className="flex items-center gap-2.5 border-t border-ink-100 p-4">
          <button type="button" onClick={submit} disabled={saving} className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            {saving ? "Saving…" : "Save result"}
          </button>
        </div>
      </PageSection>
    </div>
  );
}

function RepeatOrder({ sessionUser, title, subtitle, notice, setNotice }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab-orders?all=1&limit=200", { cache: "no-store" });
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
        const res = await fetch("/api/lab-orders?all=1&limit=200", { cache: "no-store" });
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
    return rows.filter((row) => [row.patientName, row.uhid, row.checkinNo].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [rows, query]);

  async function repeat() {
    if (!selected) {
      setNotice({ kind: "error", message: "Select an order to repeat." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/lab-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uhid: selected.uhid,
          patientName: selected.patientName,
          doctor: selected.doctor,
          receivedAt: today(),
          priority: selected.priority || "Routine",
          tests: selected.tests || [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "Repeat failed." });
        return;
      }
      setNotice({ kind: "success", message: `Repeat order ${data.order.checkinNo} raised for ${data.order.patientName}.` });
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PageSection title="Select order to repeat" subtitle={`${filtered.length} orders`} icon={<Repeat className="h-4 w-4" aria-hidden="true" />} actions={<button type="button" onClick={load} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" /></button>}>
          <div className="border-b border-ink-100 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient or check-in no…" className={cn(inputCls, "pl-9")} />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-ink-500"><Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden="true" />Loading…</div>
          ) : (
            <ul className="max-h-[520px] divide-y divide-ink-100 overflow-y-auto">
              {filtered.map((row) => (
                <li key={row._id}>
                  <button type="button" onClick={() => setSelected(row)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-brand-50/40", selected?._id === row._id && "bg-brand-50/60")}>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[13px] font-semibold text-ink-800">{row.patientName}</span>
                      <span className="block truncate font-mono text-[11px] text-ink-400">{row.checkinNo} · {(row.tests || []).length} tests</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PageSection>
        <PageSection title={title} subtitle={subtitle} icon={<Repeat className="h-4 w-4" aria-hidden="true" />}>
          {selected ? (
            <div className="space-y-3 p-4">
              <p className="text-[13px] text-ink-700"><span className="font-semibold">{selected.patientName}</span> · {selected.uhid}</p>
              <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100">
                {(selected.tests || []).map((test) => (
                  <li key={test.name} className="px-3 py-2 text-[12.5px] text-ink-700">{test.name}</li>
                ))}
              </ul>
              <button type="button" onClick={repeat} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Repeat className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Repeating…" : "Raise repeat order"}
              </button>
            </div>
          ) : (
            <p className="px-4 py-14 text-center text-[12.5px] text-ink-400">Select an order to repeat.</p>
          )}
        </PageSection>
      </div>
    </div>
  );
}
