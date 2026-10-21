import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { canSchedule, getDayAppointments, serializeBlock } from "@/lib/appointments";
import {
  RESERVING_STATUSES,
  isValidTime,
  rangesOverlap,
  timeToMinutes,
} from "@/lib/appointment-constants";

const REQUIRED = ["doctor", "date", "startTime", "endTime"];

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

/** GET /api/appointments/blocks?doctor=&date= — blocked ranges for a day. */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canSchedule(session)) {
    return fail(403, "Your role does not have access to appointments.");
  }

  const { searchParams } = new URL(request.url);
  const doctor = searchParams.get("doctor")?.trim() || "";
  const date = searchParams.get("date")?.trim() || "";
  if (!doctor || !date) {
    return NextResponse.json({ blocks: [] });
  }

  try {
    const col = await getCollection("op_appointment_blocks");
    if (!col) return fail(503, "Scheduling is unavailable. Is MongoDB running?");
    const rows = await col.find({ doctor, date }).sort({ startTime: 1 }).toArray();
    return NextResponse.json({ blocks: rows.map(serializeBlock) });
  } catch {
    return fail(503, "The blocked ranges could not be read. Is MongoDB running?");
  }
}

/** POST /api/appointments/blocks — blocks a time range for a doctor/day. */
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

  const values = {};
  for (const field of REQUIRED) values[field] = String(body[field] ?? "").trim();

  const errors = {};
  for (const field of REQUIRED) {
    if (!values[field]) errors[field] = `${field} is required.`;
  }
  const start = timeToMinutes(values.startTime);
  const end = timeToMinutes(values.endTime);
  if (values.startTime && !isValidTime(values.startTime)) {
    errors.startTime = "Enter a valid start time.";
  }
  if (values.endTime && !isValidTime(values.endTime)) {
    errors.endTime = "Enter a valid end time.";
  }
  if (values.startTime && values.endTime && isValidTime(values.startTime) && isValidTime(values.endTime) && end <= start) {
    errors.endTime = "End time must be after the start time.";
  }
  if (values.date && !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    errors.date = "Enter a valid date.";
  }
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Please correct the highlighted fields.", fields: errors },
      { status: 400 }
    );
  }

  try {
    const dayAppointments = await getDayAppointments(values.doctor, values.date);
    const clash = dayAppointments.find((appt) => {
      if (!appt.slotStart || !RESERVING_STATUSES.has(appt.status)) return false;
      const slotStart = timeToMinutes(appt.slotStart);
      const slotEnd = timeToMinutes(appt.slotEnd);
      if (slotStart == null || slotEnd == null) return false;
      return rangesOverlap(start, end, slotStart, slotEnd);
    });
    if (clash) {
      return fail(409, `A booked appointment (${clash.opNo}) overlaps this range.`);
    }

    const col = await getCollection("op_appointment_blocks");
    const now = new Date().toISOString();
    const document = {
      doctor: values.doctor,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      reason: String(body.reason ?? "").trim(),
      createdBy: session.user.username,
      createdAt: now,
      updatedAt: now,
    };
    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "opd",
      screen: "Appointment - By Doctor",
      record: `${values.doctor} ${values.date} ${values.startTime}-${values.endTime}`,
      summary: `Blocked ${values.startTime}–${values.endTime} for ${values.doctor}`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      { ok: true, block: serializeBlock({ ...document, _id: result.insertedId }) },
      { status: 201 }
    );
  } catch {
    return fail(500, "The range could not be blocked. Please try again.");
  }
}
