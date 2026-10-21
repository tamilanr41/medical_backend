import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { canSchedule, nextOpNo, nextTokenNo, serializeAppointment } from "@/lib/appointments";
import {
  APPOINTMENT_TYPES,
  GENDERS,
  PURPOSES,
  currentTimeLabel,
} from "@/lib/appointment-constants";

const REQUIRED = [
  "uhid",
  "patientName",
  "gender",
  "age",
  "department",
  "doctor",
  "visitDate",
];

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * POST /api/op-registrations — walk-in OP registration into
 * `op_registrations`. Unlike /api/appointments this needs no slot grid: the
 * desk captures the visit, the OP number and token are allocated server-side.
 */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canSchedule(session)) {
    return fail(403, "Your role does not have access to OP registration.");
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
  if (values.visitDate && !/^\d{4}-\d{2}-\d{2}$/.test(values.visitDate)) {
    errors.visitDate = "Enter a valid visit date.";
  }
  if (values.gender && !GENDERS.includes(values.gender)) {
    errors.gender = "Choose a valid sex.";
  }
  const age = Number(values.age);
  if (values.age && (!Number.isFinite(age) || age < 0 || age > 130)) {
    errors.age = "Enter a valid age.";
  }

  const appointmentType = String(body.appointmentType ?? "").trim() || "OP";
  if (!APPOINTMENT_TYPES.includes(appointmentType)) {
    errors.appointmentType = "Choose OP or Scan.";
  }
  const purpose = String(body.purpose ?? "").trim() || "General";
  if (!PURPOSES.includes(purpose)) {
    errors.purpose = "Choose General or Health Checkup.";
  }

  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  try {
    const opNo = await nextOpNo();
    const tokenNo = Number(body.tokenNo) > 0
      ? Number(body.tokenNo)
      : await nextTokenNo(values.doctor, values.visitDate);
    const now = new Date().toISOString();

    const document = {
      opNo,
      uhid: values.uhid,
      patientName: values.patientName,
      gender: values.gender,
      age,
      mobile: String(body.mobile ?? "").trim(),
      address: String(body.address ?? "").trim(),
      department: values.department,
      doctor: values.doctor,
      visitDate: values.visitDate,
      tokenNo,
      slotStart: "",
      slotEnd: "",
      appointmentType,
      purpose,
      referredBy: String(body.referredBy ?? "").trim(),
      college: String(body.college ?? "").trim(),
      paymentMode: String(body.paymentMode ?? "").trim(),
      consultationFee: Number(body.consultationFee) || 0,
      remarks: String(body.remarks ?? "").trim(),
      inTime: currentTimeLabel(),
      status: "Arrived",
      createdAt: now,
      updatedAt: now,
    };

    const col = await getCollection("op_registrations");
    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "opd",
      screen: "OP Register",
      record: opNo,
      summary: `OP registration for ${values.patientName} (${values.uhid}) with ${values.doctor}, token ${tokenNo}`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      {
        ok: true,
        registration: serializeAppointment({ ...document, _id: result.insertedId }),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail(409, "This OP number was just taken. Please retry.");
    }
    return fail(500, "The OP registration could not be saved. Please try again.");
  }
}
