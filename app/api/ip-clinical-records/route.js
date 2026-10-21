import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import {
  IP_CLINICAL_TYPES,
  canAccessIpd,
  clinicalCollection,
  clinicalRefField,
  isIsoDate,
  nextClinicalRefNo,
  serializeClinical,
} from "@/lib/ip";

const RECORD_TYPES = Object.values(IP_CLINICAL_TYPES);
const STATUSES = ["Open", "Closed"];

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * GET /api/ip-clinical-records — list clinical records for a record type.
 * Case Sheets are read from `case_sheets`; everything else from
 * `ip_clinical_records` (see lib/ip.js for the split rationale).
 */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessIpd(session)) {
    return fail(403, "Your role does not have access to IP clinical data.");
  }

  const { searchParams } = new URL(request.url);
  const recordType = String(searchParams.get("recordType") ?? "").trim();
  const collection = clinicalCollection(recordType);
  const refField = clinicalRefField(collection);

  const col = await getCollection(collection);
  if (!col) return NextResponse.json({ rows: [] });

  const query = {};
  if (recordType) query.recordType = recordType;

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
    query.$or = [{ patientName: rx }, { uhid: rx }, { [refField]: rx }];
  }

  const limit = Math.min(Number(searchParams.get("limit")) || (searchParams.get("all") ? 500 : 100), 1000);

  try {
    const rows = await col
      .find(query)
      .sort({ date: -1, [refField]: -1 })
      .limit(limit)
      .toArray();
    return NextResponse.json({ rows: rows.map((row) => serializeClinical(row, collection)) });
  } catch {
    return fail(500, "Clinical records could not be loaded.");
  }
}

/**
 * POST /api/ip-clinical-records — capture a clinical record. The reference
 * number is allocated server-side; Case Sheets route to `case_sheets` so the
 * case-sheet report reflects them.
 */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessIpd(session)) {
    return fail(403, "Your role does not have access to IP clinical data.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const values = {};
  for (const field of ["uhid", "patientName", "recordType", "date"]) {
    values[field] = String(body[field] ?? "").trim();
  }
  values.doctor = String(body.doctor ?? "").trim();

  const errors = {};
  for (const field of ["uhid", "patientName", "recordType", "date"]) {
    if (!values[field]) errors[field] = `${field} is required.`;
  }
  if (values.recordType && !RECORD_TYPES.includes(values.recordType)) {
    errors.recordType = "Choose a valid record type.";
  }
  if (values.date && !isIsoDate(values.date)) {
    errors.date = "Enter a valid date.";
  }
  if (values.recordType === "Case Sheet" && !values.doctor) {
    errors.doctor = "Doctor is required.";
  }
  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  try {
    const collection = clinicalCollection(values.recordType);
    const refField = clinicalRefField(collection);
    const col = await getCollection(collection);
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const refNo = await nextClinicalRefNo(values.recordType);
    const now = new Date().toISOString();
    const status = STATUSES.includes(String(body.status)) ? String(body.status) : "Open";
    const document = {
      [refField]: refNo,
      uhid: values.uhid,
      patientName: values.patientName,
      doctor: values.doctor,
      ward: String(body.ward ?? "").trim(),
      recordType: values.recordType,
      date: values.date,
      notes: String(body.notes ?? "").trim(),
      status,
      createdAt: now,
      updatedAt: now,
    };
    if (collection === "case_sheets") {
      document.department = String(body.department ?? "").trim();
      document.diagnosis = String(body.diagnosis ?? "").trim();
    }

    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "ipd",
      screen: values.recordType,
      record: refNo,
      summary: `Recorded ${values.recordType} for ${values.patientName} (${values.uhid})`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      { ok: true, record: serializeClinical({ ...document, _id: result.insertedId }, collection) },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail(409, "This reference number was just taken. Please retry.");
    }
    return fail(500, "The clinical record could not be saved. Please try again.");
  }
}
