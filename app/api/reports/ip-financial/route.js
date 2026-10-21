import { NextResponse } from "next/server";
import { getCollection, getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import {
  IP_REPORTS,
  IP_MENU_REPORTS,
  IP_SELECT_BY_OPTIONS,
  IP_FORMAT_OPTIONS,
  IP_ADMISSION_TYPES,
  IP_ADMISSION_STATUSES,
  getIpReport,
} from "@/config/ip-reports";
import { runIpReport } from "@/lib/reports/ip-financial";
import { validateParams } from "@/lib/reports/op-registration";

const COLLECTION = "ip_admissions";

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

async function safeFind(col, filter = {}, projection = null) {
  if (!col) return [];
  try {
    return await col.find(filter, projection ? { projection } : {}).toArray();
  } catch {
    return [];
  }
}

async function safeDistinct(col, field) {
  if (!col) return [];
  try {
    return await col.distinct(field);
  } catch {
    return [];
  }
}

/* ------------------------------- catalog ------------------------------ */

export async function GET() {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, COLLECTION)) {
    return fail(403, "Your role does not have access to IP reports.");
  }

  const db = await getDb();
  if (!db) return fail(503, "Reporting database is unavailable. Please try again later.");

  const [consultants, salaried, admissions, wards, doctors] = await Promise.all([
    getCollection("op_consultant_doctors"),
    getCollection("op_salaried_doctors"),
    getCollection("admissions"),
    getCollection("ip_wards"),
    getCollection("op_doctors"),
  ]);

  const [consultantRows, salariedRows, wardRows, doctorRows, admissionWards, admissionDoctors, admissionTypes, admissionStatuses] =
    await Promise.all([
      safeFind(consultants, {}, { name: 1 }),
      safeFind(salaried, {}, { name: 1 }),
      safeFind(wards, { status: { $ne: "Inactive" } }, { name: 1, ward: 1 }),
      safeFind(doctors, {}, { name: 1 }),
      safeDistinct(admissions, "ward"),
      safeDistinct(admissions, "doctor"),
      safeDistinct(admissions, "admissionType"),
      safeDistinct(admissions, "status"),
    ]);

  return NextResponse.json({
    reports: IP_REPORTS,
    menus: IP_MENU_REPORTS,
    options: {
      selectBy: IP_SELECT_BY_OPTIONS,
      formats: IP_FORMAT_OPTIONS,
      doctors: dedupe([
        ...consultantRows.map((r) => r.name),
        ...salariedRows.map((r) => r.name),
        ...doctorRows.map((r) => r.name),
        ...admissionDoctors,
      ]),
      wards: dedupe([...wardRows.map((r) => r.name || r.ward), ...admissionWards]),
      admissionTypes: dedupe([...IP_ADMISSION_TYPES, ...admissionTypes]),
      statuses: dedupe([...IP_ADMISSION_STATUSES, ...admissionStatuses]),
    },
  });
}

/* ------------------------------ generate ------------------------------ */

export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, COLLECTION)) {
    return fail(403, "Your role does not have access to IP reports.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid report request.");
  }

  const report = getIpReport(String(body.reportKey ?? ""));
  if (!report) return fail(404, "Unknown report.");

  const params = {
    selectBy: String(body.selectBy ?? "period"),
    fromDate: String(body.fromDate ?? "").trim(),
    toDate: String(body.toDate ?? "").trim(),
    month: String(body.month ?? "").trim(),
    year: String(body.year ?? "").trim(),
    doctor: String(body.doctor ?? "").trim(),
    ward: String(body.ward ?? "").trim(),
    admissionType: String(body.admissionType ?? "").trim(),
    status: String(body.status ?? "").trim(),
  };

  const errors = validateParams(report, params);
  if (Object.keys(errors).length > 0) {
    return fail(400, "Please check the filter values.", { fields: errors });
  }

  try {
    const result = await runIpReport(report.key, params);
    result.meta.generatedBy = session.user?.displayName || session.user?.username || "";

    await logAudit({
      user: session.user.username,
      action: "export",
      module: "ipd",
      screen: report.title,
      record: report.title,
      summary: `Generated "${report.title}" (${result.rows.length} row${result.rows.length === 1 ? "" : "s"})`,
      ip: requestIp(request),
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err?.message === "DB_UNAVAILABLE") {
      return fail(503, "Reporting database is unavailable. Please try again later.");
    }
    return fail(500, "The report could not be generated. Please try again.");
  }
}
