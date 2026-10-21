import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import { nextReferralNo, serializeDocument } from "@/lib/op-documents";

const REQUIRED = ["patientName", "referredHospital", "referralDate"];

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** GET /api/referrals — recent OP referrals, searchable. */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, "op_referrals")) {
    return fail(403, "Your role does not have access to referrals.");
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const uhid = (searchParams.get("uhid") || "").trim();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 25));

  try {
    const col = await getCollection("op_referrals");
    const filter = uhid
      ? { uhid }
      : q
        ? {
            $or: ["referralNo", "patientName", "uhid", "referredHospital"].map((field) => ({
              [field]: new RegExp(escapeRegex(q), "i"),
            })),
          }
        : {};

    const rows = await col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray();
    const total = await col.countDocuments(filter);
    return NextResponse.json({ rows: rows.map(serializeDocument), total });
  } catch {
    return fail(503, "Referrals could not be read. Is MongoDB running?");
  }
}

/** POST /api/referrals — records a referral to another hospital. */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, "op_referrals")) {
    return fail(403, "Your role does not have access to referrals.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const referralDate = String(body.referralDate ?? "").trim() || today();
  const errors = {};
  for (const field of REQUIRED) {
    if (!String(body[field] ?? "").trim()) errors[field] = `${field} is required.`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referralDate)) errors.referralDate = "Enter a valid date.";
  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  try {
    const referralNo = await nextReferralNo();
    const now = new Date().toISOString();
    const document = {
      referralNo,
      referralDate,
      uhid: String(body.uhid ?? "").trim(),
      patientName: String(body.patientName ?? "").trim(),
      referredHospital: String(body.referredHospital ?? "").trim(),
      referredDoctor: String(body.referredDoctor ?? "").trim(),
      department: String(body.department ?? "").trim(),
      phone: String(body.phone ?? "").trim(),
      email: String(body.email ?? "").trim(),
      referredBy: String(body.referredBy ?? "").trim(),
      reason: String(body.reason ?? "").trim(),
      conditionAtReferral: String(body.conditionAtReferral ?? "").trim(),
      remarks: String(body.remarks ?? "").trim(),
      createdAt: now,
      updatedAt: now,
    };

    const col = await getCollection("op_referrals");
    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "opd",
      screen: "Refer to Other Hospital",
      record: referralNo,
      summary: `Referral for ${document.patientName} to ${document.referredHospital}`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      { ok: true, referral: serializeDocument({ ...document, _id: result.insertedId }) },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail(409, "This referral number was just used. Please try again.");
    }
    return fail(500, "The referral could not be saved. Please try again.");
  }
}
