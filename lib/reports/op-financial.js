import { getCollection } from "@/lib/db";
import { escapeRegex } from "@/lib/validation";
import { getOpReport } from "@/config/op-reports";
import { resolveRange, loadBranding, todayIso } from "./op-registration";

/**
 * Server-side query engine for the OPD report screens (§OPD › Report).
 *
 * Every OP financial figure lives on the `op_bills` collection (payment,
 * sponsor and credit data is embedded there); clinical detail lives on
 * `op_visits` / `op_registrations` and card data on `op_privilege_cards`. Rows
 * are mapped to plain, serialisable objects so no driver types reach the client.
 */

/* ------------------------------- helpers ------------------------------ */

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const money = (value) => num(value).toFixed(2);
const sum = (rows, fn) => rows.reduce((total, row) => total + num(fn(row)), 0);
const stat = (label, value) => ({ label, value });

function addDaysIso(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ageingDays(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return "";
  const days = Math.floor((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 86400000);
  return String(Math.max(0, days));
}

function rangeQuery(field, params) {
  const { from, to } = resolveRange(params);
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lt = `${to}\uffff`;
  return Object.keys(range).length ? { [field]: range } : {};
}

async function loadBills(query) {
  const col = await getCollection("op_bills");
  if (!col) throw new Error("DB_UNAVAILABLE");
  return col.find(query).sort({ billDate: 1, billNo: 1 }).limit(20000).toArray();
}

function billRow(b) {
  return {
    billNo: b.billNo || "",
    billDate: b.billDate || "",
    opNo: b.opNo || "",
    uhid: b.uhid || "",
    patientName: b.patientName || "",
    patientType: b.patientType || "",
    gender: b.gender || "",
    age: b.age ?? "",
    department: b.department || "",
    doctor: b.doctor || "",
    grossAmount: money(b.grossAmount),
    discount: money(b.discount),
    tax: money(b.tax),
    serviceCharge: money(b.serviceCharge),
    netAmount: money(b.netAmount),
    paidAmount: money(b.paidAmount),
    balance: money(b.balance),
    paymentMode: b.paymentMode || "",
    paymentBy: b.paymentBy || "",
    sponsorName: b.sponsorName || "",
    sponsorType: b.sponsorType || "",
    status: b.status || "",
    remarks: b.remarks || "",
  };
}

function buildBillQuery(report, params) {
  const query = { ...rangeQuery(report.dateField || "billDate", params) };
  if (report.filters.includes("doctor") && params.doctor) {
    query.doctor = new RegExp(escapeRegex(params.doctor), "i");
  }
  if (report.filters.includes("paymentMode") && params.paymentMode) {
    query.paymentMode = params.paymentMode;
  }
  if (report.filters.includes("patientType") && params.patientType) {
    query.patientType = params.patientType;
  }
  if (report.filters.includes("sponsor") && params.sponsor) {
    query.sponsorName = new RegExp(escapeRegex(params.sponsor), "i");
  }
  return query;
}

function groupBills(bills, keyFn) {
  const map = new Map();
  for (const b of bills) {
    const key = keyFn(b) || "Unspecified";
    const group = map.get(key) ?? { key, bills: 0, gross: 0, discount: 0, net: 0, paid: 0, balance: 0 };
    group.bills += 1;
    group.gross += num(b.grossAmount);
    group.discount += num(b.discount);
    group.net += num(b.netAmount);
    group.paid += num(b.paidAmount);
    group.balance += num(b.balance);
    map.set(key, group);
  }
  return [...map.values()].sort((a, b) => b.net - a.net || String(a.key).localeCompare(String(b.key)));
}

const moneyStats = (bills) => [
  stat("Bills", bills.length),
  stat("Gross", money(sum(bills, (b) => b.grossAmount))),
  stat("Discount", money(sum(bills, (b) => b.discount))),
  stat("Net", money(sum(bills, (b) => b.netAmount))),
  stat("Collected", money(sum(bills, (b) => b.paidAmount))),
  stat("Outstanding", money(sum(bills, (b) => b.balance))),
];

/* ------------------------------- columns ------------------------------ */

const COL = {
  billNo: { key: "billNo", label: "Bill No" },
  billDate: { key: "billDate", label: "Bill Date" },
  visitDate: { key: "visitDate", label: "Visit Date" },
  opNo: { key: "opNo", label: "OP No" },
  uhid: { key: "uhid", label: "UHID" },
  patientName: { key: "patientName", label: "Patient" },
  patientType: { key: "patientType", label: "Patient Type" },
  gender: { key: "gender", label: "Sex" },
  age: { key: "age", label: "Age", align: "right" },
  department: { key: "department", label: "Department" },
  doctor: { key: "doctor", label: "Doctor" },
  purpose: { key: "purpose", label: "Visit Nature" },
  complaint: { key: "complaint", label: "Complaint" },
  diagnosis: { key: "diagnosis", label: "Diagnosis" },
  grossAmount: { key: "grossAmount", label: "Gross", align: "right" },
  discount: { key: "discount", label: "Discount", align: "right" },
  tax: { key: "tax", label: "Tax", align: "right" },
  netAmount: { key: "netAmount", label: "Net Amount", align: "right" },
  paidAmount: { key: "paidAmount", label: "Paid", align: "right" },
  balance: { key: "balance", label: "Balance", align: "right" },
  paymentMode: { key: "paymentMode", label: "Pay Mode" },
  paymentBy: { key: "paymentBy", label: "Paid By" },
  sponsorName: { key: "sponsorName", label: "Sponsor" },
  sponsorType: { key: "sponsorType", label: "Sponsor Type" },
  status: { key: "status", label: "Status" },
  remarks: { key: "remarks", label: "Remarks" },
  bills: { key: "bills", label: "Bills", align: "right" },
  count: { key: "count", label: "Count", align: "right" },
  month: { key: "month", label: "Month" },
  ageing: { key: "ageing", label: "Ageing (days)", align: "right" },
  advance: { key: "advance", label: "Advance", align: "right" },
  creditAmount: { key: "creditAmount", label: "Credit Amount", align: "right" },
  collected: { key: "collected", label: "Collected", align: "right" },
  outstanding: { key: "outstanding", label: "Outstanding", align: "right" },
  cardNo: { key: "cardNo", label: "Card No" },
  discountPct: { key: "discountPct", label: "Discount %", align: "right" },
  creditLimit: { key: "creditLimit", label: "Credit Limit", align: "right" },
  validTo: { key: "validTo", label: "Valid To" },
};

/* ------------------------------- reports ------------------------------ */

async function runDailyCollection(report, params) {
  const bills = await loadBills(buildBillQuery(report, params));
  return {
    columns: [COL.billNo, COL.billDate, COL.uhid, COL.patientName, COL.doctor, COL.department, COL.grossAmount, COL.discount, COL.netAmount, COL.paidAmount, COL.balance, COL.paymentMode, COL.status],
    rows: bills.map(billRow),
    stats: moneyStats(bills),
  };
}

async function runCollectionByMode(report, params) {
  const bills = await loadBills(buildBillQuery(report, params));
  const rows = groupBills(bills, (b) => b.paymentMode).map((g) => ({
    paymentMode: g.key,
    bills: g.bills,
    grossAmount: money(g.gross),
    discount: money(g.discount),
    netAmount: money(g.net),
    paidAmount: money(g.paid),
    balance: money(g.balance),
  }));
  return {
    columns: [COL.paymentMode, COL.bills, COL.grossAmount, COL.discount, COL.netAmount, COL.paidAmount, COL.balance],
    rows,
    stats: moneyStats(bills),
  };
}

async function runCollectionByDoctor(report, params) {
  const bills = await loadBills(buildBillQuery(report, params));
  const rows = groupBills(bills, (b) => b.doctor).map((g) => ({
    doctor: g.key,
    bills: g.bills,
    netAmount: money(g.net),
    paidAmount: money(g.paid),
    balance: money(g.balance),
  }));
  return {
    columns: [COL.doctor, COL.bills, COL.netAmount, COL.paidAmount, COL.balance],
    rows,
    stats: moneyStats(bills),
  };
}

async function runExpenseSummary(report, params) {
  const bills = await loadBills(buildBillQuery(report, params));
  const groups = groupBills(bills, (b) => b.department);
  const rows = groups.map((g) => ({
    department: g.key,
    bills: g.bills,
    grossAmount: money(g.gross),
    discount: money(g.discount),
    netAmount: money(g.net),
  }));
  return {
    columns: [COL.department, COL.bills, COL.grossAmount, COL.discount, COL.netAmount],
    rows,
    stats: [
      stat("Departments", rows.length),
      stat("Bills", bills.length),
      stat("Discount (expense)", money(sum(bills, (b) => b.discount))),
      stat("Net", money(sum(bills, (b) => b.netAmount))),
    ],
  };
}

async function runClinicalPatientDetail(report, params) {
  const query = { ...rangeQuery("visitDate", params) };
  if (report.filters.includes("doctor") && params.doctor) {
    query.doctor = new RegExp(escapeRegex(params.doctor), "i");
  }
  const col = await getCollection("op_visits");
  if (!col) throw new Error("DB_UNAVAILABLE");
  const visits = await col.find(query).sort({ visitDate: 1, opNo: 1 }).limit(20000).toArray();
  const rows = visits.map((v) => ({
    opNo: v.opNo || "",
    visitDate: v.visitDate || "",
    uhid: v.uhid || "",
    patientName: v.patientName || "",
    age: v.age ?? "",
    gender: v.gender || "",
    department: v.department || "",
    doctor: v.doctor || "",
    complaint: v.complaint || "",
    diagnosis: v.diagnosis || v.provisionalDiagnosis || "",
    status: v.status || "",
  }));
  return {
    columns: [COL.opNo, COL.visitDate, COL.uhid, COL.patientName, COL.age, COL.gender, COL.department, COL.doctor, COL.complaint, COL.diagnosis, COL.status],
    rows,
    stats: [
      stat("Visits", rows.length),
      stat("Male", rows.filter((r) => r.gender === "Male").length),
      stat("Female", rows.filter((r) => r.gender === "Female").length),
    ],
  };
}

async function runClinicalByPurpose(report, params) {
  const col = await getCollection("op_registrations");
  if (!col) throw new Error("DB_UNAVAILABLE");
  const query = rangeQuery(report.dateField || "visitDate", params);
  const regs = await col.find(query).limit(20000).toArray();
  const map = new Map();
  for (const r of regs) {
    const key = r.purpose || "Unspecified";
    const group = map.get(key) ?? { key, count: 0, maleCount: 0, femaleCount: 0 };
    group.count += 1;
    if (r.gender === "Male") group.maleCount += 1;
    if (r.gender === "Female") group.femaleCount += 1;
    map.set(key, group);
  }
  const rows = [...map.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return {
    columns: [COL.purpose, COL.count, { key: "maleCount", label: "Male", align: "right" }, { key: "femaleCount", label: "Female", align: "right" }],
    rows,
    stats: [stat("Visits", rows.reduce((t, r) => t + r.count, 0)), stat("Visit natures", rows.length)],
  };
}

async function runBillDetail(report, params) {
  const bills = await loadBills(buildBillQuery(report, params));
  return {
    columns: [COL.billNo, COL.billDate, COL.uhid, COL.patientName, COL.doctor, COL.department, COL.grossAmount, COL.discount, COL.tax, COL.netAmount, COL.paidAmount, COL.balance, COL.paymentMode, COL.status],
    rows: bills.map(billRow),
    stats: moneyStats(bills),
  };
}

async function runCancelledBills(report, params) {
  const query = { ...buildBillQuery(report, params), status: "Cancelled" };
  const bills = await loadBills(query);
  return {
    columns: [COL.billNo, COL.billDate, COL.uhid, COL.patientName, COL.doctor, COL.netAmount, COL.paymentMode, COL.remarks, COL.status],
    rows: bills.map(billRow),
    stats: [stat("Cancelled bills", bills.length), stat("Cancelled value", money(sum(bills, (b) => b.netAmount)))],
  };
}

async function runDueDetail(report, params) {
  const query = buildBillQuery(report, params);
  query.balance = { $gt: 0 };
  const bills = await loadBills(query);
  const rows = bills.map((b) => ({ ...billRow(b), ageing: ageingDays(b.billDate) }));
  return {
    columns: [COL.billNo, COL.billDate, COL.uhid, COL.patientName, COL.doctor, COL.netAmount, COL.paidAmount, COL.balance, COL.ageing, COL.sponsorName],
    rows,
    stats: [
      stat("Due bills", bills.length),
      stat("Due amount", money(sum(bills, (b) => b.balance))),
      stat("Average ageing (days)", rows.length ? Math.round(rows.reduce((t, r) => t + num(r.ageing), 0) / rows.length) : 0),
    ],
  };
}

async function runAdvanceRegister(report, params) {
  const query = buildBillQuery(report, params);
  query.$expr = { $gt: ["$paidAmount", "$netAmount"] };
  const bills = await loadBills(query);
  const rows = bills.map((b) => ({ ...billRow(b), advance: money(num(b.paidAmount) - num(b.netAmount)) }));
  return {
    columns: [COL.billDate, COL.billNo, COL.uhid, COL.patientName, COL.netAmount, COL.paidAmount, COL.advance, COL.paymentMode],
    rows,
    stats: [stat("Advance receipts", bills.length), stat("Advance amount", money(sum(rows, (r) => r.advance)))],
  };
}

async function runRefundRegister(report, params) {
  const query = buildBillQuery(report, params);
  query.$or = [
    { paymentMode: { $regex: "refund", $options: "i" } },
    { status: { $regex: "refund", $options: "i" } },
    { paidAmount: { $lt: 0 } },
  ];
  const bills = await loadBills(query);
  return {
    columns: [COL.billDate, COL.billNo, COL.uhid, COL.patientName, COL.netAmount, COL.paidAmount, COL.balance, COL.paymentMode, COL.status],
    rows: bills.map(billRow),
    stats: [stat("Refunds", bills.length), stat("Refund amount", money(sum(bills, (b) => Math.abs(num(b.paidAmount)))))],
  };
}

const isSponsored = (b) => Boolean(b.sponsorName || b.sponsorType);

async function runSponsorCollection(report, params) {
  const bills = (await loadBills(buildBillQuery(report, params))).filter(isSponsored);
  const groups = groupBills(bills, (b) => b.sponsorName || "Unspecified");
  const rows = groups.map((g) => {
    const sample = bills.find((b) => (b.sponsorName || "Unspecified") === g.key);
    return {
      sponsorName: g.key,
      sponsorType: sample?.sponsorType || "",
      bills: g.bills,
      netAmount: money(g.net),
      paidAmount: money(g.paid),
      balance: money(g.balance),
    };
  });
  return {
    columns: [COL.sponsorName, COL.sponsorType, COL.bills, COL.netAmount, COL.paidAmount, COL.balance],
    rows,
    stats: [
      stat("Sponsors", rows.length),
      stat("Bills", bills.length),
      stat("Billed", money(sum(bills, (b) => b.netAmount))),
      stat("Collected", money(sum(bills, (b) => b.paidAmount))),
      stat("Outstanding", money(sum(bills, (b) => b.balance))),
    ],
  };
}

async function runSponsorDue(report, params) {
  const query = buildBillQuery(report, params);
  query.balance = { $gt: 0 };
  const bills = (await loadBills(query)).filter(isSponsored);
  return {
    columns: [COL.sponsorName, COL.billNo, COL.billDate, COL.uhid, COL.patientName, COL.netAmount, COL.paidAmount, COL.balance],
    rows: bills.map(billRow),
    stats: [
      stat("Sponsors", new Set(bills.map((b) => b.sponsorName || "Unspecified")).size),
      stat("Due bills", bills.length),
      stat("Outstanding", money(sum(bills, (b) => b.balance))),
    ],
  };
}

async function runMonthlyCollection(report, params) {
  const bills = await loadBills(buildBillQuery(report, params));
  const groups = groupBills(bills, (b) => String(b.billDate || "").slice(0, 7) || "Unspecified");
  const rows = groups
    .sort((a, b) => String(a.key).localeCompare(String(b.key)))
    .map((g) => ({
      month: g.key,
      bills: g.bills,
      grossAmount: money(g.gross),
      discount: money(g.discount),
      netAmount: money(g.net),
      paidAmount: money(g.paid),
      balance: money(g.balance),
    }));
  return {
    columns: [COL.month, COL.bills, COL.grossAmount, COL.discount, COL.netAmount, COL.paidAmount, COL.balance],
    rows,
    stats: moneyStats(bills),
  };
}

async function runPatientBillDetail(report, params) {
  const bills = await loadBills(buildBillQuery(report, params));
  return {
    columns: [COL.billNo, COL.billDate, COL.uhid, COL.patientName, COL.patientType, COL.doctor, COL.department, COL.netAmount, COL.paidAmount, COL.balance, COL.paymentMode, COL.status],
    rows: bills.map(billRow),
    stats: moneyStats(bills),
  };
}

async function runPatientBillCash(report, params) {
  const query = buildBillQuery(report, params);
  query.balance = 0;
  query.paymentMode = { $not: { $regex: "credit", $options: "i" } };
  query.sponsorName = { $in: ["", null] };
  const bills = await loadBills(query);
  return {
    columns: [COL.billNo, COL.billDate, COL.uhid, COL.patientName, COL.doctor, COL.netAmount, COL.discount, COL.paidAmount, COL.paymentMode, COL.status],
    rows: bills.map(billRow),
    stats: [stat("Cash bills", bills.length), stat("Cash collected", money(sum(bills, (b) => b.paidAmount))), stat("Discount", money(sum(bills, (b) => b.discount)))],
  };
}

async function runPatientBillCredit(report, params) {
  const query = buildBillQuery(report, params);
  query.$or = [
    { status: { $regex: "credit", $options: "i" } },
    { paymentMode: { $regex: "credit", $options: "i" } },
    { balance: { $gt: 0 } },
    { sponsorName: { $nin: ["", null] } },
  ];
  const bills = await loadBills(query);
  const rows = bills.map((b) => ({ ...billRow(b), creditAmount: money(num(b.balance) || num(b.netAmount)) }));
  return {
    columns: [COL.billNo, COL.billDate, COL.uhid, COL.patientName, COL.sponsorName, COL.netAmount, COL.discount, COL.creditAmount, COL.status],
    rows,
    stats: [stat("Credit bills", bills.length), stat("Credit amount", money(sum(rows, (r) => r.creditAmount)))],
  };
}

async function cardIndex() {
  const col = await getCollection("op_privilege_cards");
  const map = new Map();
  if (!col) return map;
  const cards = await col.find({}).toArray();
  for (const card of cards) {
    if (card.uhid && !map.has(card.uhid)) map.set(card.uhid, card);
  }
  return map;
}

async function runPrivilegeCardUsage(report, params) {
  const bills = await loadBills(buildBillQuery(report, params));
  const col = await getCollection("op_privilege_cards");
  if (!col) throw new Error("DB_UNAVAILABLE");
  const uhids = [...new Set(bills.map((b) => b.uhid).filter(Boolean))];
  const index = new Map();
  if (uhids.length > 0) {
    const cards = await col.find({ uhid: { $in: uhids } }).toArray();
    for (const c of cards) if (!index.has(c.uhid)) index.set(c.uhid, c);
  }
  const matched = bills.filter((b) => index.has(b.uhid));
  const rows = matched.map((b) => {
    const card = index.get(b.uhid) || {};
    return {
      uhid: b.uhid || "",
      patientName: b.patientName || "",
      cardNo: card.cardNo || card.code || "",
      discountPct: card.discountPct ?? "",
      validTo: card.validTo || "",
      billNo: b.billNo || "",
      billDate: b.billDate || "",
      netAmount: money(b.netAmount),
      discount: money(b.discount),
      paidAmount: money(b.paidAmount),
      balance: money(b.balance),
    };
  });
  return {
    columns: [COL.uhid, COL.patientName, COL.cardNo, COL.discountPct, COL.validTo, COL.billNo, COL.billDate, COL.netAmount, COL.discount, COL.paidAmount, COL.balance],
    rows,
    stats: [
      stat("Card holders", new Set(matched.map((b) => b.uhid)).size),
      stat("Bills", matched.length),
      stat("Billed", money(sum(matched, (b) => b.netAmount))),
      stat("Discount", money(sum(matched, (b) => b.discount))),
    ],
  };
}

async function runCardExpiry(params) {
  const col = await getCollection("op_privilege_cards");
  if (!col) throw new Error("DB_UNAVAILABLE");
  const today = todayIso();
  const query = {};
  const expiryWithin = params.expiryWithin === "" || params.expiryWithin == null ? null : Number(params.expiryWithin);
  if (expiryWithin != null && Number.isFinite(expiryWithin)) {
    query.validTo = { $gte: today, $lte: addDaysIso(today, expiryWithin) };
  }
  const cards = await col.find(query).sort({ validTo: 1, cardNo: 1 }).limit(5000).toArray();
  const uhids = [...new Set(cards.map((c) => c.uhid).filter(Boolean))];
  const pcol = await getCollection("patients");
  const patients = new Map();
  if (pcol && uhids.length > 0) {
    const rows = await pcol.find({ uhid: { $in: uhids } }, { projection: { uhid: 1, patientName: 1 } }).toArray();
    for (const r of rows) patients.set(r.uhid, r);
  }
  const soon = addDaysIso(today, 30);
  const rows = cards.map((c) => ({
    cardNo: c.cardNo || c.code || "",
    uhid: c.uhid || "",
    patientName: patients.get(c.uhid)?.patientName || c.name || "",
    discountPct: c.discountPct ?? "",
    creditLimit: money(c.creditLimit ?? 0),
    validTo: c.validTo || "",
    status: c.status || "",
  }));
  return {
    columns: [COL.cardNo, COL.uhid, COL.patientName, COL.discountPct, COL.creditLimit, COL.validTo, COL.status],
    rows,
    stats: [
      stat("Cards", rows.length),
      stat("Expired", rows.filter((r) => r.validTo && r.validTo < today).length),
      stat("Expiring within 30 days", rows.filter((r) => r.validTo >= today && r.validTo <= soon).length),
    ],
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
  if (report.filters.includes("paymentMode") && params.paymentMode) parts.push({ label: "Pay mode", value: params.paymentMode });
  if (report.filters.includes("patientType") && params.patientType) parts.push({ label: "Patient type", value: params.patientType });
  if (report.filters.includes("sponsor") && params.sponsor) parts.push({ label: "Sponsor", value: params.sponsor });
  if (report.filters.includes("expiryWithin") && params.expiryWithin !== "" && params.expiryWithin != null) {
    parts.push({ label: "Expiry within", value: `${params.expiryWithin} days` });
  }
  return parts;
}

/* -------------------------------- entry ------------------------------- */

export async function runOpReport(key, params = {}) {
  const report = getOpReport(key);
  if (!report) throw new Error("UNKNOWN_REPORT");

  let result;
  switch (key) {
    case "op-daily-collection":
      result = await runDailyCollection(report, params);
      break;
    case "op-collection-by-mode":
      result = await runCollectionByMode(report, params);
      break;
    case "op-collection-by-doctor":
      result = await runCollectionByDoctor(report, params);
      break;
    case "op-expense-summary":
      result = await runExpenseSummary(report, params);
      break;
    case "clinical-patient-detail":
      result = await runClinicalPatientDetail(report, params);
      break;
    case "clinical-by-purpose":
      result = await runClinicalByPurpose(report, params);
      break;
    case "op-bill-detail":
      result = await runBillDetail(report, params);
      break;
    case "op-cancelled-bills":
      result = await runCancelledBills(report, params);
      break;
    case "op-due-detail":
      result = await runDueDetail(report, params);
      break;
    case "op-advance-register":
      result = await runAdvanceRegister(report, params);
      break;
    case "op-refund-register":
      result = await runRefundRegister(report, params);
      break;
    case "op-sponsor-collection":
      result = await runSponsorCollection(report, params);
      break;
    case "op-sponsor-due":
      result = await runSponsorDue(report, params);
      break;
    case "op-monthly-collection":
      result = await runMonthlyCollection(report, params);
      break;
    case "patient-bill-detail":
      result = await runPatientBillDetail(report, params);
      break;
    case "patient-bill-cash":
      result = await runPatientBillCash(report, params);
      break;
    case "patient-bill-credit":
      result = await runPatientBillCredit(report, params);
      break;
    case "privilege-card-usage":
      result = await runPrivilegeCardUsage(report, params);
      break;
    case "privilege-card-expiry":
      result = await runCardExpiry(params);
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
