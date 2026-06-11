// components/admin/remittance/conductor-detail-modal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import type {
  RemittanceRecord,
  RemittanceStatus,
} from '@/app/(admin)/remittance/data/remittance-data';
import {
  getStaticRemittanceHistory,
  getStaticShiftLogs,
  getStaticShiftTransactions,
  formatLogTime,
  type Transaction,
  type ShiftLog,
} from '@/lib/static-conductor-data';
import {
  User, Truck, Calendar, Clock, Banknote,
  ChevronDown, ChevronUp, MapPin, Hash, X,
} from 'lucide-react';

// ─── Helper ────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Normalize any static record to canonical RemittanceRecord ─────────
// static-conductor-data may return records with a different shape.
// This ensures every record matches the canonical type from @/types.
function normalizeRemittance(r: Record<string, unknown>): RemittanceRecord {
  const cb = (r.cashlessBreakdown as RemittanceRecord['cashlessBreakdown']) ?? { gcashScanned: 0, gcashDirect: 0, voucher: 0 };
  const gcashTotal = (r.gcashTotal as number) ?? cb.gcashScanned + cb.gcashDirect + cb.voucher;
  const cashTotal = (r.cashTotal as number) ?? 0;
  return {
    shiftId: r.shiftId as string,
    date: r.date as string,
    conductorName: r.conductorName as string,
    driverName: r.driverName as string,
    unitNumber: r.unitNumber as string,
    totalPassengers: r.totalPassengers as number,
    cashlessBreakdown: cb,
    totalCashless: (r.totalCashless as number) ?? cb.gcashScanned + cb.gcashDirect + cb.voucher,
    cashDeclared: (r.cashDeclared as number) ?? 0,
    remittanceStatus: (r.remittanceStatus as RemittanceStatus) ?? 'Pending',
    timeIn: r.timeIn as string,
    timeOut: r.timeOut as string,
    cashTotal,
    gcashTotal,
  };
}

// ─── Props ─────────────────────────────────────────────────────────────
interface ConductorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Full remittance record for the selected row (canonical shape) */
  record: RemittanceRecord | null;
}

// ─── Component ─────────────────────────────────────────────────────────
export function ConductorDetailModal({ isOpen, onClose, record }: ConductorDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'remittance' | 'transactions'>('remittance');
  const [expandedShift, setExpandedShift] = useState<string | null>(null);

  // Additional remittance history for the conductor (still from static
  // data until backend API is wired — same conductor, broader history).
  const [remittanceRecords, setRemittanceRecords] = useState<RemittanceRecord[]>([]);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const [shiftTransactions, setShiftTransactions] = useState<Record<string, Transaction[]>>({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!record || !isOpen) {
      setRemittanceRecords([]);
      setShiftLogs([]);
      setShiftTransactions({});
      return;
    }

    // Seed the modal with the selected record plus any static history
    // available for the same conductor.  When the API is ready this will
    // be replaced with a real fetch.
    const name = record.conductorName;
    const staticHistory = getStaticRemittanceHistory(name);

    // Merge: put the live record first, then deduplicate with static.
    // Normalize static records to canonical shape.
    const seen = new Set<string>([record.shiftId]);
    const merged: RemittanceRecord[] = [record];
    for (const r of staticHistory) {
      if (!seen.has(r.shiftId)) {
        seen.add(r.shiftId);
        merged.push(normalizeRemittance(r as unknown as Record<string, unknown>));
      }
    }
    setRemittanceRecords(merged);

    const logs = getStaticShiftLogs(name);
    setShiftLogs(logs);

    const txnsMap: Record<string, Transaction[]> = {};
    logs.forEach((l: ShiftLog) => {
      txnsMap[l.shiftId] = getStaticShiftTransactions(l.shiftId, name);
    });
    setShiftTransactions(txnsMap);

    setActiveTab('remittance');
    setExpandedShift(null);
    setStartDate('');
    setEndDate('');
  }, [record, isOpen]);

  const filterByDate = (d: string): boolean => {
    if (!startDate && !endDate) return true;
    const s = d.split('T')[0];
    if (startDate && s < startDate) return false;
    if (endDate && s > endDate) return false;
    return true;
  };

  const filteredRemittance = useMemo(() => {
    if (!startDate && !endDate) return remittanceRecords;
    return remittanceRecords.filter((r) => filterByDate(r.date));
  }, [remittanceRecords, startDate, endDate]);

  const filteredShiftLogs = useMemo(() => {
    if (!startDate && !endDate) return shiftLogs;
    return shiftLogs.filter((l) => filterByDate(l.timeIn));
  }, [shiftLogs, startDate, endDate]);

  const filteredShiftTxns = useMemo(() => {
    if (!startDate && !endDate) return shiftTransactions;
    const ids = new Set(filteredShiftLogs.map((l) => l.shiftId));
    const r: Record<string, Transaction[]> = {};
    Object.entries(shiftTransactions).forEach(([id, txns]) => {
      if (ids.has(id)) r[id] = txns;
    });
    return r;
  }, [shiftTransactions, filteredShiftLogs, startDate, endDate]);

  const hasDate = startDate || endDate;
  const clearDate = () => { setStartDate(''); setEndDate(''); };

  if (!record) return null;

  // ─── Aggregate totals from canonical fields ────────────────────────
  const totalRemitted = filteredRemittance
    .filter((r) => r.remittanceStatus === 'Remitted')
    .reduce((s, r) => s + r.gcashTotal + r.cashTotal, 0);
  const totalPending = filteredRemittance
    .filter((r) => r.remittanceStatus === 'Pending')
    .reduce((s, r) => s + r.gcashTotal + r.cashTotal, 0);
  const totalGCash = filteredRemittance.reduce((s, r) => s + r.gcashTotal, 0);
  const totalCash = filteredRemittance.reduce((s, r) => s + r.cashTotal, 0);
  const totalPassengers = filteredRemittance.reduce((s, r) => s + r.totalPassengers, 0);
  const totalShifts = filteredShiftLogs.length;
  const allTxns = Object.values(filteredShiftTxns).flat();

  const getBadge = (m: string) => {
    // Handle canonical PaymentMethodType values
    if (m === 'GCash_Scanned') return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">GCash Scan</span>;
    if (m === 'GCash_Direct') return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">GCash Direct</span>;
    if (m === 'Voucher') return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Voucher</span>;
    if (m === 'Cash') return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Cash</span>;
    // Fallback for legacy 'GCash' value
    if (m === 'GCash') return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">GCash</span>;
    return <span className="text-xs text-slate-400">{m}</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl" rounded="rounded-xl">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-[#62A0EA]/15 flex items-center justify-center"><User size={24} className="text-[#62A0EA]" /></div>
          <div><h2 className="text-xl font-bold text-white">{record.conductorName}</h2><p className="text-sm text-slate-400">Conductor Profile</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]"><Truck size={16} className="text-[#62A0EA]" /><div><p className="text-[10px] text-slate-500 uppercase">Vehicle</p><p className="text-sm text-white font-medium">{record.unitNumber}</p></div></div>
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]"><Calendar size={16} className="text-sky-400" /><div><p className="text-[10px] text-slate-500 uppercase">Shifts</p><p className="text-sm text-white font-medium">{totalShifts}</p></div></div>
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]"><Banknote size={16} className="text-[#62A0EA]" /><div><p className="text-[10px] text-slate-500 uppercase">Remitted</p><p className="text-sm text-[#62A0EA] font-medium">{fmt(totalRemitted)}</p></div></div>
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]"><Clock size={16} className="text-amber-400" /><div><p className="text-[10px] text-slate-500 uppercase">Pending</p><p className="text-sm text-orange-400 font-medium">{fmt(totalPending)}</p></div></div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="mb-4 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]">
        <div className="flex items-center gap-2 mb-2.5">
          <Calendar size={14} className="text-[#62A0EA]" />
          <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Filter by Date Range</span>
          {hasDate && <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#62A0EA]/15 text-[#62A0EA]">Active<button onClick={clearDate} className="hover:text-white"><X size={10} /></button></span>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1"><label className="text-[10px] text-slate-500 uppercase mb-1 block">From</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate||undefined} className="w-full px-3 py-2 bg-[#131C2E] border border-[#1E2D45] rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] [color-scheme:dark]" /></div>
          <div className="flex items-end pb-2 text-slate-600 hidden sm:flex"><span className="text-xs">—</span></div>
          <div className="flex-1"><label className="text-[10px] text-slate-500 uppercase mb-1 block">To</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate||undefined} className="w-full px-3 py-2 bg-[#131C2E] border border-[#1E2D45] rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] [color-scheme:dark]" /></div>
          {hasDate && <div className="flex items-end"><button onClick={clearDate} className="px-3 py-2 bg-[#1A2540] border border-[#1E2D45] rounded-md text-xs text-slate-400 hover:text-white hover:bg-[#1E2D45]">Clear</button></div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0E1628] rounded-md p-1 border border-[#1E2D45] mb-5">
        <button onClick={() => setActiveTab('remittance')} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all text-center ${activeTab==='remittance'?'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/30':'text-slate-500 hover:text-slate-300'}`}>Remittance History</button>
        <button onClick={() => setActiveTab('transactions')} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all text-center ${activeTab==='transactions'?'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/30':'text-slate-500 hover:text-slate-300'}`}>Transactions</button>
      </div>

      {/* Tab: Remittance */}
      {activeTab === 'remittance' && (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="text-center p-2 bg-[#0E1628] rounded-md border border-[#1E2D45]"><p className="text-[10px] text-slate-500 uppercase">GCash</p><p className="text-sm font-bold text-blue-400">{fmt(totalGCash)}</p></div>
            <div className="text-center p-2 bg-[#0E1628] rounded-md border border-[#1E2D45]"><p className="text-[10px] text-slate-500 uppercase">Cash</p><p className="text-sm font-bold text-emerald-400">{fmt(totalCash)}</p></div>
            <div className="text-center p-2 bg-[#0E1628] rounded-md border border-[#1E2D45]"><p className="text-[10px] text-slate-500 uppercase">Passengers</p><p className="text-sm font-bold text-pink-400">{totalPassengers}</p></div>
          </div>
          {filteredRemittance.length === 0 ? (
            <div className="text-center py-12"><Banknote size={32} className="mx-auto text-slate-600 mb-3" /><p className="text-sm text-slate-500">No records found.</p></div>
          ) : filteredRemittance.map((rec) => (
            <div key={rec.shiftId} className="bg-[#0E1628] border border-[#1E2D45] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#62A0EA]/15 flex items-center justify-center"><Hash size={16} className="text-[#62A0EA]" /></div>
                  <div><p className="text-sm text-white font-medium">{rec.shiftId}</p><p className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={11} />{rec.date}</p></div>
                </div>
                <Badge variant={rec.remittanceStatus==='Remitted'?'success':'warning'}>{rec.remittanceStatus}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#131C2E] rounded-md p-2.5 border border-[#1E2D45]"><p className="text-[10px] text-slate-500 uppercase">GCash</p><p className="text-sm text-blue-400 font-medium">{fmt(rec.gcashTotal)}</p></div>
                <div className="bg-[#131C2E] rounded-md p-2.5 border border-[#1E2D45]"><p className="text-[10px] text-slate-500 uppercase">Cash</p><p className="text-sm text-emerald-400 font-medium">{fmt(rec.cashTotal)}</p></div>
                <div className="bg-[#131C2E] rounded-md p-2.5 border border-[#1E2D45]"><p className="text-[10px] text-slate-500 uppercase">Total</p><p className="text-sm text-[#62A0EA] font-medium">{fmt(rec.gcashTotal + rec.cashTotal)}</p></div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1E2D45]">
                <p className="text-xs text-slate-500">{rec.totalPassengers} passengers</p>
                <p className="text-xs text-slate-600 flex items-center gap-1"><Clock size={11} />{rec.timeIn?.split('T')[1]?.slice(0,5)||'—'} → {rec.timeOut?.split('T')[1]?.slice(0,5)||'—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Transactions */}
      {activeTab === 'transactions' && (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          <div className="flex items-center gap-4 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]">
            <Banknote size={18} className="text-[#62A0EA]" />
            <div><p className="text-sm text-white font-medium">{allTxns.length} transactions across {totalShifts} shift(s)</p></div>
          </div>
          {filteredShiftLogs.length === 0 ? (
            <div className="text-center py-12"><Banknote size={32} className="mx-auto text-slate-600 mb-3" /><p className="text-sm text-slate-500">No shift records found.</p></div>
          ) : filteredShiftLogs.map((log) => {
            const isExp = expandedShift === log.shiftId;
            const txns = filteredShiftTxns[log.shiftId] || [];
            return (
              <div key={log.shiftId} className="bg-[#0E1628] border border-[#1E2D45] rounded-lg overflow-hidden">
                <button onClick={() => setExpandedShift(isExp ? null : log.shiftId)} className="w-full flex items-center justify-between p-4 text-left hover:bg-[#131C2E]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#131C2E] flex items-center justify-center border border-[#1E2D45]"><Calendar size={16} className="text-slate-400" /></div>
                    <div className="min-w-0"><p className="text-sm text-white font-medium truncate">{log.shiftId}</p><p className="text-xs text-slate-500">{formatLogTime(log.timeIn)}{log.timeOut ? ` → ${log.timeOut.split('T')[1]?.slice(0,5)||''}` : ' (active)'}{log.duration && <span className="ml-2 text-[#62A0EA]">{log.duration}</span>}</p></div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0"><span className="text-xs text-slate-500">{txns.length} txn(s)</span>{isExp ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}</div>
                </button>
                {isExp && (
                  <div className="border-t border-[#1E2D45] max-h-60 overflow-y-auto">
                    {txns.length === 0 ? <p className="text-xs text-slate-500 text-center py-4">No transactions.</p> : (
                      <div className="divide-y divide-[#1A2540]">
                        {txns.map((txn) => (
                          <div key={txn.transactionId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 hover:bg-[#131C2E]/50 gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex-shrink-0">{getBadge(txn.paymentMethod)}</div>
                              <div className="min-w-0"><p className="text-sm text-white font-medium truncate">{txn.passengerName}</p><p className="text-xs text-slate-500 flex items-center gap-1 truncate"><MapPin size={10} />{txn.from} → {txn.to}<span className="mx-1 text-slate-700">|</span>{txn.distance}km</p></div>
                            </div>
                            <div className="sm:text-right flex-shrink-0"><p className="text-sm text-[#62A0EA] font-medium">{fmt(txn.finalAmount)}</p><p className="text-[10px] text-slate-600">{new Date(txn.timestamp).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',hour12:true})}</p></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}