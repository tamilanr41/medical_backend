import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import { canAccessIpd, isIsoDate, nextIpNo, serializeAdmission } from "@/lib/ip";

const ADMISSION_TYPES = ["Emergency", "Elective", "Day Care"];
const WARDS = ["General Ward", "ICU", "HDU", "Maternity", "Pediatric", "Private"];

const REQUIRED = ["uhid", "patientName", "admissionType", "ward", "doctor", "admissionDate"];

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * GET /api/ip-admissions — list admissions from the `admissions` collection.
 * The collection is not exposed through `/api/resource` (no menu item maps to
 * it), so the IPD transaction screens read it here. Supports the same query
 * shape the resource API uses (`from`/`to`/`status`/`q`/`all`).
 */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessIpd(session)) {
    return fail(403, "Your role does not have access to IP admission data.");
  }

  const col = await getCollection("admissions");
  if (!col) return NextResponse.json({ rows: [] });

  const { searchParams } = new URL(request.url);
  const query = {};

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (isIsoDate(from) || isIsoDate(to)) {
    query.admissionDate = {};
    if (isIsoDate(from)) query.admissionDate.$gte = from;
    if (isIsoDate(to)) query.admissionDate.$lte = to;
  }

  const status = searchParams.get("status");
  if (status) query.status = status;

  const ward = searchParams.get("ward");
  if (ward) query.ward = ward;

  const q = String(searchParams.get("q") ?? "").trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    query.$or = [{ ipNo: rx }, { uhid: rx }, { patientName: rx }];
  }

  const limit = Math.min(Number(searchParams.get("limit")) || (searchParams.get("all") ? 500 : 100), 1000);

  try {
    const rows = await col
      .find(query)
      .sort({ admissionDate: -1, ipNo: -1 })
      .limit(limit)
      .toArray();
    return NextResponse.json({ rows: rows.map(serializeAdmission) });
  } catch {
    return fail(500, "Admission data could not be loaded.");
  }
}

/**
 * POST /api/ip-admissions — admit a patient. The IP number is allocated
 * server-side and the record is written to `admissions` so the existing IP
 * reports (ward occupancy, MIS, turnaround) pick it up.
 */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessIpd(session)) {
    return fail(403, "Your role does not have access to IP admission data.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const values = {};
  for (const field of REQUIRED) values[field] = String(body[field] ?? "").trim();

  const errors = {};
  for (const field of REQUIRED) {
    if (!values[field]) errors[field] = `${field} is required.`;
  }
  if (values.admissionType && !ADMISSION_TYPES.includes(values.admissionType)) {
    errors.admissionType = "Choose a valid admission type.";
  }
  if (values.ward && !WARDS.includes(values.ward)) {
    errors.ward = "Choose a valid ward.";
  }
  if (values.admissionDate && !isIsoDate(values.admissionDate)) {
    errors.admissionDate = "Enter a valid admission date.";
  }
  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  try {
    const col = await getCollection("admissions");
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const ipNo = await nextIpNo();
    const now = new Date().toISOString();
    const document = {
      ipNo,
      uhid: values.uhid,
      patientName: values.patientName,
      gender: String(body.gender ?? "").trim(),
      age: body.age === "" || body.age == null ? "" : Number(body.age) || "",
      mobile: String(body.mobile ?? "").trim(),
      address: String(body.address ?? "").trim(),
      admissionType: values.admissionType,
      ward: values.ward,
      room: String(body.room ?? "").trim(),
      bed: String(body.bed ?? "").trim(),
      doctor: values.doctor,
      referredBy: String(body.referredBy ?? "").trim(),
      college: String(body.college ?? "").trim(),
      admissionDate: values.admissionDate,
      dischargeDate: "",
      remarks: String(body.remarks ?? "").trim(),
      status: "Admitted",
      createdAt: now,
      updatedAt: now,
    };

    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "ipd",
      screen: "Admission Register",
      record: ipNo,
      summary: `Admitted ${values.patientName} (${values.uhid}) to ${values.ward} under ${values.doctor}`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      { ok: true, admission: serializeAdmission({ ...document, _id: result.insertedId }) },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail(409, "This admission number was just taken. Please retry.");
    }
    return fail(500, "The admission could not be saved. Please try again.");
  }
}
