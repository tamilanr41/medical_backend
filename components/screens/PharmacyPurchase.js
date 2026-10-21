"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Loader2,
  Package,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";

const PAYMENT_MODES = ["Credit", "Cash", "Cheque", "Net Transfer", "UPI", "Demand Draft"];

const KINDS = {
  "purchase-request": { title: "Purchase Request", stock: "none", needsSupplier: true, showExpected: false, showPayment: false },
  "purchase-order": { title: "Purchase Order", stock: "none", needsSupplier: true, showExpected: true, showPayment: false },
  "cash-purchase": { title: "Cash Purchase", stock: "in", needsSupplier: true, showExpected: false, showPayment: true },
  "goods-receipt": { title: "Goods Receipt", stock: "in", needsSupplier: true, showExpected: false, showPayment: false },
  "purchase-return": { title: "Purchase Return", stock: "out", needsSupplier: true, showExpected: false, showPayment: false },
};

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

function computeTotals(lines) {
  let grossAmount = 0;
  let discount = 0;
  let tax = 0;
  for (const line of lines) {
    const amount = round2(num(line.qty, 1) * num(line.rate, 0));
    const disc = round2((amount * num(line.discPct, 0)) / 100);
    const taxable = Math.max(0, amount - disc);
    grossAmount += amount;
    discount += disc;
    tax += round2((taxable * num(line.gstPct, 0)) / 100);
  }
  return {
    grossAmount: round2(grossAmount),
    discount: round2(discount),
    tax: round2(tax),
    netAmount: round2(Math.max(0, grossAmount - discount) + tax),
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
    freeQty: "",
    rate: "",
    mrp: "",
    discPct: "",
    gstPct: "",
  };
}

function statusTone(status) {
  if (status === "Received" || status === "Approved") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (status === "Cancelled") return "bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-200";
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200";
}

/**
 * Shared Pharmacy purchase screen. The legacy purchase menu items (Purchase
 * Request, Purchase Order, Cash Purchase, Goods Receipt, Purchase Return) all
 * share this document editor; behaviour varies by kind — whether stock moves,
 * whether the document needs a supplier and payment terms.
 */
export default function PharmacyPurchase({ item }) {
  const slug = item?.slug || "purchase-order";
  const kind = KINDS[slug] || KINDS["purchase-order"];
  return <PharmacyPurchaseInner slug={slug} kind={kind} />;
}

function PharmacyPurchaseInner({ slug, kind }) {
  const idRef = useRef(1);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [itemQuery, setItemQuery] = useState("");
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);

  const [form, setForm] = useState({
    docDate: today(),
    supplierName: "",
    supplierCode: "",
    reference: "",
    expectedDate: "",
    paymentMode: "Credit",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [lines, setLines] = useState([{ ...blankLine(), id: 0 }]);

  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  const loadRows = useCallback(async () => {
    setRowsLoading(true);
    try {
      const res = await fetch(`/api/pharmacy-purchase?kind=${slug}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setRows(res.ok && Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setRows([]);
    } finally {
      setRowsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [supRes, itemRes, docRes] = await Promise.all([
          fetch("/api/resource/pharmacy_suppliers?all=1&sort=name&dir=asc", { cache: "no-store" }),
          fetch("/api/resource/pharmacy_items?all=1&sort=name&dir=asc", { cache: "no-store" }),
          fetch(`/api/pharmacy-purchase?kind=${slug}`, { cache: "no-store" }),
        ]);
        const sup = await supRes.json().catch(() => ({}));
        const it = await itemRes.json().catch(() => ({}));
        const doc = await docRes.json().catch(() => ({}));
        if (cancelled) return;
        setSuppliers(supRes.ok && Array.isArray(sup.rows) ? sup.rows : []);
        setItems(itemRes.ok && Array.isArray(it.rows) ? it.rows : []);
        setRows(docRes.ok && Array.isArray(doc.rows) ? doc.rows : []);
      } catch {
        if (!cancelled) {
          setSuppliers([]);
          setItems([]);
          setRows([]);
        }
      } finally {
        if (!cancelled) setRowsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const totals = useMemo(() => computeTotals(lines), [lines]);

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
      prev.map((line) => (line.id === id ? { ...line, [field]: value } : line))
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

  function onSupplierChange(value) {
    const match = suppliers.find((s) => String(s.name).toLowerCase() === value.trim().toLowerCase());
    setForm((prev) => ({ ...prev, supplierName: value, supplierCode: match?.code || prev.supplierCode }));
  }

  async function save() {
    const errors = {};
    if (kind.needsSupplier && !form.supplierName.trim()) errors.supplierName = "Select or enter the supplier.";
    if (!lines.some((line) => line.itemName && num(line.qty, 0) > 0)) {
      errors.lines = "Add at least one item with quantity.";
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
        docDate: form.docDate,
        supplierName: form.supplierName.trim(),
        supplierCode: form.supplierCode,
        reference: form.reference,
        expectedDate: form.expectedDate,
        paymentMode: form.paymentMode,
        remarks: form.remarks,
        lines: lines
          .filter((line) => line.itemName && num(line.qty, 0) > 0)
          .map((line) => ({
            itemCode: line.itemCode,
            itemName: line.itemName,
            batchNo: line.batchNo,
            expiryDate: line.expiryDate,
            qty: line.qty,
            freeQty: line.freeQty,
            rate: line.rate,
            mrp: line.mrp,
            discPct: line.discPct,
            gstPct: line.gstPct,
          })),
      };

      const res = await fetch(`/api/pharmacy-purchase?kind=${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields);
        setNotice({ type: "error", message: data.error || "The document could not be saved." });
        return;
      }

      setNotice({ type: "success", message: `${kind.title} ${data.doc.docNo} saved successfully.` });
      setForm({
        docDate: today(),
        supplierName: "",
        supplierCode: "",
        reference: "",
        expectedDate: "",
        paymentMode: "Credit",
        remarks: "",
      });
      idRef.current = 1;
      setLines([{ ...blankLine(), id: 0 }]);
      setFieldErrors({});
      loadRows();
    } catch {
      setNotice({ type: "error", message: "The document could not be saved." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">{kind.title}</h2>
          <p className="text-sm text-ink-500 dark:text-ink-400">Pharmacy Purchase</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
            <Truck className="h-4 w-4" /> Net {money(totals.netAmount)}
          </span>
          <button
            type="button"
            onClick={loadRows}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-ink-50 dark:hover:bg-ink-800"
          >
            <RefreshCw className={cn("h-4 w-4", rowsLoading && "animate-spin")} /> Refresh
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

      <PageSection title="Supplier & Document" icon={<Truck className="h-4 w-4" />}>
        <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Document Date" required error={fieldErrors.docDate}>
            <input
              type="date"
              value={form.docDate}
              onChange={(e) => update("docDate", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Supplier" required={kind.needsSupplier} error={fieldErrors.supplierName}>
            <input
              list="pharmacy-suppliers"
              value={form.supplierName}
              onChange={(e) => onSupplierChange(e.target.value)}
              className={inputCls}
              placeholder="Search supplier"
            />
            <datalist id="pharmacy-suppliers">
              {suppliers.map((s) => (
                <option key={s._id || s.code} value={s.name} />
              ))}
            </datalist>
          </Field>
          <Field label="Supplier Code">
            <input value={form.supplierCode} onChange={(e) => update("supplierCode", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Reference / Invoice No">
            <input value={form.reference} onChange={(e) => update("reference", e.target.value)} className={inputCls} />
          </Field>
          {kind.showExpected ? (
            <Field label="Expected Date">
              <input
                type="date"
                value={form.expectedDate}
                onChange={(e) => update("expectedDate", e.target.value)}
                className={inputCls}
              />
            </Field>
          ) : null}
          {kind.showPayment ? (
            <Field label="Payment Mode">
              <select value={form.paymentMode} onChange={(e) => update("paymentMode", e.target.value)} className={selectCls}>
                {PAYMENT_MODES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Remarks" className="md:col-span-2 lg:col-span-3">
            <textarea
              value={form.remarks}
              onChange={(e) => update("remarks", e.target.value)}
              className={cn(inputCls, "min-h-[64px]")}
            />
          </Field>
        </div>
      </PageSection>

      <PageSection title="Items" icon={<PackagePlus className="h-4 w-4" />}>
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Document Lines</p>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-ink-50 dark:hover:bg-ink-800"
            >
              <Plus className="h-4 w-4" /> Add Row
            </button>
          </div>
          {fieldErrors.lines ? (
            <p className="mb-2 text-[12px] font-medium text-danger-500">{fieldErrors.lines}</p>
          ) : null}

          <div className="overflow-x-auto rounded-xl border dark:border-ink-800">
            <table className="w-full min-w-[940px] text-sm">
              <thead className="bg-ink-50 text-left text-[12px] font-semibold uppercase text-ink-500 dark:bg-ink-900 dark:text-ink-400">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Expiry</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Free</th>
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
                        <input value={line.qty} onChange={(e) => updateLine(line.id, "qty", e.target.value)} className={cellCls} />
                      </td>
                      <td className="w-20 px-2 py-1.5">
                        <input
                          value={line.freeQty}
                          onChange={(e) => updateLine(line.id, "freeQty", e.target.value)}
                          className={cellCls}
                        />
                      </td>
                      <td className="w-24 px-2 py-1.5">
                        <input value={line.rate} onChange={(e) => updateLine(line.id, "rate", e.target.value)} className={cellCls} />
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

      <PageSection title="Summary" icon={<Package className="h-4 w-4" />}>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div className="space-y-2 rounded-xl border bg-ink-50/40 p-4 dark:border-ink-800 dark:bg-ink-900/40">
            <Row label="Gross Amount" value={money(totals.grossAmount)} />
            <Row label="Discount" value={`- ${money(totals.discount)}`} />
            <Row label="GST" value={money(totals.tax)} />
            <div className="my-2 border-t dark:border-ink-800" />
            <Row label="Net Amount" value={money(totals.netAmount)} strong />
          </div>
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 md:w-auto md:self-end md:px-8"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save {kind.title}
            </button>
          </div>
        </div>
      </PageSection>

      <PageSection title={`Today's ${kind.title}`} icon={<Truck className="h-4 w-4" />}>
        <div className="overflow-x-auto p-4">
          {rowsLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-ink-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-sm text-ink-500">No documents recorded today.</p>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-[12px] font-semibold uppercase text-ink-500">
                <tr>
                  <th className="px-3 py-2">Doc No</th>
                  <th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-ink-800">
                {rows.map((row) => (
                  <tr key={row._id} className="text-ink-700 dark:text-ink-200">
                    <td className="px-3 py-2 font-medium">{row.docNo}</td>
                    <td className="px-3 py-2">{row.supplierName}</td>
                    <td className="px-3 py-2">{Array.isArray(row.lines) ? row.lines.length : 0}</td>
                    <td className="px-3 py-2 text-right">{money(row.netAmount)}</td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-semibold", statusTone(row.status))}>
                        {row.status}
                      </span>
                    </td>
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
