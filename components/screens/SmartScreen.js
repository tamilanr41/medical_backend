"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Inbox,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  SearchX,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ENTITIES, WRITABLE_COLLECTIONS } from "@/config/entities";
import { cn } from "@/lib/utils";
import {
  buildSchema,
  issuesToFieldErrors,
  searchFields,
  normalizeValues,
} from "@/lib/validation";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import StatePanel from "@/components/ui/StatePanel";
import PageSection from "@/components/ui/PageSection";
import Dialog from "@/components/ui/Dialog";

const PAGE_SIZE = 10;
const CHART_TONES = ["#1d6ff5", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"];

/* ----------------------------- helpers ----------------------------- */

function humanize(name) {
  if (!name) return "";
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fieldFor(entity, name) {
  return entity.fields.find((field) => field.name === name) ?? { name, label: humanize(name), type: "text" };
}

function resolveColumns(entity) {
  const pick = entity.columns?.length ? entity.columns : entity.fields.map((field) => field.name);
  return pick.map((name) => {
    const field = fieldFor(entity, name);
    return {
      key: name,
      label: field.label,
      type: field.type,
      right: field.type === "number" || field.type === "currency",
    };
  });
}

function fmtValue(value, field) {
  if (value === null || value === undefined || value === "") return "—";
  if (field?.type === "currency") {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (field?.type === "number") {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return n.toLocaleString("en-IN");
  }
  if (field?.type === "date") {
    const s = String(value);
    return s.length > 10 ? s.slice(0, 10) : s;
  }
  return String(value);
}

function toneForLabel(label) {
  const chain = ["emerald", "sky", "amber", "violet", "rose", "teal", "indigo", "orange"];
  let hash = 0;
  const source = String(label ?? "");
  for (let i = 0; i < source.length; i += 1) hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  return chain[hash % chain.length];
}

function fmtNumber(value) {
  return Number(value ?? 0).toLocaleString("en-IN");
}

function canWriteEntity(entity, collection) {
  if (!entity) return false;
  return entity.readOnly !== true && WRITABLE_COLLECTIONS.has(collection);
}

function RowActions({ row, onView, onEdit, onDelete }) {
  const iconBtn =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-700";
  return (
    <>
      {onView ? (
        <button type="button" title="View record" onClick={() => onView(row)} className={iconBtn}>
          <Eye className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {onEdit ? (
        <button type="button" title="Edit record" onClick={() => onEdit(row)} className={iconBtn}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          title="Delete record"
          onClick={() => onDelete(row)}
          className={cn(iconBtn, "text-rose-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </>
  );
}

/* ------------------------ data fetching hook ------------------------ */

function useCollection(collection) {
  const [state, setState] = useState({ rows: null, loading: true, error: null, readOnly: false, nonce: 0 });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/resource/${collection}?all=1`, { cache: "no-store" });
        if (!alive) return;
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || `Request failed (${res.status}).`);
        }
        const data = await res.json();
        setState((s) => ({
          ...s,
          rows: data.rows ?? [],
          readOnly: data.readOnly === true,
          loading: false,
          error: null,
        }));
      } catch (err) {
        if (!alive) return;
        setState((s) => ({ ...s, loading: false, error: err.message }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [collection, state.nonce]);

  const refetch = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null, nonce: s.nonce + 1 }));
  }, []);

  return [state, refetch];
}

function filterRows(rows, entity, { q, status, from, to }) {
  const flags = searchFields(entity);
  const badge = entity.badgeField;
  const date = entity.dateField;
  return rows.filter((row) => {
    if (q) {
      const needle = q.toLowerCase();
      const hit = flags.some((name) => String(row[name] ?? "").toLowerCase().includes(needle));
      if (!hit && !String(row._id ?? "").toLowerCase().includes(needle)) return false;
    }
    if (status && badge && String(row[badge] ?? "") !== status) return false;
    if (from || to) {
      const value = date ? String(row[date] ?? "") : "";
      if (from && value < from) return false;
      if (to && value > to) return false;
    }
    return true;
  });
}

/* --------------------------- smart screen --------------------------- */

export default function SmartScreen({ module, category, item }) {
  const entity = item.screen.collection ? ENTITIES[item.screen.collection] : null;
  const type = item.screen.type || "list";

  const body = useMemo(() => {
    if (!item.screen.collection) {
      return <Unconfigured module={module} category={category} item={item} />;
    }
    if (!entity) {
      return (
        <Unconfigured
          module={module}
          category={category}
          item={item}
          note={`Collection "${item.screen.collection}" has no entity definition yet.`}
        />
      );
    }

    const canWrite = canWriteEntity(entity, item.screen.collection);

    if (type === "report") {
      return <ReportScreen collection={item.screen.collection} entity={entity} />;
    }
    if (entity.readOnly === true || !canWrite) {
      return <ListScreen collection={item.screen.collection} entity={entity} />;
    }
    if (type === "crud") {
      return <CrudScreen collection={item.screen.collection} entity={entity} />;
    }
    if (type === "form") {
      return <FormScreen collection={item.screen.collection} entity={entity} />;
    }
    return <ListScreen collection={item.screen.collection} entity={entity} />;
  }, [item, entity, module, category, type]);

  return (
    <div className="space-y-6">
      {type === "report" || type === "crud" || type === "form" ? (
        <ScreenIntro module={module} category={category} item={item} entity={entity} type={type} canWrite={canWriteEntity(entity, item.screen.collection)} />
      ) : null}
      {body}
    </div>
  );
}

function ScreenIntro({ module, category, item, entity, type, canWrite }) {
  const blurb =
    type === "report"
      ? "Analytics and exportable summaries built live from your data."
      : type === "form"
        ? "Capture a record. Fields are validated against the shared schema."
        : type === "crud"
          ? "Browse existing records, then add new entries inline."
          : null;
  return (
    <div className="rounded-2xl border border-ink-200/70 bg-panel px-5 py-4 shadow-[var(--shadow-card)]">
      <p className="text-sm text-ink-500">
        {module.title} <span className="mx-1 text-ink-300">/</span>
        <span className="font-medium text-ink-700">{category.title}</span>
        <span className="mx-1 text-ink-300">/</span>
        <span className="font-medium text-ink-700">{item.title}</span>
        {entity ? (
          <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 font-mono text-[11px] text-brand-700 dark:text-brand-400">{entity.label}</span>
        ) : null}
      </p>
      {blurb ? <p className="mt-1 text-[13px] text-ink-500">{blurb}</p> : null}
      {type === "form" && !canWrite ? (
        <p className="mt-1 text-[12.5px] font-medium text-amber-600 dark:text-amber-400">This record is read-only in your role.</p>
      ) : null}
    </div>
  );
}

/* ------------------------- unconfigured state ------------------------ */

function Unconfigured({ module, category, item, note }) {
  return (
    <StatePanel
      icon={Inbox}
      eyebrow="Screen source pending"
      title="No data source has been wired up yet."
      description={
        note ||
        `This screen (${item.title}) has not been linked to a collection. Until then it stays offline so nothing is ever shown from mock data.`
      }
      tone="neutral"
      details={[
        { label: "Module", value: module.title },
        { label: "Category", value: category.title },
        { label: "Route", value: `/${module.slug}/${category.slug}/${item.slug}` },
      ]}
      actions={
        <Link href={`/${module.slug}/${category.slug}`} className={buttonVariants({ variant: "secondary" })}>
          Back to {category.title}
        </Link>
      }
    />
  );
}

/* ------------------------------ list ------------------------------ */

function ListScreen({ collection, entity, onEdit, onDelete, onView }) {
  const [state, refetch] = useCollection(collection);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const columns = useMemo(() => resolveColumns(entity), [entity]);
  const badge = entity.badgeField;
  const hasActions = Boolean(onEdit || onDelete || onView);

  const filtered = useMemo(
    () => filterRows(state.rows ?? [], entity, { q, status, from, to }),
    [state.rows, entity, q, status, from, to]
  );

  const sorted = useMemo(() => {
    const rows = [...filtered];
    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const numeric = typeof av === "number" && typeof bv === "number";
        const diff = numeric ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
        return sortDir === "asc" ? diff : -diff;
      });
    }
    return rows;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const changeQ = (v) => {
    setQ(v);
    setPage(1);
  };
  const changeStatus = (v) => {
    setStatus(v);
    setPage(1);
  };
  const changeFrom = (v) => {
    setFrom(v);
    setPage(1);
  };
  const changeTo = (v) => {
    setTo(v);
    setPage(1);
  };

  const resetFilters = () => {
    setQ("");
    setStatus("All");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const refresh = () => {
    resetFilters();
    refetch();
  };

  return (
    <ScreenCard
      title="Records"
      eyebrow={entity.label}
      count={state.loading && !state.rows ? null : filtered.length}
      actions={
        <>
          <ExportMenu rows={sorted} columns={columns} filename={`${collection}-export`} title={entity.label} />
          <button type="button" onClick={refresh} className={cn(buttonVariants({ variant: "secondary", size: "sm" }))} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </>
      }
    >
      {state.error ? (
        <StatePanel
          icon={SearchX}
          eyebrow="Live fetch failed"
          title="We could not load this screen."
          description={state.error}
          tone="danger"
          actions={
            <button type="button" onClick={() => refetch()} className={buttonVariants({ variant: "primary" })}>
              Try again
            </button>
          }
        />
      ) : !state.rows ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <FilterBar
            badge={badge}
            date={entity.dateField}
            q={q}
            setQ={changeQ}
            statusOptions={badge ? [...new Set(state.rows.map((r) => r[badge]).filter(Boolean))].sort() : []}
            status={status}
            setStatus={changeStatus}
            from={from}
            setFrom={changeFrom}
            to={to}
            setTo={changeTo}
            onReset={resetFilters}
          />
          {pageRows.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium text-ink-500">No records match.</p>
              <p className="mt-1 text-xs text-ink-400">Try a different search or clear the filters.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-ink-50/80 text-[12px] uppercase tracking-wide text-ink-400">
                    <tr>
                      {columns.map((col) => (
                        <th key={col.key} className={cn("px-4 py-3 font-semibold", col.right && "text-right")}>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-brand-700"
                            onClick={() => {
                              if (sortKey === col.key) {
                                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                              } else {
                                setSortKey(col.key);
                                setSortDir("asc");
                              }
                            }}
                          >
                            {col.label}
                            {sortKey === col.key ? (
                              sortDir === "asc" ? (
                                <ArrowUpDown className="h-3 w-3" />
                              ) : (
                                <ArrowDownUp className="h-3 w-3" />
                              )
                            ) : null}
                          </button>
                        </th>
                      ))}
                      {hasActions ? (
                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {pageRows.map((row) => (
                      <tr key={row._id} className="bg-panel transition hover:bg-brand-50/40">
                        {columns.map((col) => (
                          <td key={col.key} className={cn("px-4 py-3 text-[13px] text-ink-700", col.right && "text-right font-medium")}>
                            {col.key === badge ? (
                              <Badge tone={toneForLabel(String(row[col.key]))}>{String(row[col.key])}</Badge>
                            ) : (
                              fmtValue(row[col.key], fieldFor(entity, col.key))
                            )}
                          </td>
                        ))}
                        {hasActions ? (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <RowActions row={row} onView={onView} onEdit={onEdit} onDelete={onDelete} />
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 p-4 lg:hidden">
                {pageRows.map((row) => (
                  <div key={row._id} className="rounded-xl border border-ink-100 bg-ink-50/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink-800">{fmtValue(row[columns[0].key], fieldFor(entity, columns[0].key))}</span>
                      {badge && row[badge] ? <Badge tone={toneForLabel(String(row[badge]))}>{String(row[badge])}</Badge> : null}
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                      {columns.slice(1, 5).map((col) => (
                        <div key={col.key}>
                          <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">{col.label}</dt>
                          <dd className="truncate text-[12.5px] text-ink-600">{fmtValue(row[col.key], fieldFor(entity, col.key))}</dd>
                        </div>
                      ))}
                    </dl>
                    {hasActions ? (
                      <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-ink-100 pt-2.5">
                        <RowActions row={row} onView={onView} onEdit={onEdit} onDelete={onDelete} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <PaginationFooter page={safePage} totalPages={totalPages} total={sorted.length} setPage={setPage} />
            </>
          )}
        </>
      )}
    </ScreenCard>
  );
}

/* ------------------------------ form ------------------------------ */

function FormScreen({ collection, entity, record = null, onDone, onCancel }) {
  const editing = Boolean(record?._id);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [errors, setErrors] = useState({});

  const defaults = useMemo(() => {
    const out = {};
    for (const field of entity.fields) {
      const raw = record ? record[field.name] : undefined;
      if (raw === undefined || raw === null || raw === "") {
        out[field.name] = editing ? "" : field.default ?? "";
      } else if (field.type === "date") {
        out[field.name] = String(raw).slice(0, 10);
      } else {
        out[field.name] = String(raw);
      }
    }
    return out;
  }, [entity.fields, record, editing]);

  const { register, getValues, reset } = useForm({ defaultValues: defaults });

  const onSubmit = async (event) => {
    event.preventDefault();
    setNotice(null);
    const values = getValues();
    const parsed = buildSchema(entity, { mode: editing ? "update" : "create" }).safeParse(values);
    if (!parsed.success) {
      setErrors(issuesToFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const body = normalizeValues(entity, parsed.data);
      const res = await fetch(
        editing ? `/api/resource/${collection}/${record._id}` : `/api/resource/${collection}`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(payload.fields ?? {});
        setNotice({ kind: "error", message: payload.error || `Save failed (${res.status}).` });
        return;
      }
      if (onDone) {
        onDone({ kind: "success", message: `${entity.label} ${editing ? "updated" : "recorded"} successfully.` });
        return;
      }
      setNotice({ kind: "success", message: `${entity.label} ${editing ? "updated" : "recorded"} successfully.` });
      reset();
    } catch {
      setNotice({ kind: "error", message: "Network error while saving. Please retry." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenCard title={editing ? "Edit entry" : "New entry"} eyebrow={entity.label} count={null} actions={null}>
      <form onSubmit={onSubmit} className="grid gap-x-5 gap-y-5 p-6 sm:grid-cols-2 lg:grid-cols-3" noValidate>
        {entity.fields.map((field) => (
          <FieldControl key={field.name} field={field} register={register} error={errors[field.name]} />
        ))}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
          <button type="submit" disabled={saving} className={cn(buttonVariants({ variant: "primary" }), "disabled:opacity-60")}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <Pencil className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {saving ? "Saving…" : editing ? `Update ${entity.label}` : `Save ${entity.label}`}
          </button>
          <button type="button" className={buttonVariants({ variant: "secondary" })} onClick={() => (editing && onCancel ? onCancel() : reset())}>
            {editing ? "Cancel" : "Clear"}
          </button>
          {notice ? <Notice notice={notice} /> : null}
        </div>
      </form>
    </ScreenCard>
  );
}

function FieldControl({ field, register, error }) {
  const id = `field-${field.name}`;
  const shared = {
    id,
    ...register(field.name),
    className: cn(
      "w-full rounded-xl border bg-ink-50/40 px-3.5 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:ring-2",
      error ? "border-danger-300 focus:ring-danger-200" : "border-ink-200 focus:border-brand-400 focus:ring-brand-200"
    ),
  };

  let control;
  if (field.type === "textarea") {
    control = <textarea rows={3} {...shared} />;
  } else if (field.type === "select") {
    control = (
      <select {...shared}>
        <option value="">{field.placeholder || "Select…"}</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  } else if (field.type === "date") {
    control = <input type="date" {...shared} />;
  } else if (field.type === "email") {
    control = <input type="email" {...shared} placeholder={field.placeholder || "name@hospital.org"} />;
  } else if (field.type === "password") {
    control = <input type="password" {...shared} />;
  } else {
    control = <input type={field.type === "number" || field.type === "currency" ? "number" : "text"} step="any" {...shared} placeholder={field.placeholder} />;
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-semibold text-ink-600">
        {field.label}
        {field.required ? <span className="ml-0.5 text-danger-500">*</span> : null}
      </label>
      {control}
      {error ? <p className="mt-1 text-[12px] font-medium text-danger-500">{error}</p> : null}
    </div>
  );
}

/* ------------------------------ crud ------------------------------ */

function CrudScreen({ collection, entity }) {
  const canEdit = canWriteEntity(entity, collection);
  const [mode, setMode] = useState("list");
  const [active, setActive] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [listKey, setListKey] = useState(0);

  const toList = useCallback((feedback) => {
    setMode("list");
    setActive(null);
    setDeleting(null);
    setListKey((k) => k + 1);
    if (feedback) setNotice(feedback);
  }, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/resource/${collection}/${deleting._id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", message: payload.error || `Delete failed (${res.status}).` });
        setDeleting(null);
        return;
      }
      toList({ kind: "success", message: `${entity.label} deleted.` });
    } catch {
      setNotice({ kind: "error", message: "Network error while deleting. Please retry." });
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  if (mode === "new" || mode === "edit") {
    return (
      <FormScreen
        key={mode === "edit" ? active?._id : "new"}
        collection={collection}
        entity={entity}
        record={mode === "edit" ? active : null}
        onDone={toList}
        onCancel={() => toList()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {notice ? <Notice notice={notice} /> : null}
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setMode("new");
            }}
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            <Plus className="h-4 w-4" />
            Add new
          </button>
        ) : null}
      </div>
      <ListScreen
        key={listKey}
        collection={collection}
        entity={entity}
        onView={(row) => {
          setActive(row);
          setMode("view");
        }}
        onEdit={
          canEdit
            ? (row) => {
                setActive(row);
                setMode("edit");
              }
            : undefined
        }
        onDelete={canEdit ? (row) => setDeleting(row) : undefined}
      />

      {mode === "view" && active ? (
        <RecordView
          entity={entity}
          record={active}
          onClose={() => toList()}
          onEdit={
            canEdit
              ? () => {
                  setMode("edit");
                }
              : undefined
          }
        />
      ) : null}

      <Dialog
        open={Boolean(deleting)}
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
        title={`Delete ${entity.label}`}
        description="This action cannot be undone."
      >
        <div className="px-5 py-4">
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <p className="text-[13px] text-ink-600">
              You are about to permanently delete{" "}
              <span className="font-semibold text-ink-800">
                {deleting ? fmtValue(deleting[entity.fields[0]?.name], entity.fields[0]) : ""}
              </span>{" "}
              from {entity.label}.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => setDeleting(null)}
            className={buttonVariants({ variant: "secondary" })}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={confirmDelete}
            className={cn(buttonVariants({ variant: "danger" }), "disabled:opacity-60")}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function RecordView({ entity, record, onClose, onEdit }) {
  const primary = entity.fields[0];
  return (
    <Dialog
      open
      onClose={onClose}
      title={entity.label}
      description={primary ? String(fmtValue(record[primary.name], primary)) : "Record detail"}
      className="max-w-2xl"
    >
      <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {entity.fields.map((field) => (
            <div key={field.name} className="rounded-xl border border-ink-100 bg-ink-50/50 px-3.5 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{field.label}</dt>
              <dd className="mt-0.5 break-words text-sm text-ink-800">{fmtValue(record[field.name], field)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-3">
        {onEdit ? (
          <button type="button" onClick={onEdit} className={buttonVariants({ variant: "soft" })}>
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        ) : null}
        <button type="button" onClick={onClose} className={buttonVariants({ variant: "secondary" })}>
          Close
        </button>
      </div>
    </Dialog>
  );
}

/* ----------------------------- report ----------------------------- */

function ReportScreen({ collection, entity }) {
  const [state, refetch] = useCollection(collection);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const columns = useMemo(() => resolveColumns(entity), [entity]);
  const badge = entity.badgeField;
  const date = entity.dateField;
  const amount = entity.amountField;

  const filtered = useMemo(
    () => filterRows(state.rows ?? [], entity, { q, status, from, to }),
    [state.rows, entity, q, status, from, to]
  );

  const metrics = useMemo(() => {
    return {
      total: filtered.length,
      sum: amount ? filtered.reduce((acc, row) => acc + (Number(row[amount]) || 0), 0) : null,
    };
  }, [filtered, amount]);

  const statusBreakdown = useMemo(() => {
    if (!badge) return [];
    const map = new Map();
    for (const row of filtered) {
      const key = String(row[badge] ?? "Unassigned");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count }));
  }, [filtered, badge]);

  const trend = useMemo(() => {
    if (!date) return null;
    const byDate = new Map();
    for (const row of filtered) {
      const key = String(row[date] ?? "Unknown").slice(0, 10);
      byDate.set(key, (byDate.get(key) ?? 0) + 1);
    }
    const rows = [...byDate.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!amount) return rows;
    return rows.map((row) => ({
      name: row.name,
      count: row.count,
      amount: filtered
        .filter((r) => String(r[date] ?? "").slice(0, 10) === row.name)
        .reduce((acc, r) => acc + (Number(r[amount]) || 0), 0),
    }));
  }, [filtered, date, amount]);

  const hasChart = trend ? trend.length > 1 : statusBreakdown.length > 0;

  const statusOptions = useMemo(() => {
    if (!badge) return [];
    return [...new Set((state.rows ?? []).map((r) => r[badge]).filter(Boolean))].sort();
  }, [state.rows, badge]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total records" value={fmtNumber(metrics.total)} icon={<FileText className="h-4 w-4" />} />
        {metrics.sum !== null ? (
          <MetricCard label={amount ? `${fieldFor(entity, amount).label} total` : "Value total"} value={`₹ ${fmtNumber(metrics.sum)}`} icon={<TrendingUp className="h-4 w-4" />} type="accent" />
        ) : metrics.total > 0 && badge ? (
          <MetricCard label={`${humanize(badge)} categories`} value={fmtNumber(statusBreakdown.length)} icon={<TrendingDown className="h-4 w-4" />} type="alt" />
        ) : (
          <MetricCard label="Source" value={entity.label} icon={<FileSpreadsheet className="h-4 w-4" />} type="alt" />
        )}
      </div>

      {hasChart ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {trend && trend.length > 1 ? (
            <PageSection title="Daily trend" subtitle={date ? `Grouped by ${humanize(date)}` : "Records per day"} icon={<Calendar className="h-4 w-4" />}>
              <ChartArea trend={trend} amount={amount} />
            </PageSection>
          ) : null}
          {statusBreakdown.length > 0 ? (
            <PageSection title="Status mix" subtitle={badge ? `Distribution across ${humanize(badge)}` : "By status"} icon={<FileSpreadsheet className="h-4 w-4" />}>
              <ChartBreakdown rows={statusBreakdown} />
            </PageSection>
          ) : null}
        </div>
      ) : null}

      <ScreenCard
        title="Detail"
        eyebrow={entity.label}
        count={state.loading && !state.rows ? null : filtered.length}
        actions={<ExportMenu rows={filtered} columns={columns} filename={`${collection}-report`} title={entity.label} />}
      >
        {state.error ? (
          <StatePanel
            icon={SearchX}
            eyebrow="Live fetch failed"
            title="We could not load this report."
            description={state.error}
            tone="danger"
            actions={
              <button type="button" onClick={() => refetch()} className={buttonVariants({ variant: "primary" })}>
                Try again
              </button>
            }
          />
        ) : !state.rows ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <FilterBar
              badge={badge}
              date={date}
              q={q}
              setQ={setQ}
              statusOptions={statusOptions}
              status={status}
              setStatus={setStatus}
              from={from}
              setFrom={setFrom}
              to={to}
              setTo={setTo}
              onReset={() => {
                setQ("");
                setStatus("All");
                setFrom("");
                setTo("");
              }}
            />
            <ReportTable entity={entity} rows={filtered} columns={columns} badge={badge} />
          </>
        )}
      </ScreenCard>
    </>
  );
}

function ReportTable({ entity, rows, columns, badge }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="text-sm font-medium text-ink-500">No records in this report yet.</p>
        <p className="mt-1 text-xs text-ink-400">Adjust the filters above to widen the range.</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-ink-50/80 text-[12px] uppercase tracking-wide text-ink-400">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cn("px-4 py-3 font-semibold", col.right && "text-right")}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pageRows.map((row) => (
              <tr key={row._id} className="bg-panel transition hover:bg-brand-50/40">
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 text-[13px] text-ink-700", col.right && "text-right font-medium")}>
                    {col.key === badge ? (
                      <Badge tone={toneForLabel(String(row[col.key]))}>{String(row[col.key])}</Badge>
                    ) : (
                      fmtValue(row[col.key], fieldFor(entity, col.key))
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-4 lg:hidden">
        {pageRows.map((row) => (
          <div key={row._id} className="rounded-xl border border-ink-100 bg-ink-50/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-ink-800">{fmtValue(row[columns[0].key], fieldFor(entity, columns[0].key))}</span>
              {badge && row[badge] ? <Badge tone={toneForLabel(String(row[badge]))}>{String(row[badge])}</Badge> : null}
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              {columns.slice(1, 5).map((col) => (
                <div key={col.key}>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">{col.label}</dt>
                  <dd className="truncate text-[12.5px] text-ink-600">{fmtValue(row[col.key], fieldFor(entity, col.key))}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <PaginationFooter page={safePage} totalPages={totalPages} total={rows.length} setPage={setPage} />
    </>
  );
}

/* --------------------------- chart pieces --------------------------- */

function ChartArea({ trend, amount }) {
  return (
    <div className="h-56 w-full px-2 py-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trend} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="smartTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d6ff5" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1d6ff5" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e2e8f0)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--chart-axis, #94a3b8)" tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--chart-axis, #94a3b8)" tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--ink-200)", fontSize: 12 }} labelStyle={{ fontWeight: 700 }} />
          <Area type="monotone" dataKey="count" name="Records" stroke="#1d6ff5" strokeWidth={2} fill="url(#smartTrendFill)" />
          {amount ? <Area type="monotone" dataKey="amount" name="Amount" stroke="#10b981" strokeWidth={2} fill="transparent" /> : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartBreakdown({ rows }) {
  return (
    <div className="h-56 w-full px-2 py-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e2e8f0)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--chart-axis, #94a3b8)" tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--chart-axis, #94a3b8)" tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--ink-200)", fontSize: 12 }} />
          <Bar dataKey="count" name="Records" radius={[6, 6, 0, 0]}>
            {rows.map((row, index) => (
              <Cell key={row.name} fill={CHART_TONES[index % CHART_TONES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* --------------------------- shared pieces --------------------------- */

function ScreenCard({ title, eyebrow, count, actions, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/80 bg-panel shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-ink-800">{title}</h3>
          {eyebrow ? <span className="rounded-full bg-ink-100 px-2 py-0.5 font-mono text-[11px] text-ink-500">{eyebrow}</span> : null}
          {count !== null ? (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11.5px] font-semibold text-brand-700 dark:text-brand-400">{fmtNumber(count)}</span>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

function FilterBar({ badge, date, q, setQ, statusOptions, status, setStatus, from, setFrom, to, setTo, onReset }) {
  const hasFilters = Boolean(q) || status !== "All" || Boolean(from) || Boolean(to);
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-4 py-3">
      <div className="relative min-w-[200px] flex-1 lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        <input
          type="search"
          value={q}
          placeholder="Search records…"
          onChange={(event) => setQ(event.target.value)}
          className="w-full rounded-xl border border-ink-200 bg-ink-50/40 py-2 pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
        />
      </div>
      {statusOptions.length > 0 ? (
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-ink-200 bg-ink-50/40 px-3 py-2 text-sm text-ink-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
        >
          <option value="All">All statuses</option>
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : null}
      {date ? (
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-ink-200 bg-ink-50/40 px-3 py-2 text-sm text-ink-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200" />
          <span className="text-xs text-ink-400">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-ink-200 bg-ink-50/40 px-3 py-2 text-sm text-ink-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200" />
        </div>
      ) : null}
      {hasFilters ? (
        <button type="button" onClick={onReset} className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function PaginationFooter({ page, totalPages, total, setPage }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3">
      <p className="text-xs text-ink-400">
        {fmtNumber(total)} record{total === 1 ? "" : "s"} · page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className={cn(buttonVariants({ variant: "secondary", size: "icon" }), "disabled:opacity-40")}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className={cn(buttonVariants({ variant: "secondary", size: "icon" }), "disabled:opacity-40")}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, type }) {
  return (
    <div className="rounded-2xl border border-ink-200/70 bg-panel p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">{label}</span>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            type === "accent" ? "bg-emerald-50 text-emerald-600" : type === "alt" ? "bg-violet-50 text-violet-600" : "bg-brand-50 text-brand-600"
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 truncate text-2xl font-bold tracking-tight text-ink-900">{value}</p>
    </div>
  );
}

function Notice({ notice }) {
  const tone = notice.kind === "success" ? "text-emerald-700 dark:text-emerald-400" : "text-danger-600";
  return <p className={cn("text-sm font-medium", tone)}>{notice.message}</p>;
}

/* --------------------------- export menu --------------------------- */

function ExportMenu({ rows, columns, filename, title }) {
  const [busy, setBusy] = useState(null);

  const download = async (kind) => {
    setBusy(kind);
    try {
      const data = rows.map((row) => {
        const out = {};
        for (const col of columns) out[col.label] = fmtValue(row[col.key], { type: col.type });
        return out;
      });

      if (kind === "csv") {
        downloadBlob(buildCsv(data), `${filename}.csv`, "text/csv");
      } else if (kind === "xlsx") {
        const XLSX = await import("xlsx");
        const sheet = XLSX.utils.json_to_sheet(data);
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, title.slice(0, 28));
        XLSX.writeFile(book, `${filename}.xlsx`);
      } else if (kind === "pdf") {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF("l", "pt", "a4");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(title, 40, 40);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const top = 60;
        const cellPad = 6;
        const widths = columns.map((col) => Math.min(180, Math.max(70, col.label.length * 7 + 12)));
        const left = 40;
        const textFor = (row, col) => String(fmtValue(row[col.key], { type: col.type }) ?? "");
        let y = top;
        doc.setTextColor(80);
        columns.forEach((col, i) => {
          doc.text(col.label.toUpperCase(), left + widths.slice(0, i).reduce((acc, w) => acc + w, 0) + cellPad, y);
        });
        y += 16;
        for (const row of rows) {
          doc.line(left, y - 6, left + widths.reduce((acc, w) => acc + w, 0), y - 6);
          columns.forEach((col, i) => {
            const x = left + widths.slice(0, i).reduce((acc, w) => acc + w, 0) + cellPad;
            const text = textFor(row, col);
            doc.text(text.length > 42 ? `${text.slice(0, 40)}…` : text, x, y);
          });
          y += 14;
          if (y > 760) {
            doc.addPage();
            y = 50;
          }
        }
        doc.line(left, y - 6, left + widths.reduce((acc, w) => acc + w, 0), y - 6);
        doc.save(`${filename}.pdf`);
      } else if (kind === "print") {
        openPrintWindow(buildPrintHtml(title, columns, data));
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Download className="h-3.5 w-3.5 text-ink-400" />
      {[
        ["csv", "CSV"],
        ["xlsx", "Excel"],
        ["pdf", "PDF"],
        ["print", "Print"],
      ].map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          disabled={busy !== null}
          onClick={() => download(kind)}
          className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[12px] font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
        >
          {busy === kind ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
          {label}
        </button>
      ))}
    </div>
  );
}

function buildCsv(data) {
  if (data.length === 0) return "";
  const keys = Object.keys(data[0]);
  const esc = (value) => {
    const s = String(value ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...data.map((row) => keys.map((k) => esc(row[k])).join(","))].join("\n");
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildPrintHtml(title, columns, data) {
  const head = `<title>${title}</title><style>body{font-family:system-ui,Arial,sans-serif;margin:32px;color:#0f172a}h1{font-size:18px;margin:0 0 4px}p{color:#64748b;font-size:12px;margin:0 0 16px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}th{background:#f1f5f9;font-weight:700;white-space:nowrap}tr:nth-child(even){background:#f8fafc}@media print{body{margin:12mm}}</style>`;
  const th = columns.map((c) => `<th>${c.label}</th>`).join("");
  const tr = data
    .slice(0, 500)
    .map((row) => `<tr>${columns.map((c) => `<td>${String(row[c.label] ?? "—").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`).join("")}</tr>`)
    .join("");
  return `<!doctype html><html><head>${head}</head><body><h1>${title}</h1><p>${data.length} records · generated ${new Date().toLocaleString()}</p><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></body></html>`;
}

function openPrintWindow(html) {
  const win = window.open("", "_blank", "width=980,height=720");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => {
    win.print();
  };
}