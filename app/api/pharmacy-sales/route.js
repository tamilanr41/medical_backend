import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import {
  buildSaleDocument,
  cleanSaleLine,
  computeSaleTotals,
  deductStock,
  nextSaleNo,
  saleStatus,
  serializeSale,
} from "@/lib/pharmacy-sales";

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** GET /api/pharmacy-sales?q=&date= — today's sales or a bill/patient search. */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, "pharmacy_cash_sales")) {
    return fail(403, "Your role does not have access to pharmacy sales.");
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const date = (searchParams.get("date") || "").trim();
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

  try {
    const col = await getCollection("pharmacy_sales");
    if (!col) return NextResponse.json({ rows: [], total: 0 });
    const filter = q
      ? {
          $or: ["billNo", "patientName", "uhid", "mobile"].map((field) => ({
            [field]: new RegExp(escapeRegex(q), "i"),
          })),
        }
      : { billDate: date || today() };

    const rows = await col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray();
    const total = await col.countDocuments(filter);

    return NextResponse.json({ rows: rows.map(serializeSale), total });
  } catch {
    return fail(503, "Pharmacy sales could not be read. Is MongoDB running?");
  }
}

/** POST /api/pharmacy-sales — creates a cash sale, numbering and stock-adjusting server-side. */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, "pharmacy_cash_sales")) {
    return fail(403, "Your role does not have access to pharmacy sales.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const billDate = String(body.billDate ?? "").trim() || today();
  const patientName = String(body.patientName ?? "").trim();
  const lines = Array.isArray(body.lines) ? body.lines.map(cleanSaleLine) : [];
  const payableCount = lines.filter((line) => line.rate > 0 && line.qty > 0).length;

  const paymentBy = String(body.paymentBy ?? "By Patient").trim() || "By Patient";
  const discountPct = Number(body.discountPct) || 0;
  const totals = computeSaleTotals(lines, { discountPct });

  const errors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(billDate)) errors.billDate = "Enter a valid bill date.";
  if (!patientName) errors.patientName = "Enter the customer / patient name.";
  if (payableCount === 0) errors.lines = "Add at least one item with quantity and rate.";

  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  const received = Number(body.receivedAmount) || 0;
  const paidAmount = paymentBy === "Free" ? totals.netAmount : received;
  const balance = Math.max(0, Math.round((totals.netAmount - paidAmount) * 100) / 100);
  const status = paymentBy === "By Sponsor" ? "Credit" : saleStatus(totals.netAmount, paidAmount, paymentBy);

  try {
    const billNo = String(body.billNo ?? "").trim() || (await nextSaleNo());
    const { allocations } = await deductStock(lines);

    const document = buildSaleDocument(
      {
        billNo,
        billDate,
        patientName,
        uhid: body.uhid,
        mobile: body.mobile,
        doctor: body.doctor,
        customerCode: body.customerCode,
        lines,
        discountPct,
        paymentBy,
        paymentMode: String(body.paymentMode ?? "Cash").trim() || "Cash",
        receivedAmount: received,
        paidAmount,
        balance,
        remarks: body.remarks,
        status,
        stockAllocations: allocations,
      },
      totals,
      session
    );

    const col = await getCollection("pharmacy_sales");
    if (!col) return fail(503, "Pharmacy sales storage is unavailable.");
    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "pharmacy",
      screen: "Cash Sale",
      record: billNo,
      summary: `Pharmacy sale ${billNo} for ${patientName} - ${document.netAmount}`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      { ok: true, sale: serializeSale({ ...document, _id: result.insertedId }) },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail(409, "This bill number was just used. Please try again.");
    }
    return fail(500, "The sale could not be saved. Please try again.");
  }
}
