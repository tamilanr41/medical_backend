import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessModule } from "@/config/permissions";
import { logAudit, requestIp } from "@/lib/audit";

const MODULE_OPD = 101;
const MAX_RECENT = 8;

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

function canPrescribe(session) {
  if (!session) return false;
  if (session.role === "SUPER_ADMIN" || session.role === "ADMIN") return true;
  return canAccessModule(session.role, MODULE_OPD);
}

/** Builds the plain-text medicine summary (mirrors the legacy Rx format). */
function summarizeItems(items) {
  return items
    .map((item) => {
      const name = item.medicineName || item.code || "Medicine";
      const dose = item.dose ? `${item.dose}` : "";
      const frequency = item.frequency || "";
      const cadence = [dose, frequency].filter(Boolean).join(" ");
      const duration =
        Number(item.duration) > 0 ? `x ${Number(item.duration)} days` : "";
      let line = `${name} - ${[cadence, duration].filter(Boolean).join(" ")}`;
      const timing = item.timing && item.timing !== "Any time"
        ? ` (${item.timing})`
        : "";
      line += timing;
      if (item.instructions) line += ` | ${item.instructions}`;
      return line.trim();
    })
    .join("\n");
}

/** Next sequential Rx number: `RX-YYYY-NNNNN`. */
async function nextRxNo() {
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

/**
 * GET /api/prescriptions?uhid=... — recent prescriptions for a patient.
 * Used by the Appointment - By Doctor screen to show prior Rx history.
 */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canPrescribe(session)) {
    return fail(403, "Your role does not have access to prescriptions.");
  }

  const { searchParams } = new URL(request.url);
  const uhid = searchParams.get("uhid")?.trim() || "";
  const limit = Math.min(MAX_RECENT, Math.max(1, Number(searchParams.get("limit")) || MAX_RECENT));

  const filter = {};
  if (uhid) filter.uhid = uhid;

  try {
    const col = await getCollection("prescriptions");
    const rows = await col
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
    return NextResponse.json({
      rows: rows.map(({ _id, ...rest }) => ({ id: String(_id), ...rest })),
    });
  } catch {
    return fail(503, "Prescriptions could not be read. Is MongoDB running?");
  }
}

/**
 * POST /api/prescriptions — validated prescription create for the
 * Appointment - By Doctor workflow. Gated to OPD-capable roles.
 */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canPrescribe(session)) {
    return fail(403, "Your role does not have access to prescriptions.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const fields = ["uhid", "patientName", "doctor", "date"];
  const errors = {};
  for (const field of fields) {
    if (!String(body[field] ?? "").trim()) {
      errors[field] = `${field} is required.`;
    }
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    errors.items = "Add at least one medicine to the prescription.";
  }

  for (const [index, item] of items.entries()) {
    if (!String(item?.medicineName ?? "").trim() && !String(item?.code ?? "").trim()) {
      errors[`items.${index}.medicineName`] = "Medicine is required.";
    }
    if (!String(item?.frequency ?? "").trim()) {
      errors[`items.${index}.frequency`] = "Frequency is required.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Please correct the highlighted fields.", fields: errors },
      { status: 400 }
    );
  }

  try {
    const rxNo = await nextRxNo();
    const cleaned = {
      rxNo,
      uhid: String(body.uhid ?? "").trim(),
      patientName: String(body.patientName ?? "").trim(),
      doctor: String(body.doctor ?? "").trim(),
      department: String(body.department ?? "").trim(),
      date: String(body.date ?? "").slice(0, 10),
      diagnosis: String(body.diagnosis ?? "").trim(),
      medicines: summarizeItems(items),
      notes: String(body.notes ?? "").trim(),
    };
    cleaned.items = items;

    const now = new Date().toISOString();
    const col = await getCollection("prescriptions");
    const result = await col.insertOne({
      ...cleaned,
      createdAt: now,
      updatedAt: now,
    });

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "opd",
      screen: "Appointment - By Doctor",
      record: rxNo,
      summary: `Prescribed ${items.length} medicine${items.length === 1 ? "" : "s"} for ${cleaned.patientName}`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, _id: String(result.insertedId), rxNo }, { status: 201 });
  } catch {
    return fail(500, "The prescription could not be saved. Please try again.");
  }
}