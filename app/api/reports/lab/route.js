import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import {
  LAB_FORMAT_OPTIONS,
  LAB_MENU_REPORTS,
  LAB_ORDER_STATUSES,
  LAB_REPORTS,
  LAB_RESULT_STATUSES,
  LAB_SELECT_BY_OPTIONS,
  getLabReport,
} from "@/config/lab-reports";
import { canAccessLab } from "@/lib/lab";
import { runLabReport } from "@/lib/reports/lab";
import { validateParams } from "@/lib/reports/op-registration";

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

async function distinct(name, field) {
  const col = await getCollection(name);
  if (!col) return [];
  try {
    return await col.distinct(field);
  } catch {
    return [];
  }
}

const dedupe = (values) => [...new Set((values || []).filter((value) => String(value ?? "").trim()))].sort((a, b) => String(a).localeCompare(String(b)));

/* ------------------------------ catalogue ----------------------------- */

export async function GET() {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessLab(session)) return fail(403, "Your role does not have access to lab reports.");

  const [orderDoctors, pathologists, tests, resultTests, statuses] = await Promise.all([
    distinct("lab_checkins", "doctor"),
    distinct("lab_results", "pathologist"),
    distinct("lab_checkins", "tests.name"),
    distinct("lab_results", "testName"),
    distinct("lab_checkins", "status"),
  ]);

  const resultStatuses = await distinct("lab_results", "status");

  return NextResponse.json({
    reports: LAB_REPORTS,
    menus: LAB_MENU_REPORTS,
    options: {
      selectBy: LAB_SELECT_BY_OPTIONS,
      formats: LAB_FORMAT_OPTIONS,
      doctors: dedupe([...orderDoctors, ...pathologists]),
      tests: dedupe([...tests, ...resultTests]),
      statuses: dedupe([...(statuses.length ? statuses : LAB_ORDER_STATUSES), ...(resultStatuses.length ? resultStatuses : LAB_RESULT_STATUSES)]),
    },
  });
}

/* ------------------------------ generate ------------------------------ */

export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessLab(session)) return fail(403, "Your role does not have access to lab reports.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid report request.");
  }

  const report = getLabReport(String(body.reportKey ?? ""));
  if (!report) return fail(404, "Unknown report.");

  const params = {
    selectBy: String(body.selectBy ?? "period"),
    fromDate: String(body.fromDate ?? "").trim(),
    toDate: String(body.toDate ?? "").trim(),
    month: String(body.month ?? "").trim(),
    year: String(body.year ?? "").trim(),
    doctor: String(body.doctor ?? "").trim(),
    test: String(body.test ?? "").trim(),
    status: String(body.status ?? "").trim(),
  };

  const errors = validateParams(report, params);
  if (Object.keys(errors).length > 0) {
    return fail(400, "Please check the filter values.", { fields: errors });
  }

  try {
    const result = await runLabReport(report.key, params);
    result.meta.generatedBy = session.user?.displayName || session.user?.username || "";

    await logAudit({
      user: session.user.username,
      action: "export",
      module: "lab",
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
