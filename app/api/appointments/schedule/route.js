import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCollection } from "@/lib/db";
import {
  buildGrid,
  canSchedule,
  getActiveSchedule,
  getDayAppointments,
  getDayBlocks,
  serializeAppointment,
} from "@/lib/appointments";

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

function emptyCounts() {
  return { total: 0, available: 0, booked: 0, blocked: 0 };
}

/**
 * GET /api/appointments/schedule?doctor=&date=&type=
 * Returns the doctor directory plus the real slot grid for a doctor/day,
 * reconciled against stored bookings and blocked ranges.
 */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canSchedule(session)) {
    return fail(403, "Your role does not have access to appointments.");
  }

  const { searchParams } = new URL(request.url);
  const doctor = searchParams.get("doctor")?.trim() || "";
  const date = searchParams.get("date")?.trim() || "";
  const type = searchParams.get("type")?.trim() || "All";
  const department = searchParams.get("department")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "All";

  try {
    const scheduleCol = await getCollection("op_doctor_schedules");
    if (!scheduleCol) {
      return fail(503, "Scheduling is unavailable. Is MongoDB running?");
    }
    const regCol = await getCollection("op_registrations");

    const schedules = await scheduleCol
      .find({ status: { $ne: "Inactive" } })
      .sort({ doctor: 1 })
      .toArray();
    const registered = regCol
      ? await regCol.distinct("doctor", { doctor: { $ne: "" } })
      : [];
    const registeredDepartments = regCol
      ? await regCol.distinct("department", { department: { $ne: "" } })
      : [];

    const directory = new Map();
    for (const row of schedules) {
      directory.set(row.doctor, {
        id: String(row._id),
        name: row.doctor,
        department: row.department || "",
        hasSchedule: true,
      });
    }
    for (const name of registered) {
      if (name && !directory.has(name)) {
        directory.set(name, { id: "", name, department: "", hasSchedule: false });
      }
    }
    let doctors = [...directory.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    if (department) doctors = doctors.filter((entry) => entry.department === department);

    const departments = [
      ...new Set(
        [...schedules.map((row) => row.department), ...registeredDepartments].filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));

    if (!doctor || !date) {
      return NextResponse.json({
        doctors,
        departments,
        doctor: doctor || null,
        date: date || null,
        type,
        department,
        status,
        hasSchedule: false,
        schedule: null,
        slots: [],
        appointments: [],
        counts: emptyCounts(),
      });
    }

    const schedule = await getActiveSchedule(doctor);
    const [blocks, dayAppointments] = await Promise.all([
      getDayBlocks(doctor, date),
      getDayAppointments(doctor, date),
    ]);

    const slots = schedule
      ? buildGrid({ schedule, blocks, appointments: dayAppointments, type })
      : [];

    const appointments = dayAppointments.filter((row) => {
      if (status && status !== "All" && row.status !== status) return false;
      if (department && row.department && row.department !== department) return false;
      return true;
    });

    const counts = {
      total: slots.length,
      available: slots.filter((slot) => slot.status === "Available").length,
      booked: slots.filter((slot) => slot.appointment).length,
      blocked: slots.filter((slot) => slot.status === "Blocked").length,
    };

    return NextResponse.json({
      doctors,
      departments,
      doctor,
      date,
      type,
      department,
      status,
      hasSchedule: Boolean(schedule),
      schedule,
      slots,
      appointments: appointments.map(serializeAppointment),
      counts,
    });
  } catch {
    return fail(503, "The schedule could not be read. Is MongoDB running?");
  }
}
