import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import { billStatus, computeBillTotals, nextBillNo, serializeBill } from "@/lib/bills";
import { nextOpNo } from "@/lib/appointments";

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cleanLine(line) {
  return {
    service: String(line.service ?? "").trim(),
    qty: Number(line.qty) || 1,
    rate: Number(line.rate) || 0,
    discPct: Number(line.discPct) || 0,
    discAmt: Number(line.discAmt) || 0,
    gstPct: Number(line.gstPct) || 0,
  };
}

/** GET /api/op-bills?q= — today's bills, or a bill/patient search. */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, "op_bills")) {
    return fail(403, "Your role does not have access to OP billing.");
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const date = (searchParams.get("date") || "").trim();
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

  try {
    const col = await getCollection("op_bills");
    const filter = q
      ? {
          $or: ["billNo", "patientName", "uhid", "mobile"].map((field) => ({
            [field]: new RegExp(escapeRegex(q), "i"),
          })),
        }
      : { billDate: date || today() };

    const rows = await col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray();
    const total = await col.countDocuments(filter);

    return NextResponse.json({ rows: rows.map(serializeBill), total });
  } catch {
    return fail(503, "OP bills could not be read. Is MongoDB running?");
  }
}

/** POST /api/op-bills — creates an OP bill, numbering it server-side. */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, "op_bills")) {
    return fail(403, "Your role does not have access to OP billing.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const billDate = String(body.billDate ?? "").trim() || today();
  const patientName = String(body.patientName ?? "").trim();
  const lines = Array.isArray(body.lines) ? body.lines.map(cleanLine) : [];
  const payableCount = lines.filter((line) => line.rate > 0).length;

  const paymentBy = String(body.paymentBy ?? "By Patient").trim() || "By Patient";
  const sponsorType = String(body.sponsorType ?? "").trim();
  const sponsorName = String(body.sponsorName ?? "").trim();
  const sponsorRef = String(body.sponsorRef ?? "").trim();
  const creditLimit = Number(body.creditLimit) || 0;
  const discountPct = Number(body.discountPct) || 0;
  const serviceChargePct = Number(body.serviceChargePct) || 0;
  const totals = computeBillTotals(lines, { discountPct, serviceChargePct });

  const errors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(billDate)) errors.billDate = "Enter a valid bill date.";
  if (!patientName) errors.patientName = "Select a patient or enter a walk-in name.";
  if (payableCount === 0) {
    errors.lines = "Add at least one service line with an amount.";
  }
  if (paymentBy === "By Sponsor" && !sponsorName) {
    errors.sponsorName = "Choose a sponsor for a sponsored bill.";
  }
  if (paymentBy === "By Sponsor" && creditLimit > 0 && totals.netAmount > creditLimit) {
    errors.creditLimit = `This bill exceeds the sponsor credit limit of ${creditLimit}.`;
  }

  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  const received = Number(body.receivedAmount) || 0;
  const paidAmount = paymentBy === "Free" ? totals.netAmount : received;
  const balance = Math.max(0, Math.round((totals.netAmount - paidAmount) * 100) / 100);
  const status =
    paymentBy === "By Sponsor" ? "Credit" : billStatus(totals.netAmount, paidAmount, paymentBy);

  try {
    const billNo = await nextBillNo();
    const opNo = String(body.opNo ?? "").trim() || (await nextOpNo());
    const now = new Date().toISOString();
    const document = {
      billNo,
      opNo,
      uhid: String(body.uhid ?? "").trim(),
      patientName,
      gender: String(body.gender ?? "").trim(),
      age: Number(body.age) || "",
      mobile: String(body.mobile ?? "").trim(),
      doctor: String(body.doctor ?? "").trim(),
      department: String(body.department ?? "").trim(),
      patientType: String(body.patientType ?? "").trim(),
      sponsorType,
      sponsorName,
      sponsorRef,
      creditLimit,
      billDate,
      lines,
      discountPct,
      serviceChargePct,
      ...totals,
      paidAmount,
      balance,
      paymentBy,
      paymentMode: String(body.paymentMode ?? "Cash").trim() || "Cash",
      remarks: String(body.remarks ?? "").trim(),
      status,
      createdAt: now,
      updatedAt: now,
    };

    const col = await getCollection("op_bills");
    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "opd",
      screen: "Patient Billing",
      record: billNo,
      summary: `OP bill ${billNo} for ${patientName} - ${document.netAmount}`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      { ok: true, bill: serializeBill({ ...document, _id: result.insertedId }) },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail(409, "This bill number was just used. Please try again.");
    }
    return fail(500, "The bill could not be saved. Please try again.");
  }
}
