// components/admin/remittance/conductor-detail-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import type {
  RemittanceRecord,
} from '@/app/(admin)/remittance/data/remittance-data';
import {
  User, Truck, Calendar, Clock, Banknote,
  ChevronDown, ChevronUp, MapPin, Hash,
  ChevronLeft, ChevronRight, Search, X,
} from 'lucide-react';

// ─── Remittance History pagination ─────────────────────────────────────
const REMIT_PAGE_SIZE = 5;
type RemitFilter = 'All' | 'Remitted' | 'Pending';

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
  status: string;
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
  allRecords?: RemittanceRecord[];
}

// ─── Component ─────────────────────────────────────────────────────────
export function ConductorDetailModal({ isOpen, onClose, record, allRecords }: ConductorDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'remittance' | 'transactions'>('remittance');
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const [shiftTransactions, setShiftTransactions] = useState<Record<string, ApiTransaction[]>>({});
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);
  const [remitFilter, setRemitFilter] = useState<RemitFilter>('All');
  const [remitSearch, setRemitSearch] = useState('');
  const [remitDate, setRemitDate] = useState('');
  const [remitPage, setRemitPage] = useState(1);

  const conductorRecords = allRecords?.filter(r => r.conductorName === record?.conductorName) ?? (record ? [record] : []);

  useEffect(() => {
    if (!record || !isOpen) {
      setShiftTransactions({});
      setActiveTab('remittance');
      setExpandedShift(null);
      setRemitFilter('All');
      setRemitSearch('');
      setRemitDate('');
      setRemitPage(1);
      return;
    }

    setIsLoadingTxns(true);
    const shiftIds = conductorRecords.map(r => r.shiftId);

    Promise.all(
      shiftIds.map(shiftId =>
        fetch(`/api/admin/transactions?shift_id=${encodeURIComponent(shiftId)}`, {
          headers: { Accept: 'application/json' },
        })
          .then(res => res.json())
          .then(json => {
            // The proxy returns Laravel's paginator, so the transaction array
            // is nested at json.data.data (json.data is the paginator object).
            const rows = (json.data?.data ?? json.data ?? []) as ApiTransaction[];
            // Only PAID transactions actually count toward the shift's
            // cash/GCash totals. The admin transactions endpoint returns every
            // transaction (including PENDING/EXPIRED/FAILED GCash attempts that
            // were never collected), so filter to PAID here — otherwise the
            // list shows fares that legitimately don't appear in the totals.
            const txns = Array.isArray(rows) ? rows.filter(t => t.status === 'PAID') : [];
            return { shiftId, txns };
          })
          .catch(() => ({ shiftId, txns: [] as ApiTransaction[] }))
      )
    )
      .then(results => {
        const map: Record<string, ApiTransaction[]> = {};
        results.forEach(({ shiftId, txns }) => {
          map[shiftId] = txns;
        });
        setShiftTransactions(map);
      })
      .finally(() => setIsLoadingTxns(false));
  }, [record, isOpen, conductorRecords.length]);

  if (!record) return null;

  const totalPending = conductorRecords
    .filter(r => r.remittanceStatus === 'Pending')
    .reduce((s, r) => s + r.gcashTotal + r.cashTotal, 0);
  const allTxns = Object.values(shiftTransactions).flat();

  // ─── Remittance History: filter + paginate ───────────────────────────
  const search = remitSearch.trim().toLowerCase();
  const filteredRecords = conductorRecords.filter(r => {
    const matchesStatus = remitFilter === 'All' || r.remittanceStatus === remitFilter;
    const matchesSearch = !search || r.shiftId.toLowerCase().includes(search);
    const matchesDate = !remitDate || r.date === remitDate;
    return matchesStatus && matchesSearch && matchesDate;
  });
  const remitTotalPages = Math.max(1, Math.ceil(filteredRecords.length / REMIT_PAGE_SIZE));
  const safeRemitPage = Math.min(remitPage, remitTotalPages);
  const pagedRecords = filteredRecords.slice(
    (safeRemitPage - 1) * REMIT_PAGE_SIZE,
    safeRemitPage * REMIT_PAGE_SIZE
  );
  const applyRemitFilter = (f: RemitFilter) => { setRemitFilter(f); setRemitPage(1); };

  const getBadge = (m: string) => {
    if (m === 'GCASH' || m === 'GCash_Scanned' || m === 'GCash_Direct')
      return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">GCash</span>;
    if (m === 'VOUCHER' || m === 'Voucher')
      return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Voucher</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Cash</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl" rounded="rounded-xl">
      <div className="mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-[#62A0EA]/15 flex items-center justify-center"><User size={24} className="text-[#62A0EA]" /></div>
          <div><h2 className="text-xl font-bold text-white">{record.conductorName}</h2><p className="text-sm text-slate-400">Conductor Profile</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]"><Truck size={16} className="text-[#62A0EA]" /><div><p className="text-[10px] text-slate-500 uppercase">Vehicle</p><p className="text-sm text-white font-medium">{record.unitNumber}</p></div></div>
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]"><Calendar size={16} className="text-sky-400" /><div><p className="text-[10px] text-slate-500 uppercase">Shifts</p><p className="text-sm text-white font-medium">{conductorRecords.length}</p></div></div>
          <div className="flex items-center gap-2.5 p-3 bg-[#0E1628] rounded-lg border border-[#1E2D45]"><Clock size={16} className="text-amber-400" /><div><p className="text-[10px] text-slate-500 uppercase">Pending (Today)</p><p className="text-sm text-orange-400 font-medium">{fmt(totalPending)}</p></div></div>
        </div>
      </div>

      <div className="flex bg-[#0E1628] rounded-md p-1 border border-[#1E2D45] mb-5">
        <button onClick={() => setActiveTab('remittance')} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all text-center ${activeTab==='remittance'?'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/30':'text-slate-500 hover:text-slate-300'}`}>Remittance History ({conductorRecords.length})</button>
        <button onClick={() => setActiveTab('transactions')} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all text-center ${activeTab==='transactions'?'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/30':'text-slate-500 hover:text-slate-300'}`}>Transactions ({allTxns.length})</button>
      </div>

      {activeTab === 'remittance' && (
        <div>
          {/* Search + date */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={remitSearch}
                onChange={(e) => { setRemitSearch(e.target.value); setRemitPage(1); }}
                placeholder="Search Shift ID…"
                className="w-full bg-[#0E1628] border border-[#1E2D45] rounded-md pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#62A0EA]"
              />
              {remitSearch && (
                <button
                  onClick={() => { setRemitSearch(''); setRemitPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="date"
                value={remitDate}
                onChange={(e) => { setRemitDate(e.target.value); setRemitPage(1); }}
                className="bg-[#0E1628] border border-[#1E2D45] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#62A0EA] scheme-dark"
              />
              {remitDate && (
                <button
                  onClick={() => { setRemitDate(''); setRemitPage(1); }}
                  className="ml-1 text-xs text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 mb-3">
            {(['All', 'Remitted', 'Pending'] as RemitFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => applyRemitFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  remitFilter === f
                    ? 'bg-[#62A0EA] text-white'
                    : 'bg-[#0E1628] text-slate-400 border border-[#1E2D45] hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-500">{filteredRecords.length} shift(s)</span>
          </div>

          <div className="space-y-3 max-h-[42vh] overflow-y-auto">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12"><Banknote size={32} className="mx-auto text-slate-600 mb-3" /><p className="text-sm text-slate-500">No records found.</p></div>
          ) : pagedRecords.map((rec) => (
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

          {/* Pagination */}
          {remitTotalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1E2D45]">
              <span className="text-xs text-slate-500">Page {safeRemitPage} of {remitTotalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRemitPage(p => Math.max(1, p - 1))}
                  disabled={safeRemitPage === 1}
                  className="p-1.5 rounded-md bg-[#0E1628] border border-[#1E2D45] hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} className="text-slate-400" />
                </button>
                <button
                  onClick={() => setRemitPage(p => Math.min(remitTotalPages, p + 1))}
                  disabled={safeRemitPage === remitTotalPages}
                  className="p-1.5 rounded-md bg-[#0E1628] border border-[#1E2D45] hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} className="text-slate-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {isLoadingTxns ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[#62A0EA] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-400">Loading transactions...</p>
            </div>
          ) : conductorRecords.length === 0 ? (
            <div className="text-center py-12">
              <Banknote size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">No shift records found.</p>
            </div>
          ) : conductorRecords.map((rec) => {
            const isExp = expandedShift === rec.shiftId;
            const txns = shiftTransactions[rec.shiftId] || [];
            return (
              <div key={rec.shiftId} className="bg-[#0E1628] border border-[#1E2D45] rounded-lg overflow-hidden">
                <button onClick={() => setExpandedShift(isExp ? null : rec.shiftId)} className="w-full flex items-center justify-between p-4 text-left hover:bg-[#131C2E]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#131C2E] flex items-center justify-center border border-[#1E2D45]"><Calendar size={16} className="text-slate-400" /></div>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{rec.shiftId}</p>
                      <p className="text-xs text-slate-500">{formatLogTime(rec.timeIn)}{rec.timeOut ? ` → ${rec.timeOut.split('T')[1]?.slice(0,5)||''}` : ' (active)'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-slate-500">{txns.length} txn(s)</span>
                    {isExp ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                  </div>
                </button>
                {isExp && (
                  <div className="border-t border-[#1E2D45] max-h-60 overflow-y-auto">
                    {txns.length === 0 ? <p className="text-xs text-slate-500 text-center py-4">No transactions.</p> : (
                      <div className="divide-y divide-[#1A2540]">
                        {txns.map((txn) => (
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
