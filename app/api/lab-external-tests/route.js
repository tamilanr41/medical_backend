import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import { canAccessLab, isIsoDate, nextExternalNo, serializeLab } from "@/lib/lab";

const EXTERNAL_STATUSES = ["Sent", "Received", "Reported"];

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

async function amountIndex() {
  const col = await getCollection("lab_external_amounts");
  const map = new Map();
  if (!col) return map;
  const rows = await col.find({}).toArray().catch(() => []);
  for (const row of rows) if (row.requestNo) map.set(row.requestNo, row);
  return map;
}

/** GET /api/lab-external-tests — referrals with their shared amounts joined in. */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessLab(session)) return fail(403, "Your role does not have access to the laboratory.");

  const col = await getCollection("lab_external_tests");
  if (!col) return NextResponse.json({ rows: [] });

  const { searchParams } = new URL(request.url);
  const query = {};

  const status = searchParams.get("status");
  if (status) query.status = status;

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (isIsoDate(from) || isIsoDate(to)) {
    query.sentDate = {};
    if (isIsoDate(from)) query.sentDate.$gte = from;
    if (isIsoDate(to)) query.sentDate.$lte = to;
  }

  const q = String(searchParams.get("q") ?? "").trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    query.$or = [{ patientName: rx }, { uhid: rx }, { requestNo: rx }, { testName: rx }, { externalLab: rx }];
  }

  const limit = Math.min(Number(searchParams.get("limit")) || (searchParams.get("all") ? 500 : 100), 1000);

  try {
    const rows = await col.find(query).sort({ sentDate: -1, requestNo: -1 }).limit(limit).toArray();
    const amounts = await amountIndex();
    return NextResponse.json({
      rows: rows.map((row) => {
        const amount = amounts.get(row.requestNo) || {};
        return {
          ...serializeLab(row),
          quotedAmount: num(amount.quotedAmount),
          approvedAmount: num(amount.approvedAmount),
          billedAmount: num(amount.billedAmount),
          amountStatus: amount.status || (row.requestNo ? "Pending Approval" : ""),
        };
      }),
    });
  } catch {
    return fail(500, "External referrals could not be loaded.");
  }
}

/** POST /api/lab-external-tests — record a referral (and its quoted amount). */
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
  for (const field of ["uhid", "patientName", "testName", "externalLab", "sentDate", "expectedDate", "status", "remarks"]) {
    values[field] = String(body[field] ?? "").trim();
  }

  const errors = {};
  if (!values.uhid) errors.uhid = "UHID is required.";
  if (!values.patientName) errors.patientName = "Patient name is required.";
  if (!values.testName) errors.testName = "Test name is required.";
  if (!values.externalLab) errors.externalLab = "External organization is required.";
  if (!values.sentDate) errors.sentDate = "Sent date is required.";
  else if (!isIsoDate(values.sentDate)) errors.sentDate = "Enter a valid date.";
  if (values.expectedDate && !isIsoDate(values.expectedDate)) errors.expectedDate = "Enter a valid date.";
  if (values.status && !EXTERNAL_STATUSES.includes(values.status)) errors.status = "Choose a valid status.";
  const quotedAmount = num(body.quotedAmount);
  if (body.quotedAmount !== undefined && quotedAmount < 0) errors.quotedAmount = "Enter a valid amount.";
  if (Object.keys(errors).length > 0) return fail(400, "Please correct the highlighted fields.", { fields: errors });

  try {
    const col = await getCollection("lab_external_tests");
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const requestNo = String(body.requestNo ?? "").trim() || (await nextExternalNo());
    const now = new Date().toISOString();
    const document = {
      requestNo,
      uhid: values.uhid,
      patientName: values.patientName,
      testName: values.testName,
      externalLab: values.externalLab,
      sentDate: values.sentDate,
      expectedDate: values.expectedDate,
      remarks: values.remarks,
      status: values.status || "Sent",
      createdAt: now,
      updatedAt: now,
    };
    const result = await col.insertOne(document);

    const amounts = await getCollection("lab_external_amounts");
    if (amounts && quotedAmount > 0) {
      await amounts.insertOne({
        requestNo,
        uhid: values.uhid,
        externalLab: values.externalLab,
        testName: values.testName,
        quotedAmount,
        approvedAmount: 0,
        billedAmount: 0,
        status: "Pending Approval",
        createdAt: now,
        updatedAt: now,
      });
    }

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "lab",
      screen: "Lab Test Sent To External Org",
      record: requestNo,
      summary: `Referred "${values.testName}" for ${values.patientName} to ${values.externalLab}`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, referral: serializeLab({ ...document, _id: result.insertedId }) }, { status: 201 });
  } catch {
    return fail(500, "The referral could not be saved. Please try again.");
  }
}
