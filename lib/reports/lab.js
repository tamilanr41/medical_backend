/**
 * Laboratory › Report engine (legacy `FrameWork/Lab/*Report.jsp`).
 *
 * Lab orders are held on `lab_checkins` (one document per request, with the
 * requested tests embedded as lines) and results on `lab_results` (one document
 * per result line). External referrals live on `lab_external_tests`. Query
 * execution lives here; the catalogue is `config/lab-reports.js`.
 */

import { getCollection } from "@/lib/db";
import { escapeRegex } from "@/lib/validation";
import { resolveRange, loadBranding } from "@/lib/reports/op-registration";
import { getLabReport } from "@/config/lab-reports";

const stat = (label, value) => ({ label, value });
const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const sum = (rows, fn) => rows.reduce((total, row) => total + num(fn(row)), 0);
const money = (value) => num(value).toFixed(2);

function rangeQuery(field, params) {
  const { from, to } = resolveRange(params);
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lt = `${to}\uffff`;
  return Object.keys(range).length ? { [field]: range } : {};
}

function textFilter(field, value) {
  if (!value) return {};
  return { [field]: new RegExp(escapeRegex(value), "i") };
}

async function loadOrders(report, params) {
  const col = await getCollection("lab_checkins");
  if (!col) throw new Error("DB_UNAVAILABLE");
  const query = {
    ...rangeQuery(report.dateField || "receivedAt", params),
    ...textFilter("doctor", params.doctor),
  };
  if (params.status && report.filters.includes("status")) query.status = params.status;
  if (params.test && report.filters.includes("test")) query["tests.name"] = new RegExp(escapeRegex(params.test), "i");
  return col.find(query).sort({ receivedAt: 1, checkinNo: 1 }).limit(20000).toArray();
}

async function loadResults(report, params) {
  const col = await getCollection("lab_results");
  if (!col) throw new Error("DB_UNAVAILABLE");
  const query = { ...rangeQuery(report.dateField || "resultDate", params) };
  if (params.status && report.filters.includes("status")) query.status = params.status;
  if (params.test && report.filters.includes("test")) query.testName = new RegExp(escapeRegex(params.test), "i");
  return col.find(query).sort({ resultDate: 1, resultNo: 1 }).limit(20000).toArray();
}

function testsOf(order) {
  return Array.isArray(order.tests) ? order.tests : [];
}

function testNames(order) {
  return (order.tests || []).map((line) => String(line?.name ?? "").trim()).filter(Boolean);
}

/* ------------------------------- columns ------------------------------ */

const COL = {
  checkinNo: { key: "checkinNo", label: "Check-in No" },
  receivedAt: { key: "receivedAt", label: "Received" },
  uhid: { key: "uhid", label: "UHID" },
  patientName: { key: "patientName", label: "Patient" },
  doctor: { key: "doctor", label: "Doctor" },
  tests: { key: "tests", label: "Tests" },
  testCount: { key: "testCount", label: "Tests", align: "right" },
  amount: { key: "amount", label: "Amount", align: "right" },
  mode: { key: "mode", label: "Mode" },
  status: { key: "status", label: "Status" },
  test: { key: "test", label: "Test" },
  orders: { key: "orders", label: "Orders", align: "right" },
  results: { key: "results", label: "Results", align: "right" },
  pending: { key: "pending", label: "Pending", align: "right" },
  resultNo: { key: "resultNo", label: "Result No" },
  resultDate: { key: "resultDate", label: "Date" },
  checkinNoR: { key: "checkinNo", label: "Check-in No" },
  uhidR: { key: "uhid", label: "UHID" },
  patientNameR: { key: "patientName", label: "Patient" },
  result: { key: "result", label: "Result" },
  unit: { key: "unit", label: "Unit" },
  normalRange: { key: "normalRange", label: "Normal Range" },
  pathologist: { key: "pathologist", label: "Pathologist" },
  date: { key: "date", label: "Sent Date" },
  patientNameX: { key: "patientName", label: "Patient" },
  requestNo: { key: "requestNo", label: "Request No" },
  externalLab: { key: "externalLab", label: "External Org" },
  quotedAmount: { key: "quotedAmount", label: "Quoted", align: "right" },
  billedAmount: { key: "billedAmount", label: "Billed", align: "right" },
  entries: { key: "entries", label: "Entries", align: "right" },
  collected: { key: "collected", label: "Collected", align: "right" },
  net: { key: "net", label: "Net", align: "right" },
};

/* ------------------------------- reports ------------------------------ */

function orderRow(order) {
  const tests = order.tests || [];
  return {
    checkinNo: order.checkinNo || "",
    receivedAt: order.receivedAt || "",
    uhid: order.uhid || "",
    patientName: order.patientName || "",
    doctor: order.doctor || "",
    tests: tests.map((line) => line.name).filter(Boolean).join(", "),
    testCount: tests.length,
    amount: money(order.netAmount),
    mode: order.paymentMode || "",
    status: order.status || "",
  };
}

function orderStats(orders) {
  return [
    stat("Orders", orders.length),
    stat("Tests", orders.reduce((total, order) => total + (order.tests || []).length, 0)),
    stat("Amount", money(sum(orders, (order) => order.netAmount))),
  ];
}

async function runOrderRegister(report, params) {
  const orders = await loadOrders(report, params);
  return {
    columns: [COL.checkinNo, COL.receivedAt, COL.uhid, COL.patientName, COL.doctor, COL.tests, COL.amount, COL.mode, COL.status],
    rows: orders.map(orderRow),
    stats: orderStats(orders),
  };
}

async function runTestProfile(report, params) {
  const orders = await loadOrders(report, params);
  const results = await loadResults(report, params);
  const map = new Map();
  for (const order of orders) {
    const seen = new Set();
    for (const line of order.tests || []) {
      const name = String(line?.name || "").trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const row = map.get(name) ?? { test: name, orders: 0, amount: 0, results: 0, pending: 0 };
      row.orders += 1;
      row.amount += num(line.rate);
      map.set(name, row);
    }
  }
  for (const result of results) {
    const name = result.testName || "Unspecified";
    const row = map.get(name) ?? { test: name, orders: 0, amount: 0, results: 0, pending: 0 };
    row.results += 1;
    if (result.status === "Pending") row.pending += 1;
    map.set(name, row);
  }
  const rows = [...map.values()]
    .sort((a, b) => b.orders - a.orders || b.results - a.results || String(a.test).localeCompare(String(b.test)))
    .map((row) => ({ test: row.test, orders: row.orders, amount: money(row.amount), results: row.results, pending: row.pending }));
  return {
    columns: [COL.test, COL.orders, COL.amount, COL.results, COL.pending],
    rows,
    stats: [stat("Tests", rows.length), stat("Orders", sum(rows, (row) => row.orders)), stat("Amount", money(sum(rows, (row) => row.amount)))],
  };
}

async function runResultRegister(report, params) {
  const results = await loadResults(report, params);
  const rows = results.map((r) => ({
    resultNo: r.resultNo || "",
    resultDate: r.resultDate || "",
    checkinNo: r.checkinNo || "",
    uhid: r.uhid || "",
    patientName: r.patientName || "",
    test: r.testName || "",
    result: r.result || "",
    unit: r.unit || "",
    normalRange: r.normalRange || "",
    pathologist: r.pathologist || "",
    status: r.status || "",
  }));
  return {
    columns: [COL.resultNo, COL.resultDate, COL.checkinNoR, COL.uhidR, COL.patientNameR, COL.test, COL.result, COL.unit, COL.normalRange, COL.pathologist, COL.status],
    rows,
    stats: [
      stat("Results", rows.length),
      stat("Pending", rows.filter((r) => r.status === "Pending").length),
      stat("Final", rows.filter((r) => r.status === "Final").length),
      stat("Dispatched", rows.filter((r) => r.status === "Dispatched").length),
    ],
  };
}

async function runExternalShare(report, params) {
  const col = await getCollection("lab_external_tests");
  if (!col) throw new Error("DB_UNAVAILABLE");
  const referrals = await col.find(rangeQuery(report.dateField || "sentDate", params)).sort({ sentDate: 1 }).limit(20000).toArray();

  const amounts = await getCollection("lab_external_amounts");
  const byRequest = new Map();
  if (amounts) {
    const rows = await amounts.find({}).toArray().catch(() => []);
    for (const row of rows) {
      if (row.requestNo) byRequest.set(row.requestNo, row);
    }
  }

  const rows = referrals.map((r) => {
    const amount = byRequest.get(r.requestNo) || {};
    return {
      requestNo: r.requestNo || "",
      date: r.sentDate || "",
      uhid: r.uhid || "",
      patientName: r.patientName || "",
      test: r.testName || "",
      externalLab: r.externalLab || "",
      quotedAmount: money(amount.quotedAmount),
      billedAmount: money(amount.billedAmount ?? amount.approvedAmount),
      status: r.status || "",
    };
  });
  return {
    columns: [COL.requestNo, COL.date, COL.uhidR, COL.patientNameX, COL.test, COL.externalLab, COL.quotedAmount, COL.billedAmount, COL.status],
    rows,
    stats: [stat("Referrals", rows.length), stat("Shared amount", money(sum(rows, (row) => row.billedAmount)))],
  };
}

async function runDailyCollection(report, params) {
  const orders = await loadOrders(report, params);
  const map = new Map();
  for (const order of orders) {
    const key = `${order.receivedAt || ""}|${order.paymentMode || "Unspecified"}`;
    const row = map.get(key) ?? { date: order.receivedAt || "", mode: order.paymentMode || "Unspecified", entries: 0, collected: 0 };
    row.entries += 1;
    row.collected += num(order.netAmount);
    map.set(key, row);
  }
  const rows = [...map.values()]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.mode).localeCompare(String(b.mode)))
    .map((row) => ({ date: row.date, mode: row.mode, entries: row.entries, collected: money(row.collected), net: money(row.collected) }));
  return {
    columns: [COL.date, COL.mode, COL.entries, COL.collected, COL.net],
    rows,
    stats: [stat("Entries", rows.length), stat("Collected", money(sum(rows, (row) => row.collected)))],
  };
}

/* ------------------------------ presentation -------------------------- */

function filterSummary(report, params, range) {
  const parts = [];
  const selectBy = params.selectBy || "period";
  if (selectBy === "month" && params.month) parts.push({ label: "Period", value: params.month });
  else if (selectBy === "year" && params.year) parts.push({ label: "Period", value: params.year });
  else if (range?.from) parts.push({ label: "Period", value: range.from === range.to ? range.from : `${range.from} to ${range.to}` });

  if (report.filters.includes("doctor") && params.doctor) parts.push({ label: "Doctor", value: params.doctor });
  if (report.filters.includes("test") && params.test) parts.push({ label: "Test", value: params.test });
  if (report.filters.includes("status") && params.status) parts.push({ label: "Status", value: params.status });
  return parts;
}

/* -------------------------------- entry ------------------------------- */

export async function runLabReport(key, params = {}) {
  const report = getLabReport(key);
  if (!report) throw new Error("UNKNOWN_REPORT");

  let result;
  switch (key) {
    case "lab-order-register":
      result = await runOrderRegister(report, params);
      break;
    case "lab-test-profile":
      result = await runTestProfile(report, params);
      break;
    case "lab-result-register":
      result = await runResultRegister(report, params);
      break;
    case "lab-externalorg-share":
      result = await runExternalShare(report, params);
      break;
    case "lab-daily-collection":
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
