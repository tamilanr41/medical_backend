import { getCollection } from "@/lib/db";
import { escapeRegex } from "@/lib/validation";
import { CASE_TYPE_OPTIONS, getReport } from "@/config/reports";

/**
 * Server-side query engine for the OP Registration Report screens (§OPD ›
 * Report › Registration). Every function here reads from MongoDB through the
 * shared `getCollection` helper and returns plain, serialisable rows — no driver
 * types leak to the client.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const YEAR_RE = /^\d{4}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const pad = (value) => String(value).padStart(2, "0");

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDaysIso(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ------------------------------- params ------------------------------- */

const RANGE_OPTIONAL_FILTERS = new Set(["expiryWithin", "creditLimit"]);

export function resolveRange(params = {}) {
  const selectBy = params.selectBy || "period";
  if (selectBy === "month" && MONTH_RE.test(params.month || "")) {
    const [year, month] = params.month.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
  }
  if (selectBy === "year" && YEAR_RE.test(String(params.year || ""))) {
    return { from: `${params.year}-01-01`, to: `${params.year}-12-31` };
  }
  return {
    from: params.fromDate || "",
    to: params.toDate || params.fromDate || "",
  };
}

export function validateParams(report, params = {}) {
  const errors = {};
  const selectBy = params.selectBy || "period";
  const rangeOptional =
    report.dateMode === "none" ||
    report.filters.some((filter) => RANGE_OPTIONAL_FILTERS.has(filter));

  if (!["period", "time", "month", "year"].includes(selectBy)) {
    errors.selectBy = "Choose a valid Select By option.";
  }

  if (selectBy === "month") {
    if (!MONTH_RE.test(params.month || "")) errors.month = "Choose a month.";
  } else if (selectBy === "year") {
    if (!YEAR_RE.test(String(params.year || ""))) errors.year = "Choose a year.";
  } else {
    const hasRange = DATE_RE.test(params.fromDate || "") || DATE_RE.test(params.toDate || "");
    if (!rangeOptional || hasRange) {
      if (!DATE_RE.test(params.fromDate || "")) errors.fromDate = "Choose a from date.";
    }
    if (params.toDate && !DATE_RE.test(params.toDate)) errors.toDate = "Choose a valid to date.";
    if (DATE_RE.test(params.fromDate || "") && DATE_RE.test(params.toDate || "") && params.fromDate > params.toDate) {
      errors.toDate = "The to date must be on or after the from date.";
    }
    if (selectBy === "time") {
      if (!TIME_RE.test(params.fromTime || "")) errors.fromTime = "Choose a from time.";
      if (!TIME_RE.test(params.toTime || "")) errors.toTime = "Choose a to time.";
      if (TIME_RE.test(params.fromTime || "") && TIME_RE.test(params.toTime || "") && params.fromTime > params.toTime) {
        errors.toTime = "The to time must be on or after the from time.";
      }
    }
  }

  if (params.caseType && !["ALL", "NEW_CASE", "OLD_CASE"].includes(params.caseType)) {
    errors.caseType = "Choose a valid case type.";
  }
  if (params.expiryWithin != null && params.expiryWithin !== "" && !(Number(params.expiryWithin) >= 0)) {
    errors.expiryWithin = "Enter the number of days.";
  }
  if (params.limitStart != null && params.limitStart !== "" && !(Number(params.limitStart) >= 0)) {
    errors.limitStart = "Enter a valid lower limit.";
  }
  if (params.limitEnd != null && params.limitEnd !== "" && !(Number(params.limitEnd) >= 0)) {
    errors.limitEnd = "Enter a valid upper limit.";
  }
  if (
    params.limitStart !== "" &&
    params.limitEnd !== "" &&
    params.limitStart != null &&
    params.limitEnd != null &&
    Number(params.limitStart) > Number(params.limitEnd)
  ) {
    errors.limitEnd = "The upper limit must be greater than the lower limit.";
  }

  return errors;
}

/* ------------------------------- queries ------------------------------ */

function dateFilter(field, from, to) {
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lt = `${to}\uffff`;
  return Object.keys(range).length ? { [field]: range } : {};
}

function buildRegistrationQuery(report, params) {
  const { from, to } = resolveRange(params);
  const query = { ...dateFilter("visitDate", from, to) };

  if (report.key === "cancelled-registrations") query.status = "Cancelled";
  if (report.key === "referred-by-doctor") query.referredBy = { $nin: ["", null] };

  if (report.filters.includes("doctor") && params.doctor) {
    const field = report.key === "referred-by-doctor" ? "referredBy" : "doctor";
    query[field] = new RegExp(escapeRegex(params.doctor), "i");
  }
  if (report.filters.includes("visitNature") && params.visitNature) {
    query.purpose = params.visitNature;
  }

  if ((params.selectBy || "period") === "time" && report.dateField === "visitDate") {
    const time = {};
    if (params.fromTime) time.$gte = params.fromTime;
    if (params.toTime) time.$lte = params.toTime;
    if (Object.keys(time).length) query.slotStart = time;
  }

  return query;
}

async function loadRegistrations(query) {
  const col = await getCollection("op_registrations");
  if (!col) throw new Error("DB_UNAVAILABLE");
  return col.find(query).sort({ visitDate: 1, slotStart: 1, opNo: 1 }).limit(20000).toArray();
}

async function tagCaseType(regs) {
  if (regs.length === 0) return [];
  const uhids = [...new Set(regs.map((r) => r.uhid).filter(Boolean))];
  const col = await getCollection("op_registrations");
  const first = new Map();
  if (col && uhids.length > 0) {
    const rows = await col
      .aggregate([
        { $match: { uhid: { $in: uhids }, visitDate: { $type: "string" } } },
        { $group: { _id: "$uhid", first: { $min: "$visitDate" } } },
      ])
      .toArray();
    for (const row of rows) first.set(row._id, row.first);
  }
  return regs.map((r) => ({
    ...r,
    caseType: String(r.visitDate || "") === first.get(r.uhid) ? "New" : "Old",
  }));
}

function filterCaseType(regs, caseType) {
  if (!caseType || caseType === "ALL") return regs;
  const wanted = caseType === "NEW_CASE" ? "New" : "Old";
  return regs.filter((r) => r.caseType === wanted);
}

function countBy(regs, predicate) {
  return regs.reduce((total, r) => total + (predicate(r) ? 1 : 0), 0);
}

function stat(label, value) {
  return { label, value };
}

function groupCounts(regs, keyFn) {
  const groups = new Map();
  for (const r of regs) {
    const key = keyFn(r) || "Unspecified";
    const group = groups.get(key) ?? { key, total: 0, newCount: 0, oldCount: 0, maleCount: 0, femaleCount: 0 };
    group.total += 1;
    if (r.caseType === "New") group.newCount += 1;
    else group.oldCount += 1;
    if (r.gender === "Male") group.maleCount += 1;
    if (r.gender === "Female") group.femaleCount += 1;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

function regRow(r) {
  return {
    opNo: r.opNo || "",
    visitDate: r.visitDate || "",
    uhid: r.uhid || "",
    patientName: r.patientName || "",
    gender: r.gender || "",
    age: r.age ?? "",
    department: r.department || "",
    doctor: r.doctor || "",
    purpose: r.purpose || "",
    referredBy: r.referredBy || "",
    tokenNo: r.tokenNo ?? "",
    slotStart: r.slotStart || "",
    slotEnd: r.slotEnd || "",
    appointmentType: r.appointmentType || "",
    status: r.status || "",
    caseType: r.caseType || "",
    remarks: r.remarks || "",
  };
}

/* ------------------------------- reports ------------------------------ */

const COL = {
  opNo: { key: "opNo", label: "OP No" },
  visitDate: { key: "visitDate", label: "Visit Date" },
  uhid: { key: "uhid", label: "UHID" },
  patientName: { key: "patientName", label: "Patient" },
  gender: { key: "gender", label: "Sex" },
  age: { key: "age", label: "Age", align: "right" },
  department: { key: "department", label: "Specialty" },
  doctor: { key: "doctor", label: "Doctor" },
  purpose: { key: "purpose", label: "Purpose" },
  referredBy: { key: "referredBy", label: "Referred By" },
  caseType: { key: "caseType", label: "Case" },
  tokenNo: { key: "tokenNo", label: "Token", align: "right" },
  status: { key: "status", label: "Status" },
  remarks: { key: "remarks", label: "Remarks" },
  cardNo: { key: "cardNo", label: "Card No" },
  mobile: { key: "mobile", label: "Mobile" },
  discountPct: { key: "discountPct", label: "Discount %", align: "right" },
  creditLimit: { key: "creditLimit", label: "Credit Limit", align: "right" },
  validTo: { key: "validTo", label: "Valid To" },
  total: { key: "total", label: "Total", align: "right" },
  newCount: { key: "newCount", label: "New", align: "right" },
  oldCount: { key: "oldCount", label: "Old", align: "right" },
  maleCount: { key: "maleCount", label: "Male", align: "right" },
  femaleCount: { key: "femaleCount", label: "Female", align: "right" },
};

const registrationDetailStats = (regs) => [
  stat("Total registrations", regs.length),
  stat("Male", countBy(regs, (r) => r.gender === "Male")),
  stat("Female", countBy(regs, (r) => r.gender === "Female")),
  stat("New cases", countBy(regs, (r) => r.caseType === "New")),
  stat("Old cases", countBy(regs, (r) => r.caseType === "Old")),
];

async function runRegistrationReport(report, params) {
  const query = buildRegistrationQuery(report, params);
  const regs = filterCaseType(await tagCaseType(await loadRegistrations(query)), params.caseType);
  return {
    columns: [COL.opNo, COL.visitDate, COL.uhid, COL.patientName, COL.gender, COL.age, COL.department, COL.doctor, COL.purpose, COL.status],
    rows: regs.map(regRow),
    stats: registrationDetailStats(regs),
  };
}

async function runDoctorReport(report, params) {
  const query = buildRegistrationQuery(report, params);
  const regs = filterCaseType(await tagCaseType(await loadRegistrations(query)), params.caseType);
  const rows = groupCounts(regs, (r) => r.doctor).map((g) => ({
    doctor: g.key,
    total: g.total,
    newCount: g.newCount,
    oldCount: g.oldCount,
    maleCount: g.maleCount,
    femaleCount: g.femaleCount,
  }));
  return {
    columns: [COL.doctor, COL.total, COL.newCount, COL.oldCount, COL.maleCount, COL.femaleCount],
    rows,
    stats: [
      stat("Total registrations", regs.length),
      stat("Doctors", rows.length),
      stat("New cases", countBy(regs, (r) => r.caseType === "New")),
      stat("Old cases", countBy(regs, (r) => r.caseType === "Old")),
    ],
  };
}

async function runReferredByReport(report, params) {
  const query = buildRegistrationQuery(report, params);
  const regs = filterCaseType(await tagCaseType(await loadRegistrations(query)), params.caseType);
  const rows = groupCounts(regs, (r) => r.referredBy).map((g) => ({
    referredBy: g.key,
    total: g.total,
    newCount: g.newCount,
    oldCount: g.oldCount,
    maleCount: g.maleCount,
    femaleCount: g.femaleCount,
  }));
  return {
    columns: [COL.referredBy, COL.total, COL.newCount, COL.oldCount, COL.maleCount, COL.femaleCount],
    rows,
    stats: [
      stat("Total registrations", regs.length),
      stat("Referring doctors", rows.length),
      stat("New cases", countBy(regs, (r) => r.caseType === "New")),
    ],
  };
}

async function runCancelledReport(report, params) {
  const query = buildRegistrationQuery(report, params);
  const regs = await loadRegistrations(query);
  return {
    columns: [COL.opNo, COL.visitDate, COL.uhid, COL.patientName, COL.doctor, COL.department, COL.remarks, COL.status],
    rows: regs.map(regRow),
    stats: [stat("Cancelled registrations", regs.length)],
  };
}

async function runSpecialtyReport(report, params) {
  const query = buildRegistrationQuery(report, params);
  const regs = await tagCaseType(await loadRegistrations(query));
  const rows = groupCounts(regs, (r) => r.department).map((g) => ({
    department: g.key,
    total: g.total,
    newCount: g.newCount,
    oldCount: g.oldCount,
    maleCount: g.maleCount,
    femaleCount: g.femaleCount,
  }));
  return {
    columns: [COL.department, COL.total, COL.newCount, COL.oldCount, COL.maleCount, COL.femaleCount],
    rows,
    stats: [stat("Total registrations", regs.length), stat("Specialties", rows.length)],
  };
}

async function runAppointmentReport(report, params) {
  const query = buildRegistrationQuery(report, params);
  const regs = await loadRegistrations(query);
  return {
    columns: [COL.opNo, COL.visitDate, { key: "slotStart", label: "Slot" }, COL.tokenNo, COL.uhid, COL.patientName, COL.doctor, COL.department, COL.status],
    rows: regs.map((r) => ({ ...regRow(r), slotStart: r.slotStart ? `${r.slotStart}${r.slotEnd ? ` - ${r.slotEnd}` : ""}` : "" })),
    stats: [
      stat("Total appointments", regs.length),
      stat("Confirmed", countBy(regs, (r) => r.status === "Confirmed")),
      stat("Arrived / checked-in", countBy(regs, (r) => ["Arrived", "Checked-in"].includes(r.status))),
      stat("Cancelled", countBy(regs, (r) => r.status === "Cancelled")),
    ],
  };
}

async function patientIndex(uhids) {
  const col = await getCollection("patients");
  const index = new Map();
  if (!col || uhids.length === 0) return index;
  const rows = await col
    .find({ uhid: { $in: uhids } }, { projection: { uhid: 1, patientName: 1, mobile: 1 } })
    .toArray();
  for (const row of rows) index.set(row.uhid, row);
  return index;
}

async function loadCards(params, { expiryWithin = null, limitRange = null, ignoreDate = false } = {}) {
  const col = await getCollection("op_privilege_cards");
  if (!col) throw new Error("DB_UNAVAILABLE");
  const query = {};

  if (ignoreDate) {
    // Master listing — no validity window applied.
  } else if (expiryWithin != null && expiryWithin !== "") {
    const today = todayIso();
    query.validTo = { $gte: today, $lte: addDaysIso(today, Number(expiryWithin)) };
  } else {
    const { from, to } = resolveRange(params);
    Object.assign(query, dateFilter("validTo", from, to));
  }

  if (limitRange) {
    const limit = {};
    if (limitRange.start !== "" && limitRange.start != null) limit.$gte = Number(limitRange.start);
    if (limitRange.end !== "" && limitRange.end != null) limit.$lte = Number(limitRange.end);
    if (Object.keys(limit).length) query.creditLimit = limit;
  }

  const cards = await col.find(query).sort({ validTo: 1, cardNo: 1 }).limit(5000).toArray();
  const patients = await patientIndex([...new Set(cards.map((c) => c.uhid).filter(Boolean))]);
  return cards.map((card) => ({
    cardNo: card.cardNo || card.code || "",
    uhid: card.uhid || "",
    patientName: patients.get(card.uhid)?.patientName || card.name || "",
    mobile: patients.get(card.uhid)?.mobile || "",
    discountPct: card.discountPct ?? "",
    creditLimit: card.creditLimit ?? 0,
    validTo: card.validTo || "",
    status: card.status || "",
  }));
}

async function runCardExpiryReport(params) {
  const expiryWithin = params.expiryWithin === "" || params.expiryWithin == null ? null : Number(params.expiryWithin);
  const cards = await loadCards(params, { expiryWithin });
  const today = todayIso();
  const soon = addDaysIso(today, 30);
  return {
    columns: [COL.cardNo, COL.uhid, COL.patientName, COL.mobile, COL.discountPct, COL.validTo, COL.status],
    rows: cards,
    stats: [
      stat("Cards", cards.length),
      stat("Expired", countBy(cards, (c) => c.validTo && c.validTo < today)),
      stat("Expiring within 30 days", countBy(cards, (c) => c.validTo >= today && c.validTo <= soon)),
    ],
  };
}

async function runCardCreditLimitReport(params) {
  const cards = await loadCards(params, {
    limitRange: { start: params.limitStart ?? "", end: params.limitEnd ?? "" },
    ignoreDate: true,
  });
  const totalLimit = cards.reduce((sum, card) => sum + (Number(card.creditLimit) || 0), 0);
  return {
    columns: [COL.cardNo, COL.uhid, COL.patientName, COL.discountPct, COL.creditLimit, COL.validTo, COL.status],
    rows: cards,
    stats: [stat("Cards", cards.length), stat("Total credit limit", totalLimit.toFixed(2))],
  };
}

/* ------------------------------ presentation -------------------------- */

const BRANDING_KEYS = {
  "hospital.name": "name",
  "hospital.address": "address",
  "hospital.phone": "phone",
  "hospital.contact": "phone",
  "hospital.mobile": "phone",
  "hospital.email": "email",
  "hospital.website": "website",
  "hospital.logo": "logo",
};

export async function loadBranding() {
  const col = await getCollection("system_configs");
  if (!col) return null;
  let rows = [];
  try {
    rows = await col.find({ configKey: { $regex: "^hospital\\." } }).toArray();
  } catch {
    return null;
  }
  const branding = {};
  for (const row of rows) {
    const field = BRANDING_KEYS[String(row.configKey || "").toLowerCase()];
    const value = String(row.configValue ?? "").trim();
    if (field && value && !branding[field]) branding[field] = value;
  }
  return branding.name ? branding : null;
}

function filterSummary(report, params, range) {
  const parts = [];
  const selectBy = params.selectBy || "period";

  if (report.dateMode !== "none") {
    if (selectBy === "month" && params.month) {
      parts.push({ label: "Period", value: params.month });
    } else if (selectBy === "year" && params.year) {
      parts.push({ label: "Period", value: params.year });
    } else if (range?.from) {
      parts.push({
        label: "Period",
        value: range.from === range.to ? range.from : `${range.from} to ${range.to}`,
      });
    }
  }

  if (report.filters.includes("doctor") && params.doctor) {
    parts.push({ label: report.key === "referred-by-doctor" ? "Referred by" : "Doctor", value: params.doctor });
  }
  if (report.filters.includes("visitNature") && params.visitNature) {
    parts.push({ label: "Visit nature", value: params.visitNature });
  }
  if (report.filters.includes("caseType") && params.caseType && params.caseType !== "ALL") {
    const option = CASE_TYPE_OPTIONS.find((opt) => opt.value === params.caseType);
    parts.push({ label: "Case type", value: option?.label || params.caseType });
  }
  if (report.filters.includes("expiryWithin") && params.expiryWithin !== "" && params.expiryWithin != null) {
    parts.push({ label: "Expiry within", value: `${params.expiryWithin} days` });
  }
  if (report.filters.includes("creditLimit")) {
    const hasStart = params.limitStart !== "" && params.limitStart != null;
    const hasEnd = params.limitEnd !== "" && params.limitEnd != null;
    if (hasStart || hasEnd) {
      parts.push({
        label: "Credit limit",
        value: `${hasStart ? params.limitStart : "0"} to ${hasEnd ? params.limitEnd : "any"}`,
      });
    }
  }

  return parts;
}

/* -------------------------------- entry ------------------------------- */

export async function runReport(key, params = {}) {
  const report = getReport(key);
  if (!report) throw new Error("UNKNOWN_REPORT");

  let result;
  switch (key) {
    case "registration-by-op-number":
      result = await runRegistrationReport(report, params);
      break;
    case "registration-by-doctor":
      result = await runDoctorReport(report, params);
      break;
    case "referred-by-doctor":
      result = await runReferredByReport(report, params);
      break;
    case "cancelled-registrations":
      result = await runCancelledReport(report, params);
      break;
    case "insurance-card-expiry":
      result = await runCardExpiryReport(params);
      break;
    case "insurance-card-credit-limit":
      result = await runCardCreditLimitReport(params);
      break;
    case "op-register-specialty":
      result = await runSpecialtyReport(report, params);
      break;
    case "appointment-detail":
      result = await runAppointmentReport(report, params);
      break;
    default:
      throw new Error("UNKNOWN_REPORT");
  }

  const range = resolveRange(params);

  return {
    report: {
      key: report.key,
      title: report.title,
      legacy: report.legacy,
      legacyView: report.legacyView,
      note: report.note ?? null,
    },
    branding: await loadBranding(),
    columns: result.columns,
    rows: result.rows,
    stats: result.stats,
    meta: {
      generatedAt: new Date().toISOString(),
      selectBy: params.selectBy || "period",
      range,
      summary: filterSummary(report, params, range),
      rowCount: result.rows.length,
    },
  };
}
