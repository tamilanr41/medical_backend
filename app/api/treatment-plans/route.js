import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import { buildSessions, nextPlanNo, serializeSchedule } from "@/lib/treatment-plans";

const COLLECTION = "op_treatment_schedules";

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseId(raw) {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

/** GET /api/treatment-plans?uhid= | ?q= — plan sessions for a patient or search. */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, COLLECTION)) {
    return fail(403, "Your role does not have access to treatment plans.");
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const uhid = (searchParams.get("uhid") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 100));

  const filter = {};
  if (uhid) filter.uhid = uhid;
  if (status) filter.status = status;
  if (q) {
    filter.$or = ["planNo", "patientName", "uhid", "plan", "service"].map((field) => ({
      [field]: new RegExp(escapeRegex(q), "i"),
    }));
  }

  try {
    const col = await getCollection(COLLECTION);
    const rows = await col
      .find(filter)
      .sort({ planStartDate: 1, sessionNo: 1 })
      .limit(limit)
      .toArray();
    const total = await col.countDocuments(filter);
    return NextResponse.json({ rows: rows.map(serializeSchedule), total });
  } catch {
    return fail(503, "Treatment plans could not be read. Is MongoDB running?");
  }
}

/** POST /api/treatment-plans — schedule one session or allocate a plan's sessions. */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, COLLECTION)) {
    return fail(403, "Your role does not have access to treatment plans.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const mode = String(body.mode ?? "schedule").trim() || "schedule";
  const patientName = String(body.patientName ?? "").trim();
  const plan = String(body.plan ?? "").trim();
  const planStartDate = String(body.planStartDate ?? "").trim() || today();
  const totalSessions = Math.max(1, Number(body.totalSessions) || 1);

  const errors = {};
  if (!patientName) errors.patientName = "Select a patient.";
  if (!plan) errors.plan = "Choose a treatment plan.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planStartDate)) errors.planStartDate = "Enter a valid date.";
  if (mode === "allocate" && totalSessions < 1) {
    errors.totalSessions = "Enter at least one session.";
  }
  if (mode === "schedule" && !(Number(body.sessionNo) >= 1)) {
    errors.sessionNo = "Enter the session number.";
  }
  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  try {
    const col = await getCollection(COLLECTION);
    const now = new Date().toISOString();
    const base = {
      planNo: await nextPlanNo(),
      uhid: String(body.uhid ?? "").trim(),
      patientName,
      plan,
      service: String(body.service ?? "").trim(),
      intervalDays: Number(body.intervalDays) || 0,
      planStartDate,
      doctor: String(body.doctor ?? "").trim(),
      therapist: String(body.therapist ?? "").trim(),
      charges: Number(body.charges) || 0,
      remarks: String(body.remarks ?? "").trim(),
      createdBy: session.user.username,
      createdAt: now,
      updatedAt: now,
    };

    let documents;
    if (mode === "allocate") {
      documents = buildSessions(base, totalSessions);
    } else {
      documents = [
        {
          ...base,
          sessionNo: Number(body.sessionNo) || 1,
          totalSessions,
          actualDate: String(body.actualDate ?? "").trim(),
          durationMins: Number(body.durationMins) || 0,
          status: "Scheduled",
        },
      ];
    }

    const result = await col.insertMany(documents);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "opd",
      screen: mode === "allocate" ? "Treatment Plan Allocation" : "Treatment Plan Scheduling",
      record: base.planNo,
      summary:
        mode === "allocate"
          ? `Allocated ${documents.length} session(s) of "${plan}" for ${patientName}`
          : `Scheduled session ${documents[0].sessionNo} of "${plan}" for ${patientName}`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      {
        ok: true,
        planNo: base.planNo,
        count: documents.length,
        rows: documents.map((doc, i) =>
          serializeSchedule({ ...doc, _id: result.insertedIds[i] })
        ),
      },
      { status: 201 }
    );
  } catch {
    return fail(500, "The treatment plan could not be saved. Please try again.");
  }
}

/** PATCH /api/treatment-plans — record the actual session (execute / cancel). */
export async function PATCH(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, COLLECTION)) {
    return fail(403, "Your role does not have access to treatment plans.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const objectId = parseId(String(body.id ?? ""));
  if (!objectId) return fail(400, "Invalid treatment plan id.");

  const action = String(body.action ?? "execute").trim() || "execute";
  if (!["execute", "cancel"].includes(action)) {
    return fail(400, "Unsupported treatment plan action.");
  }

  try {
    const col = await getCollection(COLLECTION);
    const existing = await col.findOne({ _id: objectId });
    if (!existing) return fail(404, "Treatment plan session not found.");

    const set = { updatedAt: new Date().toISOString() };
    let summary;
    if (action === "cancel") {
      set.status = "Cancelled";
      summary = `Cancelled session ${existing.sessionNo} of ${existing.planNo}`;
    } else {
      set.status = "Executed";
      set.actualDate = String(body.actualDate ?? "").trim() || today();
      set.durationMins = Number(body.durationMins) || existing.durationMins || 0;
      if (body.remarks != null) set.remarks = String(body.remarks).trim();
      if (body.therapist != null) set.therapist = String(body.therapist).trim();
      summary = `Executed session ${existing.sessionNo} of ${existing.planNo}`;
    }

    await col.updateOne({ _id: objectId }, { $set: set });
    const updated = await col.findOne({ _id: objectId });

    await logAudit({
      user: session.user.username,
      action: "update",
      module: "opd",
      screen: "Treatment Plan Execution",
      record: existing.planNo,
      summary,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, row: serializeSchedule(updated) });
  } catch {
    return fail(500, "The treatment plan could not be updated. Please try again.");
  }
}
