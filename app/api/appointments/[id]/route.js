import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import {
  buildGrid,
  canSchedule,
  getActiveSchedule,
  getDayAppointments,
  getDayBlocks,
  serializeAppointment,
  validateTransition,
} from "@/lib/appointments";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  currentTimeLabel,
  isValidTime,
  minutesToTime,
  timeToMinutes,
} from "@/lib/appointment-constants";

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

function parseId(raw) {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

/**
 * PATCH /api/appointments/[id] — lifecycle actions on a booked slot:
 * status transitions, reschedule (move slot/type) and cancel.
 */
export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canSchedule(session)) {
    return fail(403, "Your role does not have access to appointments.");
  }

  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return fail(400, "Invalid appointment id.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const action = String(body.action ?? "").trim();
  if (!["status", "reschedule", "cancel"].includes(action)) {
    return fail(400, "Unsupported appointment action.");
  }

  try {
    const col = await getCollection("op_registrations");
    const existing = await col.findOne({ _id: objectId });
    if (!existing) return fail(404, "Appointment not found.");

    const set = { updatedAt: new Date().toISOString() };
    let summary = "";

    if (action === "status") {
      const target = String(body.status ?? "").trim();
      if (!APPOINTMENT_STATUSES.includes(target)) {
        return fail(400, "Unknown appointment status.");
      }
      const invalid = validateTransition(existing.status, target);
      if (invalid) return fail(409, invalid);
      set.status = target;
      if ((target === "Arrived" || target === "Checked-in") && !existing.inTime) {
        set.inTime = currentTimeLabel();
      }
      summary = `Moved appointment ${existing.opNo} to ${target}`;
    } else if (action === "cancel") {
      const invalid = validateTransition(existing.status, "Cancelled");
      if (invalid) return fail(409, invalid);
      set.status = "Cancelled";
      summary = `Cancelled appointment ${existing.opNo}`;
    } else {
      const doctor = existing.doctor;
      const date = existing.visitDate;
      const schedule = await getActiveSchedule(doctor);
      if (!schedule) {
        return fail(409, `No active schedule is configured for ${doctor}.`);
      }

      const slotStart = String(body.slotStart ?? existing.slotStart ?? "").trim();
      const appointmentType = String(
        body.appointmentType ?? existing.appointmentType ?? "OP"
      ).trim();

      if (!isValidTime(slotStart)) return fail(400, "Enter a valid slot time.");
      if (!APPOINTMENT_TYPES.includes(appointmentType)) {
        return fail(400, "Choose OP or Scan.");
      }

      const sessionStart = timeToMinutes(schedule.sessionStart);
      const sessionEnd = timeToMinutes(schedule.sessionEnd);
      const step = Number(schedule.slotMinutes);
      const start = timeToMinutes(slotStart);

      if (
        start == null ||
        start < sessionStart ||
        start + step > sessionEnd ||
        (start - sessionStart) % step !== 0
      ) {
        return fail(400, "The chosen slot is outside this doctor's schedule.");
      }

      const [blocks, appointments] = await Promise.all([
        getDayBlocks(doctor, date),
        getDayAppointments(doctor, date),
      ]);
      const others = appointments.filter(
        (appt) => String(appt._id) !== String(objectId)
      );

      const slot = buildGrid({ schedule, blocks, appointments: others }).find(
        (entry) => entry.start === slotStart
      );

      if (!slot) return fail(400, "The chosen slot is outside this doctor's schedule.");
      if (slot.block && !slot.appointment) {
        return fail(409, "This slot is blocked and cannot be booked.");
      }
      if (slot.appointment) return fail(409, "This slot is already booked.");

      set.slotStart = slotStart;
      set.slotEnd = minutesToTime(start + step);
      set.appointmentType = appointmentType;
      summary = `Rescheduled appointment ${existing.opNo} to ${slotStart}`;
    }

    await col.updateOne({ _id: objectId }, { $set: set });
    const updated = await col.findOne({ _id: objectId });

    await logAudit({
      user: session.user.username,
      action: "update",
      module: "opd",
      screen: "Appointment - By Doctor",
      record: existing.opNo,
      summary,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, appointment: serializeAppointment(updated) });
  } catch {
    return fail(500, "The appointment could not be updated. Please try again.");
  }
}
