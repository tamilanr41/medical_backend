import { getDb } from "@/lib/db";
import { canAccessModule } from "@/config/permissions";

/**
 * Server-only dashboard aggregation (§ dashboard).
 *
 * Reads real operational collections with the native driver (never mock
 * data) and returns a serialisable payload the dashboard view renders.
 * Every query degrades gracefully: an unreachable database yields
 * `{ available: false }` and the UI shows an empty state instead of
 * fabricated numbers.
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

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function getDashboardData(role) {
  const generatedAt = new Date().toISOString();

  const db = await getDb();
  if (!db) {
    return {
      available: false,
      generatedAt,
      role,
      kpis: [],
      trend: [],
      departments: [],
      stock: null,
      activity: [],
    };
  }

  const today = dayOffset(0);
  const since7 = dayOffset(6);
  const since30 = dayOffset(29);
  const expiringBy = dayOffset(-30);

  const access = {
    opd: canAccessModule(role, MODULE.OPD),
    ipd: canAccessModule(role, MODULE.IPD),
    lab: canAccessModule(role, MODULE.LAB),
    pharmacy: canAccessModule(role, MODULE.PHARMACY),
  };

  const [
    patientsToday,
    opVisitsToday,
    unpaidBills,
    unpaidBalanceAgg,
    admitted,
    dischargesToday,
    emergencyRecent,
    labToday,
    labPending,
    pharmSalesAgg,
    prescriptionsToday,
  ] = await Promise.all([
    access.opd
      ? safeCount(db, "op_registrations", { visitDate: today })
      : 0,
    access.opd ? safeCount(db, "op_visits", { visitDate: today }) : 0,
    access.opd
      ? safeCount(db, "op_bills", { status: { $ne: "Paid" } })
      : 0,
    access.opd
      ? safeAgg(db, "op_bills", [
          { $match: { status: { $ne: "Paid" } } },
          { $group: { _id: null, total: { $sum: "$balance" } } },
        ])
      : [],
    access.ipd
      ? safeCount(db, "admissions", { status: "Admitted" })
      : 0,
    access.ipd
      ? safeCount(db, "admissions", { dischargeDate: today, status: "Discharged" })
      : 0,
    access.ipd
      ? safeCount(db, "admissions", {
          admissionType: "Emergency",
          admissionDate: { $gte: since7 },
        })
      : 0,
    access.lab
      ? safeCount(db, "lab_checkins", { receivedAt: today })
      : 0,
    access.lab
      ? safeCount(db, "lab_results", { status: "Pending" })
      : 0,
    access.pharmacy
      ? safeAgg(db, "pharmacy_sales", [
          { $match: { invoiceDate: today } },
          {
            $group: {
              _id: null,
              total: { $sum: "$netAmount" },
              count: { $sum: 1 },
            },
          },
        ])
      : [],
    access.pharmacy
      ? safeCount(db, "prescriptions", { date: today })
      : 0,
  ]);

  const pendingBalance = toNumber(unpaidBalanceAgg[0]?.total);
  const pharmSales = toNumber(pharmSalesAgg[0]?.total);
  const pharmSalesCount = toNumber(pharmSalesAgg[0]?.count);

  const kpis = [];

  if (access.opd) {
    kpis.push(
      {
        key: "patients",
        label: "Today's Patients",
        value: patientsToday,
        hint: "New registrations today",
        tone: "brand",
        icon: "users",
        format: "number",
      },
      {
        key: "opVisits",
        label: "OP Visits",
        value: opVisitsToday,
        hint: "Consultations today",
        tone: "emerald",
        icon: "activity",
        format: "number",
      },
      {
        key: "pendingBills",
        label: "Pending Bills",
        value: unpaidBills,
        hint: "Outstanding collection",
        detail: pendingBalance,
        detailFormat: "currency",
        tone: "amber",
        icon: "receipt",
        format: "number",
      }
    );
  }

  if (access.ipd) {
    kpis.push(
      {
        key: "admitted",
        label: "In-Patients",
        value: admitted,
        hint: "Currently admitted",
        tone: "violet",
        icon: "bed",
        format: "number",
      },
      {
        key: "discharges",
        label: "Discharges Today",
        value: dischargesToday,
        hint: "Discharged today",
        tone: "emerald",
        icon: "door",
        format: "number",
      },
      {
        key: "emergency",
        label: "Emergency Cases",
        value: emergencyRecent,
        hint: "Last 7 days",
        tone: "rose",
        icon: "siren",
        format: "number",
      }
    );
  }

  if (access.lab) {
    kpis.push(
      {
        key: "labToday",
        label: "Lab Samples Today",
        value: labToday,
        hint: "Samples received",
        tone: "brand",
        icon: "flask",
        format: "number",
      },
      {
        key: "labPending",
        label: "Pending Reports",
        value: labPending,
        hint: "Awaiting validation",
        tone: "amber",
        icon: "clipboard",
        format: "number",
      }
    );
  }

  if (access.pharmacy) {
    kpis.push(
      {
        key: "pharmacySales",
        label: "Pharmacy Sales Today",
        value: pharmSales,
        hint: `${pharmSalesCount} invoices raised`,
        tone: "emerald",
        icon: "pill",
        format: "currency",
      },
      {
        key: "prescriptions",
        label: "Prescriptions Today",
        value: prescriptionsToday,
        hint: "Dispensed today",
        tone: "brand",
        icon: "file",
        format: "number",
      }
    );
  }

  /* ------------------------------ charts ------------------------------ */

  let trend = [];
  let departments = [];

  if (access.opd) {
    const trendAgg = await safeAgg(db, "op_visits", [
      { $match: { visitDate: { $in: Array.from({ length: 7 }, (_, i) => dayOffset(6 - i)) } } },
      { $group: { _id: "$visitDate", count: { $sum: 1 } } },
    ]);
    const trendMap = new Map(trendAgg.map((r) => [r._id, r.count]));
    trend = Array.from({ length: 7 }, (_, i) => {
      const date = dayOffset(6 - i);
      return { date, label: formatDayLabel(date), count: trendMap.get(date) ?? 0 };
    });

    const deptAgg = await safeAgg(db, "op_visits", [
      { $match: { visitDate: { $gte: since30 }, department: { $nin: [null, ""] } } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);
    departments = deptAgg.map((r) => ({ department: r._id, count: r.count }));
  }

  /* ---------------------------- stock watch --------------------------- */

  let stock = null;

  if (access.pharmacy) {
    const stockRows = await safeFind(db, "stock", {}, { limit: 500 });
    const lowStock = stockRows
      .map((row) => ({
        itemCode: row.itemCode,
        medicineName: row.medicineName,
        store: row.store,
        unit: row.unit,
        quantity: toNumber(row.quantity),
        reorderLevel: toNumber(row.reorderLevel),
      }))
      .filter((row) => row.reorderLevel > 0 && row.quantity <= row.reorderLevel)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 6);

    const batchRows = await safeFind(
      db,
      "batches",
      { expiryDate: { $lte: expiringBy } },
      { sort: { expiryDate: 1 }, limit: 6 }
    );
    const expiring = batchRows.map((row) => ({
      batchNo: row.batchNo,
      medicineName: row.medicineName,
      manufacturer: row.manufacturer,
      expiryDate: row.expiryDate,
      quantity: toNumber(row.quantity),
      expired: row.expiryDate < today,
    }));

    stock = { lowStock, expiring };
  }

  /* --------------------------- recent activity ------------------------ */

  const activity = [];

  if (access.opd) {
    const rows = await safeFind(
      db,
      "op_registrations",
      {},
      { sort: { visitDate: -1 }, limit: 6 }
    );
    for (const row of rows) {
      activity.push({
        id: `reg-${row._id}`,
        kind: "OP Registration",
        tone: "brand",
        title: `${row.patientName} registered`,
        meta: [row.department, row.doctor].filter(Boolean).join(" · "),
        date: row.visitDate,
      });
    }
  }

  if (access.ipd) {
    const rows = await safeFind(
      db,
      "admissions",
      {},
      { sort: { admissionDate: -1 }, limit: 6 }
    );
    for (const row of rows) {
      activity.push({
        id: `adm-${row._id}`,
        kind: "Admission",
        tone: "violet",
        title: `${row.patientName} admitted`,
        meta: [row.ward, row.admissionType].filter(Boolean).join(" · "),
        date: row.admissionDate,
      });
    }
  }

  if (access.lab) {
    const rows = await safeFind(
      db,
      "lab_results",
      {},
      { sort: { resultDate: -1 }, limit: 6 }
    );
    for (const row of rows) {
      activity.push({
        id: `lab-${row._id}`,
        kind: "Laboratory",
        tone: "amber",
        title: `${row.testName} — ${row.status}`,
        meta: row.patientName,
        date: row.resultDate,
      });
    }
  }

  if (access.pharmacy) {
    const rows = await safeFind(
      db,
      "pharmacy_sales",
      {},
      { sort: { invoiceDate: -1 }, limit: 6 }
    );
    for (const row of rows) {
      activity.push({
        id: `sale-${row._id}`,
        kind: "Pharmacy",
        tone: "emerald",
        title: `${row.medicineName} dispensed`,
        meta: [row.patientName, row.invoiceNo].filter(Boolean).join(" · "),
        date: row.invoiceDate,
        amount: toNumber(row.netAmount),
      });
    }
  }

  activity.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return {
    available: true,
    generatedAt,
    role,
    access,
    kpis,
    trend,
    departments,
    stock,
    activity: activity.slice(0, 9),
  };
}

function formatDayLabel(iso) {
  const parts = String(iso).split("-");
  if (parts.length !== 3) return iso;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}
