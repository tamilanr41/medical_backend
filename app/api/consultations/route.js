import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import { nextRxNo, serializeVisit } from "@/lib/visits";

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

function cleanMedicine(item) {
  return {
    medicineName: String(item.medicineName ?? "").trim(),
    code: String(item.code ?? "").trim(),
    dose: String(item.dose ?? "").trim(),
    frequency: String(item.frequency ?? "").trim(),
    duration: String(item.duration ?? "").trim(),
    timing: String(item.timing ?? "").trim(),
    instructions: String(item.instructions ?? "").trim(),
  };
}

function summarize(items) {
  return items
    .map((item) => {
      const cadence = [item.dose, item.frequency].filter(Boolean).join(" ");
      const duration = Number(item.duration) > 0 ? `x ${Number(item.duration)} days` : "";
      let line = `${item.medicineName || item.code || "Medicine"} - ${[cadence, duration].filter(Boolean).join(" ")}`;
      if (item.timing && item.timing !== "Any time") line += ` (${item.timing})`;
      if (item.instructions) line += ` | ${item.instructions}`;
      return line.trim();
    })
    .join("\n");
}

/** GET /api/consultations?uhid= — past visits for a patient (history panel). */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, "op_visits")) {
    return fail(403, "Your role does not have access to consultations.");
  }

  const { searchParams } = new URL(request.url);
  const uhid = (searchParams.get("uhid") || "").trim();
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

  try {
    const col = await getCollection("op_visits");
    const filter = uhid
      ? { uhid }
      : q
        ? { $or: ["patientName", "uhid", "opNo"].map((field) => ({ [field]: new RegExp(escapeRegex(q), "i") })) }
        : {};

    const rows = await col
      .find(filter)
      .sort({ visitDate: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
    return NextResponse.json({ rows: rows.map(serializeVisit) });
  } catch {
    return fail(503, "Consultations could not be read. Is MongoDB running?");
  }
}

/** POST /api/consultations — saves a visit and, if present, its prescription. */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, "op_visits")) {
    return fail(403, "Your role does not have access to consultations.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const required = ["uhid", "patientName", "doctor", "visitDate"];
  const errors = {};
  for (const field of required) {
    if (!String(body[field] ?? "").trim()) errors[field] = `${field} is required.`;
  }
  if (body.visitDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.visitDate))) {
    errors.visitDate = "Enter a valid visit date.";
  }

  const medicines = Array.isArray(body.medicines)
    ? body.medicines.map(cleanMedicine).filter((item) => item.medicineName || item.code)
    : [];

  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  try {
    let rxNo = "";

    if (medicines.length > 0) {
      const rxCol = await getCollection("prescriptions");
      rxNo = await nextRxNo();
      await rxCol.insertOne({
        rxNo,
        uhid: String(body.uhid ?? "").trim(),
        patientName: String(body.patientName ?? "").trim(),
        doctor: String(body.doctor ?? "").trim(),
        department: String(body.department ?? "").trim(),
        date: String(body.visitDate).slice(0, 10),
        diagnosis: String(body.provisionalDiagnosis ?? body.diagnosis ?? "").trim(),
        medicines: summarize(medicines),
        notes: String(body.advice ?? "").trim(),
        items: medicines,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const visit = {
      opNo: String(body.opNo ?? "").trim(),
      uhid: String(body.uhid ?? "").trim(),
      patientName: String(body.patientName ?? "").trim(),
      gender: String(body.gender ?? "").trim(),
      age: Number(body.age) || "",
      mobile: String(body.mobile ?? "").trim(),
      department: String(body.department ?? "").trim(),
      doctor: String(body.doctor ?? "").trim(),
      visitDate: String(body.visitDate ?? "").slice(0, 10),
      complaint: String(body.complaint ?? "").trim(),
      history: String(body.history ?? "").trim(),
      examination: String(body.examination ?? "").trim(),
      temperature: String(body.temperature ?? "").trim(),
      bp: String(body.bp ?? "").trim(),
      pulse: String(body.pulse ?? "").trim(),
      weight: String(body.weight ?? "").trim(),
      height: String(body.height ?? "").trim(),
      spo2: String(body.spo2 ?? "").trim(),
      bloodSugar: String(body.bloodSugar ?? "").trim(),
      drugAllergy: String(body.drugAllergy ?? "").trim(),
      provisionalDiagnosis: String(body.provisionalDiagnosis ?? "").trim(),
      diagnosis: String(body.diagnosis ?? "").trim(),
      advice: String(body.advice ?? "").trim(),
      rxNo,
      nextVisitDate: String(body.nextVisitDate ?? "").trim(),
      status: ["Open", "Consulted", "Closed"].includes(String(body.status ?? ""))
        ? String(body.status)
        : "Consulted",
      mode: String(body.mode) === "Online" ? "Online" : "In-Person",
      meetingLink: String(body.meetingLink ?? "").trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const col = await getCollection("op_visits");
    const result = await col.insertOne(visit);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "opd",
      screen: "Doctor Consultation",
      record: visit.uhid,
      summary: `Consultation for ${visit.patientName} by ${visit.doctor}${rxNo ? ` (${rxNo})` : ""}`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      { ok: true, visit: serializeVisit({ ...visit, _id: result.insertedId }), rxNo },
      { status: 201 }
    );
  } catch {
    return fail(500, "The consultation could not be saved. Please try again.");
  }
}
