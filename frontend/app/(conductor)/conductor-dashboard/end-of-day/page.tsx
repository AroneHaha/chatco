// app/(conductor)/conductor-dashboard/end-of-day/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const FareCalculatorModal = dynamic(
  () => import("@/components/conductor/modals/fare-calculator-modal"),
  { ssr: false }
);
import { endShift, getActiveShift, formatTime } from "@/lib/conductor-shift";
import { saveRemittance, getRemittanceHistory, type RemittanceRecord } from "@/lib/remittance-history";
import { getShiftTransactions, type Transaction } from "@/lib/conductor-transactions";
import { fmt, methodConfig } from "./helpers";

// Extracted UI Components
import HistorySection from "@/components/conductor/remittance/HistorySection";
import ConfirmModal from "@/components/conductor/remittance/ConfirmModal";
import SuccessOverlay from "@/components/conductor/remittance/SuccessOverlay";
import OfficialReportModal from "@/components/conductor/remittance/OfficialReportModal";

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
  
  const [shiftInfo, setShiftInfo] = useState({ conductorName: "Mark", driverName: "Ramon", unitNumber: "RIZ 2024", route: "Quiapo - Taytay", shiftId: "SHF-001", timeIn: new Date().toISOString(), timeOut: new Date().toISOString() });
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const shift = getActiveShift();
    if (shift) { setShiftInfo({ conductorName: shift.conductorName, driverName: shift.driverName, unitNumber: shift.unitNumber, route: shift.route, shiftId: shift.shiftId, timeIn: shift.timeIn, timeOut: shift.timeOut || new Date().toISOString() }); setTransactions(getShiftTransactions(shift.shiftId)); }
    setHistory(getRemittanceHistory());
  }, []);

  useEffect(() => { const handler = () => { const shift = getActiveShift(); if (shift) setTransactions(getShiftTransactions(shift.shiftId)); }; window.addEventListener("conductor:transaction-updated", handler); return () => window.removeEventListener("conductor:transaction-updated", handler); }, []);
  useEffect(() => { const handler = () => setShowFareCalc(true); window.addEventListener("conductor:scan-qr", handler); return () => window.removeEventListener("conductor:scan-qr", handler); }, []);

  const summary = useMemo(() => { const keys = ["Wallet_Scanned", "Wallet_Prepay", "Voucher"] as const; const breakdown: Record<string, { count: number; amount: number }> = {}; for (const key of keys) { const txns = transactions.filter((t) => t.paymentMethod === key); breakdown[key] = { count: txns.length, amount: txns.reduce((s, t) => s + t.finalAmount, 0) }; } return { breakdown, totalPassengers: transactions.length, totalCashless: transactions.reduce((s, t) => s + t.finalAmount, 0) }; }, [transactions]);
  const cashAmount = parseFloat(cashDeclared) || 0;
  const grandTotal = summary.totalCashless + cashAmount;
  const canRemit = cashAmount > 0 && !hasRemittedToday;

  const filteredHistory = useMemo(() => { const now = new Date(); return history.filter((r) => { const d = new Date(r.date + "T00:00:00"); if (historyFilter === "week") return d >= new Date(now.getTime() - 7 * 86400000); if (historyFilter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); return true; }); }, [history, historyFilter]);

  const activeReport = reportForRecord || { shiftId: shiftInfo.shiftId, date: new Date().toISOString().split("T")[0], conductorName: shiftInfo.conductorName, driverName: shiftInfo.driverName, unitNumber: shiftInfo.unitNumber, totalPassengers: summary.totalPassengers, cashlessBreakdown: { scanned: summary.breakdown["Wallet_Scanned"]?.amount || 0, prepaid: summary.breakdown["Wallet_Prepay"]?.amount || 0, voucher: summary.breakdown["Voucher"]?.amount || 0 }, totalCashless: summary.totalCashless, cashDeclared: cashAmount, remittanceStatus: "Pending", timeIn: shiftInfo.timeIn, timeOut: shiftInfo.timeOut };

  const handleRemit = async () => {
    setIsRemitting(true); await new Promise((r) => setTimeout(r, 1800)); setIsRemitting(false); setShowConfirm(false);
    const endedShift = endShift();
    const record: RemittanceRecord = { shiftId: shiftInfo.shiftId, date: new Date().toISOString().split("T")[0], conductorName: shiftInfo.conductorName, driverName: shiftInfo.driverName, unitNumber: shiftInfo.unitNumber, totalPassengers: summary.totalPassengers, cashlessBreakdown: { scanned: summary.breakdown["Wallet_Scanned"]?.amount || 0, prepaid: summary.breakdown["Wallet_Prepay"]?.amount || 0, voucher: summary.breakdown["Voucher"]?.amount || 0 }, totalCashless: summary.totalCashless, cashDeclared: cashAmount, remittanceStatus: "Remitted", timeIn: shiftInfo.timeIn, timeOut: endedShift?.timeOut || new Date().toISOString() };
    setHistory(saveRemittance(record)); setShowSuccess(true); setHasRemittedToday(true);
    setTimeout(() => { setShowSuccess(false); router.replace("/login"); }, 3000);
  };

  const openOfficialReport = (record?: RemittanceRecord) => { setReportForRecord(record || null); if (!record) setReportForRecord({ ...activeReport, remittanceStatus: hasRemittedToday ? "Remitted" : "Pending" }); setShowOfficialReport(true); };

  return (
    <div className="min-h-screen bg-[#050F1A] pb-28">
      <div className="sticky top-0 z-20 bg-[#050F1A]/90 backdrop-blur-xl border-b border-white/5"><div className="flex items-center gap-3 px-4 py-3.5"><button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg></button><h1 className="text-white font-bold text-lg">End of Day Report</h1>{hasRemittedToday && <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-full">Remitted</span>}</div></div>

      <div className="px-4 pt-5 space-y-5">
        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#1A5FB4]/15 flex items-center justify-center text-[#62A0EA] font-bold text-sm">{shiftInfo.driverName[0]}</div><div><p className="text-sm font-bold text-white">{shiftInfo.driverName}</p><p className="text-[11px] text-white/40 font-medium">{shiftInfo.unitNumber} · {shiftInfo.route}</p></div></div><button onClick={() => openOfficialReport()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-[0.97]"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg><span className="text-[11px] font-semibold">Report</span></button></div>

        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4"><div className="flex items-center gap-2 mb-2"><div className="w-7 h-7 rounded-lg bg-[#1A5FB4]/15 flex items-center justify-center"><svg className="w-4 h-4 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg></div><p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Cashless Collected</p></div><p className="text-3xl font-extrabold text-[#62A0EA]">{fmt(summary.totalCashless)}</p></div>

        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl overflow-hidden"><div className="px-4 py-3 border-b border-white/5"><p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Cashless Breakdown</p></div><div className="divide-y divide-white/[0.04]">{(Object.entries(summary.breakdown) as [string, { count: number; amount: number }][]).map(([key, val]) => { const cfg = methodConfig[key]; return (<div key={key} className="flex items-center justify-between px-4 py-3"><div className="flex items-center gap-2.5"><div className={`w-2 h-2 rounded-full ${cfg.dot}`} /><span className="text-sm font-medium text-white/70">{cfg.label}</span><span className="text-[11px] text-white/30 font-medium tabular-nums">{val.count}x</span></div><span className={`text-sm font-bold tabular-nums ${cfg.color}`}>{fmt(val.amount)}</span></div>); })}</div><div className="px-4 py-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between"><span className="text-xs font-bold text-white/50 uppercase tracking-wider">Total Cashless</span><span className="text-base font-extrabold text-white tabular-nums">{fmt(summary.totalCashless)}</span></div></div>

        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 space-y-3"><div className="flex items-center justify-between"><p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Cash Declaration</p><p className="text-[10px] text-amber-400/60 font-medium">Manual input</p></div><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-white/30">₱</span><input type="number" min="0" step="0.01" value={cashDeclared} onChange={(e) => !hasRemittedToday && setCashDeclared(e.target.value)} disabled={hasRemittedToday} placeholder="0.00" className={`w-full bg-white/5 border rounded-xl pl-9 pr-4 py-3.5 text-xl font-bold text-white tabular-nums placeholder:text-white/15 outline-none transition-all ${hasRemittedToday ? "border-white/5 opacity-50 cursor-not-allowed" : "border-white/10 focus:border-[#1A5FB4]/50 focus:ring-2 focus:ring-[#1A5FB4]/20"}`} /></div><p className="text-[10px] text-white/25 leading-relaxed">Enter the total cash collected during your shift. Physical cash must be handed over manually to admin.</p></div>

        <div className="bg-[#1A5FB4]/8 border border-[#1A5FB4]/20 rounded-2xl p-4 space-y-3"><p className="text-[10px] font-bold text-[#62A0EA]/60 uppercase tracking-wider">Collection Summary</p><div className="space-y-2"><div className="flex items-center justify-between"><span className="text-sm text-white/50">Cashless (digital)</span><span className="text-sm font-bold text-white tabular-nums">{fmt(summary.totalCashless)}</span></div><div className="flex items-center justify-between"><span className="text-sm text-white/50">Cash (declared)</span><span className="text-sm font-bold text-white tabular-nums">{cashAmount > 0 ? fmt(cashAmount) : "—"}</span></div></div><div className="h-px bg-white/10" /><div className="flex items-center justify-between"><span className="text-xs font-bold text-white/70 uppercase tracking-wider">Grand Total</span><span className="text-2xl font-extrabold text-[#62A0EA] tabular-nums">{grandTotal > 0 ? fmt(grandTotal) : "—"}</span></div></div>

        {!hasRemittedToday ? (
          <div className="space-y-3"><div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-[#1A5FB4]/15 flex items-center justify-center flex-shrink-0"><svg className="w-4 h-4 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9 9 0 0 1 3 12c0-1.47.353-2.856.978-4.082" /></svg></div><div><p className="text-xs font-semibold text-white/70">Remittance to Admin</p><p className="text-[10px] text-white/30 mt-0.5">Cashless will transfer digitally · Cash handed over manually</p></div></div><button onClick={() => canRemit && setShowConfirm(true)} disabled={!canRemit} className={`w-full py-4 rounded-2xl text-sm font-bold transition-all duration-200 ${canRemit ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/25 hover:bg-[#165a9f] active:scale-[0.98]" : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"}`}>{cashAmount === 0 ? "Enter cash amount to remit" : "Remit to Admin"}</button></div>
        ) : (
          <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></div><div><p className="text-sm font-bold text-emerald-400">Remitted to Admin</p><p className="text-[11px] text-white/30 mt-0.5">Cashless {fmt(summary.totalCashless)} transferred · Cash {fmt(cashAmount)} for manual handover</p></div></div>
        )}

        <HistorySection showHistory={showHistory} setShowHistory={setShowHistory} filteredHistory={filteredHistory} historyFilter={historyFilter} setHistoryFilter={setHistoryFilter} openOfficialReport={openOfficialReport} />
      </div>

      <ConfirmModal show={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleRemit} isRemitting={isRemitting} shiftInfo={shiftInfo} totalCashless={summary.totalCashless} cashAmount={cashAmount} grandTotal={grandTotal} />
      <SuccessOverlay show={showSuccess} onClose={() => { setShowSuccess(false); router.replace("/login"); }} totalCashless={summary.totalCashless} unitNumber={shiftInfo.unitNumber} />
      <OfficialReportModal show={showOfficialReport} onClose={() => setShowOfficialReport(false)} activeReport={activeReport} route={shiftInfo.route} />
      <FareCalculatorModal isOpen={showFareCalc} onClose={() => setShowFareCalc(false)} shiftId={shiftInfo.shiftId} conductorName={shiftInfo.conductorName} unitNumber={shiftInfo.unitNumber} driverName={shiftInfo.driverName} />
    </div>
  );
}