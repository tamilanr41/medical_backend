import { NextResponse } from "next/server";
import { getCollection, getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import {
  FORMAT_OPTIONS,
  SELECT_BY_OPTIONS,
  CASE_TYPE_OPTIONS,
  OP_REGISTRATION_REPORTS,
  getReport,
} from "@/config/reports";
import { runReport, validateParams } from "@/lib/reports/op-registration";

const COLLECTION = "op_registrations";

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
    return fail(403, "Your role does not have access to OP reports.");
  }

  const db = await getDb();
  if (!db) return fail(503, "Reporting database is unavailable. Please try again later.");

  const [consultants, salaried, registrations, referralDoctors, purposes] = await Promise.all([
    getCollection("op_consultant_doctors"),
    getCollection("op_salaried_doctors"),
    getCollection("op_registrations"),
    getCollection("op_referral_doctors"),
    getCollection("op_visit_purposes"),
  ]);

  const [consultantRows, salariedRows, regDoctors, regReferrers, referralRows, purposeRows] = await Promise.all([
    safeFind(consultants, {}, { name: 1 }),
    safeFind(salaried, {}, { name: 1 }),
    safeDistinct(registrations, "doctor"),
    safeDistinct(registrations, "referredBy"),
    safeFind(referralDoctors, {}, { name: 1 }),
    safeFind(purposes, { status: "Active" }, { name: 1 }),
  ]);

  return NextResponse.json({
    reports: OP_REGISTRATION_REPORTS,
    options: {
      selectBy: SELECT_BY_OPTIONS,
      formats: FORMAT_OPTIONS,
      caseTypes: CASE_TYPE_OPTIONS,
      doctors: dedupe([
        ...consultantRows.map((r) => r.name),
        ...salariedRows.map((r) => r.name),
        ...regDoctors,
      ]),
      referralDoctors: dedupe([...referralRows.map((r) => r.name), ...regReferrers]),
      visitNatures: dedupe(purposeRows.map((r) => r.name)),
      shifts: [],
    },
  });
}

/* ------------------------------ generate ------------------------------ */

export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, COLLECTION)) {
    return fail(403, "Your role does not have access to OP reports.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid report request.");
  }

  const report = getReport(String(body.reportKey ?? ""));
  if (!report) return fail(404, "Unknown report.");

  const params = {
    selectBy: String(body.selectBy ?? "period"),
    fromDate: String(body.fromDate ?? "").trim(),
    toDate: String(body.toDate ?? "").trim(),
    fromTime: String(body.fromTime ?? "").trim(),
    toTime: String(body.toTime ?? "").trim(),
    month: String(body.month ?? "").trim(),
    year: String(body.year ?? "").trim(),
    doctor: String(body.doctor ?? "").trim(),
    visitNature: String(body.visitNature ?? "").trim(),
    caseType: String(body.caseType ?? "ALL"),
    expiryWithin: body.expiryWithin == null ? "" : String(body.expiryWithin).trim(),
    limitStart: body.limitStart == null ? "" : String(body.limitStart).trim(),
    limitEnd: body.limitEnd == null ? "" : String(body.limitEnd).trim(),
  };

  const errors = validateParams(report, params);
  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted filters.", { fields: errors });
  }

  const db = await getDb();
  if (!db) return fail(503, "Reporting database is unavailable. Please try again later.");

  try {
    const result = await runReport(report.key, params);
    result.meta.generatedBy = session.user?.displayName || session.user?.username || "";

    await logAudit({
      user: session.user.username,
      action: "export",
      module: "opd",
      screen: "OP Registration Report",
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
