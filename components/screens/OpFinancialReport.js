"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Check,
  Download,
  FileText,
  Loader2,
  Play,
  Printer,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";
import { Field, opInputCls as inputCls } from "./PatientPicker";
import { getOpMenu } from "@/config/op-reports";
import {
  buildReportHtml,
  buildReportPdf,
  buildReportSheet,
  columnWidths,
  dateRangeText,
  formatCell,
} from "@/lib/reports/report-document";

function cellAlign(column) {
  if (column.key === "gender" || column.key === "age") return "text-center";
  if (column.align === "right") return "text-right";
  return "text-left";
}

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
    paymentMode: "",
    patientType: "",
    sponsor: "",
    expiryWithin: "30",
    format: "HTML",
  };
}

function downloadUrl(url, filename) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
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
    downloadUrl(url, filename);
  }
}

function openPrint(data) {
  const win = window.open("", "_blank", "width=1180,height=800");
  if (!win) return;
  win.document.write(buildReportHtml(data));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

function ReportHeader({ data }) {
  const brand = data.branding || {};
  const contact = [brand.phone || brand.mobile, brand.email, brand.website].filter(Boolean).join("  ·  ");
  const summary = Array.isArray(data.meta?.summary) ? data.meta.summary : [];
  const title = data.report?.title ?? "Report";
  const range = dateRangeText(data);

  return (
    <div className="mb-5 border-b-2 border-[#16307a] pb-3.5 text-center">
      <p className="text-[17px] font-bold leading-tight text-[#1e3a8a]">{brand.name || title}</p>
      {brand.address ? (
        <p className="mt-1 text-[11.5px] leading-snug text-ink-600">{brand.address}</p>
      ) : null}
      {contact ? (
        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500">{contact}</p>
      ) : null}
      <p className="mt-2.5 text-[14px] font-bold text-[#1e3a8a]">
        {title}
        {range}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-400">
        Generated {data.meta?.generatedAt ? new Date(data.meta.generatedAt).toLocaleString() : ""}
        {data.meta?.generatedBy ? ` · by ${data.meta.generatedBy}` : ""}
      </p>
      {summary.length > 0 ? (
        <p className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11.5px] text-ink-600">
          {summary.map((part) => (
            <span key={`${part.label}-${part.value}`}>
              <span className="font-semibold text-ink-700">{part.label}:</span> {part.value}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

/**
 * OPD › Report — shared screen for every OP financial / clinical report. The
 * menu item (`item.slug`) selects which reports are offered, via
 * `OP_MENU_REPORTS`; the catalogue, filter rules and data come from
 * `/api/reports/op-financial`.
 */
export default function OpFinancialReport({ item }) {
  const menu = useMemo(() => (item?.slug ? getOpMenu(item.slug) : null), [item]);
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
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reports/op-financial", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setCatalogError(data.error || "The report catalogue could not be loaded.");
          return;
        }
        setCatalog(data);
      } catch {
        if (!cancelled) setCatalogError("The report catalogue could not be loaded.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reportKey = useMemo(() => {
    if (menuReports.length === 0) return "";
    return menuReports.some((r) => r.key === selectedKey)
      ? selectedKey
      : menu?.default ?? menuReports[0].key;
  }, [menuReports, menu, selectedKey]);

  const report = useMemo(
    () => menuReports.find((r) => r.key === reportKey) ?? null,
    [menuReports, reportKey]
  );
  const options = catalog?.options ?? {};
  const activeFilters = report?.filters ?? [];

  const groupOrder = useMemo(() => {
    const seen = [];
    for (const r of menuReports) if (!seen.includes(r.group)) seen.push(r.group);
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
    const wantsPdf = filters.format === "PDF";
    const pdfWindow = wantsPdf ? window.open("", "_blank") : null;
    setGenerating(true);
    setNotice(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/reports/op-financial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportKey, ...filters }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (pdfWindow && !pdfWindow.closed) pdfWindow.close();
        setNotice({ kind: "error", message: data.error || "The report could not be generated." });
        setResult(null);
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      setResult(data);
      setNotice({
        kind: "success",
        message: `${data.report?.title ?? "Report"} generated — ${data.rows?.length ?? 0} row(s).`,
      });
      if (wantsPdf) await renderPdf(data, pdfWindow);
      else if (filters.format === "XLS") await downloadExcel(data);
    } catch {
      if (pdfWindow && !pdfWindow.closed) pdfWindow.close();
      setNotice({ kind: "error", message: "The report could not be generated." });
    } finally {
      setGenerating(false);
    }
  }, [reportKey, filters]);

  const runExport = useCallback(
    async (kind) => {
      if (!result) return;
      const pdfWindow = kind === "pdf" ? window.open("", "_blank") : null;
      setExporting(kind);
      try {
        if (kind === "xls") await downloadExcel(result);
        else if (kind === "pdf") await renderPdf(result, pdfWindow);
        else if (kind === "print") openPrint(result);
      } finally {
        setExporting(null);
      }
    },
    [result]
  );

  const selectBy = filters.selectBy;
  const screenTitle = menu?.title || report?.title || "OP Report";

  return (
    <div className="space-y-5">
      <PageSection
        title={screenTitle}
        subtitle="OPD collection, clinical, billing and card reports"
        icon={<FileText className="h-4 w-4" />}
      >
        <div className="grid gap-5 p-5 lg:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            {catalogError ? (
              <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700">
                {catalogError}
              </div>
            ) : null}

            <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-1.5">
              {menuReports.length === 0 ? (
                <p className="px-2.5 py-3 text-[12px] text-ink-400">Loading reports…</p>
              ) : (
                groupOrder.map((group) => (
                  <div key={group} className="mb-1.5 last:mb-0">
                    <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
                      {group}
                    </p>
                    {menuReports
                      .filter((r) => r.group === group)
                      .map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => pickReport(r.key)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium transition",
                            r.key === reportKey
                              ? "bg-brand-600 text-white shadow-sm"
                              : "text-ink-600 hover:bg-white hover:text-ink-800"
                          )}
                        >
                          {r.key === reportKey ? (
                            <Check className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <span className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="min-w-0 truncate">{r.title}</span>
                        </button>
                      ))}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            {notice ? (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium",
                  notice.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                )}
              >
                {notice.kind === "success" ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                {notice.message}
              </div>
            ) : null}

            {report ? (
              <p className="text-[12.5px] leading-relaxed text-ink-500">{report.description}</p>
            ) : null}

            {report?.note ? (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[12px] font-medium text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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
                    <input
                      list="op-financial-doctors"
                      value={filters.doctor}
                      onChange={(e) => update("doctor", e.target.value)}
                      placeholder="Any doctor"
                      className={inputCls}
                    />
                  </Field>
                ) : null}

                {activeFilters.includes("paymentMode") ? (
                  <Field label="Pay Mode">
                    <select value={filters.paymentMode} onChange={(e) => update("paymentMode", e.target.value)} className={cn(inputCls, "cursor-pointer")}>
                      <option value="">All</option>
                      {(options.paymentModes ?? []).map((mode) => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {activeFilters.includes("patientType") ? (
                  <Field label="Patient Type">
                    <select value={filters.patientType} onChange={(e) => update("patientType", e.target.value)} className={cn(inputCls, "cursor-pointer")}>
                      <option value="">All</option>
                      {(options.patientTypes ?? []).map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {activeFilters.includes("sponsor") ? (
                  <Field label="Sponsor">
                    <input
                      list="op-financial-sponsors"
                      value={filters.sponsor}
                      onChange={(e) => update("sponsor", e.target.value)}
                      placeholder="Any sponsor"
                      className={inputCls}
                    />
                  </Field>
                ) : null}

                {activeFilters.includes("expiryWithin") ? (
                  <Field label="Expiry within (days)">
                    <input
                      type="number"
                      value={filters.expiryWithin}
                      onChange={(e) => update("expiryWithin", e.target.value)}
                      placeholder="Blank for all"
                      className={inputCls}
                    />
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
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {generating ? "Generating…" : "Generate report"}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800"
                >
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
              </div>

              <datalist id="op-financial-doctors">
                {(options.doctors ?? []).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <datalist id="op-financial-sponsors">
                {(options.sponsors ?? []).map((name) => (
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
          subtitle={`${result.rows?.length ?? 0} row(s) · generated ${result.meta?.generatedAt ? new Date(result.meta.generatedAt).toLocaleString() : ""}`}
          icon={<BarChart3 className="h-4 w-4" />}
          actions={
            <div className="flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-ink-400" />
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
                  className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[12px] font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
                >
                  {exporting === kind ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : kind === "print" ? (
                    <Printer className="h-3 w-3" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  {label}
                </button>
              ))}
            </div>
          }
        >
          <div className="p-5">
            <ReportHeader data={result} />

            {Array.isArray(result.stats) && result.stats.length > 0 ? (
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
              <table className="w-full min-w-[820px] border-collapse text-[12px]" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  {columnWidths(result.columns ?? [], 100).map((width, index) => (
                    <col key={(result.columns ?? [])[index]?.key ?? index} style={{ width: `${width.toFixed(2)}%` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {(result.columns ?? []).map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          "border border-[#16307a] bg-[#1e3a8a] px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-wide text-white",
                          cellAlign(col)
                        )}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(result.rows ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(1, result.columns?.length ?? 1)} className="px-3 py-6 text-center text-[12.5px] text-ink-400">
                        No records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    result.rows.map((row, index) => (
                      <tr key={`${row.billNo || row.opNo || row.cardNo || row.month || index}-${index}`} className={index % 2 === 1 ? "bg-[#f6f8fb]" : "bg-white"}>
                        {result.columns.map((col) => (
                          <td
                            key={col.key}
                            className={cn("border border-[#d7dee8] px-2.5 py-1.5 align-top text-ink-700 [overflow-wrap:anywhere]", cellAlign(col))}
                          >
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
                <BarChart3 className="h-3.5 w-3.5" />
                Range {result.meta.range.from} to {result.meta.range.to} · generated {new Date(result.meta.generatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </PageSection>
      ) : null}
    </div>
  );
}
