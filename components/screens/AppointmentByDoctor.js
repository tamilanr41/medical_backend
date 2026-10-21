"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  History,
  Info,
  Layers,
  Loader2,
  PackageSearch,
  Pill,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Drawer from "@/components/ui/Drawer";
import PageSection from "@/components/ui/PageSection";
import AppointmentSchedule from "./AppointmentSchedule";
import {
  CATEGORY_FILTERS,
  STATUS_FILTERS,
  STOCK_FILTERS,
  formatMoney,
  MedicineDetail,
  StatusBadge,
  StockBadge,
  stockMeta,
} from "./MedicineLookup";

const ROUTES = [
  "Oral",
  "Sublingual",
  "Topical",
  "Inhalation",
  "Injection IV",
  "Injection IM",
  "Injection SC",
  "Rectal",
  "Ophthalmic",
  "Otic",
  "Nasal",
];

const FREQUENCIES = [
  "OD",
  "BD",
  "TDS",
  "QID",
  "HS",
  "PRN",
  "Stat",
  "Weekly",
  "Alternate days",
];

const TIMINGS = [
  "Any time",
  "Before food",
  "After food",
  "With food",
  "Empty stomach",
];

const PAGE_SIZE = 10;

const COLUMNS = [
  { key: "medicineName", label: "Medicine", sortable: true },
  { key: "generic", label: "Generic", sortable: true },
  { key: "manufacturer", label: "Manufacturer", sortable: true },
  { key: "category", label: "Form", sortable: true },
  { key: "mrp", label: "MRP", align: "right", sortable: true },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function blankItem(medicine) {
  return {
    key: `${medicine.code ?? medicine._id}-${Date.now()}`,
    code: medicine.code ?? "",
    medicineName: medicine.medicineName ?? "",
    generic: medicine.generic ?? "",
    form: medicine.category ?? "",
    unit: medicine.unit ?? "",
    mrp: medicine.mrp ?? null,
    dose: "",
    route: "Oral",
    frequency: "",
    duration: "",
    quantity: "",
    timing: "After food",
    instructions: "",
  };
}

function lineLabel(item) {
  const parts = [];
  if (item.dose) parts.push(item.dose);
  if (item.frequency) parts.push(item.frequency);
  if (item.duration) parts.push(`x ${item.duration} days`);
  return parts.join(" ") || "—";
}

function Card({ children, className }) {
  return (
    <div className={cn("rounded-2xl border border-ink-200/70 bg-panel shadow-[var(--shadow-card)]", className)}>
      {children}
    </div>
  );
}

function Field({ label, required, error, children, className }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-600">
        {label}
        {required ? <span className="ml-0.5 text-danger-500">*</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-medium text-danger-500">{error}</span> : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";

/**
 * Appointment - By Doctor: a single-screen medicine lookup + prescription
 * workflow. Pick a doctor and date, choose an appointment, then search the
 * medicine master, confirm each selection and save a prescription for the
 * patient — validated server-side with an audit trail.
 */
export default function AppointmentByDoctor({ user, module, item }) {
  return <AppointmentByDoctorInner sessionUser={user} module={module} item={item} />;
}

function AppointmentByDoctorInner({ sessionUser }) {
  const isDoctorRole = sessionUser?.role === "DOCTOR";

  const [doctor, setDoctor] = useState("");
  const [date, setDate] = useState(today());
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedAppt, setSelectedAppt] = useState(null);

  const [rows, setRows] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [batchRows, setBatchRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [medError, setMedError] = useState("");
  const [nonce, setNonce] = useState(0);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [manufacturer, setManufacturer] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [sortKey, setSortKey] = useState("medicineName");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [selectedMed, setSelectedMed] = useState(null);

  const [draft, setDraft] = useState([]);
  const [duplicate, setDuplicate] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [reviewOpen, setReviewOpen] = useState(false);
  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const [medRes, invRes] = await Promise.all([
          fetch("/api/resource/medicines?all=1&sort=medicineName&dir=asc", { cache: "no-store", signal: controller.signal }),
          fetch("/api/pharmacy/inventory", { cache: "no-store", signal: controller.signal }),
        ]);
        const medData = await medRes.json().catch(() => ({}));
        if (!medRes.ok) throw new Error(medData.error || "The medicine directory could not be loaded.");
        const invData = await invRes.json().catch(() => ({}));
        if (!cancelled) {
          setRows(Array.isArray(medData.rows) ? medData.rows : []);
          setStockRows(Array.isArray(invData.stock) ? invData.stock : []);
          setBatchRows(Array.isArray(invData.batches) ? invData.batches : []);
          setMedError("");
        }
      } catch (err) {
        if (!cancelled && err.name !== "AbortError") setMedError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [nonce]);

  useEffect(() => {
    let cancelled = false;
    const uhid = selectedAppt?.uhid;
    if (!uhid) {
      (function flush() {
        if (!cancelled) setRecent([]);
      })();
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      if (cancelled) return;
      setRecentLoading(true);
      try {
        const res = await fetch(`/api/prescriptions?uhid=${encodeURIComponent(uhid)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setRecent(res.ok && Array.isArray(data.rows) ? data.rows : []);
      } catch {
        if (!cancelled) setRecent([]);
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAppt?.uhid]);

  const inventory = useMemo(() => {
    const byName = new Map();
    const ensure = (name) => {
      const key = String(name || "").trim().toLowerCase();
      if (!key) return null;
      if (!byName.has(key)) byName.set(key, { quantity: 0, reorderLevel: 0, stores: new Set(), unit: "", batches: [] });
      return byName.get(key);
    };
    for (const row of stockRows) {
      const entry = ensure(row.medicineName);
      if (!entry) continue;
      entry.quantity += Number(row.quantity) || 0;
      const reorder = Number(row.reorderLevel);
      if (Number.isFinite(reorder) && reorder > 0) entry.reorderLevel += reorder;
      if (row.store) entry.stores.add(row.store);
      if (!entry.unit && row.unit) entry.unit = row.unit;
    }
    for (const batch of batchRows) {
      const entry = ensure(batch.medicineName);
      if (entry) entry.batches.push(batch);
    }
    return byName;
  }, [stockRows, batchRows]);

  const inventoryFor = useCallback(
    (medicine) => inventory.get(String(medicine?.medicineName || "").trim().toLowerCase()) || null,
    [inventory]
  );

  const manufacturers = useMemo(() => {
    const set = new Set();
    for (const row of rows) if (row.manufacturer) set.add(row.manufacturer);
    return ["All", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== "All" && (row.category || "") !== category) return false;
      if (status !== "All" && (row.status || "") !== status) return false;
      if (manufacturer !== "All" && (row.manufacturer || "") !== manufacturer) return false;
      if (stockFilter !== "All") {
        const meta = stockMeta(inventoryFor(row));
        const wanted = { "In stock": "emerald", "Low stock": "amber", "Out of stock": "rose" }[stockFilter];
        if (meta.tone !== wanted) return false;
      }
      if (!q) return true;
      return [row.code, row.medicineName, row.generic, row.manufacturer, row.unit]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [rows, query, category, status, manufacturer, stockFilter, inventoryFor]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === "mrp") {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      } else {
        av = String(av ?? "").toLowerCase();
        bv = String(bv ?? "").toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasFilters = query || category !== "All" || status !== "All" || manufacturer !== "All" || stockFilter !== "All";
  const draftTotal = draft.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  function toggleSort(key) {
    if (key === sortKey) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function clearFilters() {
    setQuery("");
    setCategory("All");
    setStatus("All");
    setManufacturer("All");
    setStockFilter("All");
    setPage(1);
  }

  function addToDraft(medicine) {
    setDuplicate("");
    const existing = draft.find((item) => item.code && item.code === medicine.code);
    if (existing) {
      setDuplicate(medicine.medicineName);
      return;
    }
    setDraft((list) => [...list, blankItem(medicine)]);
  }

  function updateDraft(key, patch) {
    setDraft((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function removeDraft(key) {
    setDraft((list) => list.filter((item) => item.key !== key));
  }

  function openReview() {
    setFieldErrors({});
    const errors = {};
    if (!selectedAppt) errors.context = "Select an appointment / patient first.";
    if (draft.length === 0) errors.draft = "Add at least one medicine.";
    if (draft.length > 0) {
      draft.forEach((item, index) => {
        if (!item.dose) errors[`dose.${item.key}`] = "Dose required";
        if (!item.frequency) errors[`frequency.${item.key}`] = "Frequency required";
        if (!item.duration) errors[`duration.${item.key}`] = "Duration required";
      });
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setNotice(null);
    setReviewOpen(true);
  }

  async function savePrescription() {
    if (!selectedAppt) return;
    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        uhid: selectedAppt.uhid,
        patientName: selectedAppt.patientName,
        doctor: selectedAppt.doctor || doctor,
        department: selectedAppt.department || "",
        date: String(selectedAppt.visitDate || date).slice(0, 10),
        diagnosis,
        notes,
        items: draft.map((item) => ({
          code: item.code,
          medicineName: item.medicineName,
          generic: item.generic,
          form: item.form,
          unit: item.unit,
          mrp: item.mrp,
          dose: item.dose,
          route: item.route,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          timing: item.timing,
          instructions: item.instructions,
        })),
      };
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || `Save failed (${res.status}).` });
        return;
      }
      setNotice({ kind: "success", message: `Prescription ${data.rxNo} saved for ${selectedAppt.patientName}.` });
      setReviewOpen(false);
      setDraft([]);
      setDiagnosis("");
      setNotes("");
      const refetch = await fetch(`/api/prescriptions?uhid=${encodeURIComponent(selectedAppt.uhid)}`, { cache: "no-store" });
      const refetchData = await refetch.json().catch(() => ({}));
      if (refetch.ok && Array.isArray(refetchData.rows)) setRecent(refetchData.rows);
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setSaving(false);
    }
  }

  function pickAppointment(row) {
    setSelectedAppt(row);
    setFieldErrors({});
    if (row.doctor) setDoctor(row.doctor);
    if (row.visitDate) setDate(String(row.visitDate).slice(0, 10));
  }

  return (
    <div className="space-y-6">
      <AppointmentSchedule
        defaultDoctor={isDoctorRole ? sessionUser?.name : ""}
        doctor={doctor}
        onDoctorChange={(value) => {
          setDoctor(value);
          setSelectedAppt(null);
        }}
        date={date}
        onDateChange={(value) => {
          setDate(value);
          setSelectedAppt(null);
        }}
        type={typeFilter}
        onTypeChange={(value) => {
          setTypeFilter(value);
          setSelectedAppt(null);
        }}
        selectedAppt={selectedAppt}
        onSelect={pickAppointment}
      />

      {isDoctorRole ? (
        <div className="flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5 text-[12.5px] font-medium text-brand-700 dark:text-brand-300">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          Signed in as {sessionUser?.name}. Selected appointments inherit the attending doctor automatically.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <MedicineLookupPanel
          loading={loading}
          error={medError}
          rows={rows}
          sorted={sorted}
          filtered={filtered}
          pageRows={pageRows}
          safePage={safePage}
          totalPages={totalPages}
          query={query}
          setQuery={(value) => {
            setQuery(value);
            setPage(1);
          }}
          category={category}
          setCategory={(value) => {
            setCategory(value);
            setPage(1);
          }}
          status={status}
          setStatus={(value) => {
            setStatus(value);
            setPage(1);
          }}
          manufacturer={manufacturer}
          setManufacturer={setManufacturer}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          manufacturers={manufacturers}
          hasFilters={hasFilters}
          onClear={clearFilters}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
          page={page}
          setPage={setPage}
          inventoryFor={inventoryFor}
          onOpen={setSelectedMed}
          onAdd={addToDraft}
          draftCodes={draft.map((item) => item.code).filter(Boolean)}
          reload={() => {
            setLoading(true);
            setMedError("");
            setNonce((n) => n + 1);
          }}
        />

        <div id="prescription" className="scroll-mt-24">
          <PrescriptionComposer
            draft={draft}
            updateDraft={updateDraft}
            removeDraft={removeDraft}
            selectedAppt={selectedAppt}
            diagnosis={diagnosis}
            setDiagnosis={setDiagnosis}
            notes={notes}
            setNotes={setNotes}
            duplicate={duplicate}
            fieldErrors={fieldErrors}
            saving={saving}
            notice={notice}
            inventoryFor={inventoryFor}
            onReview={openReview}
            onClear={() => {
              setDraft([]);
              setDuplicate("");
            }}
            recent={recent}
            recentLoading={recentLoading}
            draftTotal={draftTotal}
          />
        </div>
      </div>

      <MedicineDetail
        medicine={selectedMed}
        inventory={selectedMed ? inventoryFor(selectedMed) : null}
        onClose={() => setSelectedMed(null)}
      />

      <ReviewDrawer
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onConfirm={savePrescription}
        saving={saving}
        selectedAppt={selectedAppt}
        doctor={doctor}
        date={date}
        diagnosis={diagnosis}
        notes={notes}
        draft={draft}
      />
    </div>
  );
}

/* --------------------------- medicine lookup --------------------------- */

function MedicineLookupPanel(props) {
  const { loading, error, sorted, filtered, pageRows, safePage, totalPages, query, setQuery, category, setCategory, status, setStatus, manufacturer, setManufacturer, stockFilter, setStockFilter, manufacturers, hasFilters, onClear, sortKey, sortDir, toggleSort, setPage, inventoryFor, onOpen, onAdd, draftCodes, reload } = props;

  return (
    <PageSection
      title="Medicine lookup"
      subtitle="Search the medicine master and add lines to the prescription"
      icon={<Pill className="h-4 w-4" aria-hidden="true" />}
      actions={
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11.5px] font-semibold text-brand-700 dark:text-brand-400">
            {filtered.length} found
          </span>
          <button
            type="button"
            onClick={reload}
            title="Refresh medicines"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 border-b border-ink-100 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, code, generic, manufacturer or unit…"
            className={cn(inputCls, "pl-9 pr-9")}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORY_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              aria-pressed={category === option}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] font-semibold transition",
                category === option
                  ? "border-brand-200 bg-brand-50 text-brand-700 dark:text-brand-300"
                  : "border-ink-200 text-ink-500 hover:border-ink-300 hover:text-ink-700"
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <FilterSelect label="Manufacturer" value={manufacturer} onChange={setManufacturer} options={manufacturers} />
          <FilterSelect label="Stock status" value={stockFilter} onChange={setStockFilter} options={STOCK_FILTERS} />
          <FilterSelect label="Active status" value={status} onChange={setStatus} options={STATUS_FILTERS} />
          {hasFilters ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold text-ink-500 transition hover:text-rose-600"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden="true" />
          Loading medicine directory…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <SearchX className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-ink-700">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <PackageSearch className="h-8 w-8 text-ink-300" aria-hidden="true" />
          <p className="text-sm font-medium text-ink-600">No medicines found</p>
          <p className="text-[13px] text-ink-400">{hasFilters ? "Try adjusting your search or filters." : "The medicine master is empty."}</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-[11px] uppercase tracking-wide text-ink-400">
                  {COLUMNS.map((column) => (
                    <th key={column.key} scope="col" className={cn("px-4 py-3 font-semibold", column.align === "right" && "text-right")}>
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className={cn("inline-flex items-center gap-1 transition hover:text-ink-700", sortKey === column.key && "text-brand-600 dark:text-brand-300", column.align === "right" && "flex-row-reverse")}
                        >
                          {column.label}
                          <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 font-semibold">Stock</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const meta = stockMeta(inventoryFor(row));
                  const added = draftCodes.includes(row.code);
                  return (
                    <tr
                      key={row._id}
                      onClick={() => onOpen(row)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpen(row);
                        }
                      }}
                      className="cursor-pointer border-b border-ink-100 transition last:border-0 hover:bg-brand-50/50 focus-visible:bg-brand-50/50 focus-visible:outline-none"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink-900">{row.medicineName}</p>
                        <p className="font-mono text-[11.5px] text-ink-400">{row.code}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-600">{row.generic || "—"}</td>
                      <td className="px-4 py-3 text-ink-600">{row.manufacturer || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[12px] font-medium text-ink-600">{row.category || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-ink-800">{formatMoney(row.mrp)}</td>
                      <td className="px-4 py-3"><StockBadge meta={meta} /></td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={added || row.status === "Inactive"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAdd(row);
                          }}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition",
                            added
                              ? "bg-emerald-50 text-emerald-600"
                              : row.status === "Inactive"
                                ? "cursor-not-allowed bg-ink-100 text-ink-400"
                                : "bg-brand-600 text-white hover:bg-brand-700"
                          )}
                        >
                          {added ? <Check className="h-3 w-3" aria-hidden="true" /> : <Plus className="h-3 w-3" aria-hidden="true" />}
                          {added ? "Added" : "Add"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-ink-100 md:hidden">
            {pageRows.map((row) => {
              const meta = stockMeta(inventoryFor(row));
              const added = draftCodes.includes(row.code);
              return (
                <li key={row._id} className="flex items-start gap-3 px-4 py-3">
                  <button type="button" onClick={() => onOpen(row)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-ink-900">{row.medicineName}</span>
                      <span className="shrink-0 font-mono text-[13px] text-ink-700">{formatMoney(row.mrp)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-ink-500">{row.generic || "—"} · {row.manufacturer || "—"}</span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">{row.category || "—"}</span>
                      <StockBadge meta={meta} />
                      <StatusBadge status={row.status} />
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={added || row.status === "Inactive"}
                    onClick={() => onAdd(row)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition",
                      added ? "bg-emerald-50 text-emerald-600" : row.status === "Inactive" ? "cursor-not-allowed bg-ink-100 text-ink-400" : "bg-brand-600 text-white hover:bg-brand-700"
                    )}
                  >
                    {added ? <Check className="h-3 w-3" aria-hidden="true" /> : <Plus className="h-3 w-3" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-2.5 text-[12px] text-ink-400">
            <span>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{(safePage - 1) * PAGE_SIZE + pageRows.length} of {sorted.length}
              {sorted.length !== filtered.length ? ` (filtered from ${filtered.length})` : ""}
            </span>
            {totalPages > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={safePage <= 1}
                  aria-label="Previous page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="px-2 font-semibold text-ink-600 tabular-nums">{safePage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={safePage >= totalPages}
                  aria-label="Next page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </PageSection>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 cursor-pointer appearance-none rounded-xl border border-ink-200 bg-field pl-3 pr-8 text-[12.5px] font-medium text-ink-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="pointer-events-none absolute right-2.5 h-4 w-4 text-ink-400">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
      </svg>
    </label>
  );
}

/* ----------------------- prescription composer ------------------------- */

function PrescriptionComposer({ draft, updateDraft, removeDraft, selectedAppt, diagnosis, setDiagnosis, notes, setNotes, duplicate, fieldErrors, saving, notice, inventoryFor, onReview, onClear, recent, recentLoading, draftTotal }) {
  return (
    <div className="space-y-6">
      <PageSection
        title="Prescription"
        subtitle={selectedAppt ? `For ${selectedAppt.patientName} · ${selectedAppt.uhid}` : "Select an appointment to write a prescription"}
        icon={<ClipboardPlus className="h-4 w-4" aria-hidden="true" />}
        actions={
          draft.length > 0 ? (
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11.5px] font-semibold text-brand-700 dark:text-brand-400">
              {draft.length} line{draft.length === 1 ? "" : "s"}
            </span>
          ) : null
        }
      >
        <div className="p-5">
          {!selectedAppt ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-ink-200 px-4 py-10 text-center">
              <UserRound className="h-6 w-6 text-ink-300" aria-hidden="true" />
              <p className="text-sm font-medium text-ink-600">No patient selected yet.</p>
              <p className="text-[12.5px] text-ink-400">Pick an appointment above to link this prescription to a real patient visit.</p>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/50 px-3.5 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-[12px] font-bold text-white">
                {(selectedAppt.patientName || "?").split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13.5px] font-semibold text-ink-800">{selectedAppt.patientName}</p>
                <p className="truncate font-mono text-[11px] text-ink-400">
                  {selectedAppt.uhid} · {selectedAppt.doctor || "Doctor"}
                </p>
              </div>
            </div>
          )}

          {duplicate ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              “{duplicate}” is already in this prescription.
            </div>
          ) : null}

          {draft.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center">
              <Pill className="h-6 w-6 text-ink-300" aria-hidden="true" />
              <p className="text-sm font-medium text-ink-600">No medicines added.</p>
              <p className="text-[12.5px] text-ink-400">Use the lookup to search and add medicines to this prescription.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {draft.map((item) => {
                const meta = stockMeta(inventoryFor({ medicineName: item.medicineName }));
                return (
                  <li key={item.key} className="rounded-xl border border-ink-200 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-ink-900">{item.medicineName}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-ink-400">{item.code} · {lineLabel(item)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StockBadge meta={meta} />
                        <button
                          type="button"
                          onClick={() => removeDraft(item.key)}
                          aria-label={`Remove ${item.medicineName}`}
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      <Field label="Dose" required error={fieldErrors[`dose.${item.key}`]}>
                        <input
                          type="text"
                          value={item.dose}
                          onChange={(e) => updateDraft(item.key, { dose: e.target.value })}
                          placeholder="e.g. 1 / 500mg"
                          className={cn(inputCls, fieldErrors[`dose.${item.key}`] && "border-danger-300")}
                        />
                      </Field>
                      <Field label="Route">
                        <select value={item.route} onChange={(e) => updateDraft(item.key, { route: e.target.value })} className={cn(inputCls, "cursor-pointer")}>
                          {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </Field>
                      <Field label="Frequency" required error={fieldErrors[`frequency.${item.key}`]}>
                        <select value={item.frequency} onChange={(e) => updateDraft(item.key, { frequency: e.target.value })} className={cn(inputCls, "cursor-pointer", fieldErrors[`frequency.${item.key}`] && "border-danger-300")}>
                          <option value="">Select…</option>
                          {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </Field>
                      <Field label="Duration (days)" required error={fieldErrors[`duration.${item.key}`]}>
                        <input
                          type="number"
                          min="1"
                          value={item.duration}
                          onChange={(e) => updateDraft(item.key, { duration: e.target.value })}
                          className={cn(inputCls, fieldErrors[`duration.${item.key}`] && "border-danger-300")}
                        />
                      </Field>
                      <Field label="Quantity">
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateDraft(item.key, { quantity: e.target.value })}
                          placeholder={item.unit ? `Total ${item.unit.toLowerCase()}s` : "Quantity"}
                          className={cn(inputCls, "font-mono")}
                        />
                      </Field>
                      <Field label="Timing">
                        <select value={item.timing} onChange={(e) => updateDraft(item.key, { timing: e.target.value })} className={cn(inputCls, "cursor-pointer")}>
                          {TIMINGS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Field>
                      <Field label="Instructions" className="col-span-2 sm:col-span-3">
                        <input
                          type="text"
                          value={item.instructions}
                          onChange={(e) => updateDraft(item.key, { instructions: e.target.value })}
                          placeholder="e.g. Take with plenty of water, discontinue if rash…"
                          className={inputCls}
                        />
                      </Field>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedAppt && draft.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Diagnosis / provisional Dx">
                <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Viral fever with body ache" className={inputCls} />
              </Field>
              <Field label="Advice / notes">
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Plenty of fluids, review in 3 days" className={inputCls} />
              </Field>
            </div>
          ) : null}

          {fieldErrors.draft ? <p className="mt-3 text-[12.5px] font-medium text-danger-500">{fieldErrors.draft}</p> : null}
          {fieldErrors.context ? <p className="mt-3 text-[12.5px] font-medium text-danger-500">{fieldErrors.context}</p> : null}

          {notice ? (
            <div className={cn("mt-3 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium", notice.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
              {notice.kind === "success" ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />}
              {notice.message}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onReview}
              disabled={!selectedAppt || draft.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-[var(--shadow-lift)] disabled:pointer-events-none disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Review & dispatch
              {draftTotal > 0 ? <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">{draftTotal}</span> : null}
            </button>
            {draft.length > 0 ? (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </PageSection>

      {selectedAppt ? (
        <Card>
          <div className="border-b border-ink-100 px-5 py-3.5">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink-800">
              <History className="h-4 w-4 text-ink-400" aria-hidden="true" />
              Recent prescriptions
            </h3>
            <p className="text-[11.5px] text-ink-400">Previous Rx history for {selectedAppt.patientName}</p>
          </div>
          <div className="p-4">
            {recentLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin text-brand-500" aria-hidden="true" />
                Loading history…
              </div>
            ) : recent.length === 0 ? (
              <p className="px-2 py-4 text-center text-[12.5px] text-ink-400">No previous prescriptions on record.</p>
            ) : (
              <ul className="space-y-2">
                {recent.slice(0, 4).map((rx) => (
                  <li key={rx.id} className="rounded-xl border border-ink-200 px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11.5px] font-semibold text-brand-700 dark:text-brand-400">{rx.rxNo}</span>
                      <span className="text-[11px] text-ink-400">{rx.date}</span>
                    </div>
                    <p className="mt-1 truncate text-[12.5px] text-ink-600">{rx.diagnosis || "—"}</p>
                    <p className="mt-0.5 whitespace-pre-line text-[11.5px] leading-snug text-ink-400">{rx.medicines}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/* ---------------------------- review drawer ---------------------------- */

function ReviewDrawer({ open, onClose, onConfirm, saving, selectedAppt, doctor, date, diagnosis, notes, draft }) {
  return (
    <Drawer open={open} onClose={onClose} label="Confirm prescription" side="right" size="w-full sm:w-[520px]">
      {selectedAppt ? (
        <div className="flex h-full flex-col">
          <div className="flex items-start gap-3 border-b border-ink-100 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_20px_-10px_rgba(29,111,245,0.9)]">
              <ClipboardPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-bold text-ink-900">Confirm prescription</h2>
              <p className="mt-0.5 text-[12px] text-ink-400">Review the final order before it is recorded against the patient.</p>
            </div>
            <button type="button" data-drawer-close onClick={onClose} aria-label="Close review" className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="scrollbar-slim flex-1 overflow-y-auto p-5">
            <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <ReviewRow label="Patient" value={selectedAppt.patientName} strong />
                <ReviewRow label="UHID" value={selectedAppt.uhid} mono />
                <ReviewRow label="Doctor" value={doctor || selectedAppt.doctor} />
                <ReviewRow label="Date" value={date} />
              </div>
              <div className="mt-3 border-t border-ink-200 pt-3">
                <ReviewRow label="Diagnosis" value={diagnosis || "—"} />
                <ReviewRow label="Advice" value={notes || "—"} />
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-ink-400">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                Medicines ({draft.length})
              </h3>
              {draft.map((item, index) => (
                <div key={item.key} className="rounded-xl border border-ink-200 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[11px] font-bold text-brand-700 dark:text-brand-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-ink-900">{item.medicineName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-ink-400">{item.code}</p>
                    </div>
                    <p className="shrink-0 font-mono text-[12.5px] font-semibold text-ink-800">{formatMoney(item.mrp)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-600">
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11.5px] font-semibold text-brand-700 dark:text-brand-400">{lineLabel(item)}</span>
                    <span>{item.route}</span>
                    {item.timing !== "Any time" ? <span>{item.timing}</span> : null}
                    {item.quantity ? <span className="font-mono">Qty {item.quantity}</span> : null}
                  </div>
                  {item.instructions ? <p className="mt-1.5 text-[12px] text-ink-500">“{item.instructions}”</p> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 p-4">
            <button
              type="button"
              onClick={onConfirm}
              disabled={saving}
              className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Saving…" : "Confirm & save"}
            </button>
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800">
              Back
            </button>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function ReviewRow({ label, value, mono, strong }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className={cn("truncate text-[13px] text-ink-800", strong && "font-semibold", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

function UserRound(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" {...props} aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}