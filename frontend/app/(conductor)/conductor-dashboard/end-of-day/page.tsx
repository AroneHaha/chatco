"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import FareCalculatorModal from "@/components/conductor/modals/fare-calculator-modal";
import { endShift, getActiveShift, formatTime } from "@/lib/conductor-shift";
import {
  saveRemittance,
  getRemittanceHistory,
  type RemittanceRecord,
} from "@/lib/remittance-history";

/* ═════════════ Types ═══════════════ */

interface CashlessTransaction {
  transactionId: string;
  paymentMethod: "Wallet_Prepay" | "Wallet_Scanned" | "Voucher";
  finalAmount: number;
}

/* ═════════════ Mock Data ═══════════════ */

const todayTransactions: CashlessTransaction[] = [
  { transactionId: "TXN-001", paymentMethod: "Wallet_Scanned", finalAmount: 18.0 },
  { transactionId: "TXN-002", paymentMethod: "Wallet_Scanned", finalAmount: 18.0 },
  { transactionId: "TXN-003", paymentMethod: "Wallet_Scanned", finalAmount: 22.0 },
  { transactionId: "TXN-004", paymentMethod: "Wallet_Scanned", finalAmount: 18.0 },
  { transactionId: "TXN-005", paymentMethod: "Wallet_Scanned", finalAmount: 26.0 },
  { transactionId: "TXN-006", paymentMethod: "Wallet_Scanned", finalAmount: 18.0 },
  { transactionId: "TXN-007", paymentMethod: "Wallet_Scanned", finalAmount: 18.0 },
  { transactionId: "TXN-008", paymentMethod: "Wallet_Scanned", finalAmount: 20.0 },
  { transactionId: "TXN-009", paymentMethod: "Wallet_Prepay", finalAmount: 18.0 },
  { transactionId: "TXN-010", paymentMethod: "Wallet_Prepay", finalAmount: 14.4 },
  { transactionId: "TXN-011", paymentMethod: "Wallet_Prepay", finalAmount: 18.0 },
  { transactionId: "TXN-012", paymentMethod: "Wallet_Prepay", finalAmount: 14.4 },
  { transactionId: "TXN-015", paymentMethod: "Voucher", finalAmount: 0.0 },
  { transactionId: "TXN-016", paymentMethod: "Voucher", finalAmount: 0.0 },
];

/* ═════════════ Helpers ═══════════════ */

const fmt = (n: number) => `₱${n.toFixed(2)}`;

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const fmtDateTime = () =>
  new Date().toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const methodConfig: Record<string, { label: string; color: string; dot: string }> = {
  Wallet_Scanned: { label: "QR Scanned", color: "text-[#62A0EA]", dot: "bg-[#62A0EA]" },
  Wallet_Prepay: { label: "Prepaid", color: "text-emerald-400", dot: "bg-emerald-400" },
  Voucher: { label: "Voucher", color: "text-amber-400", dot: "bg-amber-400" },
};

/* ═════════════ Component ═══════════════ */

export default function EndOfDayPage() {
  const router = useRouter();
  const [cashDeclared, setCashDeclared] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRemitting, setIsRemitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasRemittedToday, setHasRemittedToday] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "week" | "month">("all");
  const [showOfficialReport, setShowOfficialReport] = useState(false);
  const [reportForRecord, setReportForRecord] = useState<RemittanceRecord | null>(null);
  const [showFareCalc, setShowFareCalc] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<RemittanceRecord[]>([]);
  const [shiftInfo, setShiftInfo] = useState({
    conductorName: "Mark",
    driverName: "Ramon",
    unitNumber: "RIZ 2024",
    route: "Quiapo - Taytay",
    shiftId: "SHF-001",
    timeIn: new Date().toISOString(),
    timeOut: new Date().toISOString(),
  });

  useEffect(() => {
    const shift = getActiveShift();
    if (shift) {
            setShiftInfo({
        conductorName: shift.conductorName,
        driverName: shift.driverName,
        unitNumber: shift.unitNumber,
        route: shift.route,
        shiftId: shift.shiftId,
        timeIn: shift.timeIn,
        timeOut: shift.timeOut || new Date().toISOString(),
      });
    }
    setHistory(getRemittanceHistory());
  }, []);

  useEffect(() => {
    const handler = () => setShowFareCalc(true);
    window.addEventListener("conductor:scan-qr", handler);
    return () => window.removeEventListener("conductor:scan-qr", handler);
  }, []);

  const summary = useMemo(() => {
    const keys = ["Wallet_Scanned", "Wallet_Prepay", "Voucher"] as const;
    const breakdown: Record<string, { count: number; amount: number }> = {};
    for (const key of keys) {
      const txns = todayTransactions.filter((t) => t.paymentMethod === key);
      breakdown[key] = {
        count: txns.length,
        amount: txns.reduce((s, t) => s + t.finalAmount, 0),
      };
    }
    return {
      breakdown,
      totalPassengers: todayTransactions.length,
      totalCashless: todayTransactions.reduce((s, t) => s + t.finalAmount, 0),
    };
  }, []);

  const cashAmount = parseFloat(cashDeclared) || 0;
  const grandTotal = summary.totalCashless + cashAmount;
  const canRemit = cashAmount > 0 && !hasRemittedToday;

  const filteredHistory = useMemo(() => {
    const now = new Date();
    return history.filter((r) => {
      const d = new Date(r.date + "T00:00:00");
      if (historyFilter === "week") return d >= new Date(now.getTime() - 7 * 86400000);
      if (historyFilter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [history, historyFilter]);

  const handleRemit = async () => {
    setIsRemitting(true);
    await new Promise((r) => setTimeout(r, 1800));
    setIsRemitting(false);
    setShowConfirm(false);

    const endedShift = endShift();

    const record: RemittanceRecord = {
      shiftId: shiftInfo.shiftId,
      date: new Date().toISOString().split("T")[0],
      conductorName: shiftInfo.conductorName,
      driverName: shiftInfo.driverName,
      unitNumber: shiftInfo.unitNumber,
      totalPassengers: summary.totalPassengers,
      cashlessBreakdown: {
        scanned: summary.breakdown["Wallet_Scanned"]?.amount || 0,
        prepaid: summary.breakdown["Wallet_Prepay"]?.amount || 0,
        voucher: summary.breakdown["Voucher"]?.amount || 0,
      },
      totalCashless: summary.totalCashless,
      cashDeclared: cashAmount,
      remittanceStatus: "Remitted",
      timeIn: shiftInfo.timeIn,
      timeOut: endedShift?.timeOut || new Date().toISOString(),
    };

    const updatedHistory = saveRemittance(record);
    setHistory(updatedHistory);

    setShowSuccess(true);
    setHasRemittedToday(true);

    setTimeout(() => {
      setShowSuccess(false);
      router.replace("/conductor-login");
    }, 3000);
  };

  const openOfficialReport = (record?: RemittanceRecord) => {
    if (record) {
      setReportForRecord(record);
    } else {
      setReportForRecord({
        shiftId: shiftInfo.shiftId,
        date: new Date().toISOString().split("T")[0],
        conductorName: shiftInfo.conductorName,
        driverName: shiftInfo.driverName,
        unitNumber: shiftInfo.unitNumber,
        totalPassengers: summary.totalPassengers,
        cashlessBreakdown: {
          scanned: summary.breakdown["Wallet_Scanned"]?.amount || 0,
          prepaid: summary.breakdown["Wallet_Prepay"]?.amount || 0,
          voucher: summary.breakdown["Voucher"]?.amount || 0,
        },
        totalCashless: summary.totalCashless,
        cashDeclared: cashAmount,
        remittanceStatus: hasRemittedToday ? "Remitted" : "Pending",
        timeIn: shiftInfo.timeIn,
        timeOut: shiftInfo.timeOut,
      });
    }
    setShowOfficialReport(true);
  };

  const activeReport = reportForRecord || {
    shiftId: shiftInfo.shiftId,
    date: new Date().toISOString().split("T")[0],
    conductorName: shiftInfo.conductorName,
    driverName: shiftInfo.driverName,
    unitNumber: shiftInfo.unitNumber,
    totalPassengers: summary.totalPassengers,
    cashlessBreakdown: {
      scanned: summary.breakdown["Wallet_Scanned"]?.amount || 0,
      prepaid: summary.breakdown["Wallet_Prepay"]?.amount || 0,
      voucher: summary.breakdown["Voucher"]?.amount || 0,
    },
    totalCashless: summary.totalCashless,
    cashDeclared: cashAmount,
    remittanceStatus: "Pending",
    timeIn: shiftInfo.timeIn,
    timeOut: shiftInfo.timeOut,
  };

  return (
    <div className="min-h-screen bg-[#050F1A] pb-28">
      {/* ══════════ HEADER ══════════ */}
      <div className="sticky top-0 z-20 bg-[#050F1A]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg">End of Day Report</h1>
          {hasRemittedToday && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-full">
              Remitted
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* ══════════ SHIFT INFO ══════════ */}
        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1A5FB4]/15 flex items-center justify-center text-[#62A0EA] font-bold text-sm">
              {shiftInfo.driverName[0]}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{shiftInfo.driverName}</p>
              <p className="text-[11px] text-white/40 font-medium">{shiftInfo.unitNumber} · {shiftInfo.route}</p>
            </div>
          </div>
          <button
            onClick={() => openOfficialReport()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-[0.97]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="text-[11px] font-semibold">Report</span>
          </button>
        </div>

        {/* ══════════ TODAY'S CASHLESS CARD ══════════ */}
        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#1A5FB4]/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
            </div>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Cashless Collected</p>
          </div>
          <p className="text-3xl font-extrabold text-[#62A0EA]">{fmt(summary.totalCashless)}</p>
        </div>

        {/* ══════════ CASHLESS BREAKDOWN ══════════ */}
        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Cashless Breakdown</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {(Object.entries(summary.breakdown) as [string, { count: number; amount: number }][]).map(([key, val]) => {
              const cfg = methodConfig[key];
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
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Total Cashless</span>
            <span className="text-base font-extrabold text-white tabular-nums">{fmt(summary.totalCashless)}</span>
          </div>
        </div>

        {/* ══════════ CASH DECLARATION ══════════ */}
        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Cash Declaration</p>
            <p className="text-[10px] text-amber-400/60 font-medium">Manual input</p>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-white/30">₱</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cashDeclared}
              onChange={(e) => !hasRemittedToday && setCashDeclared(e.target.value)}
              disabled={hasRemittedToday}
              placeholder="0.00"
              className={`w-full bg-white/5 border rounded-xl pl-9 pr-4 py-3.5 text-xl font-bold text-white tabular-nums placeholder:text-white/15 outline-none transition-all ${
                hasRemittedToday
                  ? "border-white/5 opacity-50 cursor-not-allowed"
                  : "border-white/10 focus:border-[#1A5FB4]/50 focus:ring-2 focus:ring-[#1A5FB4]/20"
              }`}
            />
          </div>
          <p className="text-[10px] text-white/25 leading-relaxed">
            Enter the total cash collected during your shift. Physical cash must be handed over manually to admin.
          </p>
        </div>

        {/* ══════════ GRAND TOTAL ══════════ */}
        <div className="bg-[#1A5FB4]/8 border border-[#1A5FB4]/20 rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-bold text-[#62A0EA]/60 uppercase tracking-wider">Collection Summary</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Cashless (digital)</span>
              <span className="text-sm font-bold text-white tabular-nums">{fmt(summary.totalCashless)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Cash (declared)</span>
              <span className="text-sm font-bold text-white tabular-nums">{cashAmount > 0 ? fmt(cashAmount) : "—"}</span>
            </div>
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Grand Total</span>
            <span className="text-2xl font-extrabold text-[#62A0EA] tabular-nums">{grandTotal > 0 ? fmt(grandTotal) : "—"}</span>
          </div>
        </div>

        {/* ══════════ REMIT SECTION ══════════ */}
        {!hasRemittedToday ? (
          <div className="space-y-3">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1A5FB4]/15 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9 9 0 0 1 3 12c0-1.47.353-2.856.978-4.082" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/70">Remittance to Admin</p>
                <p className="text-[10px] text-white/30 mt-0.5">Cashless will transfer digitally · Cash handed over manually</p>
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
              {cashAmount === 0 ? "Enter cash amount to remit" : "Remit to Admin"}
            </button>
          </div>
        ) : (
          <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-400">Remitted to Admin</p>
              <p className="text-[11px] text-white/30 mt-0.5">
                Cashless {fmt(summary.totalCashless)} transferred · Cash {fmt(cashAmount)} for manual handover
              </p>
            </div>
          </div>
        )}

        {/* ══════════ REMITTANCE HISTORY (Collapsed) ══════════ */}
        <div className="space-y-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between hover:border-white/[0.1] transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-white/60">Remittance History</p>
                <p className="text-[10px] text-white/25 mt-0.5">
                  {filteredHistory.length} record{filteredHistory.length !== 1 ? "s" : ""} total
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-white/20 transition-transform duration-300 ${showHistory ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: showHistory ? "2000px" : "0px", opacity: showHistory ? 1 : 0 }}
          >
            <div className="space-y-3 pt-1">

              <div className="flex gap-2">
                {([
                  { key: "all", label: "All" },
                  { key: "week", label: "This Week" },
                  { key: "month", label: "This Month" },
                ] as const).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setHistoryFilter(f.key)}
                    className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                      historyFilter === f.key
                        ? "bg-[#1A5FB4] text-white shadow-md shadow-[#1A5FB4]/20"
                        : "bg-white/5 text-white/35 border border-white/5 hover:bg-white/8 hover:text-white/50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredHistory.length === 0 ? (
                <div className="bg-[#071A2E] border border-white/[0.04] rounded-2xl p-8 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium text-white/20">No records yet</p>
                  <p className="text-[10px] text-white/15 mt-0.5">Remittances will appear here after each shift</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredHistory.map((record, idx) => (
                    <div key={`${record.shiftId}-${idx}`} className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white/70">{fmtDate(record.date)}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          {record.remittanceStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-white/35 font-medium flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-[#1A5FB4]/30 flex items-center justify-center">
                            <span className="text-[7px] font-bold text-[#62A0EA]">{record.conductorName[0]}</span>
                          </div>
                          <span className="text-white/60 font-semibold">{record.conductorName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
                          </svg>
                          <span className="text-white/50">{record.driverName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H6.375c-.621 0-1.125-.504-1.125-1.125V14.25m17.25 4.5V14.25A2.25 2.25 0 0 0 20.25 12H3.75A2.25 2.25 0 0 0 1.5 14.25v4.5" />
                          </svg>
                          <span className="text-white/50">{record.unitNumber}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
                          <p className="text-[8px] font-semibold text-white/30 uppercase tracking-wider">Cashless</p>
                          <p className="text-sm font-extrabold text-[#62A0EA] mt-0.5 tabular-nums">{fmt(record.totalCashless)}</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
                          <p className="text-[8px] font-semibold text-white/30 uppercase tracking-wider">Cash</p>
                          <p className="text-sm font-extrabold text-amber-400 mt-0.5 tabular-nums">{fmt(record.cashDeclared)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                        <span className="text-xs font-bold text-white/40">
                          Total <span className="text-white font-extrabold tabular-nums">{fmt(record.totalCashless + record.cashDeclared)}</span>
                        </span>
                        <button
                          onClick={() => openOfficialReport(record)}
                          className="flex items-center gap-1 text-[#62A0EA]/70 hover:text-[#62A0EA] transition-colors active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                          <span className="text-[10px] font-semibold">View Report</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ CONFIRM MODAL ══════════ */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative w-full max-w-sm bg-[#0B1E33] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
            <div className="p-6 space-y-5">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-[#1A5FB4]/15 flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-white font-bold text-lg">Confirm Remittance</h2>
                <p className="text-xs text-white/40 mt-1">Submit report to admin</p>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">Driver / Unit</span>
                  <span className="text-white font-semibold">{shiftInfo.driverName} · {shiftInfo.unitNumber}</span>
                </div>
                <div className="h-px bg-white/[0.04]" />
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Cashless (digital transfer)</span>
                  <span className="text-white font-bold tabular-nums">{fmt(summary.totalCashless)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Cash (manual handover)</span>
                  <span className="text-amber-400 font-bold tabular-nums">{fmt(cashAmount)}</span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Total</span>
                  <span className="text-lg font-extrabold text-white tabular-nums">{fmt(grandTotal)}</span>
                </div>
                <div className="h-px bg-white/[0.04]" />
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Remit to</span>
                  <span className="text-white font-semibold">Admin</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-amber-500/8 border border-amber-500/15 rounded-xl p-3">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <p className="text-[11px] text-amber-400/70 leading-relaxed">
                  Cashless amount will be transferred to admin wallet instantly. Physical cash of <span className="font-bold text-amber-400">{fmt(cashAmount)}</span> must be handed over manually.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 transition-all active:scale-[0.98]">
                  Cancel
                </button>
                <button onClick={handleRemit} disabled={isRemitting} className="flex-1 py-3 rounded-xl bg-[#1A5FB4] text-white text-sm font-bold shadow-lg shadow-[#1A5FB4]/25 hover:bg-[#165a9f] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isRemitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing…
                    </>
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ SUCCESS OVERLAY ══════════ */}
      {showSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0B1E33] border border-emerald-500/20 rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center animate-scale-in">
                <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Remitted to Admin</h2>
              <p className="text-xs text-white/40 mt-1.5 leading-relaxed">
                Report for <span className="text-white/60 font-semibold">{shiftInfo.unitNumber}</span> submitted. Cashless transferred. Hand over physical cash to admin.
              </p>
            </div>
            <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-3 space-y-1">
              <p className="text-xs text-emerald-400/60 font-medium">Cashless Transferred</p>
              <p className="text-xl font-extrabold text-emerald-400 tabular-nums">{fmt(summary.totalCashless)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-white/25 tabular-nums">Redirecting to login…</p>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  router.replace("/conductor-login");
                }}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ OFFICIAL REPORT MODAL ══════════ */}
      {showOfficialReport && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowOfficialReport(false)} />
          <div className="relative w-full max-w-md bg-[#0F2135] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">

            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1A5FB4] flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <h2 className="text-white font-bold text-sm">Official Report</h2>
                </div>
                <button onClick={() => setShowOfficialReport(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">

                <div className="text-center space-y-1">
                  <h3 className="text-white font-extrabold text-xl tracking-wide">CHATCO</h3>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-semibold">End of Day Remittance Report</p>
                </div>

                <div className="h-px bg-white/10" />

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Date</p>
                    <p className="text-xs font-semibold text-white/80 mt-0.5">{fmtDate(activeReport.date)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Shift ID</p>
                    <p className="text-xs font-semibold text-white/80 mt-0.5 font-mono">{activeReport.shiftId}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Conductor</p>
                    <p className="text-xs font-semibold text-white/80 mt-0.5">{activeReport.conductorName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Driver</p>
                    <p className="text-xs font-semibold text-white/80 mt-0.5">{activeReport.driverName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Time In</p>
                    <p className="text-xs font-semibold text-emerald-400/80 mt-0.5">{formatTime(activeReport.timeIn)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Time Out</p>
                    <p className="text-xs font-semibold text-red-400/80 mt-0.5">{formatTime(activeReport.timeOut)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Unit Number</p>
                    <p className="text-xs font-semibold text-white/80 mt-0.5">{activeReport.unitNumber}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Route</p>
                    <p className="text-xs font-semibold text-white/80 mt-0.5">{shiftInfo.route}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Cashless Collection</p>
                  <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left text-[9px] font-bold text-white/30 uppercase tracking-wider px-3.5 py-2.5">Method</th>
                          <th className="text-right text-[9px] font-bold text-white/30 uppercase tracking-wider px-3.5 py-2.5">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        <tr>
                          <td className="px-3.5 py-2.5 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#62A0EA]" />
                            <span className="text-xs text-white/60">QR Scanned</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-xs font-bold text-[#62A0EA] tabular-nums">{fmt(activeReport.cashlessBreakdown.scanned)}</td>
                        </tr>
                        <tr>
                          <td className="px-3.5 py-2.5 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-xs text-white/60">Prepaid</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-xs font-bold text-emerald-400 tabular-nums">{fmt(activeReport.cashlessBreakdown.prepaid)}</td>
                        </tr>
                        <tr>
                          <td className="px-3.5 py-2.5 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="text-xs text-white/60">Voucher</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-xs font-bold text-amber-400 tabular-nums">{fmt(activeReport.cashlessBreakdown.voucher)}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-white/[0.03]">
                          <td className="px-3.5 py-2.5 text-[10px] font-bold text-white/50 uppercase tracking-wider">Subtotal</td>
                          <td className="px-3.5 py-2.5 text-right text-sm font-extrabold text-white tabular-nums">{fmt(activeReport.totalCashless)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">Cash Collected</span>
                    <span className="text-sm font-bold text-amber-400 tabular-nums">{fmt(activeReport.cashDeclared)}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Grand Total</span>
                    </div>
                    <span className="text-2xl font-extrabold text-[#62A0EA] tabular-nums">
                      {fmt(activeReport.totalCashless + activeReport.cashDeclared)}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Remittance Status</p>
                    <p className="text-xs font-semibold text-white/60 mt-0.5">Remitted to Admin</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    activeReport.remittanceStatus === "Remitted"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {activeReport.remittanceStatus}
                  </span>
                </div>

                <p className="text-[10px] text-white/15 text-center font-mono">
                  Generated: {fmtDateTime()}
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 px-6 py-4 border-t border-white/[0.06] flex gap-3 bg-[#0F2135]">
              <button
                onClick={() => setShowOfficialReport(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-semibold hover:bg-white/10 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => { window.print(); }}
                className="flex-1 py-3 rounded-xl bg-[#1A5FB4] text-white text-xs font-bold shadow-lg shadow-[#1A5FB4]/20 hover:bg-[#165a9f] transition-all flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ FARE CALCULATOR MODAL ══════════ */}
      <FareCalculatorModal
        isOpen={showFareCalc}
        onClose={() => setShowFareCalc(false)}
        conductorName="Mark"
        unitNumber={shiftInfo.unitNumber}
        driverName={shiftInfo.driverName}
      />
    </div>
  );
}