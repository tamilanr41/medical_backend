import { getCollection } from "@/lib/db";

export function serializeDocument(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: String(_id) };
}

/** Next sequential `PREFIX-YYYY-NNNNN` value for a collection/field. */
async function nextSequential(collection, field, prefix) {
  const col = await getCollection(collection);
  const docs = await col
    .find({ [field]: { $regex: `^${prefix}` } })
    .sort({ [field]: -1 })
    .limit(1)
    .toArray();
  const match = docs[0]?.[field]?.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

/** Next certificate number: `CERT-YYYY-NNNNN`. */
export async function nextCertificateNo() {
  return nextSequential("op_certificates", "certificateNo", `CERT-${new Date().getFullYear()}-`);
}

/** Next referral number: `REF-YYYY-NNNNN`. */
export async function nextReferralNo() {
  return nextSequential("op_referrals", "referralNo", `REF-${new Date().getFullYear()}-`);
}
