// components/admin/remittance/conductor-detail-modal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { type Remittance } from '@/app/(admin)/remittance/data/remittance-data';
import {
  User, Truck, Calendar, Clock, Wallet, Ticket, ScanLine,
  ChevronDown, ChevronUp, MapPin, Hash, X
} from 'lucide-react';
import {
  getStaticRemittanceHistory,
  getStaticShiftLogs,
  getStaticShiftTransactions,
  formatLogTime,
  type RemittanceRecord,
  type Transaction,
  type ShiftLog,
} from '@/lib/static-conductor-data';

interface ConductorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  conductor: Remittance | null;
}

export function ConductorDetailModal({ isOpen, onClose, conductor }: ConductorDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'remittance' | 'transactions'>('remittance');
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const [remittanceRecords, setRemittanceRecords] = useState<RemittanceRecord[]>([]);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const [shiftTransactions, setShiftTransactions] = useState<Record<string, Transaction[]>>({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Load static mock data when conductor changes
  useEffect(() => {
    if (!conductor || !isOpen) {
      setRemittanceRecords([]);
      setShiftLogs([]);
      setShiftTransactions({});
      return;
    }

    const name = conductor.conductor;

    // Load static remittance history
    setRemittanceRecords(getStaticRemittanceHistory(name));

    // Load static shift logs
    const logs = getStaticShiftLogs(name);
    setShiftLogs(logs);

    // Load static transactions for each shift
    const txnsMap: Record<string, Transaction[]> = {};
    logs.forEach((log: ShiftLog) => {
      txnsMap[log.shiftId] = getStaticShiftTransactions(log.shiftId, name);
    });
    setShiftTransactions(txnsMap);

    // Reset tab, expanded state, and date filters
    setActiveTab('remittance');
    setExpandedShift(null);
    setStartDate('');
    setEndDate('');
  }, [conductor, isOpen]);

  // ── Date filter helpers ──
  const filterByDate = (dateStr: string): boolean => {
    if (!startDate && !endDate) return true;
    const d = dateStr.split('T')[0]; // strip time portion if present
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  // Filtered data based on date range
  const filteredRemittanceRecords = useMemo(() => {
    if (!startDate && !endDate) return remittanceRecords;
    return remittanceRecords.filter((r: RemittanceRecord) => filterByDate(r.date));
  }, [remittanceRecords, startDate, endDate]);

  const filteredShiftLogs = useMemo(() => {
    if (!startDate && !endDate) return shiftLogs;
    return shiftLogs.filter((l: ShiftLog) => filterByDate(l.timeIn));
  }, [shiftLogs, startDate, endDate]);

  const filteredShiftTransactions = useMemo(() => {
    if (!startDate && !endDate) return shiftTransactions;
    const filteredShiftIds = new Set(filteredShiftLogs.map((l: ShiftLog) => l.shiftId));
    const result: Record<string, Transaction[]> = {};
    Object.entries(shiftTransactions).forEach(([shiftId, txns]) => {
      if (filteredShiftIds.has(shiftId)) {
        result[shiftId] = txns;
      }
    });
    return result;
  }, [shiftTransactions, filteredShiftLogs, startDate, endDate]);

  const hasDateFilter = startDate || endDate;
  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  if (!conductor) return null;

  // Aggregate stats from FILTERED remittance records
  const totalRemitted = filteredRemittanceRecords
    .filter((r: RemittanceRecord) => r.remittanceStatus === 'Remitted')
    .reduce((sum: number, r: RemittanceRecord) => sum + r.totalCashless + r.cashDeclared, 0);
  const totalPending = filteredRemittanceRecords
    .filter((r: RemittanceRecord) => r.remittanceStatus === 'Pending')
    .reduce((sum: number, r: RemittanceRecord) => sum + r.totalCashless + r.cashDeclared, 0);
  const totalScanned = filteredRemittanceRecords.reduce((sum: number, r: RemittanceRecord) => sum + r.cashlessBreakdown.scanned, 0);
  const totalVoucher = filteredRemittanceRecords.reduce((sum: number, r: RemittanceRecord) => sum + r.cashlessBreakdown.voucher, 0);
  const totalPassengers = filteredRemittanceRecords.reduce((sum: number, r: RemittanceRecord) => sum + r.totalPassengers, 0);

  // Aggregate from filtered shift logs + transactions
  const totalShifts = filteredShiftLogs.length;
  const allTxns = Object.values(filteredShiftTransactions).flat();
  const totalScans = allTxns.filter((t: Transaction) => t.paymentMethod === 'Wallet_Scanned').length;

  const formatCurrency = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'Wallet_Scanned': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400"><ScanLine size={11} />Scanned</span>;
      case 'Wallet_Prepay': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400"><Wallet size={11} />Prepaid</span>;
      case 'Voucher': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400"><Ticket size={11} />Voucher</span>;
      default: return <span className="text-xs text-slate-400">{method}</span>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl" rounded="rounded-xl">
      {/* ── Header: Conductor Info ── */}
      <div className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#62A0EA]/15 flex items-center justify-center flex-shrink-0">
              <User size={24} className="text-[#62A0EA]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{conductor.conductor}</h2>
              <p className="text-sm text-slate-400">Conductor Profile</p>
            </div>
          </div>
        </div>

        {/* Quick info pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]">
            <Truck size={16} className="text-[#62A0EA] flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Vehicle</p>
              <p className="text-sm text-white font-medium">{conductor.vehicle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]">
            <Calendar size={16} className="text-sky-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Filtered Shifts</p>
              <p className="text-sm text-white font-medium">{totalShifts}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]">
            <Wallet size={16} className="text-[#62A0EA] flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Total Remitted</p>
              <p className="text-sm text-[#62A0EA] font-medium">{formatCurrency(totalRemitted)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]">
            <Clock size={16} className="text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Pending</p>
              <p className="text-sm text-orange-400 font-medium">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Date Range Filter ── */}
      <div className="mb-4 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]">
        <div className="flex items-center gap-2 mb-2.5">
          <Calendar size={14} className="text-[#62A0EA] flex-shrink-0" />
          <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Filter by Date Range</span>
          {hasDateFilter && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#62A0EA]/15 text-[#62A0EA]">
              Active
              <button onClick={clearDateFilter} className="hover:text-white transition-colors">
                <X size={10} />
              </button>
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 uppercase mb-1 block">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate || undefined}
              className="w-full px-3 py-2 bg-[#131C2E] border border-[#1E2D45] rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] [color-scheme:dark]"
            />
          </div>
          <div className="flex items-end pb-2 text-slate-600 hidden sm:flex">
            <span className="text-xs">—</span>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 uppercase mb-1 block">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              className="w-full px-3 py-2 bg-[#131C2E] border border-[#1E2D45] rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] [color-scheme:dark]"
            />
          </div>
          {hasDateFilter && (
            <div className="flex items-end">
              <button
                onClick={clearDateFilter}
                className="px-3 py-2 bg-[#1A2540] border border-[#1E2D45] rounded-md text-xs text-slate-400 hover:text-white hover:bg-[#1E2D45] transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex bg-[#0E1628] rounded-md p-1 border border-[#1E2D45] mb-5">
        <button
          onClick={() => setActiveTab('remittance')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all text-center ${
            activeTab === 'remittance'
              ? 'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/30'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Remittance History
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all text-center ${
            activeTab === 'transactions'
              ? 'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/30'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Scan Transactions
        </button>
      </div>

      {/* ── Tab: Remittance History ── */}
      {activeTab === 'remittance' && (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="text-center p-2 bg-[#0E1628] rounded-md border border-[#1E2D45]">
              <p className="text-[10px] text-slate-500 uppercase">Total Scanned</p>
              <p className="text-sm font-bold text-[#62A0EA]">{formatCurrency(totalScanned)}</p>
            </div>
            <div className="text-center p-2 bg-[#0E1628] rounded-md border border-[#1E2D45]">
              <p className="text-[10px] text-slate-500 uppercase">Total Voucher</p>
              <p className="text-sm font-bold text-pink-400">{formatCurrency(totalVoucher)}</p>
            </div>
            <div className="text-center p-2 bg-[#0E1628] rounded-md border border-[#1E2D45]">
              <p className="text-[10px] text-slate-500 uppercase">Passengers</p>
              <p className="text-sm font-bold text-white">{totalPassengers}</p>
            </div>
          </div>

          {filteredRemittanceRecords.length === 0 ? (
            <div className="text-center py-12">
              <Wallet size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">No remittance records found.</p>
              <p className="text-xs text-slate-600 mt-1">{hasDateFilter ? 'Try adjusting the date range.' : 'Records appear here after conductors submit their end-of-day report.'}</p>
            </div>
          ) : (
            filteredRemittanceRecords.map((record: RemittanceRecord) => (
              <div key={record.shiftId} className="bg-[#0E1628] border border-[#1E2D45] rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#62A0EA]/15 flex items-center justify-center flex-shrink-0">
                      <Hash size={16} className="text-[#62A0EA]" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{record.shiftId}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={11} /> {record.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={record.remittanceStatus === 'Remitted' ? 'success' : 'warning'}>
                      {record.remittanceStatus}
                    </Badge>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-[#131C2E] rounded-md p-2.5 border border-[#1E2D45]">
                    <p className="text-[10px] text-slate-500 uppercase">Scanned</p>
                    <p className="text-sm text-purple-400 font-medium">{formatCurrency(record.cashlessBreakdown.scanned)}</p>
                  </div>
                  <div className="bg-[#131C2E] rounded-md p-2.5 border border-[#1E2D45]">
                    <p className="text-[10px] text-slate-500 uppercase">Prepaid</p>
                    <p className="text-sm text-emerald-400 font-medium">{formatCurrency(record.cashlessBreakdown.prepaid)}</p>
                  </div>
                  <div className="bg-[#131C2E] rounded-md p-2.5 border border-[#1E2D45]">
                    <p className="text-[10px] text-slate-500 uppercase">Voucher</p>
                    <p className="text-sm text-pink-400 font-medium">{formatCurrency(record.cashlessBreakdown.voucher)}</p>
                  </div>
                  <div className="bg-[#131C2E] rounded-md p-2.5 border border-[#1E2D45]">
                    <p className="text-[10px] text-slate-500 uppercase">Cash Declared</p>
                    <p className="text-sm text-white font-medium">{formatCurrency(record.cashDeclared)}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 pt-3 border-t border-[#1E2D45] gap-1">
                  <p className="text-xs text-slate-500">
                    {record.totalPassengers} passengers
                    <span className="mx-1.5 text-slate-700">|</span>
                    Total: <span className="text-slate-300 font-medium">{formatCurrency(record.totalCashless + record.cashDeclared)}</span>
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock size={11} /> {record.timeIn?.split('T')[1]?.slice(0, 5) || '—'} → {record.timeOut?.split('T')[1]?.slice(0, 5) || '—'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Scan Transactions (grouped by shift) ── */}
      {activeTab === 'transactions' && (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {/* Summary */}
          <div className="flex items-center gap-4 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]">
            <ScanLine size={18} className="text-[#62A0EA] flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">{totalScans} total scans across {totalShifts} shift(s)</p>
              <p className="text-xs text-slate-500">{allTxns.length} total transactions recorded</p>
            </div>
          </div>

          {filteredShiftLogs.length === 0 ? (
            <div className="text-center py-12">
              <ScanLine size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">No shift records found.</p>
              <p className="text-xs text-slate-600 mt-1">{hasDateFilter ? 'Try adjusting the date range.' : 'Transaction scans appear here after conductors complete shifts.'}</p>
            </div>
          ) : (
            filteredShiftLogs.map((log: ShiftLog) => {
              const isExpanded = expandedShift === log.shiftId;
              const txns = filteredShiftTransactions[log.shiftId] || [];

              return (
                <div key={log.shiftId} className="bg-[#0E1628] border border-[#1E2D45] rounded-lg overflow-hidden">
                  {/* Shift header — click to expand */}
                  <button
                    onClick={() => setExpandedShift(isExpanded ? null : log.shiftId)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-[#131C2E] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#131C2E] flex items-center justify-center flex-shrink-0 border border-[#1E2D45]">
                        <Calendar size={16} className="text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{log.shiftId}</p>
                        <p className="text-xs text-slate-500">
                          {formatLogTime(log.timeIn)}
                          {log.timeOut ? ` → ${log.timeOut.split('T')[1]?.slice(0, 5) || ''}` : ' (active)'}
                          {log.duration && <span className="ml-2 text-[#62A0EA]">{log.duration}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-slate-500">{txns.length} txn(s)</span>
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  {/* Expanded: transaction list */}
                  {isExpanded && (
                    <div className="border-t border-[#1E2D45] max-h-60 overflow-y-auto">
                      {txns.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">No transactions recorded for this shift.</p>
                      ) : (
                        <div className="divide-y divide-[#1A2540]">
                          {txns.map((txn: Transaction) => (
                            <div key={txn.transactionId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 hover:bg-[#131C2E]/50 transition-colors gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex-shrink-0">
                                  {getMethodBadge(txn.paymentMethod)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm text-white font-medium truncate">{txn.passengerName}</p>
                                  <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                    <MapPin size={10} /> {txn.from} → {txn.to}
                                    <span className="mx-1 text-slate-700">|</span>
                                    {txn.distance} km
                                  </p>
                                </div>
                              </div>
                              <div className="sm:text-right flex-shrink-0">
                                <p className="text-sm text-[#62A0EA] font-medium">{formatCurrency(txn.finalAmount)}</p>
                                <p className="text-[10px] text-slate-600">
                                  {new Date(txn.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </Modal>
  );
}
