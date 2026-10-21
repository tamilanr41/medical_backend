"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/** Reusable patient search/select used by the OP transaction screens. */
export default function PatientPicker({
  patient,
  onPick,
  onClear,
  error,
  placeholder = "Search UHID, name or mobile",
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(true);
  const [loadError, setLoadError] = useState("");

  const search = useCallback(async (value) => {
    setSearching(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(value)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Patients could not be loaded.");
      setResults(Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
      setResults([]);
      setLoadError(err.message);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/patients?q=", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setResults(res.ok && Array.isArray(data.rows) ? data.rows : []);
      } catch {
        if (!cancelled) {
          setResults([]);
          setLoadError("Patients could not be loaded.");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function pick(row) {
    setQuery("");
    onPick(row);
  }

  if (patient) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 px-3.5 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-800">{patient.patientName}</p>
          <p className="truncate font-mono text-[11.5px] text-ink-500">
            {patient.uhid} · {patient.gender || "-"} · {patient.age || "-"} yrs · {patient.mobile || "no mobile"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-[12px] font-semibold text-brand-600 hover:text-brand-700"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl border bg-ink-50/40 px-3 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
        <Search className="h-4 w-4 text-ink-400" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-300"
        />
        {searching ? <Loader2 className="h-4 w-4 animate-spin text-ink-400" aria-hidden="true" /> : null}
      </div>

      {error ? (
        <span className="block text-[12px] font-medium text-danger-500">{error}</span>
      ) : null}

      <div className="max-h-44 overflow-y-auto rounded-xl border border-ink-100">
        {results.length === 0 ? (
          <p className="px-3.5 py-3 text-[12.5px] text-ink-400">
            {loadError || "No patient found."}
          </p>
        ) : (
          results.map((row) => (
            <button
              key={row._id}
              type="button"
              onClick={() => pick(row)}
              className="flex w-full items-center justify-between gap-3 border-b border-ink-50 px-3.5 py-2.5 text-left transition last:border-0 hover:bg-brand-50/60"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-ink-800">{row.patientName}</span>
                <span className="block truncate font-mono text-[11px] text-ink-400">
                  {row.uhid} · {row.mobile || "-"}
                </span>
              </span>
              <Plus className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** Shared field wrapper/label styling for the OP screens. */
export function Field({ label, required, error, children, className }) {
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

export const opInputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";
