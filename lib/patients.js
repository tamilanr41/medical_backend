import { getCollection } from "@/lib/db";

/** Strips the Mongo `_id` into a stable string id. */
export function serializePatient(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: String(_id) };
}

/**
 * Next UHID in the `UH-{year}-{seq}` series (legacy `Patient.CODE`), scanned
 * from the highest existing value in the `patients` collection.
 */
export async function nextUhid() {
  const col = await getCollection("patients");
  const year = new Date().getFullYear();
  const prefix = `UH-${year}-`;
  const docs = await col
    .find({ uhid: { $regex: `^${prefix}` } })
    .sort({ uhid: -1 })
    .limit(1)
    .toArray();
  const match = docs[0]?.uhid?.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 1000) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

/**
 * Duplicate detection mirroring the legacy check: a patient is a likely
 * duplicate when the mobile number or ID proof already exist.
 */
export async function findPatientDuplicates({ mobile, idProof } = {}) {
  const col = await getCollection("patients");
  if (!col) return [];
  const or = [];
  if (mobile) or.push({ mobile: String(mobile).trim() });
  if (idProof) or.push({ idProof: String(idProof).trim() });
  if (or.length === 0) return [];
  const rows = await col.find({ $or: or }).limit(5).toArray();
  return rows.map(serializePatient);
}
