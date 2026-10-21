import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { LAB_RESULT_STATUSES, canAccessLab, isIsoDate, serializeLab } from "@/lib/lab";

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

function parseId(raw) {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

/** PATCH /api/lab-results/[id] — edit a result, approve it (Final) or dispatch it. */
export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessLab(session)) return fail(403, "Your role does not have access to the laboratory.");

  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return fail(400, "Invalid result id.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const set = {};
  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!LAB_RESULT_STATUSES.includes(status)) return fail(400, "Choose a valid status.");
    set.status = status;
  }
  if (body.result !== undefined) set.result = String(body.result).trim();
  if (body.unit !== undefined) set.unit = String(body.unit).trim();
  if (body.normalRange !== undefined) set.normalRange = String(body.normalRange).trim();
  if (body.pathologist !== undefined) set.pathologist = String(body.pathologist).trim();
  if (body.resultDate !== undefined) {
    const date = String(body.resultDate).trim();
    if (!isIsoDate(date)) return fail(400, "Enter a valid date.");
    set.resultDate = date;
  }

  if (Object.keys(set).length === 0) return fail(400, "Nothing to update.");
  set.updatedAt = new Date().toISOString();

  try {
    const col = await getCollection("lab_results");
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const existing = await col.findOne({ _id: objectId });
    if (!existing) return fail(404, "Lab result not found.");

    await col.updateOne({ _id: objectId }, { $set: set });

    await logAudit({
      user: session.user.username,
      action: "update",
      module: "lab",
      screen: "Lab Result",
      record: existing.resultNo || "-",
      summary: `${set.status ? `${set.status} ` : ""}result ${existing.resultNo || ""} · ${existing.testName} for ${existing.patientName}`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, result: serializeLab({ ...existing, ...set }) });
  } catch {
    return fail(500, "The result could not be updated. Please try again.");
  }
}
