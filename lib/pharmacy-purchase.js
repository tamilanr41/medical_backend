import { getCollection, getDb } from "@/lib/db";

/**
 * Pharmacy purchase domain logic. Covers the legacy stock-in family:
 *   - purchase-request : internal request, no stock impact
 *   - purchase-order   : committed order, no stock impact (until receipt)
 *   - cash-purchase    : immediate purchase, stock-in + paid
 *   - goods-receipt    : receive against an order, stock-in
 *   - purchase-return  : return to supplier, stock-out
 *
 * Numbering: <PREFIX>-<year>-000001 where PREFIX depends on the document kind.
 * Stock moves batch-wise through `pharmacy_stock` with `pharmacy_stock_movements`
 * audit rows, mirroring lib/pharmacy-sales.js.
 */

export const PURCHASE_KINDS = {
  "purchase-request": { collection: "pharmacy_purchase_requests", prefix: "PREQ", stock: "none", title: "Purchase Request" },
  "purchase-order": { collection: "pharmacy_purchase_orders", prefix: "PORD", stock: "none", title: "Purchase Order" },
  "cash-purchase": { collection: "pharmacy_cash_purchases", prefix: "CPUR", stock: "in", title: "Cash Purchase" },
  "goods-receipt": { collection: "pharmacy_goods_receipts", prefix: "GRN", stock: "in", title: "Goods Receipt" },
  "purchase-return": { collection: "pharmacy_purchase_returns", prefix: "PRET", stock: "out", title: "Purchase Return" },
};

export function purchaseKind(slug) {
  return PURCHASE_KINDS[slug] || PURCHASE_KINDS["purchase-order"];
}

export function serializePurchase(doc) {
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

export function cleanPurchaseLine(line = {}) {
  const qty = num(line.qty, 1);
  const rate = num(line.rate, 0);
  const discPct = num(line.discPct, 0);
  const gstPct = num(line.gstPct, 0);
  const freeQty = num(line.freeQty, 0);
  const amount = round2(qty * rate);
  const discount = round2((amount * discPct) / 100);
  const taxable = Math.max(0, amount - discount);
  const gst = round2((taxable * gstPct) / 100);
  return {
    itemCode: String(line.itemCode ?? "").trim(),
    itemName: String(line.itemName ?? "").trim(),
    batchNo: String(line.batchNo ?? "").trim(),
    expiryDate: String(line.expiryDate ?? "").trim(),
    qty,
    freeQty,
    rate,
    mrp: num(line.mrp, 0),
    discPct,
    gstPct,
    amount: round2(amount),
    discount,
    gst,
    lineTotal: round2(taxable + gst),
  };
}

export function computePurchaseTotals(lines = []) {
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
  const netAmount = round2(Math.max(0, grossAmount - discount) + tax);
  return {
    grossAmount: round2(grossAmount),
    discount: round2(discount),
    tax: round2(tax),
    netAmount,
  };
}

export async function nextPurchaseNo(collection, prefix) {
  const col = await getCollection(collection);
  const year = new Date().getFullYear();
  const full = `${prefix}-${year}-`;
  if (!col) return `${full}000001`;
  const docs = await col
    .find({ docNo: { $regex: `^${full}` } })
    .sort({ docNo: -1 })
    .limit(1)
    .toArray();
  const match = docs[0]?.docNo?.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `${full}${String(next).padStart(6, "0")}`;
}

/** Adds received quantities to stock batch-wise (upserting the batch row). */
export async function receiveStock(lines = []) {
  const db = await getDb();
  if (!db) return { allocations: [], available: false };
  const stock = db.collection("pharmacy_stock");
  const movement = db.collection("pharmacy_stock_movements");
  const allocations = [];
  for (const line of lines) {
    const receiveQty = num(line.qty, 0) + num(line.freeQty, 0);
    if (!line.itemCode || receiveQty <= 0) continue;
    const batchNo = line.batchNo || "";
    const existing = await stock.findOne({ itemCode: line.itemCode, batchNo });
    if (existing) {
      await stock.updateOne(
        { _id: existing._id },
        {
          $inc: { quantity: receiveQty },
          $set: {
            itemName: line.itemName,
            expiryDate: line.expiryDate || existing.expiryDate || "",
            rate: line.rate,
            mrp: line.mrp || existing.mrp || 0,
            updatedAt: new Date().toISOString(),
          },
        }
      );
    } else {
      await stock.insertOne({
        itemCode: line.itemCode,
        itemName: line.itemName,
        batchNo,
        expiryDate: line.expiryDate || "",
        rate: line.rate,
        mrp: line.mrp || 0,
        quantity: receiveQty,
        createdAt: new Date().toISOString(),
      });
    }
    await movement.insertOne({
      itemCode: line.itemCode,
      itemName: line.itemName,
      batchNo,
      expiryDate: line.expiryDate || "",
      quantity: receiveQty,
      type: "purchase",
      createdAt: new Date().toISOString(),
    });
    allocations.push({ itemCode: line.itemCode, batchNo, quantity: receiveQty });
  }
  return { allocations, available: true };
}

/** Removes quantities from stock batch-wise for a purchase return. */
export async function returnStock(lines = []) {
  const db = await getDb();
  if (!db) return { allocations: [], available: false };
  const stock = db.collection("pharmacy_stock");
  const movement = db.collection("pharmacy_stock_movements");
  const allocations = [];
  for (const line of lines) {
    let remaining = num(line.qty, 0);
    if (!line.itemCode || remaining <= 0) continue;
    const filter = line.batchNo
      ? { itemCode: line.itemCode, batchNo: line.batchNo }
      : { itemCode: line.itemCode, quantity: { $gt: 0 } };
    const batches = await stock.find(filter).sort({ expiryDate: 1 }).toArray();
    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, num(batch.quantity, 0));
      await stock.updateOne({ _id: batch._id }, { $inc: { quantity: -take } });
      await movement.insertOne({
        itemCode: line.itemCode,
        itemName: line.itemName,
        batchNo: batch.batchNo || "",
        expiryDate: batch.expiryDate || "",
        quantity: -take,
        type: "purchase-return",
        createdAt: new Date().toISOString(),
      });
      allocations.push({ itemCode: line.itemCode, batchNo: batch.batchNo || "", quantity: take });
      remaining -= take;
    }
  }
  return { allocations, available: true };
}

/** Reverses a stock-in (cancelled GRN / cash purchase). */
export async function reverseReceive(allocations = []) {
  const db = await getDb();
  if (!db) return;
  const stock = db.collection("pharmacy_stock");
  const movement = db.collection("pharmacy_stock_movements");
  for (const alloc of allocations) {
    if (!alloc.itemCode || !alloc.quantity) continue;
    await stock.updateOne(
      { itemCode: alloc.itemCode, batchNo: alloc.batchNo || "" },
      { $inc: { quantity: -num(alloc.quantity, 0) } }
    );
    await movement.insertOne({
      itemCode: alloc.itemCode,
      batchNo: alloc.batchNo || "",
      quantity: -num(alloc.quantity, 0),
      type: "purchase-cancel",
      createdAt: new Date().toISOString(),
    });
  }
}

/** Reverses a purchase return (re-adds the returned quantity). */
export async function reverseReturn(allocations = []) {
  const db = await getDb();
  if (!db) return;
  const stock = db.collection("pharmacy_stock");
  const movement = db.collection("pharmacy_stock_movements");
  for (const alloc of allocations) {
    if (!alloc.itemCode || !alloc.quantity) continue;
    await stock.updateOne(
      { itemCode: alloc.itemCode, batchNo: alloc.batchNo || "" },
      { $inc: { quantity: num(alloc.quantity, 0) } }
    );
    await movement.insertOne({
      itemCode: alloc.itemCode,
      batchNo: alloc.batchNo || "",
      quantity: num(alloc.quantity, 0),
      type: "purchase-return-cancel",
      createdAt: new Date().toISOString(),
    });
  }
}
