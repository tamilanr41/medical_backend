import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import { LAB_RESULT_STATUSES, canAccessLab, isIsoDate, nextLabResultNo, serializeLab } from "@/lib/lab";

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * GET /api/lab-results — the result register (`lab_results`). Feeds the
 * dashboard "pending reports" KPI and the approval / dispatch queues.
 */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessLab(session)) return fail(403, "Your role does not have access to the laboratory.");

  const col = await getCollection("lab_results");
  if (!col) return NextResponse.json({ rows: [] });

  const { searchParams } = new URL(request.url);
  const query = {};

  const status = searchParams.get("status");
  if (status) query.status = status;

  const uhid = searchParams.get("uhid");
  if (uhid) query.uhid = uhid;

  const checkinNo = searchParams.get("checkinNo");
  if (checkinNo) query.checkinNo = checkinNo;

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (isIsoDate(from) || isIsoDate(to)) {
    query.resultDate = {};
    if (isIsoDate(from)) query.resultDate.$gte = from;
    if (isIsoDate(to)) query.resultDate.$lte = to;
  }

  const q = String(searchParams.get("q") ?? "").trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    query.$or = [{ patientName: rx }, { uhid: rx }, { testName: rx }, { resultNo: rx }];
  }

  const limit = Math.min(Number(searchParams.get("limit")) || (searchParams.get("all") ? 500 : 100), 1000);

  try {
    const rows = await col.find(query).sort({ resultDate: -1, resultNo: -1 }).limit(limit).toArray();
    return NextResponse.json({ rows: rows.map(serializeLab) });
  } catch {
    return fail(500, "Lab results could not be loaded.");
  }
}

/** POST /api/lab-results — capture one or more result lines for a patient. */
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

  const uhid = String(body.uhid ?? "").trim();
  const patientName = String(body.patientName ?? "").trim();
  const checkinNo = String(body.checkinNo ?? "").trim();
  const resultDate = String(body.resultDate ?? "").trim();
  const pathologist = String(body.pathologist ?? "").trim();
  const lines = Array.isArray(body.results) ? body.results : [body];

  const errors = {};
  if (!uhid) errors.uhid = "UHID is required.";
  if (!patientName) errors.patientName = "Patient name is required.";
  if (!resultDate) errors.resultDate = "Result date is required.";
  else if (!isIsoDate(resultDate)) errors.resultDate = "Enter a valid date.";

  const cleaned = [];
  for (const line of lines) {
    const testName = String(line?.testName ?? "").trim();
    if (!testName) {
      errors.tests = "Every result needs a test.";
      break;
    }
    cleaned.push({
      testName,
      value: String(line?.result ?? "").trim(),
      unit: String(line?.unit ?? "").trim(),
      normalRange: String(line?.normalRange ?? "").trim(),
    });
  }
  if (cleaned.length === 0) errors.tests = "Add at least one result.";
  if (Object.keys(errors).length > 0) return fail(400, "Please correct the highlighted fields.", { fields: errors });

  try {
    const col = await getCollection("lab_results");
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const status = LAB_RESULT_STATUSES.includes(String(body.status)) ? String(body.status) : "Pending";
    const now = new Date().toISOString();
    const docs = [];
    for (const line of cleaned) {
      const resultNo = await nextLabResultNo();
      docs.push({
        resultNo,
        checkinNo,
        uhid,
        patientName,
        testName: line.testName,
        result: line.value,
        unit: line.unit,
        normalRange: line.normalRange,
        resultDate,
        pathologist,
        status,
        createdAt: now,
        updatedAt: now,
      });
    }

    const inserted = await col.insertMany(docs);
    const saved = docs.map((doc, index) => serializeLab({ ...doc, _id: inserted.insertedIds[index] }));

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "lab",
      screen: "Lab Result Entry",
      record: checkinNo || docs[0].resultNo,
      summary: `Recorded ${docs.length} result${docs.length === 1 ? "" : "s"} for ${patientName} (${uhid})`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, rows: saved, count: saved.length }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return fail(409, "A result number was just taken. Please retry.");
    return fail(500, "The lab results could not be saved. Please try again.");
  }
}
