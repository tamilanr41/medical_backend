"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  Check,
  DoorOpen,
  Loader2,
  RefreshCw,
  Shuffle,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Drawer from "@/components/ui/Drawer";
import PageSection from "@/components/ui/PageSection";
import { buildWardBoard } from "@/lib/ip-board";

const WARDS = ["General Ward", "ICU", "HDU", "Maternity", "Pediatric", "Private"];

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";
const selectCls = cn(inputCls, "cursor-pointer");

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Room Status — live ward/bed occupancy board built from the `admissions`
 * collection (via /api/ip-admissions). Occupied beds can be discharged or
 * transferred without leaving the board.
 */
export default function RoomStatus() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ip-admissions?all=1&limit=200", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Admissions could not be loaded.");
        setRows([]);
        return;
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setError("Admissions could not be loaded.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ip-admissions?all=1&limit=200", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Admissions could not be loaded.");
          setRows([]);
        } else {
          setRows(Array.isArray(data.rows) ? data.rows : []);
        }
      } catch {
        if (!cancelled) {
          setError("Admissions could not be loaded.");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const board = useMemo(() => buildWardBoard(rows, WARDS), [rows]);

  const totals = useMemo(() => {
    const total = board.reduce((sum, ward) => sum + ward.total, 0);
    const occupied = board.reduce((sum, ward) => sum + ward.occupied, 0);
    return {
      total,
      occupied,
      available: total - occupied,
      occupancyPct: total > 0 ? Math.round((occupied / total) * 100) : 0,
    };
  }, [board]);

  return (
    <div className="space-y-6">
      <PageSection
        title="Room status"
        subtitle="Live ward and bed occupancy"
        icon={<BedDouble className="h-4 w-4" aria-hidden="true" />}
        actions={
          <button
            type="button"
            onClick={load}
            title="Refresh"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-800"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" />
          </button>
        }
      >
        <div className="grid grid-cols-2 divide-ink-100 border-b border-ink-100 sm:grid-cols-4 sm:divide-x">
          <Stat label="Tracked beds" value={totals.total} />
          <Stat label="Occupied" value={totals.occupied} tone="rose" />
          <Stat label="Available" value={totals.available} tone="emerald" />
          <Stat label="Occupancy" value={`${totals.occupancyPct}%`} />
        </div>

        {error ? (
          <p className="flex items-center gap-2 px-4 py-3 text-[12.5px] font-medium text-danger-500">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-ink-500">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden="true" />
            Loading occupancy…
          </div>
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {board.map((ward) => (
              <WardCard key={ward.ward} ward={ward} onPick={setActive} />
            ))}
          </div>
        )}
      </PageSection>

      <BedDrawer
        admission={active}
        onClose={() => setActive(null)}
        onChanged={() => {
          setActive(null);
          load();
        }}
      />
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-[20px] font-bold tabular-nums",
          tone === "rose" ? "text-rose-600" : tone === "emerald" ? "text-emerald-600" : "text-ink-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function WardCard({ ward, onPick }) {
  const pct = ward.total > 0 ? Math.round((ward.occupied / ward.total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-ink-100 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-ink-900">{ward.ward}</p>
          <p className="text-[11.5px] text-ink-400">
            {ward.occupied}/{ward.total || "—"} occupied
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn("h-full rounded-full", pct >= 100 ? "bg-rose-500" : "bg-brand-500")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11.5px] font-semibold tabular-nums text-ink-500">{pct}%</span>
        </div>
      </div>

      {ward.beds.length === 0 ? (
        <p className="px-4 py-6 text-center text-[12.5px] text-ink-400">No beds recorded.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 p-3">
          {ward.beds.map((bed) => (
            <li key={bed.bed}>
              <button
                type="button"
                onClick={() => onPick(bed.admission)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition",
                  bed.occupied
                    ? "border-rose-100 bg-rose-50/70 hover:border-rose-200"
                    : "border-emerald-100 bg-emerald-50/50 hover:border-emerald-200"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white",
                    bed.occupied ? "bg-rose-500" : "bg-emerald-500"
                  )}
                >
                  {bed.occupied ? <UserRound className="h-3.5 w-3.5" /> : <DoorOpen className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate font-mono text-[11px] font-semibold text-ink-700">{bed.bed}</span>
                  <span className="block truncate text-[11px] text-ink-500">
                    {bed.occupied ? bed.admission.patientName : "Available"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------- bed drawer ------------------------------- */

function BedDrawer({ admission, onClose, onChanged }) {
  return (
    <Drawer open={Boolean(admission)} onClose={onClose} label="Bed details" side="right" size="w-full sm:w-[440px]">
      {admission ? <BedDrawerInner admission={admission} onClose={onClose} onChanged={onChanged} /> : null}
    </Drawer>
  );
}

function BedDrawerInner({ admission, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [confirmDischarge, setConfirmDischarge] = useState(false);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState("view");
  const [transfer, setTransfer] = useState({
    ward: admission.ward || WARDS[0],
    room: admission.room || "",
    bed: admission.bed || "",
  });

  async function patch(payload, okMessage) {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch(`/api/ip-admissions/${admission._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(data.error || "The update failed. Please retry.");
        return;
      }
      onChanged();
    } catch {
      setNotice("Network error while saving. Please retry.");
    } finally {
      setBusy(false);
    }
    void confirmDischarge;
    void notice;
    void mode;
    return notice;
  }

  async function discharge() {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch(`/api/ip-admissions/${admission._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Discharged", dischargeDate: today() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(data.error || "The discharge could not be saved.");
        return;
      }
      onChanged();
    } catch {
      setNotice("Network error while saving. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTransfer() {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch(`/api/ip-admissions/${admission._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward: transfer.ward,
          room: transfer.room,
          bed: transfer.bed,
          status: "Admitted",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(data.error || "The transfer could not be saved.");
        return;
      }
      onChanged();
    } catch {
      setNotice("Network error while saving. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  const discharged = admission.status === "Discharged";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b border-ink-100 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <BedDouble className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-bold text-ink-900">{admission.patientName}</h2>
          <p className="mt-0.5 font-mono text-[11.5px] text-ink-500">
            {admission.ipNo} · {admission.uhid}
          </p>
        </div>
        <button
          type="button"
          data-drawer-close
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="scrollbar-slim flex-1 overflow-y-auto p-5">
        <dl className="grid grid-cols-2 gap-3 text-[12.5px]">
          <Detail label="Ward" value={admission.ward} />
          <Detail label="Room" value={admission.room} />
          <Detail label="Bed" value={admission.bed} />
          <Detail label="Status" value={admission.status} />
          <Detail label="Admitted" value={admission.admissionDate} />
          <Detail label="Doctor" value={admission.doctor} />
          <Detail label="Type" value={admission.admissionType} />
          <Detail label="Discharge" value={admission.dischargeDate || "—"} />
        </dl>

        {notice ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {notice}
          </p>
        ) : null}

        {!discharged && mode === "transfer" ? (
          <div className="mt-5 rounded-2xl border border-ink-100 p-4">
            <p className="mb-3 text-[12.5px] font-bold text-ink-700">Transfer / reassign bed</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 block">
                <span className="mb-1.5 block text-[12px] font-semibold text-ink-600">Ward</span>
                <select value={transfer.ward} onChange={(e) => setTransfer((p) => ({ ...p, ward: e.target.value }))} className={selectCls}>
                  {WARDS.map((ward) => <option key={ward} value={ward}>{ward}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-ink-600">Room</span>
                <input type="text" value={transfer.room} onChange={(e) => setTransfer((p) => ({ ...p, room: e.target.value }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-ink-600">Bed</span>
                <input type="text" value={transfer.bed} onChange={(e) => setTransfer((p) => ({ ...p, bed: e.target.value }))} className={inputCls} />
              </label>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 p-4">
        {discharged ? (
          <p className="text-[12.5px] font-medium text-ink-400">This admission is discharged.</p>
        ) : mode === "transfer" ? (
          <>
            <button
              type="button"
              onClick={submitTransfer}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Shuffle className="h-4 w-4" aria-hidden="true" />}
              Save transfer
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="inline-flex items-center rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800"
            >
              Cancel
            </button>
          </>
        ) : confirmDischarge ? (
          <>
            <button
              type="button"
              onClick={discharge}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <DoorOpen className="h-4 w-4" aria-hidden="true" />}
              Confirm discharge
            </button>
            <button
              type="button"
              onClick={() => setConfirmDischarge(false)}
              className="inline-flex items-center rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800"
            >
              Keep admitted
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirmDischarge(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              <DoorOpen className="h-4 w-4" aria-hidden="true" />
              Discharge
            </button>
            <button
              type="button"
              onClick={() => setMode("transfer")}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-800"
            >
              <Shuffle className="h-4 w-4" aria-hidden="true" />
              Transfer bed
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-ink-800">{value || "—"}</dd>
    </div>
  );
}
