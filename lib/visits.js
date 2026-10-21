import { getCollection } from "@/lib/db";

export function serializeVisit(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: String(_id) };
}

/** Next sequential Rx number: `RX-YYYY-NNNNN`. */
export async function nextRxNo() {
  const col = await getCollection("prescriptions");
  const year = new Date().getFullYear();
  const prefix = `RX-${year}-`;
  const docs = await col
    .find({ rxNo: { $regex: `^${prefix}` } })
    .sort({ rxNo: -1 })
    .limit(1)
    .toArray();
  const match = docs[0]?.rxNo?.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

/** Builds the plain-text medicine summary (mirrors the legacy Rx format). */
export function summarizeMedicines(items = []) {
  return items
    .map((item) => {
      const name = item.medicineName || item.code || "Medicine";
      const cadence = [item.dose, item.frequency].filter(Boolean).join(" ");
      const duration = Number(item.duration) > 0 ? `x ${Number(item.duration)} days` : "";
      let line = `${name} - ${[cadence, duration].filter(Boolean).join(" ")}`;
      if (item.timing && item.timing !== "Any time") line += ` (${item.timing})`;
      if (item.instructions) line += ` | ${item.instructions}`;
      return line.trim();
    })
    .join("\n");
}
