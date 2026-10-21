"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Loader2,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";

const PAYMENT_MODES = ["Cash", "Card", "Cheque", "Net Transfer", "UPI", "Demand Draft"];
const PAYMENT_BY = ["By Patient", "By Credit", "Free"];

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 dark:bg-ink-900 dark:text-ink-100";
const selectCls = cn(inputCls, "cursor-pointer");
const cellCls =
  "w-full rounded-lg border bg-white px-2 py-1.5 text-right text-[13px] text-ink-800 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200 dark:bg-ink-900 dark:text-ink-100";

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

function money(value) {
  return round2(num(value, 0)).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function computeTotals(lines, discountPct) {
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
  return {
    grossAmount: round2(grossAmount),
    discount: round2(lineDiscount + headerDiscount),
    tax: round2(tax),
    netAmount: round2(taxableTotal - headerDiscount + tax),
  };
}

function Field({ label, required, error, children, className }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-600 dark:text-ink-300">
        {label}
        {required ? <span className="ml-0.5 text-danger-500">*</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-medium text-danger-500">{error}</span> : null}
    </label>
  );
}

function blankLine() {
  return {
    id: 0,
    itemCode: "",
    itemName: "",
    batchNo: "",
    expiryDate: "",
    qty: "1",
    rate: "",
    mrp: "",
    discPct: "",
    discAmt: "",
    gstPct: "",
  };
}

/**
 * Pharmacy Cash Sale — modern reimplementation of the legacy pharmacy billing:
 * pick/enter a customer, add medicine lines with batch and expiry, per-line
 * discount / GST, header discount, take payment and save. Bill number and stock
 * deduction (FEFO batch-wise) happen server-side.
 */
export default function PharmacySale() {
  const idRef = useRef(1);
  const [items, setItems] = useState([]);
  const [itemQuery, setItemQuery] = useState("");
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);

  const [form, setForm] = useState({
    billDate: today(),
    patientName: "",
    uhid: "",
    mobile: "",
    doctor: "",
    customerCode: "",
    discountPct: "",
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

  const loadToday = useCallback(async () => {
    setTodayLoading(true);
    try {
      const res = await fetch("/api/pharmacy-sales", { cache: "no-store" });
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
        const [iRes, sRes] = await Promise.all([
          fetch("/api/resource/pharmacy_items?all=1&sort=name&dir=asc", { cache: "no-store" }),
          fetch("/api/pharmacy-sales", { cache: "no-store" }),
        ]);
        const i = await iRes.json().catch(() => ({}));
        const s = await sRes.json().catch(() => ({}));
        if (cancelled) return;
        setItems(iRes.ok && Array.isArray(i.rows) ? i.rows : []);
        setTodayRows(sRes.ok && Array.isArray(s.rows) ? s.rows : []);
      } catch {
        if (!cancelled) {
          setItems([]);
          setTodayRows([]);
        }
      } finally {
        if (!cancelled) setTodayLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => computeTotals(lines, form.discountPct), [lines, form.discountPct]);

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

  const filteredItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    if (!q) return items.slice(0, 30);
    return items
      .filter((it) =>
        [it.code, it.name, it.genericName, it.brand].some((v) =>
          String(v || "").toLowerCase().includes(q)
        )
      )
      .slice(0, 30);
  }, [items, itemQuery]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addLine() {
    const id = idRef.current++;
    setLines((prev) => [...prev, { ...blankLine(), id }]);
  }

  function updateLine(id, field, value) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        return { ...line, [field]: value };
      })
    );
  }

  function removeLine(id) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== id)));
  }

  function openPicker(lineId) {
    setPickerTarget(lineId);
    setItemQuery("");
    setShowItemPicker(true);
  }

  function chooseItem(item) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== pickerTarget) return line;
        return {
          ...line,
          itemCode: item.code || "",
          itemName: item.name || "",
          rate: item.rate != null ? String(item.rate) : line.rate,
          mrp: item.mrp != null ? String(item.mrp) : line.mrp,
        };
      })
    );
    setShowItemPicker(false);
    setPickerTarget(null);
    setItemQuery("");
  }

  async function save() {
    const errors = {};
    if (!form.patientName.trim()) errors.patientName = "Enter the customer / patient name.";
    if (!lines.some((line) => line.itemName && num(line.qty, 0) > 0 && num(line.rate, 0) > 0)) {
      errors.lines = "Add at least one item with quantity and rate.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setNotice({ type: "error", message: "Please correct the highlighted fields." });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        billDate: form.billDate,
        patientName: form.patientName.trim(),
        uhid: form.uhid,
        mobile: form.mobile,
        doctor: form.doctor,
        customerCode: form.customerCode,
        discountPct: form.discountPct,
        paymentBy: form.paymentBy,
        paymentMode: form.paymentMode,
        receivedAmount: form.paymentBy === "Free" ? totals.netAmount : form.receivedAmount,
        remarks: form.remarks,
        lines: lines
          .filter((line) => line.itemName && num(line.qty, 0) > 0)
          .map((line) => ({
            itemCode: line.itemCode,
            itemName: line.itemName,
            batchNo: line.batchNo,
            expiryDate: line.expiryDate,
            qty: line.qty,
            rate: line.rate,
            mrp: line.mrp,
            discPct: line.discPct,
            discAmt: line.discAmt,
            gstPct: line.gstPct,
          })),
      };

      const res = await fetch("/api/pharmacy-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields);
        setNotice({ type: "error", message: data.error || "The sale could not be saved." });
        return;
      }

      setNotice({ type: "success", message: `Sale ${data.sale.billNo} saved successfully.` });
      setForm({
        billDate: today(),
        patientName: "",
        uhid: "",
        mobile: "",
        doctor: "",
        customerCode: "",
        discountPct: "",
        paymentBy: "By Patient",
        paymentMode: "Cash",
        receivedAmount: "",
        remarks: "",
      });
      idRef.current = 1;
      setLines([{ ...blankLine(), id: 0 }]);
      setFieldErrors({});
      loadToday();
    } catch {
      setNotice({ type: "error", message: "The sale could not be saved." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Cash Sale</h2>
          <p className="text-sm text-ink-500 dark:text-ink-400">Pharmacy Sales</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
            <Receipt className="h-4 w-4" /> Net {money(totals.netAmount)}
          </span>
          <button
            type="button"
            onClick={loadToday}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-ink-50 dark:hover:bg-ink-800"
          >
            <RefreshCw className={cn("h-4 w-4", todayLoading && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      {notice ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium",
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
              : "border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-800 dark:bg-danger-900/30 dark:text-danger-200"
          )}
        >
          {notice.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {notice.message}
        </div>
      ) : null}

      <PageSection title="Customer Details" icon={<UserRound className="h-4 w-4" />}>
        <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Bill Date" required error={fieldErrors.billDate}>
            <input
              type="date"
              value={form.billDate}
              onChange={(e) => update("billDate", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Customer / Patient Name" required error={fieldErrors.patientName}>
            <input
              value={form.patientName}
              onChange={(e) => update("patientName", e.target.value)}
              className={inputCls}
              placeholder="Walk-in name or patient"
            />
          </Field>
          <Field label="Customer Code">
            <input value={form.customerCode} onChange={(e) => update("customerCode", e.target.value)} className={inputCls} />
          </Field>
          <Field label="UHID">
            <input value={form.uhid} onChange={(e) => update("uhid", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Mobile">
            <input value={form.mobile} onChange={(e) => update("mobile", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Prescribing Doctor">
            <input value={form.doctor} onChange={(e) => update("doctor", e.target.value)} className={inputCls} />
          </Field>
        </div>
      </PageSection>

      <PageSection title="Items" icon={<Package className="h-4 w-4" />}>
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Sale Lines</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-ink-50 dark:hover:bg-ink-800"
              >
                <Plus className="h-4 w-4" /> Add Row
              </button>
            </div>
          </div>
          {fieldErrors.lines ? (
            <p className="mb-2 text-[12px] font-medium text-danger-500">{fieldErrors.lines}</p>
          ) : null}

          <div className="overflow-x-auto rounded-xl border dark:border-ink-800">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-ink-50 text-left text-[12px] font-semibold uppercase text-ink-500 dark:bg-ink-900 dark:text-ink-400">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Expiry</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Disc %</th>
                  <th className="px-3 py-2 text-right">GST %</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-ink-800">
                {lines.map((line) => {
                  const amount = round2(num(line.qty, 1) * num(line.rate, 0));
                  return (
                    <tr key={line.id} className="bg-white dark:bg-ink-900/40">
                      <td className="min-w-[220px] px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <input
                            value={line.itemName}
                            onChange={(e) => updateLine(line.id, "itemName", e.target.value)}
                            placeholder="Type or pick item"
                            className={cn(cellCls, "text-left")}
                          />
                          <button
                            type="button"
                            onClick={() => openPicker(line.id)}
                            title="Pick item"
                            className="rounded-lg border p-1.5 hover:bg-ink-50 dark:hover:bg-ink-800"
                          >
                            <Search className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={line.batchNo}
                          onChange={(e) => updateLine(line.id, "batchNo", e.target.value)}
                          className={cn(cellCls, "text-left")}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="date"
                          value={line.expiryDate}
                          onChange={(e) => updateLine(line.id, "expiryDate", e.target.value)}
                          className={cellCls}
                        />
                      </td>
                      <td className="w-20 px-2 py-1.5">
                        <input
                          value={line.qty}
                          onChange={(e) => updateLine(line.id, "qty", e.target.value)}
                          className={cellCls}
                        />
                      </td>
                      <td className="w-24 px-2 py-1.5">
                        <input
                          value={line.rate}
                          onChange={(e) => updateLine(line.id, "rate", e.target.value)}
                          className={cellCls}
                        />
                      </td>
                      <td className="w-20 px-2 py-1.5">
                        <input
                          value={line.discPct}
                          onChange={(e) => updateLine(line.id, "discPct", e.target.value)}
                          className={cellCls}
                        />
                      </td>
                      <td className="w-20 px-2 py-1.5">
                        <input
                          value={line.gstPct}
                          onChange={(e) => updateLine(line.id, "gstPct", e.target.value)}
                          className={cellCls}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-ink-800 dark:text-ink-100">
                        {money(amount)}
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length <= 1}
                          className="rounded-lg border p-1.5 text-danger-600 hover:bg-danger-50 disabled:opacity-40 dark:hover:bg-danger-900/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </PageSection>

      <PageSection title="Payment & Summary" icon={<Receipt className="h-4 w-4" />}>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div className="space-y-3">
            <Field label="Header Discount %">
              <input
                value={form.discountPct}
                onChange={(e) => update("discountPct", e.target.value)}
                className={inputCls}
                placeholder="0"
              />
            </Field>
            <Field label="Payment By">
              <select value={form.paymentBy} onChange={(e) => update("paymentBy", e.target.value)} className={selectCls}>
                {PAYMENT_BY.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment Mode">
              <select value={form.paymentMode} onChange={(e) => update("paymentMode", e.target.value)} className={selectCls}>
                {PAYMENT_MODES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Received Amount">
              <input
                value={form.receivedAmount}
                onChange={(e) => update("receivedAmount", e.target.value)}
                className={inputCls}
                placeholder="0"
                disabled={form.paymentBy === "Free"}
              />
            </Field>
            <Field label="Remarks">
              <textarea
                value={form.remarks}
                onChange={(e) => update("remarks", e.target.value)}
                className={cn(inputCls, "min-h-[64px]")}
              />
            </Field>
          </div>

          <div className="space-y-2 rounded-xl border bg-ink-50/40 p-4 dark:border-ink-800 dark:bg-ink-900/40">
            <Row label="Gross Amount" value={money(totals.grossAmount)} />
            <Row label="Discount" value={`- ${money(totals.discount)}`} />
            <Row label="GST" value={money(totals.tax)} />
            <div className="my-2 border-t dark:border-ink-800" />
            <Row label="Net Amount" value={money(totals.netAmount)} strong />
            <Row label="Received" value={money(received)} />
            <Row label="Balance" value={money(balance)} />
            <div className="my-2 border-t dark:border-ink-800" />
            <Row
              label="Status"
              value={
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
                    statusLabel === "Paid"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : statusLabel === "Partially Paid"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                        : "bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-200"
                  )}
                >
                  {statusLabel}
                </span>
              }
            />
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Sale
            </button>
          </div>
        </div>
      </PageSection>

      <PageSection title="Today's Sales" icon={<Receipt className="h-4 w-4" />}>
        <div className="overflow-x-auto p-4">
          {todayLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-ink-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : todayRows.length === 0 ? (
            <p className="py-6 text-sm text-ink-500">No sales recorded today.</p>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-[12px] font-semibold uppercase text-ink-500">
                <tr>
                  <th className="px-3 py-2">Bill No</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-ink-800">
                {todayRows.map((row) => (
                  <tr key={row._id} className="text-ink-700 dark:text-ink-200">
                    <td className="px-3 py-2 font-medium">{row.billNo}</td>
                    <td className="px-3 py-2">{row.patientName}</td>
                    <td className="px-3 py-2">{Array.isArray(row.lines) ? row.lines.length : 0}</td>
                    <td className="px-3 py-2 text-right">{money(row.netAmount)}</td>
                    <td className="px-3 py-2 text-right">{money(row.balance)}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.paymentMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </PageSection>

      {showItemPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl dark:bg-ink-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink-900 dark:text-ink-100">Pick Item</h3>
              <button
                type="button"
                onClick={() => setShowItemPicker(false)}
                className="rounded-lg border p-1.5 hover:bg-ink-50 dark:hover:bg-ink-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              autoFocus
              value={itemQuery}
              onChange={(e) => setItemQuery(e.target.value)}
              placeholder="Search by code, name, generic or brand"
              className={cn(inputCls, "mb-3")}
            />
            <div className="max-h-80 overflow-y-auto rounded-xl border dark:border-ink-800">
              {filteredItems.length === 0 ? (
                <p className="p-4 text-sm text-ink-500">No items found.</p>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item._id || item.code}
                    type="button"
                    onClick={() => chooseItem(item)}
                    className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800"
                  >
                    <span>
                      <span className="font-medium text-ink-800 dark:text-ink-100">{item.name}</span>
                      <span className="ml-2 text-xs text-ink-500">
                        {item.code}
                        {item.genericName ? ` · ${item.genericName}` : ""}
                      </span>
                    </span>
                    <span className="text-xs text-ink-500">{item.rate != null ? money(item.rate) : ""}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn("text-ink-600 dark:text-ink-300", strong && "font-semibold text-ink-900 dark:text-ink-100")}>
        {label}
      </span>
      <span className={cn("text-ink-800 dark:text-ink-100", strong && "text-base font-bold")}>{value}</span>
    </div>
  );
}
