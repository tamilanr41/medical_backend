import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import { LAB_MODES, canAccessLab, isIsoDate, nextSponsorDueNo, serializeLab } from "@/lib/lab";

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function statusFor(due, collected) {
  if (collected <= 0) return "Outstanding";
  if (collected >= due) return "Settled";
  return "Partially Paid";
}

/** GET /api/lab-sponsor-dues — sponsor liability / collection register. */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessLab(session)) return fail(403, "Your role does not have access to the laboratory.");

  const col = await getCollection("lab_sponsor_dues");
  if (!col) return NextResponse.json({ rows: [] });

  const { searchParams } = new URL(request.url);
  const query = {};

  const status = searchParams.get("status");
  if (status) query.status = status;

  const sponsor = searchParams.get("sponsor");
  if (sponsor) query.sponsor = new RegExp(escapeRegex(sponsor), "i");

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (isIsoDate(from) || isIsoDate(to)) {
    query.date = {};
    if (isIsoDate(from)) query.date.$gte = from;
    if (isIsoDate(to)) query.date.$lte = to;
  }

  const q = String(searchParams.get("q") ?? "").trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    query.$or = [{ patientName: rx }, { uhid: rx }, { sponsor: rx }, { invoiceNo: rx }, { receiptNo: rx }];
  }

  const limit = Math.min(Number(searchParams.get("limit")) || (searchParams.get("all") ? 500 : 100), 1000);

  try {
    const rows = await col.find(query).sort({ date: -1, receiptNo: -1 }).limit(limit).toArray();
    return NextResponse.json({ rows: rows.map(serializeLab) });
  } catch {
    return fail(500, "Sponsor dues could not be loaded.");
  }
}

/** POST /api/lab-sponsor-dues — record a sponsor bill or a collection against it. */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessLab(session)) return fail(403, "Your role does not have access to the laboratory.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const values = {};
  for (const field of ["uhid", "patientName", "sponsor", "invoiceNo", "mode", "date", "remarks"]) {
    values[field] = String(body[field] ?? "").trim();
  }
  const dueAmount = num(body.dueAmount);
  const collectedAmount = num(body.collectedAmount);

  const errors = {};
  if (!values.sponsor) errors.sponsor = "Sponsor is required.";
  if (!values.date) errors.date = "Date is required.";
  else if (!isIsoDate(values.date)) errors.date = "Enter a valid date.";
  if (!(dueAmount > 0)) errors.dueAmount = "Enter the due amount.";
  if (collectedAmount < 0) errors.collectedAmount = "Enter a valid collection.";
  if (values.mode && !LAB_MODES.includes(values.mode)) errors.mode = "Choose a valid mode.";
  if (Object.keys(errors).length > 0) return fail(400, "Please correct the highlighted fields.", { fields: errors });

  try {
    const col = await getCollection("lab_sponsor_dues");
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const receiptNo = String(body.receiptNo ?? "").trim() || (await nextSponsorDueNo());
    const now = new Date().toISOString();
    const document = {
      receiptNo,
      uhid: values.uhid,
      patientName: values.patientName,
      sponsor: values.sponsor,
      invoiceNo: values.invoiceNo,
      dueAmount,
      collectedAmount,
      mode: values.mode,
      date: values.date,
      remarks: values.remarks,
      status: statusFor(dueAmount, collectedAmount),
      createdAt: now,
      updatedAt: now,
    };
    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "lab",
      screen: "Sponsor Due Collection",
      record: receiptNo,
      summary: `Recorded sponsor due for ${values.sponsor} (due ${dueAmount.toFixed(2)}, collected ${collectedAmount.toFixed(2)})`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, due: serializeLab({ ...document, _id: result.insertedId }) }, { status: 201 });
  } catch {
    return fail(500, "The sponsor due could not be saved. Please try again.");
  }
}
