"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeIndianRupee,
  Check,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const PAYMENT_MODES = ["Cash", "Demand Draft", "Cheque", "Card", "Net Transfer", "UPI"];
const PAYMENT_BY = ["By Patient", "By Credit", "Free"];

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";
const selectCls = cn(inputCls, "cursor-pointer");
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

/** Mirrors lib/bills.js computeBillTotals for live preview. */
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

function blankLine() {
  return { id: 0, service: "", qty: "1", rate: "", discPct: "", discAmt: "", gstPct: "" };
}

/**
 * OP Billing — modern reimplementation of the legacy Patient Billing flow:
 * pick/enter a patient, add service line items with per-line discount and GST,
 * apply header discount / service charge, take payment and save (bill number is
 * allocated server-side).
 */
export default function PatientBilling() {
  const idRef = useRef(1);
  const [patient, setPatient] = useState(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState("");
  const [services, setServices] = useState([]);

  const [form, setForm] = useState({
    billDate: today(),
    walkInName: "",
    opNo: "",
    doctor: "",
    department: "",
    patientType: "General",
    discountPct: "",
    serviceChargePct: "",
    paymentBy: "By Patient",
    paymentMode: "Cash",
    receivedAmount: "",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [lines, setLines] = useState([{ ...blankLine(), id: 0 }]);

  const [todayRows, setTodayRows] = useState([]);
  const [todayLoading, setTodayLoading] = useState(true);

  const searchPatients = useCallback(async (value) => {
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
      const res = await fetch("/api/op-bills", { cache: "no-store" });
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
        const [pRes, sRes, bRes] = await Promise.all([
          fetch("/api/patients?q=", { cache: "no-store" }),
          fetch("/api/resource/op_services?all=1&sort=name&dir=asc", { cache: "no-store" }),
          fetch("/api/op-bills", { cache: "no-store" }),
        ]);
        const p = await pRes.json().catch(() => ({}));
        const s = await sRes.json().catch(() => ({}));
        const b = await bRes.json().catch(() => ({}));
        if (cancelled) return;
        setResults(pRes.ok && Array.isArray(p.rows) ? p.rows : []);
        setServices(sRes.ok && Array.isArray(s.rows) ? s.rows : []);
        setTodayRows(bRes.ok && Array.isArray(b.rows) ? b.rows : []);
      } catch {
        if (!cancelled) {
          setResults([]);
          setServices([]);
          setTodayRows([]);
          setSearchError("Patients could not be loaded.");
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

  const totals = useMemo(
    () => computeTotals(lines, form.discountPct, form.serviceChargePct),
    [lines, form.discountPct, form.serviceChargePct]
  );

  const patientName = patient ? patient.patientName : form.walkInName.trim();
  const received = form.paymentBy === "Free" ? totals.netAmount : num(form.receivedAmount, 0);
  const balance = Math.max(0, round2(totals.netAmount - received));
  const statusLabel =
    totals.netAmount <= 0 || form.paymentBy === "Free"
      ? "Paid"
      : received >= totals.netAmount
        ? "Paid"
        : received > 0
          ? "Partially Paid"
          : "Unpaid";

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function pickPatient(next) {
    setPatient(next);
    setPatientQuery("");
    setFieldErrors({});
    setNotice(null);
    setForm((prev) => ({ ...prev, opNo: "", ...(next.patientType ? { patientType: next.patientType } : {}) }));
    try {
      const res = await fetch(
        `/api/resource/op_registrations?q=${encodeURIComponent(next.uhid)}&sort=createdAt&dir=desc&size=1`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      const reg = res.ok && Array.isArray(data.rows) ? data.rows[0] : null;
      if (reg) {
        setForm((prev) => ({
          ...prev,
          opNo: reg.opNo || "",
          doctor: prev.doctor || reg.doctor || "",
          department: prev.department || reg.department || "",
        }));
      }
    } catch {
      /* no registration for this patient — the OP number is generated on save */
    }
  }

  function addLine() {
    const id = idRef.current++;
    setLines((prev) => [...prev, { ...blankLine(), id }]);
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
    if (!patient && !form.walkInName.trim()) errors.patient = "Select a patient or enter a walk-in name.";
    if (!lines.some((line) => num(line.rate, 0) > 0)) errors.lines = "Add at least one service with an amount.";
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
        patientName: patient?.patientName || form.walkInName.trim(),
        gender: patient?.gender || "",
        age: patient?.age || "",
        mobile: patient?.mobile || "",
        opNo: form.opNo,
        doctor: form.doctor,
        department: form.department,
        patientType: form.patientType,
        discountPct: form.discountPct,
        serviceChargePct: form.serviceChargePct,
        paymentBy: form.paymentBy,
        paymentMode: form.paymentMode,
        receivedAmount: form.paymentBy === "Free" ? totals.netAmount : form.receivedAmount,
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
        setNotice({ kind: "error", message: data.error || "The bill could not be saved." });
        if (data.fields) setFieldErrors(data.fields);
        return;
      }

      setNotice({
        kind: "success",
        message: `Bill ${data.bill.billNo} saved for ${data.bill.patientName} · ${formatMoney(data.bill.netAmount)} (${data.bill.status}).`,
      });
      setLines([{ ...blankLine(), id: idRef.current++ }]);
      setPatient(null);
      setForm((prev) => ({
        ...prev,
        walkInName: "",
        opNo: "",
        doctor: "",
        discountPct: "",
        serviceChargePct: "",
        receivedAmount: "",
        remarks: "",
      }));
      setFieldErrors({});
      await loadToday();
    } catch {
      setNotice({ kind: "error", message: "The bill could not be saved. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  const serviceNames = useMemo(() => services.map((item) => item.name).filter(Boolean), [services]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <PageSection title="Patient Billing" subtitle="Create an OP bill and collect payment" icon={<Receipt className="h-4 w-4" aria-hidden="true" />}>
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
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-ink-600">
                  Patient <span className="text-danger-500">*</span>
                </span>
                {patient ? (
                  <button
                    type="button"
                    onClick={() => { setPatient(null); update("opNo", ""); }}
                    className="text-[12px] font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Change patient
                  </button>
                ) : null}
              </div>

              {patient ? (
                <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 px-3.5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-[12px] font-bold text-white">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-800">{patient.patientName}</p>
                    <p className="truncate font-mono text-[11.5px] text-ink-500">
                      {patient.uhid} · {patient.gender || "-"} · {patient.age || "-"} yrs · {patient.mobile || "no mobile"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-xl border bg-ink-50/40 px-3 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
                    <Search className="h-4 w-4 text-ink-400" aria-hidden="true" />
                    <input
                      type="text"
                      value={patientQuery}
                      onChange={(e) => {
                        setPatientQuery(e.target.value);
                        searchPatients(e.target.value);
                      }}
                      placeholder="Search UHID, name or mobile"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-ink-300"
                    />
                    {searching ? <Loader2 className="h-4 w-4 animate-spin text-ink-400" aria-hidden="true" /> : null}
                  </div>

                  {fieldErrors.patient ? (
                    <span className="block text-[12px] font-medium text-danger-500">{fieldErrors.patient}</span>
                  ) : null}

                  <div className="max-h-44 overflow-y-auto rounded-xl border border-ink-100">
                    {results.length === 0 ? (
                      <p className="px-3.5 py-3 text-[12.5px] text-ink-400">
                        {searchError || "No patient found — enter a walk-in name below."}
                      </p>
                    ) : (
                      results.map((row) => (
                        <button
                          key={row._id}
                          type="button"
                          onClick={() => pickPatient(row)}
                          className="flex w-full items-center justify-between gap-3 border-b border-ink-50 px-3.5 py-2.5 text-left transition last:border-0 hover:bg-brand-50/60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium text-ink-800">{row.patientName}</span>
                            <span className="block truncate font-mono text-[11px] text-ink-400">
                              {row.uhid} · {row.mobile || "-"}
                            </span>
                          </span>
                          <Plus className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                        </button>
                      ))
                    )}
                  </div>

                  <Field label="Walk-in patient name">
                    <input
                      type="text"
                      value={form.walkInName}
                      onChange={(e) => update("walkInName", e.target.value)}
                      placeholder="Name for an unregistered patient"
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
              <Field label="Bill date" required>
                <input type="date" value={form.billDate} onChange={(e) => update("billDate", e.target.value)} className={inputCls} />
              </Field>
              <Field label="OP number">
                <input
                  type="text"
                  value={form.opNo}
                  readOnly
                  placeholder="Auto on save"
                  className={cn(inputCls, "bg-ink-100/60 font-mono")}
                  title={form.opNo ? "From the patient's latest OP registration" : "Generated automatically when the bill is saved"}
                />
              </Field>
              <Field label="Doctor">
                <input type="text" value={form.doctor} onChange={(e) => update("doctor", e.target.value)} placeholder="Consulting doctor" className={inputCls} />
              </Field>
              <Field label="Department">
                <select value={form.department} onChange={(e) => update("department", e.target.value)} className={selectCls}>
                  <option value="">Select</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
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
                        <tr key={line.id} className="border-t border-ink-50">
                          <td className="px-3 py-1.5">
                            <input
                              list="op-service-options"
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
                          <td className="px-2 py-1.5 text-right font-medium text-ink-700">{amount ? amount.toFixed(2) : "0.00"}</td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" value={line.discPct} onChange={(e) => updateLine(line.id, "discPct", e.target.value)} className={cellCls} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" value={line.discAmt} onChange={(e) => updateLine(line.id, "discAmt", e.target.value)} className={cellCls} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" value={line.gstPct} onChange={(e) => updateLine(line.id, "gstPct", e.target.value)} className={cellCls} />
                          </td>
                          <td className="px-2 py-1.5 text-right text-ink-600">{gst ? gst.toFixed(2) : "0.00"}</td>
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
              <Field label="Patient type">
                <select value={form.patientType} onChange={(e) => update("patientType", e.target.value)} className={selectCls}>
                  {["General", "Corporate", "Insurance", "Staff", "Camp", "VIP"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Header discount %">
                <input type="number" min="0" value={form.discountPct} onChange={(e) => update("discountPct", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Service charge %">
                <input type="number" min="0" value={form.serviceChargePct} onChange={(e) => update("serviceChargePct", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Remarks">
                <input type="text" value={form.remarks} onChange={(e) => update("remarks", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>
        </PageSection>

        <PageSection title="Payment" subtitle="Settlement details" icon={<BadgeIndianRupee className="h-4 w-4" aria-hidden="true" />}>
          <div className="grid gap-3.5 p-5 md:grid-cols-4">
            <Field label="Payment by">
              <select value={form.paymentBy} onChange={(e) => update("paymentBy", e.target.value)} className={selectCls}>
                {PAYMENT_BY.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Payment mode">
              <select value={form.paymentMode} onChange={(e) => update("paymentMode", e.target.value)} className={selectCls}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Received amount">
              <input
                type="number"
                min="0"
                value={form.paymentBy === "Free" ? totals.netAmount : form.receivedAmount}
                onChange={(e) => update("receivedAmount", e.target.value)}
                disabled={form.paymentBy === "Free"}
                className={cn(inputCls, form.paymentBy === "Free" && "opacity-60")}
              />
            </Field>
            <Field label="Balance">
              <input type="text" value={balance.toFixed(2)} readOnly className={cn(inputCls, "bg-ink-100/60")} />
            </Field>
          </div>
        </PageSection>
      </div>

      <div className="space-y-5">
        <PageSection title="Bill summary" subtitle={`Status: ${statusLabel}`}>
          <div className="space-y-2.5 p-5 text-[13px]">
            <Row label="Gross amount" value={formatMoney(totals.grossAmount)} />
            <Row label="Discount" value={`- ${formatMoney(totals.discount)}`} />
            <Row label="GST / Tax" value={formatMoney(totals.tax)} />
            <Row label="Service charge" value={formatMoney(totals.serviceCharge)} />
            <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-3 text-base font-bold text-ink-900">
              <span>Net payable</span>
              <span>{formatMoney(totals.netAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-[12.5px] text-ink-500">
              <span>Paid</span>
              <span>{formatMoney(received)}</span>
            </div>
            <div className="flex items-center justify-between text-[12.5px] font-semibold text-ink-700">
              <span>Balance</span>
              <span>{formatMoney(balance)}</span>
            </div>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Saving…" : "Save bill"}
            </button>
          </div>
        </PageSection>

        <PageSection
          title="Today's bills"
          subtitle={`${todayRows.length} bill(s)`}
          icon={<Receipt className="h-4 w-4" aria-hidden="true" />}
          actions={
            <button
              type="button"
              onClick={loadToday}
              className="rounded-lg border border-ink-200 p-2 text-ink-500 transition hover:border-ink-300 hover:text-ink-700"
              aria-label="Refresh"
            >
              {todayLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          }
        >
          <div className="max-h-[420px] overflow-y-auto">
            {todayRows.length === 0 ? (
              <p className="px-5 py-4 text-[12.5px] text-ink-400">No bills created today.</p>
            ) : (
              todayRows.map((row) => (
                <div key={row._id} className="flex items-center justify-between gap-3 border-b border-ink-50 px-5 py-2.5 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink-800">{row.patientName}</p>
                    <p className="truncate font-mono text-[11px] text-ink-400">{row.billNo}</p>
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
