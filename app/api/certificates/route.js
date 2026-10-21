import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import { nextCertificateNo, serializeDocument } from "@/lib/op-documents";

const REQUIRED = ["patientName", "certificateType", "doctor", "certificateDate"];

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** GET /api/certificates — recent certificates, searchable. */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, "op_certificates")) {
    return fail(403, "Your role does not have access to certificates.");
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const uhid = (searchParams.get("uhid") || "").trim();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 25));

  try {
    const col = await getCollection("op_certificates");
    const filter = uhid
      ? { uhid }
      : q
        ? {
            $or: ["certificateNo", "patientName", "uhid", "certificateType"].map((field) => ({
              [field]: new RegExp(escapeRegex(q), "i"),
            })),
          }
        : {};

    const rows = await col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray();
    const total = await col.countDocuments(filter);
    return NextResponse.json({ rows: rows.map(serializeDocument), total });
  } catch {
    return fail(503, "Certificates could not be read. Is MongoDB running?");
  }
}

/** POST /api/certificates — issues a certificate, numbering it server-side. */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, "op_certificates")) {
    return fail(403, "Your role does not have access to certificates.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const certificateDate = String(body.certificateDate ?? "").trim() || today();
  const errors = {};
  for (const field of REQUIRED) {
    if (!String(body[field] ?? "").trim()) errors[field] = `${field} is required.`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(certificateDate)) errors.certificateDate = "Enter a valid date.";
  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  try {
    const certificateNo = await nextCertificateNo();
    const now = new Date().toISOString();
    const document = {
      certificateNo,
      certificateDate,
      uhid: String(body.uhid ?? "").trim(),
      patientName: String(body.patientName ?? "").trim(),
      certificateType: String(body.certificateType ?? "").trim(),
      doctor: String(body.doctor ?? "").trim(),
      place: String(body.place ?? "").trim(),
      title: String(body.title ?? "").trim(),
      content: String(body.content ?? "").trim(),
      remarks: String(body.remarks ?? "").trim(),
      createdAt: now,
      updatedAt: now,
    };

    const col = await getCollection("op_certificates");
    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "opd",
      screen: "Issue Certificate",
      record: certificateNo,
      summary: `Certificate ${certificateNo} issued to ${document.patientName} (${document.certificateType})`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      { ok: true, certificate: serializeDocument({ ...document, _id: result.insertedId }) },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail(409, "This certificate number was just used. Please try again.");
    }
    return fail(500, "The certificate could not be saved. Please try again.");
  }
}
