"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Check,
  Download,
  FlaskConical,
  Loader2,
  Play,
  Printer,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";
import { Field, opInputCls as inputCls } from "./PatientPicker";
import { getLabMenu } from "@/config/lab-reports";
import { buildReportHtml, buildReportSheet, buildReportPdf, columnWidths, formatCell } from "@/lib/reports/report-document";

function pad(value) {
  return String(value).padStart(2, "0");
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthStartIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function monthIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function blankFilters() {
  return {
    selectBy: "period",
    fromDate: monthStartIso(),
    toDate: todayIso(),
    month: monthIso(),
    year: String(new Date().getFullYear()),
    doctor: "",
    test: "",
    status: "",
    format: "HTML",
  };
}

async function downloadExcel(data) {
  const XLSX = await import("xlsx");
  const { aoa, cols, merges, filename } = buildReportSheet(data);
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = cols;
  if (merges.length) sheet["!merges"] = merges;
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, (data.report?.title || "Report").slice(0, 28));
  XLSX.writeFile(book, filename);
}

async function renderPdf(data, preopenedWindow) {
  const target = preopenedWindow ?? window.open("", "_blank");
  const { doc, filename } = await buildReportPdf(data);
  const url = URL.createObjectURL(doc.output("blob"));
  if (target && !target.closed) {
    target.location.href = url;
  } else {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
}

function openPrint(data) {
  const target = window.open("", "_blank");
  if (!target) return;
  target.document.write(buildReportHtml(data));
  target.document.close();
  target.focus();
  target.print();
}

const groupKey = (report) => report?.group || "Reports";

export default function LabReport({ item }) {
  const menu = useMemo(() => (item?.slug ? getLabMenu(item.slug) : null), [item]);
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  const [selectedKey, setReportKey] = useState("");
  const [filters, setFilters] = useState(blankFilters);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [result, setResult] = useState(null);

  const menuReports = useMemo(() => {
    if (!catalog?.reports) return [];
    const allowed = menu?.reports ?? [];
    const list = allowed.length
      ? allowed.map((key) => catalog.reports.find((r) => r.key === key)).filter(Boolean)
      : catalog.reports;
    return list;
  }, [catalog, menu]);

  useEffect(() => {
    let alive = true;
    fetch("/api/reports/lab")
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok) {
          setCatalogError(data?.error || "Unable to load lab report catalogue.");
          return;
        }
        setCatalog(data);
      })
      .catch(() => {
        if (alive) setCatalogError("Unable to load lab report catalogue.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const reportKey = useMemo(() => {
    if (menuReports.some((r) => r.key === selectedKey)) return selectedKey;
    return menu?.default ?? menuReports[0]?.key ?? "";
  }, [menuReports, menu, selectedKey]);

  const report = useMemo(() => menuReports.find((r) => r.key === reportKey) ?? null, [menuReports, reportKey]);
  const options = catalog?.options ?? {};
  const activeFilters = report?.filters ?? [];

  const groupOrder = useMemo(() => {
    const seen = [];
    for (const r of menuReports) {
      const g = groupKey(r);
      if (!seen.includes(g)) seen.push(g);
    }
    return seen;
  }, [menuReports]);

  const update = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const reset = useCallback(() => {
    setFilters(blankFilters());
    setFieldErrors({});
    setNotice(null);
    setResult(null);
  }, []);

  const pickReport = useCallback((key) => {
    setReportKey(key);
    setFieldErrors({});
    setNotice(null);
    setResult(null);
  }, []);

  const generate = useCallback(async () => {
    const pdfWindow = filters.format === "PDF" ? window.open("", "_blank") : null;
    setExporting(null);
    setGenerating(true);
    setNotice(null);
    setResult(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/reports/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportKey, ...filters }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (pdfWindow && !pdfWindow.closed) pdfWindow.close();
        setFieldErrors(data?.fields ?? {});
        setNotice({ kind: "error", message: data?.error || "Unable to generate report." });
        return;
      }
      setResult(data);
      setNotice({ kind: "success", message: `${data.report?.title ?? "Report"} generated — ${data.rows?.length ?? 0} row(s).` });
      if (filters.format === "PDF") await renderPdf(data, pdfWindow);
      else if (filters.format === "XLS") await downloadExcel(data);
    } catch {
      if (pdfWindow && !pdfWindow.closed) pdfWindow.close();
      setNotice({ kind: "error", message: "Unable to generate report." });
    } finally {
      setGenerating(false);
    }
  }, [reportKey, filters]);

  const runExport = useCallback(
    async (kind) => {
      if (!result) return;
      setExporting(kind);
      try {
        if (kind === "xls") await downloadExcel(result);
        else if (kind === "pdf") await renderPdf(result, window.open("", "_blank"));
        else if (kind === "print") openPrint(result);
      } finally {
        setExporting(null);
      }
    },
    [result]
  );

  const selectBy = filters.selectBy;
  const rows = result?.rows ?? [];
  const columns = result?.columns ?? [];

  return (
    <div className="space-y-6">
      <PageSection title={menu?.title || "Lab Report"} subtitle="Laboratory activity, results and collection reports" icon={<FlaskConical className="h-4 w-4" aria-hidden="true" />}>
        <div className="grid gap-5 p-5 lg:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            {catalogError ? (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {catalogError}
              </div>
            ) : null}

            <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-2">
              {groupOrder.map((group) => (
                <div key={group} className="mb-1.5 last:mb-0">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{group}</p>
                  {menuReports
                    .filter((r) => groupKey(r) === group)
                    .map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => pickReport(r.key)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium transition",
                          r.key === reportKey ? "bg-brand-600 text-white shadow-sm" : "text-ink-600 hover:bg-white hover:text-ink-800"
                        )}
                      >
                        {r.key === reportKey ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <span className="h-3.5 w-3.5 shrink-0" />}
                        <span className="min-w-0 truncate">{r.title}</span>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {notice ? (
              <div className={cn("flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium", notice.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                {notice.kind === "success" ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />}
                {notice.message}
              </div>
            ) : null}

            {report ? <p className="text-[12.5px] leading-relaxed text-ink-500">{report.description}</p> : null}

            {report?.note ? (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[12px] font-medium text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {report.note}
              </div>
            ) : null}

            <div className="rounded-xl border border-ink-100 p-4">
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Select By">
                  <select value={selectBy} onChange={(e) => update("selectBy", e.target.value)} className={cn(inputCls, "cursor-pointer")}>
                    {(options.selectBy ?? [
                      { value: "period", label: "Period" },
                      { value: "month", label: "Month" },
                      { value: "year", label: "Year" },
                    ]).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </Field>

                {selectBy === "month" ? (
                  <Field label="Month" error={fieldErrors.month}>
                    <input type="month" value={filters.month} onChange={(e) => update("month", e.target.value)} className={inputCls} />
                  </Field>
                ) : null}

                {selectBy === "year" ? (
                  <Field label="Year" error={fieldErrors.year}>
                    <input type="number" value={filters.year} onChange={(e) => update("year", e.target.value)} className={inputCls} />
                  </Field>
                ) : null}

                {selectBy === "period" || selectBy === "time" ? (
                  <>
                    <Field label="From Date" error={fieldErrors.fromDate}>
                      <input type="date" value={filters.fromDate} onChange={(e) => update("fromDate", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="To Date" error={fieldErrors.toDate}>
                      <input type="date" value={filters.toDate} onChange={(e) => update("toDate", e.target.value)} className={inputCls} />
                    </Field>
                  </>
                ) : null}

                {activeFilters.includes("doctor") ? (
                  <Field label="Doctor">
                    <input list="lab-report-doctors" value={filters.doctor} onChange={(e) => update("doctor", e.target.value)} placeholder="Any doctor" className={inputCls} />
                  </Field>
                ) : null}

                {activeFilters.includes("test") ? (
                  <Field label="Test">
                    <input list="lab-report-tests" value={filters.test} onChange={(e) => update("test", e.target.value)} placeholder="Any test" className={inputCls} />
                  </Field>
                ) : null}

                {activeFilters.includes("status") ? (
                  <Field label="Status">
                    <select value={filters.status} onChange={(e) => update("status", e.target.value)} className={cn(inputCls, "cursor-pointer")}>
                      <option value="">All</option>
                      {(options.statuses ?? []).map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                <Field label="Output format">
                  <select value={filters.format} onChange={(e) => update("format", e.target.value)} className={cn(inputCls, "cursor-pointer")}>
                    {(options.formats ?? [{ value: "HTML", label: "HTML" }]).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-4 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={generate}
                  disabled={generating || !report}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                  {generating ? "Generating…" : "Generate report"}
                </button>
                <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
                </button>
              </div>

              <datalist id="lab-report-doctors">
                {(options.doctors ?? []).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <datalist id="lab-report-tests">
                {(options.tests ?? []).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
      </PageSection>

      {result ? (
        <PageSection
          title={result.report?.title ?? "Report"}
          subtitle={`${rows.length} row(s) · generated ${result.meta?.generatedAt ? new Date(result.meta.generatedAt).toLocaleString() : ""}`}
          icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
          actions={
            <div className="flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
              {[
                ["xls", "Excel"],
                ["pdf", "PDF"],
                ["print", "Print"],
              ].map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  disabled={exporting !== null}
                  onClick={() => runExport(kind)}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-ink-200 px-2 text-[11.5px] font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800 disabled:opacity-50"
                >
                  {exporting === kind ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : kind === "print" ? <Printer className="h-3 w-3" aria-hidden="true" /> : <Download className="h-3 w-3" aria-hidden="true" />}
                  {label}
                </button>
              ))}
            </div>
          }
        >
          <div className="p-5">
            {result.stats?.length ? (
              <div className="mb-4 flex flex-wrap gap-2.5">
                {result.stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-ink-100 bg-ink-50/50 px-3.5 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{s.label}</p>
                    <p className="text-[16px] font-bold text-ink-800">{formatCell(s.value)}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-ink-100">
              <table className="w-full min-w-[760px] border-collapse text-[12px]" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  {columnWidths(columns, 100).map((width, index) => (
                    <col key={columns[index]?.key ?? index} style={{ width: `${width.toFixed(2)}%` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} className={cn("border border-[#16307a] bg-[#1e3a8a] px-2.5 py-2 text-left text-[10.5px] font-bold uppercase tracking-wide text-white", col.align === "right" && "text-right")}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(1, columns.length)} className="px-3 py-6 text-center text-[12.5px] text-ink-400">
                        No records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={index} className={index % 2 === 1 ? "bg-[#f6f8fb]" : "bg-white"}>
                        {columns.map((col) => (
                          <td key={col.key} className={cn("border border-[#d7dee8] px-2.5 py-1.5 align-top text-ink-700 [overflow-wrap:anywhere]", col.align === "right" ? "text-right" : "text-left")}>
                            {formatCell(row[col.key])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {result.meta?.range?.from ? (
              <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-400">
                <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                Range {result.meta.range.from} to {result.meta.range.to} · generated {new Date(result.meta.generatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </PageSection>
      ) : null}
    </div>
  );
}
