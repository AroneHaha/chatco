"use client";

import { useCallback, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import {
  fetchShiftTransactionsPage,
  type Transaction,
} from "@/lib/conductor/services/transactions.service";
import { formatPeso } from "@/lib/utils/display";

interface HistoryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
}

type PaymentFilter = "ALL" | "GCash" | "Cash" | "Voucher";
type BackendPaymentMethod = "CASH" | "GCASH" | "VOUCHER";
type DatePreset = "TODAY" | "LAST_7_DAYS" | "THIS_MONTH" | "ALL" | "CUSTOM";

const TRANSACTIONS_PER_PAGE = 25;

const PAYMENT_METHOD_DISPLAY: Record<string, { label: string; color: string }> = {
  Voucher: { label: "Voucher", color: "text-pink-400" },
  GCash: { label: "GCash", color: "text-blue-400" },
  Cash: { label: "Cash", color: "text-green-400" },
};

function toBackendPaymentMethod(method: PaymentFilter): BackendPaymentMethod | undefined {
  if (method === "Cash") return "CASH";
  if (method === "GCash") return "GCASH";
  if (method === "Voucher") return "VOUCHER";
  return undefined;
}

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  if (preset === "ALL" || preset === "CUSTOM") return { from: "", to: "" };
  if (preset === "THIS_MONTH") {
    return {
      from: formatInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: formatInputDate(today),
    };
  }
  if (preset === "LAST_7_DAYS") {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { from: formatInputDate(from), to: formatInputDate(today) };
  }
  return { from: formatInputDate(today), to: formatInputDate(today) };
}

export default function HistoryLogModal({ isOpen, onClose, shiftId }: HistoryLogModalProps) {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<PaymentFilter>("ALL");
  const [datePreset, setDatePreset] = useState<DatePreset>("TODAY");
  const [dateFrom, setDateFrom] = useState(() => getPresetRange("TODAY").from);
  const [dateTo, setDateTo] = useState(() => getPresetRange("TODAY").to);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const loadPage = useCallback(
    async (
      page: number,
      filters: { method: PaymentFilter; from: string; to: string }
    ) => {
      if (!shiftId) return;

      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;
      setIsLoading(true);
      setExpandedId(null);
      setHistory([]);

      try {
        const result = await fetchShiftTransactionsPage(shiftId, {
          page,
          perPage: TRANSACTIONS_PER_PAGE,
          paymentMethod: toBackendPaymentMethod(filters.method),
          dateFrom: filters.from || undefined,
          dateTo: filters.to || undefined,
        });

        if (requestSeqRef.current !== requestSeq) return;

        setHistory(result.transactions);
        setCurrentPage(result.currentPage);
        setTotalTransactions(result.total);
        setTotalPages(Math.max(1, result.totalPages));
        setFilteredTotal(result.totalAmount);
      } catch {
        if (requestSeqRef.current !== requestSeq) return;

        setHistory([]);
        setCurrentPage(1);
        setTotalTransactions(0);
        setTotalPages(1);
        setFilteredTotal(0);
      } finally {
        if (requestSeqRef.current === requestSeq) {
          setIsLoading(false);
        }
      }
    },
    [shiftId]
  );

  const openKey = isOpen ? shiftId : null;
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (isOpen && shiftId) {
      const todayRange = getPresetRange("TODAY");
      setExpandedId(null);
      setDatePreset("TODAY");
      setDateFrom(todayRange.from);
      setDateTo(todayRange.to);
      setFilterMethod("ALL");
      setCurrentPage(1);
      setTotalTransactions(0);
      setTotalPages(1);
      setFilteredTotal(0);
      void loadPage(1, { method: "ALL", from: todayRange.from, to: todayRange.to });
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const hasDateFilter = datePreset !== "ALL" || dateFrom !== "" || dateTo !== "";
  const hasActiveFilter = filterMethod !== "ALL" || hasDateFilter;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const clearDateFilter = () => {
    setDatePreset("ALL");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
    void loadPage(1, { method: filterMethod, from: "", to: "" });
  };

  if (!isOpen) return null;

  const getMethodBorderColor = (method: string) => {
    switch (method) {
      case "GCash": return "border-blue-500/20";
      case "Cash": return "border-green-500/20";
      case "Voucher": return "border-pink-500/20";
      default: return "border-white/10";
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "GCash": return <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 leading-none">GCash</span>;
      case "Cash": return <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-green-500/20 text-green-400 border border-green-500/30 leading-none">Cash</span>;
      case "Voucher": return <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-pink-500/20 text-pink-400 border border-pink-500/30 leading-none">Voucher</span>;
      default: return null;
    }
  };

  const getMethodDescription = (method: string) => {
    switch (method) {
      case "GCash": return "Digital payment via GCash";
      case "Cash": return "Physical cash collected";
      case "Voucher": return "Ride voucher used";
      default: return "";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50">
      <div className="relative bg-[#17233B] border border-[#2A3A55] rounded-xl shadow-2xl w-full max-w-lg mx-0 sm:mx-4 h-[92vh] sm:h-[94vh] max-h-[920px] flex flex-col rounded-b-none sm:rounded-b-xl mb-16 sm:mb-0">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/8 transition-colors z-20"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="p-4 sm:p-6 flex-1 min-h-0">
          <div className="h-full min-h-0 space-y-3 p-2 flex flex-col">
            <div>
              <h2 className="text-xl font-bold text-white">Transaction History</h2>
              <p className="text-white/40 text-xs mt-0.5">{totalTransactions} total</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="min-w-0">
                  <span className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Payment</span>
                  <select
                    value={filterMethod}
                    onChange={(e) => {
                      const method = e.target.value as PaymentFilter;
                      setFilterMethod(method);
                      setCurrentPage(1);
                      void loadPage(1, { method, from: dateFrom, to: dateTo });
                    }}
                    className="w-full rounded-lg border border-white/10 bg-[#0B1E33] px-2.5 py-2 text-xs font-semibold text-white/80 focus:outline-none focus:border-[#62A0EA] [color-scheme:dark]"
                  >
                    <option value="ALL">All payments</option>
                    <option value="GCash">GCash</option>
                    <option value="Cash">Cash</option>
                    <option value="Voucher">Voucher</option>
                  </select>
                </label>

                <label className="min-w-0">
                  <span className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Period</span>
                  <select
                    value={datePreset}
                    onChange={(e) => {
                      const preset = e.target.value as DatePreset;
                      const range = getPresetRange(preset);
                      setDatePreset(preset);
                      setDateFrom(range.from);
                      setDateTo(range.to);
                      setCurrentPage(1);
                      void loadPage(1, { method: filterMethod, from: range.from, to: range.to });
                    }}
                    className="w-full rounded-lg border border-white/10 bg-[#0B1E33] px-2.5 py-2 text-xs font-semibold text-white/80 focus:outline-none focus:border-[#62A0EA] [color-scheme:dark]"
                  >
                    <option value="TODAY">Today</option>
                    <option value="LAST_7_DAYS">Last 7 days</option>
                    <option value="THIS_MONTH">This month</option>
                    <option value="ALL">All</option>
                    <option value="CUSTOM">Custom range</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="min-w-0">
                  <span className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">From</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      const nextFrom = e.target.value;
                      setDatePreset("CUSTOM");
                      setDateFrom(nextFrom);
                      setCurrentPage(1);
                      void loadPage(1, { method: filterMethod, from: nextFrom, to: dateTo });
                    }}
                    max={dateTo || undefined}
                    className="w-full rounded-lg border border-white/10 bg-[#0B1E33] px-2.5 py-2 text-xs text-white/80 focus:outline-none focus:border-[#62A0EA] [color-scheme:dark]"
                  />
                </label>

                <label className="min-w-0">
                  <span className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">To</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      const nextTo = e.target.value;
                      setDatePreset("CUSTOM");
                      setDateTo(nextTo);
                      setCurrentPage(1);
                      void loadPage(1, { method: filterMethod, from: dateFrom, to: nextTo });
                    }}
                    min={dateFrom || undefined}
                    className="w-full rounded-lg border border-white/10 bg-[#0B1E33] px-2.5 py-2 text-xs text-white/80 focus:outline-none focus:border-[#62A0EA] [color-scheme:dark]"
                  />
                </label>
              </div>
            </div>

            {hasActiveFilter && (
              <div className="flex items-center justify-between bg-[#62A0EA]/10 border border-[#62A0EA]/20 rounded-xl px-3 py-2">
                <div>
                  <p className="text-[10px] font-semibold text-[#62A0EA]/60 uppercase tracking-wider">Filtered Results</p>
                  <p className="text-white text-sm font-semibold mt-0.5">{totalTransactions} transaction{totalTransactions !== 1 ? "s" : ""}</p>
                </div>
                <p className="text-lg font-extrabold text-[#62A0EA]">{formatPeso(filteredTotal)}</p>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-[#62A0EA] animate-spin" />
                  <p className="text-white/40 text-sm">Loading transactions...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/30 text-sm gap-2">
                  <svg className="w-10 h-10 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <p>No transactions found.</p>
                  {hasDateFilter && (
                    <button onClick={clearDateFilter} className="text-[#62A0EA] text-xs font-medium hover:underline">
                      Clear date filter
                    </button>
                  )}
                </div>
              ) : (
                history.map((tx) => {
                  const normalizedMethod = tx.paymentMethod.startsWith("GCash") ? "GCash" : tx.paymentMethod;
                  const methodDisplay = PAYMENT_METHOD_DISPLAY[normalizedMethod] || { label: tx.paymentMethod, color: "text-white/50" };
                  const displayDate = new Date(tx.timestamp).toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const displayTime = new Date(tx.timestamp).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });
                  const succeedingFare = tx.distance > 1
                    ? (tx.baseFare + (tx.succeedingKm * (tx.distance - 1))) - tx.baseFare
                    : 0;
                  const borderColor = getMethodBorderColor(normalizedMethod);
                  const methodBadge = getMethodBadge(normalizedMethod);
                  const methodDesc = getMethodDescription(normalizedMethod);

                  return (
                    <div key={tx.transactionId} className={`border rounded-xl overflow-hidden transition-colors ${borderColor}`}>
                      <button
                        onClick={() => toggleExpand(tx.transactionId)}
                        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="min-w-0 flex-1 mr-3">
                          <div className="flex items-center gap-2">
                            <p className="text-white text-sm font-semibold truncate">{tx.passengerName}</p>
                            {methodBadge}
                          </div>
                          <p className="text-white/40 text-xs mt-0.5 truncate">{displayDate} - {tx.from} to {tx.to}</p>
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                          <p className={`font-bold ${methodDisplay.color}`}>{formatPeso(tx.finalAmount)}</p>
                          <svg className={`w-4 h-4 text-white/30 transition-transform ${expandedId === tx.transactionId ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                          </svg>
                        </div>
                      </button>

                      {expandedId === tx.transactionId && (
                        <div className="bg-white/5 p-4 border-t border-dashed border-white/10 text-xs space-y-1.5 font-mono">
                          <div className="flex justify-between"><span className="text-gray-400">Txn ID:</span><span className="text-white">{tx.transactionId}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Date:</span><span className="text-white">{displayDate} {displayTime}</span></div>
                          <div className="border-t border-dashed border-white/10 pt-2 space-y-1">
                            <p className="text-white/50 font-bold uppercase text-[10px]">Passenger</p>
                            <div className="flex justify-between"><span className="text-gray-400">Name:</span><span className="text-white">{tx.passengerName}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">ID:</span><span className="text-white">{tx.passengerId}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Role:</span><span className="text-white">{tx.passengerRole}</span></div>
                          </div>
                          <div className="border-t border-dashed border-white/10 pt-2 space-y-1">
                            <p className="text-white/50 font-bold uppercase text-[10px]">Route &amp; Fare</p>
                            <div className="flex justify-between"><span className="text-gray-400">Route:</span><span className="text-white capitalize">{tx.from} to {tx.to}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Distance:</span><span className="text-white">{tx.distance} km</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">First Km:</span><span className="text-white">{formatPeso(tx.baseFare)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Succeeding:</span><span className="text-white">{formatPeso(succeedingFare)}</span></div>
                            {(tx.discountAmount ?? 0) > 0 && <div className="flex justify-between text-green-400"><span>Discount:</span><span>-{formatPeso(tx.discountAmount ?? 0)}</span></div>}
                            <div className="flex justify-between font-bold text-base text-[#62A0EA] border-t border-white/10 pt-2 mt-1"><span>Total:</span><span>{formatPeso(tx.finalAmount)}</span></div>
                          </div>
                          <div className="border-t border-dashed border-white/10 pt-2 space-y-1">
                            <p className="text-white/50 font-bold uppercase text-[10px]">Unit Info</p>
                            <div className="flex justify-between"><span className="text-gray-400">Conductor:</span><span className="text-white">{tx.conductorName}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Driver:</span><span className="text-white">{tx.driverName}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Unit No:</span><span className="text-white">{tx.unitNumber}</span></div>
                          </div>
                          <div className={`border-t border-dashed pt-2 mt-1 ${borderColor}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Payment Method:</span>
                              <span className={`font-bold text-sm ${methodDisplay.color}`}>{methodDisplay.label}</span>
                            </div>
                            {methodDesc && (<p className={`${methodDisplay.color}/60 text-[10px] mt-1 text-right`}>{methodDesc}</p>)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="shrink-0 flex items-center justify-between border-t border-white/10 pt-3 min-h-[44px]">
              <p className="text-[11px] text-white/35">
                {totalTransactions > 0
                  ? `Showing ${(safeCurrentPage - 1) * TRANSACTIONS_PER_PAGE + 1}-${Math.min(safeCurrentPage * TRANSACTIONS_PER_PAGE, totalTransactions)} of ${totalTransactions}`
                  : "Showing 0 of 0"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nextPage = Math.max(1, safeCurrentPage - 1);
                    void loadPage(nextPage, { method: filterMethod, from: dateFrom, to: dateTo });
                  }}
                  disabled={isLoading || safeCurrentPage === 1}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 disabled:opacity-25"
                >
                  Previous
                </button>
                <span className="text-[11px] text-white/40">{safeCurrentPage} / {totalPages}</span>
                <button
                  onClick={() => {
                    const nextPage = Math.min(totalPages, safeCurrentPage + 1);
                    void loadPage(nextPage, { method: filterMethod, from: dateFrom, to: dateTo });
                  }}
                  disabled={isLoading || safeCurrentPage === totalPages}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 disabled:opacity-25"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
