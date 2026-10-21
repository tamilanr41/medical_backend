import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import { IP_BILLING_MODES, IP_BILLING_STATUSES, IP_BILLING_TYPES } from "@/config/ip-reports";
import { canAccessIpd, isIsoDate, nextBillingRefNo, serializeBilling } from "@/lib/ip";

const DOCUMENT_TYPES = Object.values(IP_BILLING_TYPES).map((entry) => entry.documentType);

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * GET /api/ip-billing-records — the IPD billing ledger (`ip_billing_records`).
 * Filtered by `documentType` so each billing menu item reads its own slice.
 */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessIpd(session)) {
    return fail(403, "Your role does not have access to IP billing data.");
  }

  const col = await getCollection("ip_billing_records");
  if (!col) return NextResponse.json({ rows: [] });

  const { searchParams } = new URL(request.url);
  const query = {};

  const documentType = String(searchParams.get("documentType") ?? "").trim();
  if (documentType) query.documentType = documentType;

  const uhid = searchParams.get("uhid");
  if (uhid) query.uhid = uhid;

  const status = searchParams.get("status");
  if (status) query.status = status;

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
    query.$or = [{ patientName: rx }, { uhid: rx }, { refNo: rx }];
  }

  const limit = Math.min(Number(searchParams.get("limit")) || (searchParams.get("all") ? 500 : 100), 1000);

  try {
    const rows = await col
      .find(query)
      .sort({ date: -1, refNo: -1 })
      .limit(limit)
      .toArray();
    return NextResponse.json({ rows: rows.map(serializeBilling) });
  } catch {
    return fail(500, "Billing records could not be loaded.");
  }
}

/**
 * POST /api/ip-billing-records — capture a billing transaction. The reference
 * number is allocated server-side from the document-type prefix.
 */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessIpd(session)) {
    return fail(403, "Your role does not have access to IP billing data.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const values = {};
  for (const field of ["uhid", "patientName", "documentType", "date"]) {
    values[field] = String(body[field] ?? "").trim();
  }
  values.mode = String(body.mode ?? "").trim();
  values.doctor = String(body.doctor ?? "").trim();
  values.amount = Number(body.amount);

  const errors = {};
  for (const field of ["uhid", "patientName", "documentType", "date"]) {
    if (!values[field]) errors[field] = `${field} is required.`;
  }
  if (values.documentType && !DOCUMENT_TYPES.includes(values.documentType)) {
    errors.documentType = "Choose a valid transaction type.";
  }
  if (values.date && !isIsoDate(values.date)) errors.date = "Enter a valid date.";
  if (!Number.isFinite(values.amount) || values.amount < 0) {
    errors.amount = "Enter a valid amount.";
  }
  if (values.mode && !IP_BILLING_MODES.includes(values.mode)) {
    errors.mode = "Choose a valid payment mode.";
  }
  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  const entry = Object.values(IP_BILLING_TYPES).find((item) => item.documentType === values.documentType) || {};
  const status = IP_BILLING_STATUSES.includes(String(body.status)) ? String(body.status) : entry.status || "Pending";

  try {
    const col = await getCollection("ip_billing_records");
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const refNo = await nextBillingRefNo(entry.prefix || "IPB");
    const now = new Date().toISOString();
    const document = {
      refNo,
      documentType: values.documentType,
      uhid: values.uhid,
      patientName: values.patientName,
      ipNo: String(body.ipNo ?? "").trim(),
      doctor: values.doctor,
      amount: values.amount,
      mode: values.mode,
      date: values.date,
      remarks: String(body.remarks ?? "").trim(),
      status,
      createdAt: now,
      updatedAt: now,
    };

    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "ipd",
      screen: values.documentType,
      record: refNo,
      summary: `${values.documentType} of ${values.amount.toFixed(2)} for ${values.patientName} (${values.uhid})`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      { ok: true, record: serializeBilling({ ...document, _id: result.insertedId }) },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail(409, "This reference number was just taken. Please retry.");
    }
    return fail(500, "The billing record could not be saved. Please try again.");
  }
}
