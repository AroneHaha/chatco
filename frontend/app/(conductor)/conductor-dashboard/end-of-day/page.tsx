// app/(conductor)/conductor-dashboard/end-of-day/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { endShift, formatTime } from "@/lib/conductor/services/shift.service";
import { submitRemittance, type RemittanceRecord } from "@/lib/conductor/services/remittance.service";
import type { Transaction } from "@/lib/conductor/services/transactions.service";
import { useRemittanceData } from "@/app/(conductor)/hooks/use-remittance-data";
import { EndOfDaySkeleton } from "@/components/conductor/ui/skeleton";
import { fmt, methodConfig } from "./helpers";

// Extracted UI Components
import HistorySection from "@/components/conductor/remittance/HistorySection";
import ConfirmModal from "@/components/conductor/remittance/ConfirmModal";
import SuccessOverlay from "@/components/conductor/remittance/SuccessOverlay";
import OfficialReportModal, { buildPrintHTML } from "@/components/conductor/remittance/OfficialReportModal";

export default function EndOfDayPage() {
  const router = useRouter();
  const { shift, transactions, earnings, history, status, error, refresh } = useRemittanceData();

  const [showConfirm, setShowConfirm] = useState(false);
  const [isRemitting, setIsRemitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasRemittedToday, setHasRemittedToday] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "week" | "month">("all");
  const [showOfficialReport, setShowOfficialReport] = useState(false);
  const [reportForRecord, setReportForRecord] = useState<RemittanceRecord | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const shiftInfo = {
    conductorName: shift?.conductorName || "—",
    driverName: shift?.driverName || "—",
    unitNumber: shift?.unitNumber || "—",
    route: shift?.route || "—",
    shiftId: shift?.shiftId || "",
    timeIn: shift?.timeIn || new Date().toISOString(),
    timeOut: shift?.timeOut || new Date().toISOString(),
  };
  // ─── Computed breakdown from system-tracked transactions ───
  // S4-T9: Prefer the API-backed `earnings` (from the DB) for the
  // cash_total / gcash_total split. Fall back to computing from the
  // transactions array if earnings is null (e.g., network error).
  const summary = useMemo(() => {
    const keys = ["GCash_Scanned", "GCash_Direct", "Voucher", "Cash"] as const;
    const breakdown: Record<string, { count: number; amount: number }> = {};
    for (const key of keys) {
      const txns = transactions.filter((t) => t.paymentMethod === key);
      breakdown[key] = { count: txns.length, amount: txns.reduce((s, t) => s + t.finalAmount, 0) };
    }

    // Use API-backed earnings if available; otherwise compute from transactions
    const cashTotal = earnings?.cash_total ?? (breakdown["Cash"]?.amount ?? 0);
    const gcashTotal = earnings?.gcash_total ??
      ((breakdown["GCash_Scanned"]?.amount ?? 0) + (breakdown["GCash_Direct"]?.amount ?? 0));
    const grandTotal = earnings?.total ?? transactions.reduce((s, t) => s + t.finalAmount, 0);

    return {
      breakdown,
      totalPassengers: transactions.length,
      gcashTotal,
      cashTotal,
      grandTotal,
    };
  }, [transactions, earnings]);

  const canRemit = transactions.length > 0 && !hasRemittedToday;

  const filteredHistory = useMemo(() => { const now = new Date(); return history.filter((r) => { const d = new Date(r.date + "T00:00:00"); if (historyFilter === "week") return d >= new Date(now.getTime() - 7 * 86400000); if (historyFilter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); return true; }); }, [history, historyFilter]);

  const activeReport = reportForRecord || {
    shiftId: shiftInfo.shiftId,
    date: new Date().toISOString().split("T")[0],
    conductorName: shiftInfo.conductorName,
    driverName: shiftInfo.driverName,
    unitNumber: shiftInfo.unitNumber,
    totalPassengers: summary.totalPassengers,
    cashlessBreakdown: {
      gcashScanned: summary.breakdown["GCash_Scanned"]?.amount ?? 0,
      gcashDirect: summary.breakdown["GCash_Direct"]?.amount ?? 0,
      voucher: summary.breakdown["Voucher"]?.amount ?? 0,
    },
    totalCashless: (summary.breakdown["GCash_Scanned"]?.amount ?? 0) + (summary.breakdown["GCash_Direct"]?.amount ?? 0) + (summary.breakdown["Voucher"]?.amount ?? 0),
    cashDeclared: 0,
    gcashTotal: summary.gcashTotal,
    cashTotal: summary.cashTotal,
    remittanceStatus: "Pending" as const,
    timeIn: shiftInfo.timeIn,
    timeOut: shiftInfo.timeOut,
  };

  const handleRemit = async () => {
    setIsRemitting(true);
    setSubmitError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const endedShift = await endShift();
      const record: RemittanceRecord = {
        shiftId: shiftInfo.shiftId,
        date: new Date().toISOString().split("T")[0],
        conductorName: shiftInfo.conductorName,
        driverName: shiftInfo.driverName,
        unitNumber: shiftInfo.unitNumber,
        totalPassengers: summary.totalPassengers,
        cashlessBreakdown: {
          gcashScanned: summary.breakdown["GCash_Scanned"]?.amount ?? 0,
          gcashDirect: summary.breakdown["GCash_Direct"]?.amount ?? 0,
          voucher: summary.breakdown["Voucher"]?.amount ?? 0,
        },
        totalCashless:
          (summary.breakdown["GCash_Scanned"]?.amount ?? 0) +
          (summary.breakdown["GCash_Direct"]?.amount ?? 0) +
          (summary.breakdown["Voucher"]?.amount ?? 0),
        cashDeclared: 0,
        gcashTotal: summary.gcashTotal,
        cashTotal: summary.cashTotal,
        remittanceStatus: "Remitted",
        timeIn: shiftInfo.timeIn,
        timeOut: endedShift?.timeOut || new Date().toISOString(),
      };
      await submitRemittance(record);
      await refresh();
      setShowConfirm(false);
      setShowSuccess(true);
      setHasRemittedToday(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.replace("/login");
      }, 3000);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Unable to submit remittance."
      );
    } finally {
      setIsRemitting(false);
    }
  };

  const openOfficialReport = (record?: RemittanceRecord) => { setReportForRecord(record || null); if (!record) setReportForRecord({ ...activeReport, remittanceStatus: hasRemittedToday ? "Remitted" : "Pending" }); setShowOfficialReport(true); };

  const printReport = (record: RemittanceRecord) => {
    const html = buildPrintHTML(record, shiftInfo.route);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) { doc.open(); doc.write(html); doc.close(); }
    iframe.onload = () => {
      setTimeout(() => {
        try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
        catch { const pw = window.open("", "_blank"); if (pw) { pw.document.write(html); pw.document.close(); pw.onload = () => { pw.print(); pw.close(); }; } }
        setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1000);
      }, 300);
    };
  };

  if (status === "loading") {
    return <EndOfDaySkeleton />;
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#050F1A] flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050F1A] pb-28">
      <div className="sticky top-0 z-20 bg-[#050F1A]/90 backdrop-blur-xl border-b border-white/5"><div className="flex items-center gap-3 px-4 py-3.5"><button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg></button><h1 className="text-white font-bold text-lg">End of Day Report</h1>{hasRemittedToday && <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-full">Remitted</span>}</div></div>

      <div className="px-4 pt-5 space-y-5">
        {/* Driver info */}
        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#1A5FB4]/15 flex items-center justify-center text-[#62A0EA] font-bold text-sm">{shiftInfo.driverName[0]}</div><div><p className="text-sm font-bold text-white">{shiftInfo.driverName}</p><p className="text-[11px] text-white/40 font-medium">{shiftInfo.unitNumber} · {shiftInfo.route}</p></div></div></div>

        {/* Grand Total card */}
        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#1A5FB4]/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
            </div>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Total Collections</p>
          </div>
          <p className="text-3xl font-extrabold text-[#62A0EA]">{fmt(summary.grandTotal)}</p>
          <p className="text-[11px] text-white/25 mt-1">{summary.totalPassengers} passenger{summary.totalPassengers !== 1 ? "s" : ""} · {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Payment Breakdown</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {(Object.entries(summary.breakdown) as [string, { count: number; amount: number }][])
              .filter(([, val]) => val.count > 0 || val.amount > 0)
              .map(([key, val]) => {
                const cfg = methodConfig[key];
                if (!cfg) return null;
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-sm font-medium text-white/70">{cfg.label}</span>
                      <span className="text-[11px] text-white/30 font-medium tabular-nums">{val.count}x</span>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${cfg.color}`}>{fmt(val.amount)}</span>
                  </div>
                );
              })}
          </div>
          <div className="px-4 py-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Grand Total</span>
            <span className="text-base font-extrabold text-white tabular-nums">{fmt(summary.grandTotal)}</span>
          </div>
        </div>

        {/* Collection Summary — GCash vs Cash high-level */}
        <div className="bg-[#1A5FB4]/8 border border-[#1A5FB4]/20 rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-bold text-[#62A0EA]/60 uppercase tracking-wider">Collection Summary</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-[10px] font-semibold text-blue-400/60 uppercase tracking-wider">GCash</p>
              <p className="text-lg font-extrabold text-blue-400 mt-0.5">{fmt(summary.gcashTotal)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-wider">Cash</p>
              <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{fmt(summary.cashTotal)}</p>
            </div>
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Grand Total</span>
            <span className="text-2xl font-extrabold text-[#62A0EA] tabular-nums">{fmt(summary.grandTotal)}</span>
          </div>
        </div>

        {/* Remit section */}
        {!hasRemittedToday ? (
          <div className="space-y-3">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1A5FB4]/15 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9 9 0 0 1 3 12c0-1.47.353-2.856.978-4.082" /></svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/70">Remittance to Admin</p>
                <p className="text-[10px] text-white/30 mt-0.5">All recorded transactions will be submitted to admin</p>
              </div>
            </div>
            <button
              onClick={() => canRemit && setShowConfirm(true)}
              disabled={!canRemit}
              className={`w-full py-4 rounded-2xl text-sm font-bold transition-all duration-200 ${
                canRemit
                  ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/25 hover:bg-[#165a9f] active:scale-[0.98]"
                  : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
              }`}
            >
              {transactions.length === 0 ? "No transactions to remit" : "Remit to Admin"}
            </button>
          </div>
        ) : (
          <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-400">Remitted to Admin</p>
              <p className="text-[11px] text-white/30 mt-0.5">
                GCash {fmt(summary.gcashTotal)} · Cash {fmt(summary.cashTotal)} · Total {fmt(summary.grandTotal)}
              </p>
            </div>
          </div>
        )}

        <HistorySection showHistory={showHistory} setShowHistory={setShowHistory} filteredHistory={filteredHistory} historyFilter={historyFilter} setHistoryFilter={setHistoryFilter} openOfficialReport={openOfficialReport} onPrintReport={printReport} />
      </div>

      {submitError && (
        <div className="px-4 pb-4">
          <p className="text-center text-xs text-red-300">{submitError}</p>
        </div>
      )}

      <ConfirmModal show={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleRemit} isRemitting={isRemitting} shiftInfo={shiftInfo} gcashTotal={summary.gcashTotal} cashTotal={summary.cashTotal} grandTotal={summary.grandTotal} totalPassengers={summary.totalPassengers} />
      <SuccessOverlay show={showSuccess} onClose={() => { setShowSuccess(false); router.replace("/login"); }} gcashTotal={summary.gcashTotal} cashTotal={summary.cashTotal} grandTotal={summary.grandTotal} unitNumber={shiftInfo.unitNumber} />
      <OfficialReportModal show={showOfficialReport} onClose={() => setShowOfficialReport(false)} activeReport={activeReport} route={shiftInfo.route} />

    </div>
  );
}