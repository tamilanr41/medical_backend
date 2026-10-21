"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  FlaskConical,
  Loader2,
  RefreshCw,
  Save,
  Search,
  SearchX,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";
import { Field, opInputCls as inputCls } from "./PatientPicker";

const MODES = {
  "lab-test-sent-to-external-org": { mode: "send", title: "Lab Test Sent To External Org", subtitle: "Refer a test to an external laboratory" },
  "lab-test-sent-to-external-org-edit-amount": { mode: "edit", title: "External Org — Edit Amount", subtitle: "Revise the amounts agreed with the external lab" },
};

const AMOUNT_STATUSES = ["Pending Approval", "Approved", "Billed"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  const n = Number(value) || 0;
  return n.toFixed(2);
}

function statusTone(status) {
  if (status === "Reported") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "Received") return "bg-brand-50 text-brand-700 ring-brand-100";
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

export default function LabExternalTests({ user, item }) {
  const config = MODES[item?.slug] || MODES["lab-test-sent-to-external-org"];
  return <LabExternalTestsInner sessionUser={user} config={config} />;
}

function LabExternalTestsInner({ sessionUser, config }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab-external-tests?all=1&limit=200", { cache: "no-store" });
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
        const res = await fetch("/api/lab-external-tests?all=1&limit=200", { cache: "no-store" });
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
    return rows.filter((row) => [row.patientName, row.uhid, row.requestNo, row.testName, row.externalLab].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [rows, query]);

  return (
    <div className="space-y-6">
      <Notice notice={notice} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
        <PageSection
          title="External referrals"
          subtitle={`${filtered.length} record(s)`}
          icon={<FlaskConical className="h-4 w-4" aria-hidden="true" />}
          actions={
            <button type="button" onClick={load} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" />
            </button>
          }
        >
          <div className="border-b border-ink-100 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, test or organization…" className={cn(inputCls, "pl-9")} />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-ink-500"><Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden="true" />Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center"><SearchX className="h-8 w-8 text-ink-300" aria-hidden="true" /><p className="text-sm font-medium text-ink-600">No external referrals yet</p></div>
          ) : (
            <ul className="max-h-[560px] divide-y divide-ink-100 overflow-y-auto">
              {filtered.map((row) => (
                <li key={row._id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-semibold text-ink-800">{row.testName} <span className="font-normal text-ink-500">· {row.patientName}</span></span>
                    <span className="block truncate font-mono text-[11px] text-ink-400">{row.requestNo} · {row.externalLab} · {row.sentDate}</span>
                  </span>
                  {config.mode === "edit" ? (
                    <span className="shrink-0 text-right text-[12px] font-semibold text-ink-700">
                      {money(row.billedAmount || row.approvedAmount || row.quotedAmount)}
                      <span className="block text-[10.5px] font-medium text-ink-400">{row.amountStatus}</span>
                    </span>
                  ) : null}
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", statusTone(row.status))}>{row.status}</span>
                </li>
              ))}
            </ul>
          )}
        </PageSection>

        {config.mode === "send" ? (
          <SendForm sessionUser={sessionUser} title={config.title} subtitle={config.subtitle} setNotice={setNotice} reload={load} />
        ) : (
          <AmountForm title={config.title} subtitle={config.subtitle} rows={filtered} setNotice={setNotice} reload={load} />
        )}
      </div>
    </div>
  );
}

function SendForm({ sessionUser, title, subtitle, setNotice, reload }) {
  const [form, setForm] = useState({ uhid: "", patientName: "", testName: "", externalLab: "", sentDate: today(), expectedDate: "", quotedAmount: "", remarks: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  async function submit() {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/lab-external-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "Sent", quotedAmount: Number(form.quotedAmount) || 0 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFieldErrors(data.fields || {});
        setNotice({ kind: "error", message: data.error || "Save failed." });
        return;
      }
      setNotice({ kind: "success", message: `Referral ${data.referral.requestNo} created for ${data.referral.patientName}.` });
      setFieldErrors({});
      setForm({ uhid: "", patientName: "", testName: "", externalLab: "", sentDate: today(), expectedDate: "", quotedAmount: "", remarks: "" });
      reload();
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageSection title={title} subtitle={subtitle} icon={<Send className="h-4 w-4" aria-hidden="true" />}>
      <div className="grid grid-cols-2 gap-3.5 p-4">
        <Field label="UHID" required error={fieldErrors.uhid} className="col-span-2 sm:col-span-1">
          <input type="text" value={form.uhid} onChange={(e) => update("uhid", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Patient name" required error={fieldErrors.patientName} className="col-span-2 sm:col-span-1">
          <input type="text" value={form.patientName} onChange={(e) => update("patientName", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Test" required error={fieldErrors.testName} className="col-span-2">
          <input type="text" value={form.testName} onChange={(e) => update("testName", e.target.value)} className={inputCls} />
        </Field>
        <Field label="External organization" required error={fieldErrors.externalLab} className="col-span-2">
          <input type="text" value={form.externalLab} onChange={(e) => update("externalLab", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Sent date" required error={fieldErrors.sentDate} className="col-span-2 sm:col-span-1">
          <input type="date" value={form.sentDate} onChange={(e) => update("sentDate", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Expected date" error={fieldErrors.expectedDate} className="col-span-2 sm:col-span-1">
          <input type="date" value={form.expectedDate} onChange={(e) => update("expectedDate", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Quoted amount" error={fieldErrors.quotedAmount} className="col-span-2 sm:col-span-1">
          <input type="number" min="0" step="0.01" value={form.quotedAmount} onChange={(e) => update("quotedAmount", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Remarks" className="col-span-2">
          <input type="text" value={form.remarks} onChange={(e) => update("remarks", e.target.value)} className={inputCls} />
        </Field>
        <p className="col-span-2 -mt-1 text-[11.5px] text-ink-400">Referred by {sessionUser?.name || sessionUser?.username || "—"}</p>
      </div>
      <div className="flex items-center gap-2.5 border-t border-ink-100 p-4">
        <button type="button" onClick={submit} disabled={saving} className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {saving ? "Saving…" : "Send to external lab"}
        </button>
      </div>
    </PageSection>
  );
}

function AmountForm({ title, subtitle, rows, setNotice, reload }) {
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({ quotedAmount: "", approvedAmount: "", billedAmount: "", amountStatus: "Pending Approval" });
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => rows.find((row) => row._id === selectedId) || null, [rows, selectedId]);

  function pick(id) {
    setSelectedId(id);
    const row = rows.find((r) => r._id === id);
    if (!row) return;
    setForm({
      quotedAmount: row.quotedAmount ? String(row.quotedAmount) : "",
      approvedAmount: row.approvedAmount ? String(row.approvedAmount) : "",
      billedAmount: row.billedAmount ? String(row.billedAmount) : "",
      amountStatus: row.amountStatus || "Pending Approval",
    });
  }

  async function submit() {
    if (!selected) {
      setNotice({ kind: "error", message: "Select a referral first." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/lab-external-tests/${selected._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotedAmount: Number(form.quotedAmount) || 0,
          approvedAmount: Number(form.approvedAmount) || 0,
          billedAmount: Number(form.billedAmount) || 0,
          amountStatus: form.amountStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "Update failed." });
        return;
      }
      setNotice({ kind: "success", message: `Amounts updated for ${selected.requestNo}.` });
      reload();
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageSection title={title} subtitle={selected ? selected.requestNo : subtitle} icon={<FlaskConical className="h-4 w-4" aria-hidden="true" />}>
      {selected ? (
        <>
          <div className="border-b border-ink-100 p-4">
            <p className="text-[13px] font-semibold text-ink-800">{selected.patientName}</p>
            <p className="text-[12px] text-ink-500">{selected.testName} · {selected.externalLab}</p>
          </div>
          <div className="grid grid-cols-2 gap-3.5 p-4">
            <Field label="Quoted amount" className="col-span-2 sm:col-span-1">
              <input type="number" min="0" step="0.01" value={form.quotedAmount} onChange={(e) => setForm((p) => ({ ...p, quotedAmount: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Approved amount" className="col-span-2 sm:col-span-1">
              <input type="number" min="0" step="0.01" value={form.approvedAmount} onChange={(e) => setForm((p) => ({ ...p, approvedAmount: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Billed amount" className="col-span-2 sm:col-span-1">
              <input type="number" min="0" step="0.01" value={form.billedAmount} onChange={(e) => setForm((p) => ({ ...p, billedAmount: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Status" className="col-span-2 sm:col-span-1">
              <select value={form.amountStatus} onChange={(e) => setForm((p) => ({ ...p, amountStatus: e.target.value }))} className={cn(inputCls, "cursor-pointer")}>
                {AMOUNT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex items-center gap-2.5 border-t border-ink-100 p-4">
            <button type="button" onClick={submit} disabled={saving} className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Saving…" : "Save amounts"}
            </button>
          </div>
        </>
      ) : (
        <p className="px-4 py-14 text-center text-[12.5px] text-ink-400">Select a referral from the list to edit its amounts.</p>
      )}
      <div className="border-t border-ink-100 p-3">
        <label className="block text-[12.5px] font-semibold text-ink-600">
          Referral
          <select value={selectedId} onChange={(e) => pick(e.target.value)} className={cn(inputCls, "mt-1.5 cursor-pointer")}>
            <option value="">Select a referral…</option>
            {rows.map((row) => (
              <option key={row._id} value={row._id}>{row.requestNo} · {row.patientName} · {row.testName}</option>
            ))}
          </select>
        </label>
      </div>
    </PageSection>
  );
}
