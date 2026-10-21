import { getCollection } from "@/lib/db";

export function serializeBill(doc) {
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

/**
 * Recomputes an OP bill the same way on the client and the server so the
 * printed total always matches what was validated (legacy PATIENT_BILL logic):
 * per-line amount = qty x rate, line discount %, GST %, then header discount %.
 */
export function computeBillTotals(lines = [], { discountPct = 0, serviceChargePct = 0 } = {}) {
  let grossAmount = 0;
  let lineDiscount = 0;
  let tax = 0;

  for (const line of lines) {
    const qty = num(line.qty, 1);
    const rate = num(line.rate, 0);
    const amount = round2(qty * rate);
    const discount = round2((amount * num(line.discPct, 0)) / 100 + num(line.discAmt, 0));
    const taxable = Math.max(0, amount - discount);
    const gst = round2((taxable * num(line.gstPct, 0)) / 100);

    grossAmount += amount;
    lineDiscount += discount;
    tax += gst;
  }

  const taxableTotal = Math.max(0, grossAmount - lineDiscount);
  const headerDiscount = round2((taxableTotal * num(discountPct, 0)) / 100);
  const serviceCharge = round2((taxableTotal * num(serviceChargePct, 0)) / 100);
  const netAmount = round2(taxableTotal - headerDiscount + tax + serviceCharge);

  return {
    grossAmount: round2(grossAmount),
    discount: round2(lineDiscount + headerDiscount),
    tax: round2(tax),
    serviceCharge,
    netAmount,
  };
}

export function billStatus(netAmount, receivedAmount, paymentBy = "By Patient") {
  const net = num(netAmount, 0);
  const received = num(receivedAmount, 0);
  if (net <= 0) return "Paid";
  if (paymentBy === "Free") return "Paid";
  if (paymentBy === "By Credit") return "Unpaid";
  if (received >= net) return "Paid";
  if (received > 0) return "Partially Paid";
  return "Unpaid";
}

export async function nextBillNo() {
  const col = await getCollection("op_bills");
  const year = new Date().getFullYear();
  const prefix = `BILL-${year}-`;
  const docs = await col
    .find({ billNo: { $regex: `^${prefix}` } })
    .sort({ billNo: -1 })
    .limit(1)
    .toArray();
  const match = docs[0]?.billNo?.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}
