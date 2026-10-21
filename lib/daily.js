import { getDb } from "@/lib/db";
import { canAccessModule } from "@/config/permissions";

/**
 * Server-only "Today" and "Waitlist" aggregation (§ today / waitlist).
 *
 * Today = a role-aware digest of everything logged today across the modules
 * the signed-in role may open. Waitlist = the live OPD patient queue derived
 * from today's registrations. Both degrade to `{ available: false }` when
 * MongoDB is unreachable — no fabricated numbers.
 */

const MODULE = {
  OPD: 101,
  IPD: 102,
  LAB: 103,
  PHARMACY: 113,
};

function dayOffset(back = 0) {
  const d = new Date();
  d.setDate(d.getDate() - back);
  return d.toISOString().slice(0, 10);
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function safeFind(db, name, filter, { sort, limit } = {}) {
  try {
    let cursor = db.collection(name).find(filter);
    if (sort) cursor = cursor.sort(sort);
    if (limit) cursor = cursor.limit(limit);
    return await cursor.toArray();
  } catch {
    return [];
  }
}

async function safeCount(db, name, filter) {
  try {
    return await db.collection(name).countDocuments(filter);
  } catch {
    return 0;
  }
}

async function safeAgg(db, name, pipeline) {
  try {
    return await db.collection(name).aggregate(pipeline).toArray();
  } catch {
    return [];
  }
}

function clean(doc) {
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest };
}

export async function getTodayData(role) {
  const generatedAt = new Date().toISOString();
  const db = await getDb();

  if (!db) {
    return {
      available: false,
      generatedAt,
      role,
      kpis: [],
      sections: [],
    };
  }

  const today = dayOffset(0);
  const access = {
    opd: canAccessModule(role, MODULE.OPD),
    ipd: canAccessModule(role, MODULE.IPD),
    lab: canAccessModule(role, MODULE.LAB),
    pharmacy: canAccessModule(role, MODULE.PHARMACY),
  };

  const kpis = [];
  const sections = [];

  /* ------------------------------- OPD ------------------------------- */

  if (access.opd) {
    const [registrations, visits] = await Promise.all([
      safeFind(db, "op_registrations", { visitDate: today }, { sort: { tokenNo: 1 } }),
      safeFind(db, "op_visits", { visitDate: today }, { sort: { tokenNo: 1 } }),
    ]);

    kpis.push({
      key: "opToday",
      label: "OP Registrations",
      value: registrations.length,
      hint: "Today",
      tone: "brand",
      icon: "activity",
    });

    sections.push({
      key: "op",
      module: "opd",
      moduleTitle: "OPD",
      title: "Today's Registrations",
      count: registrations.length,
      columns: ["Token", "Patient", "Department", "Doctor", "Status"],
      rows: registrations.map((row) => ({
        id: String(row._id),
        token: row.tokenNo,
        name: row.patientName,
        meta: row.uhid,
        department: row.department,
        doctor: row.doctor,
        status:
          visits.find((v) => String(v.uhid) === String(row.uhid))?.status ?? "—",
      })),
      empty: "No registrations today yet.",
    });
  }

  /* ------------------------------- IPD ------------------------------- */

  if (access.ipd) {
    const [admissions, discharges] = await Promise.all([
      safeFind(db, "admissions", { admissionDate: today }, { sort: { admissionDate: -1 } }),
      safeFind(db, "admissions", { dischargeDate: today }, { sort: { dischargeDate: -1 } }),
    ]);

    kpis.push(
      {
        key: "admissionsToday",
        label: "Admissions",
        value: admissions.length,
        hint: "Today",
        tone: "violet",
        icon: "bed",
      },
      {
        key: "dischargesToday",
        label: "Discharges",
        value: discharges.length,
        hint: "Today",
        tone: "emerald",
        icon: "door",
      }
    );

    sections.push({
      key: "ip-admissions",
      module: "ipd",
      moduleTitle: "IPD",
      title: "Today's Admissions",
      count: admissions.length,
      columns: ["IP No", "Patient", "Ward", "Room", "Type"],
      rows: admissions.map(clean).map((row) => ({
        id: row.id,
        token: row.ipNo,
        name: row.patientName,
        meta: row.uhid,
        department: row.ward,
        doctor: row.room,
        status: row.admissionType,
      })),
      empty: "No admissions today yet.",
    });
  }

  /* ------------------------------ Laboratory ------------------------- */

  if (access.lab) {
    const samples = await safeFind(
      db,
      "lab_checkins",
      { receivedAt: today },
      { sort: { receivedAt: -1 } }
    );

    kpis.push({
      key: "labToday",
      label: "Lab Samples",
      value: samples.length,
      hint: "Received today",
      tone: "amber",
      icon: "flask",
    });

    sections.push({
      key: "lab",
      module: "laboratory",
      moduleTitle: "Laboratory",
      title: "Samples Received Today",
      count: samples.length,
      columns: ["Check-in", "Patient", "Priority", "Status"],
      rows: samples.map(clean).map((row) => ({
        id: row.id,
        token: row.checkinNo,
        name: row.patientName,
        meta: row.uhid,
        department: row.priority,
        doctor: row.doctor,
        status: row.status,
      })),
      empty: "No samples received today yet.",
    });
  }

  /* ------------------------------ Pharmacy --------------------------- */

  if (access.pharmacy) {
    const [salesAgg, sales, prescriptions] = await Promise.all([
      safeAgg(db, "pharmacy_sales", [
        { $match: { invoiceDate: today } },
        {
          $group: {
            _id: null,
            total: { $sum: "$netAmount" },
            count: { $sum: 1 },
          },
        },
      ]),
      safeFind(db, "pharmacy_sales", { invoiceDate: today }, { sort: { invoiceDate: -1 } }),
      safeCount(db, "prescriptions", { date: today }),
    ]);

    kpis.push(
      {
        key: "pharmacyToday",
        label: "Pharmacy Sales",
        value: toNumber(salesAgg[0]?.total),
        hint: `${toNumber(salesAgg[0]?.count)} invoices`,
        tone: "emerald",
        icon: "pill",
        format: "currency",
      },
      {
        key: "prescriptionsToday",
        label: "Prescriptions",
        value: prescriptions,
        hint: "Dispensed today",
        tone: "brand",
        icon: "file",
      }
    );

    sections.push({
      key: "pharmacy",
      module: "pharmacy",
      moduleTitle: "Pharmacy",
      title: "Sales Invoices Today",
      count: sales.length,
      columns: ["Invoice", "Patient", "Item", "Amount"],
      rows: sales.map(clean).map((row) => ({
        id: row.id,
        token: row.invoiceNo,
        name: row.patientName,
        meta: row.uhid,
        department: row.medicineName,
        doctor: "",
        amount: toNumber(row.netAmount),
        status: row.paymentMode,
      })),
      empty: "No pharmacy sales recorded today yet.",
    });
  }

  return { available: true, generatedAt, role, kpis, sections };
}

export async function getWaitlist(role) {
  const generatedAt = new Date().toISOString();
  const db = await getDb();
  const hasOpd = canAccessModule(role, MODULE.OPD);

  if (!db || !hasOpd) {
    return {
      available: Boolean(db),
      access: hasOpd,
      generatedAt,
      role,
      queue: [],
      summary: [],
    };
  }

  const today = dayOffset(0);
  const [registrations, visits] = await Promise.all([
    safeFind(db, "op_registrations", { visitDate: today }, { sort: { tokenNo: 1 } }),
    safeFind(
      db,
      "op_visits",
      { visitDate: today },
      { sort: { tokenNo: 1 } }
    ),
  ]);

  const waiting = [];
  for (const reg of registrations) {
    const visit = visits.find(
      (v) => String(v.uhid) === String(reg.uhid)
    );
    const status = visit?.status ?? "In queue";
    waiting.push({
      id: String(reg._id),
      uhid: reg.uhid,
      token: reg.tokenNo,
      name: reg.patientName,
      gender: reg.gender,
      age: reg.age,
      department: visit?.department ?? reg.department,
      doctor: visit?.doctor ?? reg.doctor,
      status,
    });
  }

  const waitKind = (status) =>
    status === "Closed" ? "Done" : status === "Open" ? "In consultation" : "In queue";

  const summaryMap = new Map();
  for (const entry of waiting) {
    const kind = waitKind(entry.status);
    summaryMap.set(kind, (summaryMap.get(kind) ?? 0) + 1);
  }
  const summary = [...summaryMap.entries()].map(([label, value]) => ({ label, value }));

  return { available: true, generatedAt, role, access: true, queue: waiting, summary };
}