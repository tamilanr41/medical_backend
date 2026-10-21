import { getCollection } from "@/lib/db";
import { canAccessModule } from "@/config/permissions";
import {
  MODULE_OPD,
  RESERVING_STATUSES,
  SLOT_AVAILABLE,
  SLOT_BLOCKED,
  canTransition,
  generateSlotStarts,
  rangesOverlap,
  timeToMinutes,
} from "@/lib/appointment-constants";

export function canSchedule(session) {
  if (!session) return false;
  if (session.role === "SUPER_ADMIN" || session.role === "ADMIN") return true;
  return canAccessModule(session.role, MODULE_OPD);
}

export function serializeAppointment(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: String(_id) };
}

export function serializeBlock(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: String(_id) };
}

export function slotStatusLabel(appointment) {
  if (!appointment) return SLOT_AVAILABLE;
  return appointment.status || SLOT_AVAILABLE;
}

/** Builds the slot grid for one doctor/day, reconciling bookings and blocks. */
export function buildGrid({ schedule, blocks, appointments, type } = {}) {
  const reservations = (appointments ?? []).filter(
    (appt) => appt.slotStart && RESERVING_STATUSES.has(appt.status)
  );
  const activeBlocks = blocks ?? [];

  const slots = [];
  for (const { start, end } of generateSlotStarts(schedule)) {
    const appointment =
      reservations.find((appt) => appt.slotStart === start) ?? null;

    if (type && type !== "All" && appointment && appointment.appointmentType !== type) {
      continue;
    }

    const block =
      activeBlocks.find((range) => {
        const blockStart = timeToMinutes(range.startTime);
        const blockEnd = timeToMinutes(range.endTime);
        const slotStart = timeToMinutes(start);
        const slotEnd = timeToMinutes(end);
        if (blockStart == null || blockEnd == null) return false;
        return rangesOverlap(blockStart, blockEnd, slotStart, slotEnd);
      }) ?? null;

    let status = SLOT_AVAILABLE;
    if (appointment) status = slotStatusLabel(appointment);
    else if (block) status = SLOT_BLOCKED;

    slots.push({
      start,
      end,
      status,
      appointment: serializeAppointment(appointment),
      block: serializeBlock(block),
    });
  }

  return slots;
}

export function findSlot({ schedule, blocks, appointments, slotStart } = {}) {
  return (
    buildGrid({ schedule, blocks, appointments }).find(
      (slot) => slot.start === slotStart
    ) ?? null
  );
}

export async function getActiveSchedule(doctor) {
  const col = await getCollection("op_doctor_schedules");
  if (!col) return null;
  const row = await col.findOne(
    { doctor, status: { $ne: "Inactive" } },
    { sort: { sessionStart: 1 } }
  );
  if (!row) return null;
  return {
    _id: String(row._id),
    doctor: row.doctor,
    department: row.department || "",
    sessionStart: row.sessionStart,
    sessionEnd: row.sessionEnd,
    slotMinutes: Number(row.slotMinutes) || 0,
  };
}

export async function getDayBlocks(doctor, date) {
  const col = await getCollection("op_appointment_blocks");
  if (!col) return [];
  return col.find({ doctor, date }).toArray();
}

export async function getDayAppointments(doctor, date) {
  const col = await getCollection("op_registrations");
  if (!col) return [];
  return col.find({ doctor, visitDate: date }).sort({ slotStart: 1 }).toArray();
}

export async function nextOpNo() {
  const col = await getCollection("op_registrations");
  const year = new Date().getFullYear();
  const prefix = `OP-${year}-`;
  const docs = await col
    .find({ opNo: { $regex: `^${prefix}` } })
    .sort({ opNo: -1 })
    .limit(1)
    .toArray();
  const match = docs[0]?.opNo?.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}

export async function nextTokenNo(doctor, date) {
  const col = await getCollection("op_registrations");
  const count = await col.countDocuments({
    doctor,
    visitDate: date,
    status: { $ne: "Cancelled" },
  });
  return count + 1;
}

export function validateTransition(from, to) {
  if (!canTransition(from, to)) {
    return `An appointment cannot move from "${from}" to "${to}".`;
  }
  return null;
}
