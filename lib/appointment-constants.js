/** Pure, client-safe appointment scheduling constants and time helpers. */

export const MODULE_OPD = 101;

export const APPOINTMENT_TYPES = ["OP", "Scan"];

export const GENDERS = ["Male", "Female", "Trans", "Other"];

export const PURPOSES = ["General", "Health Checkup"];

export const APPOINTMENT_STATUSES = [
  "Tentative",
  "Confirmed",
  "Arrived",
  "Scan",
  "Checked-in",
  "Checked-out",
  "Cancelled",
];

/** Statuses that reserve a doctor's slot (everything except Cancelled). */
export const RESERVING_STATUSES = new Set(
  APPOINTMENT_STATUSES.filter((status) => status !== "Cancelled")
);

export const SLOT_AVAILABLE = "Available";
export const SLOT_BLOCKED = "Blocked";

/** Slot states surfaced by the grid, including the derived ones. */
export const SLOT_STATES = [
  SLOT_AVAILABLE,
  SLOT_BLOCKED,
  ...APPOINTMENT_STATUSES,
];

/** Allowed forward transitions for an appointment's lifecycle. */
export const STATUS_FLOW = {
  Tentative: ["Confirmed", "Scan", "Cancelled"],
  Confirmed: ["Arrived", "Scan", "Cancelled"],
  Scan: ["Arrived", "Checked-out", "Cancelled"],
  Arrived: ["Checked-in", "Cancelled"],
  "Checked-in": ["Checked-out", "Cancelled"],
  "Checked-out": [],
  Cancelled: [],
};

export const STATUS_META = {
  Available: { label: "Available", tone: "emerald" },
  Blocked: { label: "Blocked", tone: "rose" },
  Tentative: { label: "Tentative", tone: "amber" },
  Confirmed: { label: "Confirmed", tone: "sky" },
  Arrived: { label: "Arrived", tone: "indigo" },
  Scan: { label: "Scan", tone: "violet" },
  "Checked-in": { label: "Checked-in", tone: "teal" },
  "Checked-out": { label: "Checked-out", tone: "muted" },
  Cancelled: { label: "Cancelled", tone: "rose" },
};

export function nextStatuses(status) {
  return STATUS_FLOW[status] ?? [];
}

export function canTransition(from, to) {
  if (!from) return true;
  if (from === to) return true;
  return nextStatuses(from).includes(to);
}

export function statusMeta(state) {
  return STATUS_META[state] ?? { label: state || "—", tone: "muted" };
}

/**
 * Legacy legend labels mapped onto this project's real slot/status values.
 * "Ready" is the derived Available slot; "Active" has no distinct stored
 * status and is grouped as the in-progress appointments (Arrived/Checked-in).
 */
export const STATUS_LEGEND = [
  { label: "Ready", value: "Available", tone: "emerald", derived: true },
  { label: "Blocked", value: "Blocked", tone: "rose", derived: true },
  { label: "Active", value: "Arrived / Checked-in", tone: "indigo", derived: true },
  { label: "Tentative", value: "Tentative", tone: "amber" },
  { label: "Confirmed", value: "Confirmed", tone: "sky" },
  { label: "Arrived", value: "Arrived", tone: "indigo" },
  { label: "Checked-in", value: "Checked-in", tone: "teal" },
  { label: "Checked-out", value: "Checked-out", tone: "muted" },
  { label: "Scan", value: "Scan", tone: "violet" },
];

export function currentTimeLabel(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value) {
  return TIME_RE.test(String(value ?? ""));
}

export function timeToMinutes(value) {
  const match = String(value ?? "").match(TIME_RE);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(minutes) {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatSlotRange(start, end) {
  return `${start} – ${end}`;
}

/** True when two [start,end) minute ranges intersect. */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/** Generates aligned slot boundaries from a doctor's session config. */
export function generateSlotStarts(schedule) {
  const start = timeToMinutes(schedule?.sessionStart);
  const end = timeToMinutes(schedule?.sessionEnd);
  const step = Number(schedule?.slotMinutes);
  if (start == null || end == null || !Number.isFinite(step) || step < 1 || end <= start) {
    return [];
  }
  const slots = [];
  for (let cursor = start; cursor + step <= end; cursor += step) {
    slots.push({ start: minutesToTime(cursor), end: minutesToTime(cursor + step) });
  }
  return slots;
}
