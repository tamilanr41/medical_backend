import { getCollection, getDb } from "@/lib/db";

/**
 * Pharmacy sales domain logic. Mirrors the legacy Zhanx cash-sale flow:
 * line amount = qty x rate, line discount %, GST %, then header discount %;
 * stock is deducted batch-wise (FEFO - first expiry first out) on save and
 * restored when a bill is cancelled.
 */

export function serializeSale(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: String(_id) };
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function cleanSaleLine(line = {}) {
  const qty = num(line.qty, 1);
  const rate = num(line.rate, 0);
  const discPct = num(line.discPct, 0);
  const discAmt = num(line.discAmt, 0);
  const gstPct = num(line.gstPct, 0);
  const amount = round2(qty * rate);
  const discount = round2((amount * discPct) / 100 + discAmt);
  const taxable = Math.max(0, amount - discount);
  const gst = round2((taxable * gstPct) / 100);
  return {
    itemCode: String(line.itemCode ?? "").trim(),
    itemName: String(line.itemName ?? "").trim(),
    batchNo: String(line.batchNo ?? "").trim(),
    expiryDate: String(line.expiryDate ?? "").trim(),
    qty,
    rate,
    mrp: num(line.mrp, 0),
    discPct,
    discAmt,
    gstPct,
    amount: round2(amount),
    discount,
    gst,
    lineTotal: round2(taxable + gst),
  };
}

export function computeSaleTotals(lines = [], { discountPct = 0 } = {}) {
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

export function saleStatus(netAmount, receivedAmount, paymentBy = "By Patient") {
  const net = num(netAmount, 0);
  const received = num(receivedAmount, 0);
  if (net <= 0) return "Paid";
  if (paymentBy === "Free") return "Paid";
  if (paymentBy === "By Credit") return "Unpaid";
  if (received >= net) return "Paid";
  if (received > 0) return "Partially Paid";
  return "Unpaid";
}

/** Server-side bill numbering per calendar year: PSALE-<year>-000001. */
export async function nextSaleNo() {
  const col = await getCollection("pharmacy_sales");
  const year = new Date().getFullYear();
  const prefix = `PSALE-${year}-`;
  if (!col) return `${prefix}000001`;
  const docs = await col
    .find({ billNo: { $regex: `^${prefix}` } })
    .sort({ billNo: -1 })
    .limit(1)
    .toArray();
  const match = docs[0]?.billNo?.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}

/**
 * Deducts stock batch-wise using first-expiry-first-out. Returns the batch
 * allocations applied so a cancellation can reverse them exactly. Skips
 * silently when MongoDB or stock tracking is unavailable so the bill still
 * saves (matching legacy tolerant behaviour).
 */
export async function deductStock(lines = []) {
  const db = await getDb();
  if (!db) return { allocations: [], available: false };
  const stock = db.collection("pharmacy_stock");
  const movement = db.collection("pharmacy_stock_movements");
  const allocations = [];
  for (const line of lines) {
    let remaining = num(line.qty, 0);
    if (!line.itemCode || remaining <= 0) continue;
    const batches = await stock
      .find({ itemCode: line.itemCode, quantity: { $gt: 0 } })
      .sort({ expiryDate: 1 })
      .toArray();
    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, num(batch.quantity, 0));
      await stock.updateOne(
        { _id: batch._id },
        { $inc: { quantity: -take } }
      );
      await movement.insertOne({
        itemCode: line.itemCode,
        itemName: line.itemName,
        batchNo: batch.batchNo || line.batchNo || "",
        expiryDate: batch.expiryDate || line.expiryDate || "",
        quantity: -take,
        type: "sale",
        createdAt: new Date().toISOString(),
      });
      allocations.push({
        itemCode: line.itemCode,
        batchNo: batch.batchNo || line.batchNo || "",
        quantity: take,
      });
      remaining -= take;
    }
  }
  return { allocations, available: true };
}

/** Reverses stock allocations recorded by deductStock. */
export async function restoreStock(allocations = []) {
  const db = await getDb();
  if (!db) return;
  const stock = db.collection("pharmacy_stock");
  const movement = db.collection("pharmacy_stock_movements");
  for (const alloc of allocations) {
    if (!alloc.itemCode || !alloc.quantity) continue;
    await stock.updateOne(
      { itemCode: alloc.itemCode, batchNo: alloc.batchNo },
      { $inc: { quantity: num(alloc.quantity, 0) } },
      { upsert: false }
    );
    await movement.insertOne({
      itemCode: alloc.itemCode,
      batchNo: alloc.batchNo || "",
      quantity: num(alloc.quantity, 0),
      type: "sale-cancel",
      createdAt: new Date().toISOString(),
    });
  }
}

export function buildSaleDocument(body, totals, session) {
  const now = new Date().toISOString();
  return {
    billNo: body.billNo,
    billDate: body.billDate,
    patientName: body.patientName,
    uhid: body.uhid || "",
    mobile: body.mobile || "",
    doctor: body.doctor || "",
    customerCode: body.customerCode || "",
    lines: body.lines,
    discountPct: body.discountPct,
    ...totals,
    paymentBy: body.paymentBy,
    paymentMode: body.paymentMode,
    receivedAmount: body.receivedAmount,
    paidAmount: body.paidAmount,
    balance: body.balance,
    remarks: body.remarks || "",
    status: body.status,
    stockAllocations: body.stockAllocations || [],
    createdBy: session?.user?.username || "",
    createdAt: now,
    updatedAt: now,
  };
}
