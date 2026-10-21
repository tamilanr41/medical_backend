import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { canAccessIpd, isIsoDate, serializeClinical } from "@/lib/ip";

const SOURCES = new Set(["case_sheets", "ip_clinical_records"]);
const STATUSES = ["Open", "Closed"];

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

function parseId(raw) {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

/** PATCH /api/ip-clinical-records/[id] — edit notes / status / diagnosis. */
export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessIpd(session)) {
    return fail(403, "Your role does not have access to IP clinical data.");
  }

  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return fail(400, "Invalid record id.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const source = String(body.source ?? "").trim();
  if (!SOURCES.has(source)) return fail(400, "Unknown clinical record source.");

  const set = {};
  if (body.notes !== undefined) set.notes = String(body.notes).trim();
  if (body.doctor !== undefined) set.doctor = String(body.doctor).trim();
  if (body.ward !== undefined) set.ward = String(body.ward).trim();
  if (body.department !== undefined) set.department = String(body.department).trim();
  if (body.diagnosis !== undefined) set.diagnosis = String(body.diagnosis).trim();
  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!STATUSES.includes(status)) return fail(400, "Choose a valid status.");
    set.status = status;
  }
  if (body.date !== undefined) {
    const date = String(body.date).trim();
    if (!isIsoDate(date)) return fail(400, "Enter a valid date.");
    set.date = date;
  }

  if (Object.keys(set).length === 0) return fail(400, "Nothing to update.");
  set.updatedAt = new Date().toISOString();

  try {
    const col = await getCollection(source);
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const existing = await col.findOne({ _id: objectId });
    if (!existing) return fail(404, "Clinical record not found.");

    await col.updateOne({ _id: objectId }, { $set: set });

    await logAudit({
      user: session.user.username,
      action: "update",
      module: "ipd",
      screen: existing.recordType || "IP Clinical Record",
      record: existing.refNo || existing.caseSheetNo || "-",
      summary: `Updated ${existing.recordType || "clinical record"} for ${existing.patientName}`,
      ip: requestIp(request),
    });

    return NextResponse.json({
      ok: true,
      record: serializeClinical({ ...existing, ...set }, source),
    });
  } catch {
    return fail(500, "The clinical record could not be updated. Please try again.");
  }
}
