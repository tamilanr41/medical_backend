"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ClipboardList,
  FileText,
  Loader2,
  Pill,
  Search,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "@/components/ui/PageSection";

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";

/**
 * Patient History — modern reimplementation of the legacy
 * GetPatientPreviousVisit flow: search a patient, list their past OP visits and
 * open a visit to review the clinical note and prescription.
 */
export default function PatientHistory() {
  const [patient, setPatient] = useState(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState("");

  const [visits, setVisits] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);

  const searchPatients = useCallback(async (value) => {
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(value)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Patients could not be loaded.");
      setResults(Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
      setResults([]);
      setSearchError(err.message);
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
        if (!cancelled) setSearchError("Patients could not be loaded.");
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function pickPatient(next) {
    setPatient(next);
    setVisits([]);
    setPrescriptions([]);
    setSelectedId(null);
    setLoading(true);
    try {
      const [vRes, pRes] = await Promise.all([
        fetch(`/api/consultations?uhid=${encodeURIComponent(next.uhid)}`, { cache: "no-store" }),
        fetch(`/api/prescriptions?uhid=${encodeURIComponent(next.uhid)}&limit=8`, { cache: "no-store" }),
      ]);
      const v = await vRes.json().catch(() => ({}));
      const p = await pRes.json().catch(() => ({}));
      const rows = vRes.ok && Array.isArray(v.rows) ? v.rows : [];
      setVisits(rows);
      setPrescriptions(pRes.ok && Array.isArray(p.rows) ? p.rows : []);
      setSelectedId(rows[0]?._id ?? null);
    } catch {
      setVisits([]);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }

  const selected = visits.find((visit) => visit._id === selectedId) ?? null;
  const selectedRx = selected
    ? prescriptions.find((rx) => selected.rxNo && rx.rxNo === selected.rxNo) ?? null
    : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-5">
        <PageSection title="Patient" subtitle="Find a patient record" icon={<UserRound className="h-4 w-4" aria-hidden="true" />}>
          <div className="space-y-3 p-5">
            {patient ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/50 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-800">{patient.patientName}</p>
                  <p className="truncate font-mono text-[11.5px] text-ink-500">
                    {patient.uhid} · {patient.gender || "-"} · {patient.age || "-"} yrs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPatient(null); setVisits([]); setPrescriptions([]); setSelectedId(null); }}
                  className="text-[12px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-xl border bg-ink-50/40 px-3 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
                  <Search className="h-4 w-4 text-ink-400" aria-hidden="true" />
                  <input
                    type="text"
                    value={patientQuery}
                    onChange={(e) => {
                      setPatientQuery(e.target.value);
                      searchPatients(e.target.value);
                    }}
                    placeholder="Search UHID, name or mobile"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-ink-300"
                  />
                  {searching ? <Loader2 className="h-4 w-4 animate-spin text-ink-400" aria-hidden="true" /> : null}
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-ink-100">
                  {results.length === 0 ? (
                    <p className="px-3.5 py-3 text-[12.5px] text-ink-400">{searchError || "No patient found."}</p>
                  ) : (
                    results.map((row) => (
                      <button
                        key={row._id}
                        type="button"
                        onClick={() => pickPatient(row)}
                        className="flex w-full items-center justify-between gap-3 border-b border-ink-50 px-3.5 py-2.5 text-left transition last:border-0 hover:bg-brand-50/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-ink-800">{row.patientName}</span>
                          <span className="block truncate font-mono text-[11px] text-ink-400">{row.uhid} · {row.mobile || "-"}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </PageSection>

        {patient ? (
          <PageSection title="Visits" subtitle={`${visits.length} record(s)`} icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}>
            <div className="max-h-[460px] overflow-y-auto">
              {loading ? (
                <p className="flex items-center gap-2 px-5 py-4 text-[12.5px] text-ink-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Loading visits…
                </p>
              ) : visits.length === 0 ? (
                <p className="px-5 py-4 text-[12.5px] text-ink-400">No visits recorded for this patient.</p>
              ) : (
                visits.map((visit) => (
                  <button
                    key={visit._id}
                    type="button"
                    onClick={() => setSelectedId(visit._id)}
                    className={cn(
                      "block w-full border-b border-ink-50 px-5 py-2.5 text-left transition last:border-0",
                      visit._id === selectedId ? "bg-brand-50/70" : "hover:bg-ink-50/60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-semibold text-ink-700">{visit.visitDate}</span>
                      <span className="font-mono text-[11px] text-ink-400">{visit.opNo || ""}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-500">{visit.doctor || "—"}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-ink-400">
                      {visit.provisionalDiagnosis || visit.diagnosis || visit.complaint || "No diagnosis"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </PageSection>
        ) : null}
      </div>

      <div className="space-y-5">
        {selected ? (
          <>
            <PageSection title="Visit detail" subtitle={`${selected.visitDate} · ${selected.doctor || "-"}`}>
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <Detail label="OP number" value={selected.opNo} />
                <Detail label="Department" value={selected.department} />
                <Detail label="Complaint" value={selected.complaint} wide />
                <Detail label="History" value={selected.history} wide />
                <Detail label="Examination" value={selected.examination} wide />
                <Detail label="Temperature" value={selected.temperature} />
                <Detail label="Blood pressure" value={selected.bp} />
                <Detail label="Pulse" value={selected.pulse} />
                <Detail label="Weight" value={selected.weight} />
                <Detail label="Height" value={selected.height} />
                <Detail label="Provisional diagnosis" value={selected.provisionalDiagnosis} />
                <Detail label="Final diagnosis" value={selected.diagnosis} />
                <Detail label="Advice" value={selected.advice} wide />
                <Detail label="Next visit" value={selected.nextVisitDate} />
                <Detail label="Status" value={selected.status} />
              </div>
            </PageSection>

            <PageSection title="Prescription" subtitle={selected.rxNo || "No prescription"} icon={<Pill className="h-4 w-4" aria-hidden="true" />}>
              <div className="p-5">
                {selectedRx && Array.isArray(selectedRx.items) && selectedRx.items.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-ink-100">
                    <table className="w-full min-w-[620px] border-collapse text-[12.5px]">
                      <thead>
                        <tr className="bg-ink-50/60 text-left text-[11px] uppercase tracking-wide text-ink-500">
                          <th className="px-3 py-2 font-semibold">Medicine</th>
                          <th className="px-3 py-2 font-semibold">Dose</th>
                          <th className="px-3 py-2 font-semibold">Frequency</th>
                          <th className="px-3 py-2 font-semibold">Days</th>
                          <th className="px-3 py-2 font-semibold">Timing</th>
                          <th className="px-3 py-2 font-semibold">Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRx.items.map((item, index) => (
                          <tr key={index} className="border-t border-ink-50">
                            <td className="px-3 py-2 font-medium text-ink-800">{item.medicineName || item.code}</td>
                            <td className="px-3 py-2 text-ink-600">{item.dose || "—"}</td>
                            <td className="px-3 py-2 text-ink-600">{item.frequency || "—"}</td>
                            <td className="px-3 py-2 text-ink-600">{item.duration || "—"}</td>
                            <td className="px-3 py-2 text-ink-600">{item.timing || "—"}</td>
                            <td className="px-3 py-2 text-ink-600">{item.instructions || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : selectedRx?.medicines ? (
                  <pre className="whitespace-pre-wrap rounded-xl border border-ink-100 bg-ink-50/40 p-3.5 text-[12.5px] text-ink-700">
                    {selectedRx.medicines}
                  </pre>
                ) : (
                  <p className="text-[12.5px] text-ink-400">No prescription linked to this visit.</p>
                )}
              </div>
            </PageSection>
          </>
        ) : (
          <PageSection title="Visit detail" subtitle="Select a patient and visit" icon={<FileText className="h-4 w-4" aria-hidden="true" />}>
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
              <Activity className="h-6 w-6 text-ink-300" aria-hidden="true" />
              <p className="text-[13px] text-ink-400">
                Search a patient, then pick a visit to review the clinical note and prescription.
              </p>
            </div>
          </PageSection>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value, wide }) {
  return (
    <div className={cn(wide && "md:col-span-2")}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-ink-700">{value || "—"}</p>
    </div>
  );
}
