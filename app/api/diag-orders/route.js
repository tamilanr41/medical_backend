import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import {
  canAccessDiag,
  DIAG_MODES,
  DIAG_ORDER_STATUSES,
  DIAG_PRIORITIES,
  isIsoDate,
  nextDiagNo,
  normaliseDiagTests,
  serializeDiag,
} from "@/lib/diag";

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");

  const { searchParams } = new URL(request.url);
  const slug = String(searchParams.get("module") || "xray");
  if (!canAccessDiag(session, slug)) return fail(403, "Access denied to this diagnostic module.");

  const col = await getCollection("diag_checkins");
  if (!col) return NextResponse.json({ rows: [] });

  const query = { module: slug };

  const status = searchParams.get("status");
  if (status) query.status = status;

  const priority = searchParams.get("priority");
  if (priority) query.priority = priority;

  const uhid = searchParams.get("uhid");
  if (uhid) query.uhid = uhid;

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (isIsoDate(from) || isIsoDate(to)) {
    query.receivedAt = {};
    if (isIsoDate(from)) query.receivedAt.$gte = from;
    if (isIsoDate(to)) query.receivedAt.$lte = to;
  }

  const q = String(searchParams.get("q") ?? "").trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    query.$or = [{ patientName: rx }, { uhid: rx }, { checkinNo: rx }, { doctor: rx }];
  }

  const limit = Math.min(Number(searchParams.get("limit")) || (searchParams.get("all") ? 500 : 100), 1000);

  try {
    const rows = await col.find(query).sort({ receivedAt: -1, checkinNo: -1 }).limit(limit).toArray();
    return NextResponse.json({ rows: rows.map(serializeDiag) });
  } catch {
    return fail(500, "Diagnostic orders could not be loaded.");
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const slug = String(body.module || "xray");
  if (!canAccessDiag(session, slug)) return fail(403, "Access denied to this diagnostic module.");

  const values = {};
  for (const field of ["uhid", "patientName", "doctor", "receivedAt", "priority", "paymentMode", "sponsor", "sampleType"]) {
    values[field] = String(body[field] ?? "").trim();
  }
  const tests = normaliseDiagTests(body.tests);

  const errors = {};
  if (!values.uhid) errors.uhid = "UHID is required.";
  if (!values.patientName) errors.patientName = "Patient name is required.";
  if (!values.receivedAt) errors.receivedAt = "Received date is required.";
  else if (!isIsoDate(values.receivedAt)) errors.receivedAt = "Enter a valid date.";
  if (values.priority && !DIAG_PRIORITIES.includes(values.priority)) errors.priority = "Choose a valid priority.";
  if (values.paymentMode && !DIAG_MODES.includes(values.paymentMode)) errors.paymentMode = "Choose a valid mode.";
  if (tests.length === 0) errors.tests = "Add at least one test.";
  if (Object.keys(errors).length > 0) return fail(400, "Please correct the highlighted fields.", { fields: errors });

  const netAmount = body.netAmount === undefined ? tests.reduce((sum, line) => sum + num(line.rate), 0) : num(body.netAmount);
  const status = DIAG_ORDER_STATUSES.includes(String(body.status)) ? String(body.status) : "Received";

  try {
    const col = await getCollection("diag_checkins");
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const checkinNo = await nextDiagNo(slug);
    const now = new Date().toISOString();
    const document = {
      module: slug,
      checkinNo,
      uhid: values.uhid,
      patientName: values.patientName,
      doctor: values.doctor,
      age: String(body.age ?? "").trim(),
      gender: String(body.gender ?? "").trim(),
      receivedAt: values.receivedAt,
      priority: values.priority || "Routine",
      tests,
      sampleType: values.sampleType,
      barcode: String(body.barcode ?? "").trim(),
      collectedBy: "",
      collectedAt: "",
      netAmount,
      paidAmount: num(body.paidAmount),
      paymentMode: values.paymentMode,
      sponsor: values.sponsor,
      status,
      createdAt: now,
      updatedAt: now,
    };

    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: slug,
      screen: "Diagnostic Order",
      record: checkinNo,
      summary: `Raised ${slug} order ${checkinNo} for ${values.patientName} (${tests.length} test${tests.length === 1 ? "" : "s"})`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, order: serializeDiag({ ...document, _id: result.insertedId }) }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return fail(409, "This order number was just taken. Please retry.");
    return fail(500, "The diagnostic order could not be saved. Please try again.");
  }
}
