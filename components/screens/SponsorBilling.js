"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, Loader2, Plus, Receipt, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";
import PatientPicker, { Field, opInputCls as inputCls } from "./PatientPicker";
import { formatMoney } from "./MedicineLookup";

const DEPARTMENTS = [
  "General Medicine",
  "Cardiology",
  "Nephrology",
  "Orthopedics",
  "Pathology",
  "Radiology",
];

const cellCls =
  "w-full rounded-lg border bg-white px-2 py-1.5 text-right text-[13px] text-ink-800 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function computeTotals(lines, discountPct, serviceChargePct) {
  let grossAmount = 0;
  let lineDiscount = 0;
  let tax = 0;
  for (const line of lines) {
    const amount = round2(num(line.qty, 1) * num(line.rate, 0));
    const discount = round2((amount * num(line.discPct, 0)) / 100 + num(line.discAmt, 0));
    const taxable = Math.max(0, amount - discount);
    grossAmount += amount;
    lineDiscount += discount;
    tax += round2((taxable * num(line.gstPct, 0)) / 100);
  }
  const taxableTotal = Math.max(0, grossAmount - lineDiscount);
  const headerDiscount = round2((taxableTotal * num(discountPct, 0)) / 100);
  const serviceCharge = round2((taxableTotal * num(serviceChargePct, 0)) / 100);
  return {
    grossAmount: round2(grossAmount),
    discount: round2(lineDiscount + headerDiscount),
    tax: round2(tax),
    serviceCharge,
    netAmount: round2(taxableTotal - headerDiscount + tax + serviceCharge),
  };
}

function blankLine(id) {
  return { id, service: "", qty: "1", rate: "", discPct: "", discAmt: "", gstPct: "" };
}

/**
 * Sponsor Billing (legacy `PatientBillingCancelled.jsp` mode `BySponsor`):
 * raises the same OP bill but the payable is posted against a Corporate /
 * Insurance sponsor instead of being collected from the patient.
 */
export default function SponsorBilling() {
  const idRef = useRef(1);
  const [patient, setPatient] = useState(null);
  const [services, setServices] = useState([]);
  const [sponsors, setSponsors] = useState({ corporate: [], insurance: [] });

  const [form, setForm] = useState({
    billDate: today(),
    opNo: "",
    doctor: "",
    department: "",
    patientType: "Corporate",
    sponsorType: "Corporate",
    sponsorName: "",
    sponsorRef: "",
    creditLimit: "",
    discountPct: "",
    serviceChargePct: "",
    remarks: "",
  });
  const [lines, setLines] = useState([blankLine(0)]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await fetch("/api/op-bills", { cache: "no-store" });
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
        const [sRes, cRes, iRes, bRes] = await Promise.all([
          fetch("/api/resource/op_services?all=1&sort=name&dir=asc", { cache: "no-store" }),
          fetch("/api/resource/op_corporates?all=1&sort=name&dir=asc", { cache: "no-store" }),
          fetch("/api/resource/op_insurance_patient_type_map?all=1&sort=name&dir=asc", { cache: "no-store" }),
          fetch("/api/op-bills", { cache: "no-store" }),
        ]);
        const s = await sRes.json().catch(() => ({}));
        const c = await cRes.json().catch(() => ({}));
        const i = await iRes.json().catch(() => ({}));
        const b = await bRes.json().catch(() => ({}));
        if (cancelled) return;
        setServices(sRes.ok && Array.isArray(s.rows) ? s.rows : []);
        setSponsors({
          corporate: cRes.ok && Array.isArray(c.rows) ? c.rows.map((r) => r.name).filter(Boolean) : [],
          insurance:
            iRes.ok && Array.isArray(i.rows)
              ? i.rows.map((r) => r.insuranceProvider).filter(Boolean)
              : [],
        });
        setRecent(bRes.ok && Array.isArray(b.rows) ? b.rows : []);
      } catch {
        if (!cancelled) setNotice({ kind: "error", message: "Master data could not be loaded." });
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(
    () => computeTotals(lines, form.discountPct, form.serviceChargePct),
    [lines, form.discountPct, form.serviceChargePct]
  );

  const creditLimit = num(form.creditLimit, 0);
  const overLimit = creditLimit > 0 && totals.netAmount > creditLimit;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function pickPatient(next) {
    setPatient(next);
    setFieldErrors({});
    setNotice(null);
  }

  function addLine() {
    const id = idRef.current++;
    setLines((prev) => [...prev, blankLine(id)]);
  }

  function updateLine(id, field, value) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const next = { ...line, [field]: value };
        if (field === "service") {
          const match = services.find(
            (item) => String(item.name).toLowerCase() === String(value).trim().toLowerCase()
          );
          if (match && match.charge != null && !line.rate) next.rate = String(match.charge);
        }
        return next;
      })
    );
  }

  function removeLine(id) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== id)));
  }

  async function save() {
    const errors = {};
    if (!patient) errors.patient = "Select a patient.";
    if (!form.sponsorName.trim()) errors.sponsorName = "Choose the sponsor.";
    if (!lines.some((line) => num(line.rate, 0) > 0)) errors.lines = "Add at least one service with an amount.";
    if (overLimit) errors.creditLimit = "The bill exceeds the sponsor credit limit.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        billDate: form.billDate,
        uhid: patient?.uhid || "",
        patientName: patient?.patientName || "",
        gender: patient?.gender || "",
        age: patient?.age || "",
        mobile: patient?.mobile || "",
        opNo: form.opNo,
        doctor: form.doctor,
        department: form.department,
        patientType: form.patientType,
        sponsorType: form.sponsorType,
        sponsorName: form.sponsorName,
        sponsorRef: form.sponsorRef,
        creditLimit: form.creditLimit,
        discountPct: form.discountPct,
        serviceChargePct: form.serviceChargePct,
        paymentBy: "By Sponsor",
        paymentMode: "Credit",
        receivedAmount: 0,
        remarks: form.remarks,
        lines: lines
          .filter((line) => line.service || num(line.rate, 0) > 0)
          .map((line) => ({
            service: line.service,
            qty: line.qty,
            rate: line.rate,
            discPct: line.discPct,
            discAmt: line.discAmt,
            gstPct: line.gstPct,
          })),
      };

      const res = await fetch("/api/op-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "The sponsor bill could not be saved." });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }

      setNotice({
        kind: "success",
        message: `Sponsor bill ${data.bill.billNo} posted to ${form.sponsorName} · ${formatMoney(data.bill.netAmount)} (${data.bill.status}).`,
      });
      setLines([blankLine(idRef.current++)]);
      setPatient(null);
      setForm((prev) => ({
        ...prev,
        opNo: "",
        doctor: "",
        sponsorName: "",
        sponsorRef: "",
        creditLimit: "",
        discountPct: "",
        serviceChargePct: "",
        remarks: "",
      }));
      setFieldErrors({});
      await loadRecent();
    } catch {
      setNotice({ kind: "error", message: "The sponsor bill could not be saved. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  const serviceNames = useMemo(() => services.map((item) => item.name).filter(Boolean), [services]);
  const sponsorOptions = form.sponsorType === "Insurance" ? sponsors.insurance : sponsors.corporate;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <PageSection
          title="Sponsor Billing"
          subtitle="Post an OP bill to a corporate / insurance sponsor"
          icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="space-y-5 p-5">
            {notice ? (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium",
                  notice.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                )}
              >
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                {notice.message}
              </div>
            ) : null}

            <div>
              <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-600">
                Patient <span className="text-danger-500">*</span>
              </span>
              <PatientPicker
                patient={patient}
                onPick={pickPatient}
                onClear={() => setPatient(null)}
                error={fieldErrors.patient}
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
              <Field label="Bill date" required>
                <input type="date" value={form.billDate} onChange={(e) => update("billDate", e.target.value)} className={inputCls} />
              </Field>
              <Field label="OP number">
                <input type="text" value={form.opNo} onChange={(e) => update("opNo", e.target.value)} placeholder="Auto on save" className={inputCls} />
              </Field>
              <Field label="Doctor">
                <input type="text" value={form.doctor} onChange={(e) => update("doctor", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Department">
                <select value={form.department} onChange={(e) => update("department", e.target.value)} className={cn(inputCls, "cursor-pointer")}>
                  <option value="">Select</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
              <Field label="Patient type">
                <select value={form.patientType} onChange={(e) => update("patientType", e.target.value)} className={cn(inputCls, "cursor-pointer")}>
                  {["Corporate", "Insurance", "General", "Staff", "Camp", "VIP"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Sponsor type">
                <select value={form.sponsorType} onChange={(e) => update("sponsorType", e.target.value)} className={cn(inputCls, "cursor-pointer")}>
                  <option value="Corporate">Corporate</option>
                  <option value="Insurance">Insurance</option>
                </select>
              </Field>
              <Field label="Sponsor" required error={fieldErrors.sponsorName}>
                <input
                  list="op-sponsor-options"
                  type="text"
                  value={form.sponsorName}
                  onChange={(e) => update("sponsorName", e.target.value)}
                  placeholder={form.sponsorType === "Insurance" ? "Insurance provider" : "Corporate"}
                  className={inputCls}
                />
                <datalist id="op-sponsor-options">
                  {sponsorOptions.map((name) => <option key={name} value={name} />)}
                </datalist>
              </Field>
              <Field label="Sponsor reference">
                <input type="text" value={form.sponsorRef} onChange={(e) => update("sponsorRef", e.target.value)} placeholder="Policy / employee id" className={inputCls} />
              </Field>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink-700">Services / charges</span>
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700 transition hover:bg-brand-100"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add line
                </button>
              </div>
              {fieldErrors.lines ? (
                <p className="mb-2 text-[12px] font-medium text-danger-500">{fieldErrors.lines}</p>
              ) : null}

              <div className="overflow-x-auto rounded-xl border border-ink-100">
                <table className="w-full min-w-[820px] border-collapse text-[12.5px]">
                  <thead>
                    <tr className="bg-ink-50/60 text-left text-[11px] uppercase tracking-wide text-ink-500">
                      <th className="px-3 py-2 font-semibold">Service</th>
                      <th className="w-16 px-2 py-2 text-right font-semibold">Qty</th>
                      <th className="w-24 px-2 py-2 text-right font-semibold">Rate</th>
                      <th className="w-24 px-2 py-2 text-right font-semibold">Amount</th>
                      <th className="w-16 px-2 py-2 text-right font-semibold">Disc %</th>
                      <th className="w-20 px-2 py-2 text-right font-semibold">Disc</th>
                      <th className="w-16 px-2 py-2 text-right font-semibold">GST %</th>
                      <th className="w-20 px-2 py-2 text-right font-semibold">GST</th>
                      <th className="w-10 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const amount = round2(num(line.qty, 1) * num(line.rate, 0));
                      const discount = round2((amount * num(line.discPct, 0)) / 100 + num(line.discAmt, 0));
                      const gst = round2((Math.max(0, amount - discount) * num(line.gstPct, 0)) / 100);
                      return (
                        <tr key={line.id}>
                          <td className="px-3 py-1.5">
                            <input
                              list="op-service-options"
                              type="text"
                              value={line.service}
                              onChange={(e) => updateLine(line.id, "service", e.target.value)}
                              placeholder="Service name"
                              className="w-full rounded-lg border bg-white px-2 py-1.5 text-[13px] outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="1" value={line.qty} onChange={(e) => updateLine(line.id, "qty", e.target.value)} className={cellCls} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" value={line.rate} onChange={(e) => updateLine(line.id, "rate", e.target.value)} className={cellCls} />
                          </td>
                          <td className="px-2 py-1.5 text-right font-medium text-ink-700">{round2(num(line.qty, 1) * num(line.rate, 0)).toFixed(2)}</td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" value={line.discPct} onChange={(e) => updateLine(line.id, "discPct", e.target.value)} className={cellCls} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" value={line.discAmt} onChange={(e) => updateLine(line.id, "discAmt", e.target.value)} className={cellCls} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" value={line.gstPct} onChange={(e) => updateLine(line.id, "gstPct", e.target.value)} className={cellCls} />
                          </td>
                          <td className="px-2 py-1.5 text-right text-ink-600">
                            {round2(Math.max(0, num(line.qty, 1) * num(line.rate, 0) - ((num(line.qty, 1) * num(line.rate, 0)) * num(line.discPct, 0)) / 100 - num(line.discAmt, 0)) * num(line.gstPct, 0) / 100).toFixed(2)}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(line.id)}
                              disabled={lines.length <= 1}
                              className="rounded-lg p-1.5 text-ink-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                              aria-label="Remove line"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <datalist id="op-service-options">
                {serviceNames.map((name) => <option key={name} value={name} />)}
              </datalist>
            </div>

            <div className="grid gap-3.5 md:grid-cols-4">
              <Field label="Header discount %">
                <input type="number" min="0" value={form.discountPct} onChange={(e) => update("discountPct", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Service charge %">
                <input type="number" min="0" value={form.serviceChargePct} onChange={(e) => update("serviceChargePct", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Credit limit" error={fieldErrors.creditLimit}>
                <input type="number" min="0" value={form.creditLimit} onChange={(e) => update("creditLimit", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Remarks">
                <input type="text" value={form.remarks} onChange={(e) => update("remarks", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>
        </PageSection>
      </div>

      <div className="space-y-5">
        <PageSection title="Bill summary" subtitle="Payable posted to the sponsor">
          <div className="space-y-2.5 p-5 text-[13px]">
            <Row label="Gross amount" value={formatMoney(totals.grossAmount)} />
            <Row label="Discount" value={`- ${formatMoney(totals.discount)}`} />
            <Row label="GST / Tax" value={formatMoney(totals.tax)} />
            <Row label="Service charge" value={formatMoney(totals.serviceCharge)} />
            <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-3 text-base font-bold text-ink-900">
              <span>Sponsor payable</span>
              <span>{formatMoney(totals.netAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-[12.5px] text-ink-500">
              <span>Sponsor</span>
              <span>{form.sponsorName || "-"}</span>
            </div>
            <div className="flex items-center justify-between text-[12.5px] text-ink-500">
              <span>Credit limit</span>
              <span>{creditLimit > 0 ? formatMoney(creditLimit) : "No limit"}</span>
            </div>
            {overLimit ? (
              <p className="text-[12px] font-semibold text-danger-500">
                Exceeds the credit limit by {formatMoney(totals.netAmount - creditLimit)}.
              </p>
            ) : null}

            <button
              type="button"
              onClick={save}
              disabled={saving || overLimit}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Saving…" : "Save sponsor bill"}
            </button>
          </div>
        </PageSection>

        <PageSection
          title="Today's bills"
          subtitle={`${recent.length} bill(s)`}
          icon={<Receipt className="h-4 w-4" aria-hidden="true" />}
          actions={
            <button
              type="button"
              onClick={loadRecent}
              className="rounded-lg border border-ink-200 p-2 text-ink-500 transition hover:border-ink-300 hover:text-ink-700"
              aria-label="Refresh"
            >
              {recentLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          }
        >
          <div className="max-h-[420px] overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-5 py-4 text-[12.5px] text-ink-400">No bills created today.</p>
            ) : (
              recent.map((row) => (
                <div key={row._id} className="flex items-center justify-between gap-3 border-b border-ink-50 px-5 py-2.5 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink-800">{row.patientName}</p>
                    <p className="truncate font-mono text-[11px] text-ink-400">
                      {row.billNo}
                      {row.sponsorName ? ` · ${row.sponsorName}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-ink-800">{formatMoney(row.netAmount)}</p>
                    <p className="text-[11px] text-ink-400">{row.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </PageSection>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-ink-600">
      <span>{label}</span>
      <span className="font-medium text-ink-800">{value}</span>
    </div>
  );
}
