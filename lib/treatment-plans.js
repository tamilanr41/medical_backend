import { getCollection } from "@/lib/db";

export function serializeSchedule(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: String(_id) };
}

/** Adds `days` to a `YYYY-MM-DD` date, returning a `YYYY-MM-DD` string. */
export function addDays(dateStr, days) {
  const base = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return dateStr;
  base.setUTCDate(base.getUTCDate() + Number(days || 0));
  return base.toISOString().slice(0, 10);
}

/** Next plan number: `PLAN-YYYY-NNNNN` (shared by every session of a plan). */
export async function nextPlanNo() {
  const col = await getCollection("op_treatment_schedules");
  const prefix = `PLAN-${new Date().getFullYear()}-`;
  const docs = await col
    .find({ planNo: { $regex: `^${prefix}` } })
    .sort({ planNo: -1 })
    .limit(1)
    .toArray();
  const match = docs[0]?.planNo?.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

/**
 * Builds the session rows for a treatment plan allocation (legacy
 * `TreatmentPlanActualAllocation`): one row per session, dated `intervalDays`
 * apart starting from `planStartDate`.
 */
export function buildSessions(base, totalSessions) {
  const count = Math.max(1, Number(totalSessions) || 1);
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    rows.push({
      ...base,
      sessionNo: i + 1,
      totalSessions: count,
      planStartDate: addDays(base.planStartDate, i * (Number(base.intervalDays) || 0)),
      status: "Scheduled",
    });
  }
  return rows;
}
