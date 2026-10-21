import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import {
  buildGrid,
  canSchedule,
  getActiveSchedule,
  getDayAppointments,
  getDayBlocks,
  nextOpNo,
  nextTokenNo,
  serializeAppointment,
} from "@/lib/appointments";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  GENDERS,
  PURPOSES,
  isValidTime,
  minutesToTime,
  timeToMinutes,
} from "@/lib/appointment-constants";

const REQUIRED = ["uhid", "patientName", "age", "doctor", "date", "slotStart"];

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * POST /api/appointments — books a slot from the Appointment - By Doctor
 * grid into `op_registrations`. The grid already knows the doctor, day and
 * slot, so the slot is validated against the live schedule, existing
 * bookings and blocked ranges before the OP number and token are allocated.
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

  const values = {};
  for (const field of REQUIRED) values[field] = String(body[field] ?? "").trim();

  const errors = {};
  for (const field of REQUIRED) {
    if (!values[field]) errors[field] = `${field} is required.`;
  }
  if (values.date && !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    errors.date = "Enter a valid appointment date.";
  }
  if (values.slotStart && !isValidTime(values.slotStart)) {
    errors.slotStart = "Enter a valid slot time.";
  }
  const age = Number(values.age);
  if (values.age && (!Number.isFinite(age) || age < 0 || age > 130)) {
    errors.age = "Enter a valid age.";
  }
  const gender = String(body.gender ?? "").trim() || "Male";
  if (!GENDERS.includes(gender)) errors.gender = "Choose a valid sex.";

  const appointmentType = String(body.appointmentType ?? "").trim() || "OP";
  if (!APPOINTMENT_TYPES.includes(appointmentType)) {
    errors.appointmentType = "Choose OP or Scan.";
  }
  const purpose = String(body.purpose ?? "").trim() || "General";
  if (!PURPOSES.includes(purpose)) {
    errors.purpose = "Choose General or Health Checkup.";
  }
  const status = String(body.status ?? "").trim() || "Tentative";
  if (!APPOINTMENT_STATUSES.includes(status)) {
    errors.status = "Choose a valid appointment status.";
  }

  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  try {
    const schedule = await getActiveSchedule(values.doctor);
    if (!schedule) {
      return fail(409, `No active schedule is configured for ${values.doctor}.`);
    }

    const sessionStart = timeToMinutes(schedule.sessionStart);
    const sessionEnd = timeToMinutes(schedule.sessionEnd);
    const step = Number(schedule.slotMinutes);
    const start = timeToMinutes(values.slotStart);

    if (
      start == null ||
      start < sessionStart ||
      start + step > sessionEnd ||
      (start - sessionStart) % step !== 0
    ) {
      return fail(400, "The chosen slot is outside this doctor's schedule.");
    }

    const [blocks, appointments] = await Promise.all([
      getDayBlocks(values.doctor, values.date),
      getDayAppointments(values.doctor, values.date),
    ]);

    const slot = buildGrid({ schedule, blocks, appointments }).find(
      (entry) => entry.start === values.slotStart
    );

    if (!slot) {
      return fail(400, "The chosen slot is outside this doctor's schedule.");
    }
    if (slot.block && !slot.appointment) {
      return fail(409, "This slot is blocked and cannot be booked.");
    }
    if (slot.appointment) {
      return fail(409, "This slot is already booked.");
    }

    const opNo = await nextOpNo();
    const tokenNo =
      Number(body.tokenNo) > 0
        ? Number(body.tokenNo)
        : await nextTokenNo(values.doctor, values.date);
    const now = new Date().toISOString();

    const document = {
      opNo,
      uhid: values.uhid,
      patientName: values.patientName,
      gender,
      age,
      mobile: String(body.mobile ?? "").trim(),
      address: String(body.address ?? "").trim(),
      department: String(body.department ?? "").trim() || schedule.department || "",
      doctor: values.doctor,
      visitDate: values.date,
      tokenNo,
      slotStart: values.slotStart,
      slotEnd: minutesToTime(start + step),
      appointmentType,
      purpose,
      referredBy: String(body.referredBy ?? "").trim(),
      college: String(body.college ?? "").trim(),
      paymentMode: String(body.paymentMode ?? "").trim(),
      consultationFee: Number(body.consultationFee) || 0,
      remarks: String(body.remarks ?? "").trim(),
      inTime: "",
      status,
      createdAt: now,
      updatedAt: now,
    };

    const col = await getCollection("op_registrations");
    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "opd",
      screen: "Appointment - By Doctor",
      record: opNo,
      summary: `Booked ${values.slotStart} for ${values.patientName} (${values.uhid}) with ${values.doctor}`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      {
        ok: true,
        appointment: serializeAppointment({ ...document, _id: result.insertedId }),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail(409, "This slot was just booked. Please pick another slot.");
    }
    return fail(500, "The appointment could not be booked. Please try again.");
  }
}
