import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { canSchedule } from "@/lib/appointments";

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * POST /api/appointments/postpone — bulk reschedule (legacy
 * `AppointmentListMassUpdation.jsp`): moves selected appointments to a new
 * date, keeping each one's slot time unless a new slot is supplied.
 */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canSchedule(session)) {
    return fail(403, "Your role does not have access to appointments.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => ObjectId.isValid(id)) : [];
  const newDate = String(body.newDate ?? "").trim();
  const slotStart = String(body.slotStart ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  const doctor = String(body.doctor ?? "").trim();

  const errors = {};
  if (ids.length === 0) errors.ids = "Select at least one appointment.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) errors.newDate = "Choose the new date.";
  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  try {
    const col = await getCollection("op_registrations");
    const objectIds = ids.map((id) => new ObjectId(id));
    const existing = await col.find({ _id: { $in: objectIds } }).toArray();

    const now = new Date().toISOString();
    const set = {
      visitDate: newDate,
      status: "Confirmed",
      updatedAt: now,
    };
    if (slotStart) set.slotStart = slotStart;
    if (doctor) set.doctor = doctor;
    if (reason) set.remarks = reason;

    await col.updateMany({ _id: { $in: objectIds } }, { $set: set });

    await logAudit({
      user: session.user.username,
      action: "update",
      module: "opd",
      screen: "Postpone Appointment",
      record: `${existing.length} appointment(s)`,
      summary: `Postponed ${existing.length} appointment(s) to ${newDate}${reason ? ` — ${reason}` : ""}`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, count: existing.length, newDate });
  } catch {
    return fail(500, "The appointments could not be postponed. Please try again.");
  }
}
