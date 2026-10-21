import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { ENTITIES } from "@/config/entities";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex, parseBody } from "@/lib/validation";
import { findPatientDuplicates, nextUhid, serializePatient } from "@/lib/patients";

const COLLECTION = "patients";

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** GET /api/patients?q= — patient lookup for the OP registration desk. */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, COLLECTION)) {
    return fail(403, "Your role does not have access to patient records.");
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 25));

  try {
    const col = await getCollection(COLLECTION);
    const filter = q
      ? {
          $or: ["uhid", "patientName", "mobile", "phone"].map((field) => ({
            [field]: new RegExp(escapeRegex(q), "i"),
          })),
        }
      : {};

    const rows = await col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray();
    const total = await col.countDocuments(filter);

    return NextResponse.json({ rows: rows.map(serializePatient), total });
  } catch {
    return fail(503, "Patient records could not be read. Is MongoDB running?");
  }
}

/** POST /api/patients — registers a new patient and allocates a UHID. */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, COLLECTION)) {
    return fail(403, "Your role does not have access to patient records.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const autoUhid = body.autoUhid === true || !String(body.uhid ?? "").trim();
  const uhid = autoUhid ? await nextUhid() : String(body.uhid).trim();

  const { values, errors } = parseBody(
    ENTITIES[COLLECTION],
    { ...body, uhid },
    { mode: "create" }
  );
  if (errors) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  const force = body.force === true;
  if (!force) {
    const duplicates = await findPatientDuplicates({
      mobile: values.mobile,
      idProof: values.idProof,
    });
    if (duplicates.length > 0) {
      return fail(409, "A patient with this mobile or ID already exists.", { duplicates });
    }
  }

  try {
    const col = await getCollection(COLLECTION);

    const now = new Date().toISOString();
    const document = {
      ...values,
      uhid: values.uhid || uhid,
      status: values.status || "Active",
      createdAt: now,
      updatedAt: now,
    };

    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "opd",
      screen: "OP Register",
      record: uhid,
      summary: `Registered patient ${values.patientName} (${uhid})`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      { ok: true, patient: serializePatient({ ...document, _id: result.insertedId }) },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail(409, "A record with this UHID already exists.");
    }
    return fail(500, "The patient could not be saved. Please try again.");
  }
}
