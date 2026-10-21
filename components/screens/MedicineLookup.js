"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FlaskConical,
  Layers,
  Loader2,
  PackageSearch,
  Pill,
  RefreshCw,
  Search,
  Warehouse,
  X,
} from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { cn } from "@/lib/utils";

const CATEGORY_FILTERS = [
  "All",
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Ointment",
  "Drops",
];

const STATUS_FILTERS = ["All", "Active", "Inactive"];

const STOCK_FILTERS = ["All", "In stock", "Low stock", "Out of stock"];

const COLUMNS = [
  { key: "medicineName", label: "Medicine", sortable: true },
  { key: "generic", label: "Generic", sortable: true },
  { key: "manufacturer", label: "Manufacturer", sortable: true },
  { key: "category", label: "Form", sortable: true },
  { key: "stock", label: "Stock", sortable: false },
  { key: "mrp", label: "MRP", align: "right", sortable: true },
];

const PAGE_SIZE = 12;

export function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d - startOfToday()) / 86400000);
}

export function stockMeta(entry) {
  if (!entry) return { tone: "muted", label: "Not stocked", entry: null };
  if (entry.quantity <= 0) return { tone: "rose", label: "Out of stock", entry };
  if (entry.reorderLevel > 0 && entry.quantity <= entry.reorderLevel) {
    return { tone: "amber", label: "Low stock", entry };
  }
  return { tone: "emerald", label: "In stock", entry };
}

const STOCK_STYLES = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 ring-rose-100 dark:text-rose-300",
  muted: "bg-ink-100 text-ink-500 ring-ink-200",
};

export function StockBadge({ meta }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        STOCK_STYLES[meta.tone]
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          meta.tone === "emerald" && "bg-emerald-500",
          meta.tone === "amber" && "bg-amber-500",
          meta.tone === "rose" && "bg-rose-500",
          meta.tone === "muted" && "bg-ink-400"
        )}
        aria-hidden="true"
      />
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const active = status === "Active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:text-emerald-300"
          : "bg-ink-100 text-ink-500 ring-ink-200"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-ink-400"
        )}
        aria-hidden="true"
      />
      {status || "Unknown"}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, tone = "brand" }) {
  const chip = {
    brand: "bg-brand-50 text-brand-600 dark:text-brand-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-50 text-rose-600 dark:text-rose-400",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-panel px-4 py-3 shadow-[var(--shadow-card)]">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          chip
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[19px] font-bold tracking-tight text-ink-900 tabular-nums">
          {value}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
          {label}
        </p>
      </div>
    </div>
  );
}

function Select({ value, onChange, options, label }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="h-10 cursor-pointer appearance-none rounded-xl border border-ink-200 bg-field pl-3 pr-8 text-[12.5px] font-medium text-ink-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 h-4 w-4 text-ink-400"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </label>
  );
}

/**
 * Medicine Lookup — a fast, searchable directory over the `medicines` master
 * collection (config/entities.js) joined with live `stock` and `batches`
 * levels, backed by the resource + pharmacy inventory APIs.
 */
export default function MedicineLookup() {
  const [rows, setRows] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [batchRows, setBatchRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [manufacturer, setManufacturer] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [sortKey, setSortKey] = useState("medicineName");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const [medRes, invRes] = await Promise.all([
          fetch("/api/resource/medicines?all=1&sort=medicineName&dir=asc", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/pharmacy/inventory", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        const medData = await medRes.json().catch(() => ({}));
        if (!medRes.ok) {
          throw new Error(
            medData.error || "The medicine directory could not be loaded."
          );
        }
        const invData = await invRes.json().catch(() => ({}));

        if (!cancelled) {
          setRows(Array.isArray(medData.rows) ? medData.rows : []);
          setStockRows(Array.isArray(invData.stock) ? invData.stock : []);
          setBatchRows(Array.isArray(invData.batches) ? invData.batches : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled && err.name !== "AbortError") {
          setError(err.message || "The medicine directory could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [nonce]);

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    setNonce((n) => n + 1);
  }, []);

  const inventory = useMemo(() => {
    const byName = new Map();
    const ensure = (name) => {
      const key = String(name || "").trim().toLowerCase();
      if (!key) return null;
      if (!byName.has(key)) {
        byName.set(key, {
          quantity: 0,
          reorderLevel: 0,
          stores: new Set(),
          unit: "",
          batches: [],
        });
      }
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
    (medicine) =>
      inventory.get(String(medicine?.medicineName || "").trim().toLowerCase()) ||
      null,
    [inventory]
  );

  const manufacturers = useMemo(() => {
    const set = new Set();
    for (const row of rows) {
      if (row.manufacturer) set.add(row.manufacturer);
    }
    return ["All", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const expiringCount = useMemo(() => {
    const names = new Set();
    for (const batch of batchRows) {
      const days = daysUntil(batch.expiryDate);
      if (days !== null && days <= 30) names.add(batch.medicineName);
    }
    return names.size;
  }, [batchRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== "All" && (row.category || "") !== category) return false;
      if (status !== "All" && (row.status || "") !== status) return false;
      if (manufacturer !== "All" && (row.manufacturer || "") !== manufacturer) {
        return false;
      }
      if (stockFilter !== "All") {
        const meta = stockMeta(inventoryFor(row));
        const wanted = {
          "In stock": "emerald",
          "Low stock": "amber",
          "Out of stock": "rose",
        }[stockFilter];
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
  const pageRows = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const stats = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outStock = 0;
    for (const row of rows) {
      const tone = stockMeta(inventoryFor(row)).tone;
      if (tone === "emerald") inStock += 1;
      else if (tone === "amber") lowStock += 1;
      else if (tone === "rose") outStock += 1;
    }
    return { total: rows.length, inStock, lowStock, outStock };
  }, [rows, inventoryFor]);

  const hasFilters =
    query ||
    category !== "All" ||
    status !== "All" ||
    manufacturer !== "All" ||
    stockFilter !== "All";

  function toggleSort(key) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={Pill} label="Medicines" value={stats.total} />
        <StatCard icon={Layers} label="In Stock" value={stats.inStock} tone="emerald" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={stats.lowStock} tone="amber" />
        <StatCard icon={PackageSearch} label="Expiring Soon" value={expiringCount} tone="rose" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-panel shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, code, generic or manufacturer..."
              aria-label="Search medicines"
              autoFocus
              className="h-10 w-full rounded-xl border border-ink-200 bg-field pl-9 pr-9 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-ink-200 bg-ink-50 p-0.5">
              {STATUS_FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setStatus(option);
                    setPage(1);
                  }}
                  aria-pressed={status === option}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition",
                    status === option
                      ? "bg-panel text-brand-700 shadow-sm dark:text-brand-300"
                      : "text-ink-500 hover:text-ink-700"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={reload}
              title="Refresh"
              aria-label="Refresh medicine list"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"
            >
              <RefreshCw
                className={cn("h-4 w-4", loading && "animate-spin")}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setCategory(option);
                  setPage(1);
                }}
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
            <Select
              label="Filter by manufacturer"
              value={manufacturer}
              onChange={(event) => {
                setManufacturer(event.target.value);
                setPage(1);
              }}
              options={manufacturers}
            />
            <Select
              label="Filter by stock status"
              value={stockFilter}
              onChange={(event) => {
                setStockFilter(event.target.value);
                setPage(1);
              }}
              options={STOCK_FILTERS}
            />
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold text-ink-500 transition hover:text-rose-600"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-ink-500">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden="true" />
            Loading medicine directory...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <X className="h-6 w-6" aria-hidden="true" />
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
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <PackageSearch className="h-8 w-8 text-ink-300" aria-hidden="true" />
            <p className="text-sm font-medium text-ink-600">No medicines found</p>
            <p className="text-[13px] text-ink-400">
              {hasFilters
                ? "Try adjusting your search or filters."
                : "The medicine master is empty."}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-[11px] uppercase tracking-wide text-ink-400">
                    {COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        className={cn(
                          "px-4 py-3 font-semibold",
                          column.align === "right" && "text-right"
                        )}
                      >
                        {column.sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column.key)}
                            className={cn(
                              "inline-flex items-center gap-1 transition hover:text-ink-700",
                              sortKey === column.key &&
                                "text-brand-600 dark:text-brand-300",
                              column.align === "right" && "flex-row-reverse"
                            )}
                          >
                            {column.label}
                            <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                          </button>
                        ) : (
                          column.label
                        )}
                      </th>
                    ))}
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const meta = stockMeta(inventoryFor(row));
                    return (
                      <tr
                        key={row._id}
                        onClick={() => setSelected(row)}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelected(row);
                          }
                        }}
                        className="cursor-pointer border-b border-ink-100 transition last:border-0 hover:bg-brand-50/50 focus-visible:bg-brand-50/50 focus-visible:outline-none"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink-900">
                            {row.medicineName}
                          </p>
                          <p className="font-mono text-[11.5px] text-ink-400">
                            {row.code}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-ink-600">
                          {row.generic || "—"}
                        </td>
                        <td className="px-4 py-3 text-ink-600">
                          {row.manufacturer || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[12px] font-medium text-ink-600">
                            {row.category || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StockBadge meta={meta} />
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-ink-800">
                          {formatMoney(row.mrp)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.status} />
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
                return (
                  <li key={row._id}>
                    <button
                      type="button"
                      onClick={() => setSelected(row)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-brand-50/50"
                    >
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-400">
                        <Pill className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-ink-900">
                            {row.medicineName}
                          </span>
                          <span className="shrink-0 font-mono text-[13px] text-ink-700">
                            {formatMoney(row.mrp)}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-ink-500">
                          {row.generic || "—"} · {row.manufacturer || "—"}
                        </span>
                        <span className="mt-1.5 flex items-center gap-2">
                          <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">
                            {row.category || "—"}
                          </span>
                          <StockBadge meta={meta} />
                          <StatusBadge status={row.status} />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-2.5 text-[12px] text-ink-400">
              <span>
                Showing {(safePage - 1) * PAGE_SIZE + 1}–
                {(safePage - 1) * PAGE_SIZE + pageRows.length} of {sorted.length}{" "}
                medicines
                {sorted.length !== rows.length ? ` (filtered from ${rows.length})` : ""}
              </span>

              {totalPages > 1 ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    aria-label="Previous page"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="px-2 font-semibold text-ink-600 tabular-nums">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
      </div>

      <MedicineDetail
        medicine={selected}
        inventory={selected ? inventoryFor(selected) : null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function DetailRow({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 py-2.5 last:border-0">
      <dt className="text-[12.5px] font-medium text-ink-400">{label}</dt>
      <dd
        className={cn(
          "text-right text-[13.5px] font-medium text-ink-800",
          mono && "font-mono tabular-nums"
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function CopyCodeButton({ code }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[12px] font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-900"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? "Copied" : "Copy code"}
    </button>
  );
}

export function MedicineDetail({ medicine, inventory, onClose }) {
  const open = Boolean(medicine);
  const meta = stockMeta(inventory);
  const stores = inventory ? [...inventory.stores] : [];
  const batches = inventory?.batches ?? [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      label="Medicine details"
      side="right"
      size="w-full sm:w-[460px]"
    >
      {medicine ? (
        <div className="flex h-full flex-col">
          <div className="flex items-start gap-3 border-b border-ink-100 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_20px_-10px_rgba(29,111,245,0.9)]">
              <Pill className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[17px] font-bold text-ink-900">
                {medicine.medicineName}
              </h2>
              <p className="mt-0.5 font-mono text-[12px] text-ink-400">
                {medicine.code}
              </p>
            </div>
            <button
              type="button"
              data-drawer-close
              onClick={onClose}
              aria-label="Close details"
              className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-2 border-b border-ink-100 bg-ink-50">
            <div className="border-r border-ink-100 px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                MRP
              </p>
              <p className="text-[20px] font-bold tracking-tight text-ink-900 tabular-nums">
                {formatMoney(medicine.mrp)}
              </p>
            </div>
            <div className="px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Availability
              </p>
              <div className="mt-1.5">
                <StockBadge meta={meta} />
              </div>
            </div>
          </div>

          <div className="scrollbar-slim flex-1 overflow-y-auto px-5 py-3">
            <dl>
              <DetailRow label="Generic" value={medicine.generic} />
              <DetailRow label="Manufacturer" value={medicine.manufacturer} />
              <DetailRow label="Dosage Form" value={medicine.category} />
              <DetailRow label="Unit" value={medicine.unit} />
              <DetailRow label="Item Code" value={medicine.code} mono />
              <DetailRow label="Status" value={medicine.status} />
            </dl>

            <section className="mt-4">
              <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-ink-400">
                <Warehouse className="h-3.5 w-3.5" aria-hidden="true" />
                Inventory
              </h3>
              {inventory ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-ink-200">
                  <div className="flex items-center justify-between bg-ink-50 px-3 py-2 text-[12.5px]">
                    <span className="font-medium text-ink-500">On hand</span>
                    <span className="font-mono font-semibold text-ink-900 tabular-nums">
                      {inventory.quantity}
                      {inventory.unit ? ` ${inventory.unit}` : ""}
                    </span>
                  </div>
                  {inventory.reorderLevel > 0 ? (
                    <div className="flex items-center justify-between border-t border-ink-100 px-3 py-2 text-[12.5px]">
                      <span className="font-medium text-ink-500">Reorder level</span>
                      <span className="font-mono font-semibold text-ink-700 tabular-nums">
                        {inventory.reorderLevel}
                      </span>
                    </div>
                  ) : null}
                  {stores.length > 0 ? (
                    <div className="flex items-start justify-between gap-3 border-t border-ink-100 px-3 py-2 text-[12.5px]">
                      <span className="font-medium text-ink-500">Store</span>
                      <span className="text-right font-medium text-ink-700">
                        {stores.join(", ")}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 rounded-xl border border-dashed border-ink-200 px-3 py-3 text-center text-[12.5px] text-ink-400">
                  No stock recorded for this item.
                </p>
              )}
            </section>

            {batches.length > 0 ? (
              <section className="mt-4">
                <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-ink-400">
                  <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                  Batches
                </h3>
                <ul className="mt-2 space-y-2">
                  {batches.map((batch) => {
                    const days = daysUntil(batch.expiryDate);
                    const warn = days !== null && days <= 30;
                    return (
                      <li
                        key={batch.id || batch.batchNo}
                        className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-[12.5px] font-semibold text-ink-800">
                            {batch.batchNo}
                          </p>
                          <p className="truncate text-[11.5px] text-ink-400">
                            {batch.manufacturer || "—"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={cn(
                              "font-mono text-[12px] font-semibold tabular-nums",
                              warn
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-ink-600"
                            )}
                          >
                            {batch.expiryDate}
                          </p>
                          <p className="text-[11px] text-ink-400">
                            {warn
                              ? days < 0
                                ? "Expired"
                                : `${days} day${days === 1 ? "" : "s"} left`
                              : "Qty " + (batch.quantity ?? "—")}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>

          <div className="flex items-center gap-2 border-t border-ink-100 p-4">
            <CopyCodeButton code={medicine.code} />
            <span className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-400">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Read-only master record
            </span>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
export { CATEGORY_FILTERS, STATUS_FILTERS, STOCK_FILTERS };
