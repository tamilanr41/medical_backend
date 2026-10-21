import { NextResponse } from "next/server";
import { getCollection, getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import {
  OP_REPORTS,
  OP_MENU_REPORTS,
  OP_SELECT_BY_OPTIONS,
  OP_FORMAT_OPTIONS,
  getOpReport,
} from "@/config/op-reports";
import { runOpReport } from "@/lib/reports/op-financial";
import { validateParams } from "@/lib/reports/op-registration";

const COLLECTION = "op_bills";

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

  const [consultants, salaried, bills, corporates, patientTypes, purposes] = await Promise.all([
    getCollection("op_consultant_doctors"),
    getCollection("op_salaried_doctors"),
    getCollection("op_bills"),
    getCollection("op_corporates"),
    getCollection("op_patient_types"),
    getCollection("op_visit_purposes"),
  ]);

  const [consultantRows, salariedRows, billDoctors, billModes, billTypes, billSponsors, corporateRows, patientTypeRows, purposeRows] =
    await Promise.all([
      safeFind(consultants, {}, { name: 1 }),
      safeFind(salaried, {}, { name: 1 }),
      safeDistinct(bills, "doctor"),
      safeDistinct(bills, "paymentMode"),
      safeDistinct(bills, "patientType"),
      safeDistinct(bills, "sponsorName"),
      safeFind(corporates, {}, { name: 1 }),
      safeFind(patientTypes, {}, { name: 1 }),
      safeFind(purposes, { status: "Active" }, { name: 1 }),
    ]);

  return NextResponse.json({
    reports: OP_REPORTS,
    menus: OP_MENU_REPORTS,
    options: {
      selectBy: OP_SELECT_BY_OPTIONS,
      formats: OP_FORMAT_OPTIONS,
      doctors: dedupe([...consultantRows.map((r) => r.name), ...salariedRows.map((r) => r.name), ...billDoctors]),
      paymentModes: dedupe(billModes),
      patientTypes: dedupe([...patientTypeRows.map((r) => r.name), ...billTypes]),
      sponsors: dedupe([...corporateRows.map((r) => r.name), ...billSponsors]),
      visitNatures: dedupe(purposeRows.map((r) => r.name)),
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

  const report = getOpReport(String(body.reportKey ?? ""));
  if (!report) return fail(404, "Unknown report.");

  const params = {
    selectBy: String(body.selectBy ?? "period"),
    fromDate: String(body.fromDate ?? "").trim(),
    toDate: String(body.toDate ?? "").trim(),
    month: String(body.month ?? "").trim(),
    year: String(body.year ?? "").trim(),
    doctor: String(body.doctor ?? "").trim(),
    paymentMode: String(body.paymentMode ?? "").trim(),
    patientType: String(body.patientType ?? "").trim(),
    sponsor: String(body.sponsor ?? "").trim(),
    expiryWithin: String(body.expiryWithin ?? "").trim(),
  };

  const errors = validateParams(report, params);
  if (Object.keys(errors).length > 0) {
    return fail(400, "Please check the filter values.", { fields: errors });
  }

  try {
    const result = await runOpReport(report.key, params);
    result.meta.generatedBy = session.user?.displayName || session.user?.username || "";

    await logAudit({
      user: session.user.username,
      action: "export",
      module: "opd",
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
