import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { canAccessIpd, isIsoDate, serializeAdmission } from "@/lib/ip";

const STATUSES = ["Admitted", "Discharged", "Transferred"];
const WARDS = ["General Ward", "ICU", "HDU", "Maternity", "Pediatric", "Private"];

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

function parseId(raw) {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

/**
 * PATCH /api/ip-admissions/[id] — discharge, transfer or reassign a bed on an
 * existing admission. Only the mutable fields are honoured; the IP number and
 * patient identity are immutable.
 */
export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessIpd(session)) {
    return fail(403, "Your role does not have access to IP admission data.");
  }

  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return fail(400, "Invalid admission id.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const set = {};
  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!STATUSES.includes(status)) return fail(400, "Choose a valid status.");
    set.status = status;
  }
  if (body.ward !== undefined) {
    const ward = String(body.ward).trim();
    if (!WARDS.includes(ward)) return fail(400, "Choose a valid ward.");
    set.ward = ward;
  }
  if (body.room !== undefined) set.room = String(body.room).trim();
  if (body.bed !== undefined) set.bed = String(body.bed).trim();
  if (body.doctor !== undefined) set.doctor = String(body.doctor).trim();
  if (body.remarks !== undefined) set.remarks = String(body.remarks).trim();
  if (body.dischargeDate !== undefined) {
    const date = String(body.dischargeDate).trim();
    if (date && !isIsoDate(date)) return fail(400, "Enter a valid discharge date.");
    set.dischargeDate = date;
  }

  const statusChanged = set.status !== undefined;
  if (statusChanged && set.status === "Discharged" && set.dischargeDate === undefined) {
    set.dischargeDate = new Date().toISOString().slice(0, 10);
  }
  if (statusChanged && set.status === "Admitted") {
    set.dischargeDate = "";
  }

  if (Object.keys(set).length === 0) {
    return fail(400, "Nothing to update.");
  }
  set.updatedAt = new Date().toISOString();

  try {
    const col = await getCollection("admissions");
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const existing = await col.findOne({ _id: objectId });
    if (!existing) return fail(404, "Admission not found.");

    await col.updateOne({ _id: objectId }, { $set: set });

    await logAudit({
      user: session.user.username,
      action: "update",
      module: "ipd",
      screen: "Admission Register",
      record: existing.ipNo,
      summary: `Updated admission ${existing.ipNo} (${existing.patientName})${
        set.status ? ` → ${set.status}` : ""
      }`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, admission: serializeAdmission({ ...existing, ...set }) });
  } catch {
    return fail(500, "The admission could not be updated. Please try again.");
  }
}
