/**
 * In Patient › Report engine (legacy `FrameWork/Consultation/IP*Report.jsp`).
 *
 * IP operational activity in this build is held on `admissions` (with ward /
 * room / bed, admission & discharge dates), joined to `room_cleanings` for the
 * discharge → vacate turnaround and `case_sheets` for the clinical register.
 * The financial reports (advance / payment / daily collection) read the shared
 * `ip_billing_records` ledger written by the 9 IPD billing transactions.
 *
 * Query execution lives here; the catalogue is `config/ip-reports.js`.
 */

import { getCollection } from "@/lib/db";
import { escapeRegex } from "@/lib/validation";
import { resolveRange, loadBranding } from "@/lib/reports/op-registration";
import { getIpReport } from "@/config/ip-reports";

const stat = (label, value) => ({ label, value });
const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const sum = (rows, fn) => rows.reduce((total, row) => total + num(fn(row)), 0);

function toIso(value) {
  const text = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function dayDiff(from, to) {
  const a = toIso(from);
  const b = toIso(to);
  if (!a || !b) return null;
  return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
}

function rangeQuery(field, params) {
  const { from, to } = resolveRange(params);
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lt = `${to}\uffff`;
  return Object.keys(range).length ? { [field]: range } : {};
}

function buildFilter(report, params) {
  const query = {};
  if (report.filters.includes("doctor") && params.doctor) {
    query.doctor = new RegExp(escapeRegex(params.doctor), "i");
  }
  if (report.filters.includes("ward") && params.ward) {
    query.ward = params.ward;
  }
  if (report.filters.includes("admissionType") && params.admissionType) {
    query.admissionType = params.admissionType;
  }
  if (report.filters.includes("status") && params.status) {
    query.status = params.status;
  }
  return query;
}

async function loadCollection(name, query, sort = {}) {
  const col = await getCollection(name);
  if (!col) throw new Error("DB_UNAVAILABLE");
  const cursor = col.find(query).limit(20000);
  if (Object.keys(sort).length > 0) cursor.sort(sort);
  return cursor.toArray();
}

function loadAdmissions(report, params) {
  return loadCollection("admissions", { ...rangeQuery(report.dateField || "admissionDate", params), ...buildFilter(report, params) }, { admissionDate: 1, ipNo: 1 });
}

function admissionRow(a) {
  return {
    ipNo: a.ipNo || "",
    admissionDate: a.admissionDate || "",
    dischargeDate: a.dischargeDate || "",
    uhid: a.uhid || "",
    patientName: a.patientName || "",
    admissionType: a.admissionType || "",
    ward: a.ward || "",
    room: a.room || "",
    bed: a.bed || "",
    doctor: a.doctor || "",
    status: a.status || "",
    stayDays: stayDays(a) ?? "",
  };
}

function stayDays(a) {
  if ((a.status || "") !== "Discharged") return null;
  return dayDiff(a.admissionDate, a.dischargeDate);
}

function groupAdmissions(admissions, keyFn) {
  const map = new Map();
  for (const a of admissions) {
    const key = keyFn(a) || "Unspecified";
    const group = map.get(key) ?? { key, total: 0, admitted: 0, discharged: 0, staySum: 0, stayCount: 0 };
    group.total += 1;
    if (a.status === "Admitted") group.admitted += 1;
    if (a.status === "Discharged") {
      group.discharged += 1;
      const d = stayDays(a);
      if (d != null) {
        group.staySum += d;
        group.stayCount += 1;
      }
    }
    map.set(key, group);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || String(a.key).localeCompare(String(b.key)));
}

const average = (values) => (values.length ? Math.round(values.reduce((t, v) => t + v, 0) / values.length) : 0);

function admissionStats(admissions) {
  const stays = admissions.map(stayDays).filter((d) => d != null);
  return [
    stat("Admissions", admissions.length),
    stat("Admitted", admissions.filter((a) => a.status === "Admitted").length),
    stat("Discharged", admissions.filter((a) => a.status === "Discharged").length),
    stat("Average stay (days)", average(stays)),
  ];
}

/* ------------------------------- columns ------------------------------ */

const COL = {
  ipNo: { key: "ipNo", label: "IP No" },
  admissionDate: { key: "admissionDate", label: "Admission Date" },
  dischargeDate: { key: "dischargeDate", label: "Discharge Date" },
  uhid: { key: "uhid", label: "UHID" },
  patientName: { key: "patientName", label: "Patient" },
  admissionType: { key: "admissionType", label: "Admission Type" },
  ward: { key: "ward", label: "Ward" },
  room: { key: "room", label: "Room" },
  bed: { key: "bed", label: "Bed" },
  doctor: { key: "doctor", label: "Doctor" },
  status: { key: "status", label: "Status" },
  stayDays: { key: "stayDays", label: "Stay (days)", align: "right" },
  admissions: { key: "total", label: "Admissions", align: "right" },
  admitted: { key: "admitted", label: "Admitted", align: "right" },
  discharged: { key: "discharged", label: "Discharged", align: "right" },
  avgStay: { key: "stayDays", label: "Avg Stay (days)", align: "right" },
  caseSheetNo: { key: "caseSheetNo", label: "Case Sheet No" },
  caseDate: { key: "date", label: "Date" },
  department: { key: "department", label: "Department" },
  diagnosis: { key: "diagnosis", label: "Diagnosis" },
  notes: { key: "notes", label: "Clinical Notes" },
  requestNo: { key: "requestNo", label: "Cleaning Request" },
  requestedAt: { key: "requestedAt", label: "Cleaned On" },
  assignedTo: { key: "assignedTo", label: "Assigned To" },
  cleaningStatus: { key: "cleaningStatus", label: "Cleaning Status" },
  vacateDays: { key: "vacateDays", label: "Turn Around (days)", align: "right" },
  bucket: { key: "bucket", label: "Length of Stay" },
  count: { key: "count", label: "Admissions", align: "right" },
};

/* ------------------------------- reports ------------------------------ */

async function runAdmissionRegister(report, params) {
  const admissions = await loadAdmissions(report, params);
  return {
    columns: [COL.ipNo, COL.admissionDate, COL.uhid, COL.patientName, COL.admissionType, COL.ward, COL.room, COL.bed, COL.doctor, COL.dischargeDate, COL.status],
    rows: admissions.map(admissionRow),
    stats: admissionStats(admissions),
  };
}

async function runWardOccupancy(report, params) {
  const admissions = await loadAdmissions(report, params);
  const rows = groupAdmissions(admissions, (a) => a.ward).map((g) => ({
    ward: g.key,
    total: g.total,
    admitted: g.admitted,
    discharged: g.discharged,
    stayDays: g.stayCount ? Math.round(g.staySum / g.stayCount) : "",
  }));
  return {
    columns: [COL.ward, COL.admissions, { key: "admitted", label: "Admitted", align: "right" }, { key: "discharged", label: "Discharged", align: "right" }, COL.stayDays],
    rows,
    stats: [
      stat("Wards", rows.length),
      stat("Admissions", admissions.length),
      stat("Currently admitted", admissions.filter((a) => a.status === "Admitted").length),
      stat("Discharged", admissions.filter((a) => a.status === "Discharged").length),
    ],
  };
}

async function runAdmissionTypeSummary(report, params) {
  const admissions = await loadAdmissions(report, params);
  const rows = groupAdmissions(admissions, (a) => a.admissionType).map((g) => ({
    admissionType: g.key,
    total: g.total,
    admitted: g.admitted,
    discharged: g.discharged,
    stayDays: g.stayCount ? Math.round(g.staySum / g.stayCount) : "",
  }));
  return {
    columns: [COL.admissionType, COL.admissions, { key: "admitted", label: "Admitted", align: "right" }, { key: "discharged", label: "Discharged", align: "right" }, COL.stayDays],
    rows,
    stats: admissionStats(admissions),
  };
}

async function runDoctorAdmissions(report, params) {
  const admissions = await loadAdmissions(report, params);
  const rows = groupAdmissions(admissions, (a) => a.doctor).map((g) => ({
    doctor: g.key,
    total: g.total,
    admitted: g.admitted,
    discharged: g.discharged,
    stayDays: g.stayCount ? Math.round(g.staySum / g.stayCount) : "",
  }));
  return {
    columns: [COL.doctor, COL.admissions, { key: "admitted", label: "Admitted", align: "right" }, { key: "discharged", label: "Discharged", align: "right" }, COL.stayDays],
    rows,
    stats: admissionStats(admissions),
  };
}

async function runCaseSheetRegister(report, params) {
  const docs = await loadCollection("case_sheets", rangeQuery(report.dateField || "date", params), { date: 1 });
  const rows = docs
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    .map((c) => ({
      caseSheetNo: c.caseSheetNo || "",
      date: c.date || "",
      uhid: c.uhid || "",
      patientName: c.patientName || "",
      department: c.department || "",
      doctor: c.doctor || "",
      diagnosis: c.diagnosis || "",
    }));
  return {
    columns: [COL.caseSheetNo, { key: "date", label: "Date" }, COL.uhid, COL.patientName, { key: "department", label: "Department" }, COL.doctor, { key: "diagnosis", label: "Diagnosis" }],
    rows,
    stats: [stat("Case sheets", rows.length), stat("Departments", new Set(rows.map((r) => r.department || "Unspecified")).size)],
  };
}

async function runAdmissionTurnaround(report, params) {
  const admissions = (await loadAdmissions(report, params)).filter((a) => a.status === "Discharged" && toIso(a.dischargeDate));
  const rows = admissions.map(admissionRow).sort((a, b) => num(b.stayDays) - num(a.stayDays));
  const stays = admissions.map(stayDays).filter((d) => d != null);
  return {
    columns: [COL.ipNo, COL.uhid, COL.patientName, COL.ward, COL.bed, COL.doctor, COL.admissionDate, COL.dischargeDate, COL.stayDays],
    rows,
    stats: [
      stat("Discharged", rows.length),
      stat("Average stay (days)", average(stays)),
      stat("Longest stay (days)", stays.length ? Math.max(...stays) : 0),
    ],
  };
}

async function runDischargeToVacate(report, params) {
  const admissions = (await loadAdmissions(report, params)).filter((a) => a.status === "Discharged" && toIso(a.dischargeDate));
  const cleanings = await loadCollection("room_cleanings", {});
  const byKey = new Map();
  for (const c of cleanings) {
    const key = `${c.ward || ""}|${c.room || ""}|${c.bed || ""}`;
    const list = byKey.get(key) ?? [];
    list.push(c);
    byKey.set(key, list);
  }
  const rows = admissions.map((a) => {
    const key = `${a.ward || ""}|${a.room || ""}|${a.bed || ""}`;
    const candidates = (byKey.get(key) ?? [])
      .filter((c) => toIso(c.requestedAt) && toIso(c.requestedAt) >= toIso(a.dischargeDate))
      .sort((x, y) => String(x.requestedAt).localeCompare(String(y.requestedAt)));
    const cleaning = candidates[0] || null;
    return {
      ...admissionRow(a),
      requestNo: cleaning?.requestNo || "",
      requestedAt: cleaning?.requestedAt || "",
      vacateDays: cleaning ? dayDiff(a.dischargeDate, cleaning.requestedAt) : "",
    };
  });
  const turnarounds = rows.map((r) => r.vacateDays).filter((d) => d != null);
  const matched = rows.filter((r) => r.requestNo).length;
  return {
    columns: [COL.ipNo, COL.uhid, COL.patientName, COL.ward, COL.bed, COL.dischargeDate, { key: "requestNo", label: "Cleaning Request" }, { key: "requestedAt", label: "Cleaned Date" }, COL.vacateDays],
    rows,
    stats: [
      stat("Discharged", rows.length),
      stat("Cleaning requests matched", matched),
      stat("Average turn around (days)", average(turnarounds)),
    ],
  };
}

const STAY_BUCKETS = [
  { label: "0 – 1 days", test: (d) => d <= 1 },
  { label: "2 – 3 days", test: (d) => d >= 2 && d <= 3 },
  { label: "4 – 7 days", test: (d) => d >= 4 && d <= 7 },
  { label: "8+ days", test: (d) => d >= 8 },
];

async function runStayDuration(report, params) {
  const admissions = (await loadAdmissions(report, params)).filter((a) => a.status === "Discharged");
  const stays = admissions.map(stayDays).filter((d) => d != null);
  const rows = STAY_BUCKETS.map((bucket) => ({ bucket: bucket.label, count: stays.filter(bucket.test).length }));
  return {
    columns: [COL.bucket, COL.count],
    rows,
    stats: [
      stat("Discharged", stays.length),
      stat("Average stay (days)", average(stays)),
      stat("Longest stay (days)", stays.length ? Math.max(...stays) : 0),
    ],
  };
}

function collectionRow(doc) {
  return {
    ipNo: doc.ipNo || doc.admissionNo || "",
    receiptNo: doc.receiptNo || doc.refNo || "",
    date: doc.admissionDate || doc.paymentDate || doc.date || "",
    uhid: doc.uhid || "",
    patientName: doc.patientName || "",
    doctor: doc.doctor || "",
    mode: doc.mode || doc.paymentMode || "",
    documentType: doc.documentType || "",
    amount: num(doc.amount).toFixed(2),
    balance: num(doc.balance).toFixed(2),
    remarks: doc.remarks || "",
  };
}

async function runAdvanceDetail(report, params) {
  const docs = await loadCollection(
    "ip_billing_records",
    { documentType: { $in: ["Advance Request", "Advance Collection"] }, ...rangeQuery(report.dateField || "date", params), ...buildFilter(report, params) },
    { date: 1 }
  );
  const rows = docs.map(collectionRow);
  return {
    columns: [COL.ipNo, { key: "date", label: "Date" }, COL.uhid, COL.patientName, COL.doctor, { key: "mode", label: "Mode" }, { key: "documentType", label: "Type" }, { key: "amount", label: "Advance", align: "right" }, { key: "balance", label: "Balance", align: "right" }],
    rows,
    stats: [stat("Advances", rows.length), stat("Advance amount", sum(rows, (r) => r.amount).toFixed(2))],
  };
}

async function runPaymentDetail(report, params) {
  const docs = await loadCollection(
    "ip_billing_records",
    { documentType: { $in: ["Advance Collection", "Posting to Finance"] }, ...rangeQuery(report.dateField || "date", params), ...buildFilter(report, params) },
    { date: 1 }
  );
  const rows = docs.map(collectionRow);
  return {
    columns: [COL.ipNo, { key: "receiptNo", label: "Receipt No" }, { key: "date", label: "Date" }, COL.uhid, COL.patientName, COL.doctor, { key: "mode", label: "Mode" }, { key: "amount", label: "Amount", align: "right" }],
    rows,
    stats: [stat("Receipts", rows.length), stat("Collected", sum(rows, (r) => r.amount).toFixed(2))],
  };
}

async function runDailyCollection(report, params) {
  const docs = await loadCollection("ip_billing_records", rangeQuery(report.dateField || "date", params), { date: 1 });
  const map = new Map();
  for (const doc of docs) {
    const key = `${doc.date || ""}|${doc.mode || "Unspecified"}`;
    const row = map.get(key) ?? { date: doc.date || "", mode: doc.mode || "Unspecified", count: 0, collected: 0, refund: 0 };
    if ((doc.status || "") === "Cancelled") row.refund += num(doc.amount);
    else row.collected += num(doc.amount);
    row.count += 1;
    map.set(key, row);
  }
  const rows = [...map.values()]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.mode).localeCompare(String(b.mode)))
    .map((row) => ({
      date: row.date,
      mode: row.mode,
      count: row.count,
      collected: row.collected.toFixed(2),
      refund: row.refund.toFixed(2),
      net: (row.collected - row.refund).toFixed(2),
    }));
  const net = rows.reduce((total, row) => total + num(row.net), 0);
  return {
    columns: [{ key: "date", label: "Date" }, { key: "mode", label: "Mode" }, { key: "count", label: "Entries", align: "right" }, { key: "collected", label: "Collected", align: "right" }, { key: "refund", label: "Refund", align: "right" }, { key: "net", label: "Net", align: "right" }],
    rows,
    stats: [stat("Entries", rows.length), stat("Collected", net.toFixed(2))],
  };
}

/* ------------------------------ presentation -------------------------- */

function filterSummary(report, params, range) {
  const parts = [];
  const selectBy = params.selectBy || "period";
  if (selectBy === "month" && params.month) {
    parts.push({ label: "Period", value: params.month });
  } else if (selectBy === "year" && params.year) {
    parts.push({ label: "Period", value: params.year });
  } else if (range?.from) {
    parts.push({ label: "Period", value: range.from === range.to ? range.from : `${range.from} to ${range.to}` });
  }
  if (report.filters.includes("doctor") && params.doctor) parts.push({ label: "Doctor", value: params.doctor });
  if (report.filters.includes("ward") && params.ward) parts.push({ label: "Ward", value: params.ward });
  if (report.filters.includes("admissionType") && params.admissionType) parts.push({ label: "Admission type", value: params.admissionType });
  if (report.filters.includes("status") && params.status) parts.push({ label: "Status", value: params.status });
  return parts;
}

/* -------------------------------- entry ------------------------------- */

export async function runIpReport(key, params = {}) {
  const report = getIpReport(key);
  if (!report) throw new Error("UNKNOWN_REPORT");

  let result;
  switch (key) {
    case "ip-admission-register":
      result = await runAdmissionRegister(report, params);
      break;
    case "ip-ward-occupancy":
      result = await runWardOccupancy(report, params);
      break;
    case "ip-admission-type-summary":
      result = await runAdmissionTypeSummary(report, params);
      break;
    case "ip-doctor-admissions":
      result = await runDoctorAdmissions(report, params);
      break;
    case "ip-case-sheet-register":
      result = await runCaseSheetRegister(report, params);
      break;
    case "ip-admission-turnaround":
      result = await runAdmissionTurnaround(report, params);
      break;
    case "ip-discharge-to-vacate":
      result = await runDischargeToVacate(report, params);
      break;
    case "ip-stay-duration":
      result = await runStayDuration(report, params);
      break;
    case "ip-advance-detail":
      result = await runAdvanceDetail(report, params);
      break;
    case "ip-payment-detail":
      result = await runPaymentDetail(report, params);
      break;
    case "ip-daily-collection":
      result = await runDailyCollection(report, params);
      break;
    default:
      throw new Error("UNKNOWN_REPORT");
  }

  return {
    report: {
      key: report.key,
      title: report.title,
      legacy: report.legacy,
      note: report.note ?? null,
    },
    branding: await loadBranding(),
    columns: result.columns,
    rows: result.rows,
    stats: result.stats,
    meta: {
      generatedAt: new Date().toISOString(),
      selectBy: params.selectBy || "period",
      range: resolveRange(params),
      summary: filterSummary(report, params, resolveRange(params)),
      rowCount: result.rows.length,
    },
  };
}
