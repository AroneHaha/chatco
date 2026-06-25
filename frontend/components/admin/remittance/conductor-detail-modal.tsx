// components/admin/remittance/conductor-detail-modal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import type {
  RemittanceRecord,
} from '@/app/(admin)/remittance/data/remittance-data';
import {
  User, Truck, Calendar, Clock, Banknote,
  ChevronDown, ChevronUp, MapPin, Hash,
} from 'lucide-react';

// ─── Helper ────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatLogTime = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

// ─── Real Transaction type (from API) ──────────────────────────────────
interface ApiTransaction {
  transaction_id: string;
  payment_method: string;
  final_amount: string | number;
  passenger_name: string | null;
  pickup_name: string | null;
  dropoff_name: string | null;
  created_at: string;
}

// ─── Props ─────────────────────────────────────────────────────────────
interface ConductorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: RemittanceRecord | null;
}

// ─── Component ─────────────────────────────────────────────────────────
export function ConductorDetailModal({ isOpen, onClose, record }: ConductorDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'remittance' | 'transactions'>('remittance');
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);

  useEffect(() => {
    if (!record || !isOpen) {
      setTransactions([]);
      setActiveTab('remittance');
      setExpandedShift(null);
      return;
    }

    // Fetch real transactions for this shift
    setIsLoadingTxns(true);
    fetch(`/api/admin/transactions?shift_id=${encodeURIComponent(record.shiftId)}`, {
      headers: { Accept: 'application/json' },
    })
      .then((res) => res.json())
      .then((json) => {
        setTransactions(json.data ?? []);
      })
      .catch(() => setTransactions([]))
      .finally(() => setIsLoadingTxns(false));
  }, [record, isOpen]);

  if (!record) return null;

  const totalRemitted = record.remittanceStatus === 'Remitted' ? record.gcashTotal + record.cashTotal : 0;
  const totalPending = record.remittanceStatus === 'Pending' ? record.gcashTotal + record.cashTotal : 0;

  const getBadge = (m: string) => {
    if (m === 'GCASH' || m === 'GCash_Scanned' || m === 'GCash_Direct')
      return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">GCash</span>;
    if (m === 'VOUCHER' || m === 'Voucher')
      return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Voucher</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Cash</span>;
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
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]"><Calendar size={16} className="text-sky-400" /><div><p className="text-[10px] text-slate-500 uppercase">Shift ID</p><p className="text-sm text-white font-medium">{record.shiftId.slice(0, 12)}...</p></div></div>
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]"><Banknote size={16} className="text-[#62A0EA]" /><div><p className="text-[10px] text-slate-500 uppercase">Remitted</p><p className="text-sm text-[#62A0EA] font-medium">{fmt(totalRemitted)}</p></div></div>
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]"><Clock size={16} className="text-amber-400" /><div><p className="text-[10px] text-slate-500 uppercase">Pending</p><p className="text-sm text-orange-400 font-medium">{fmt(totalPending)}</p></div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0E1628] rounded-md p-1 border border-[#1E2D45] mb-5">
        <button onClick={() => setActiveTab('remittance')} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all text-center ${activeTab==='remittance'?'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/30':'text-slate-500 hover:text-slate-300'}`}>Remittance Details</button>
        <button onClick={() => setActiveTab('transactions')} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all text-center ${activeTab==='transactions'?'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/30':'text-slate-500 hover:text-slate-300'}`}>Transactions ({transactions.length})</button>
      </div>

      {/* Tab: Remittance */}
      {activeTab === 'remittance' && (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          <div className="bg-[#0E1628] border border-[#1E2D45] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#62A0EA]/15 flex items-center justify-center"><Hash size={16} className="text-[#62A0EA]" /></div>
                <div><p className="text-sm text-white font-medium">{record.shiftId}</p><p className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={11} />{record.date}</p></div>
              </div>
              <Badge variant={record.remittanceStatus==='Remitted'?'success':'warning'}>{record.remittanceStatus}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#131C2E] rounded-md p-2.5 border border-[#1E2D45]"><p className="text-[10px] text-slate-500 uppercase">GCash</p><p className="text-sm text-blue-400 font-medium">{fmt(record.gcashTotal)}</p></div>
              <div className="bg-[#131C2E] rounded-md p-2.5 border border-[#1E2D45]"><p className="text-[10px] text-slate-500 uppercase">Cash</p><p className="text-sm text-emerald-400 font-medium">{fmt(record.cashTotal)}</p></div>
              <div className="bg-[#131C2E] rounded-md p-2.5 border border-[#1E2D45]"><p className="text-[10px] text-slate-500 uppercase">Total</p><p className="text-sm text-[#62A0EA] font-medium">{fmt(record.gcashTotal + record.cashTotal)}</p></div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1E2D45]">
              <p className="text-xs text-slate-500">{record.totalPassengers} passengers</p>
              <p className="text-xs text-slate-600 flex items-center gap-1"><Clock size={11} />{record.timeIn?.split('T')[1]?.slice(0,5)||'—'} → {record.timeOut?.split('T')[1]?.slice(0,5)||'—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Transactions */}
      {activeTab === 'transactions' && (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {isLoadingTxns ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[#62A0EA] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-400">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Banknote size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">No transactions found for this shift.</p>
            </div>
          ) : (
            <div className="bg-[#0E1628] border border-[#1E2D45] rounded-lg overflow-hidden">
              <div className="divide-y divide-[#1A2540]">
                {transactions.map((txn) => (
                  <div key={txn.transaction_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 hover:bg-[#131C2E]/50 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">{getBadge(txn.payment_method)}</div>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{txn.passenger_name || 'Cash Passenger'}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                          <MapPin size={10} />
                          {txn.pickup_name || '—'} → {txn.dropoff_name || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="sm:text-right flex-shrink-0">
                      <p className="text-sm text-[#62A0EA] font-medium">₱{Number(txn.final_amount).toFixed(2)}</p>
                      <p className="text-[10px] text-slate-600">
                        {new Date(txn.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
