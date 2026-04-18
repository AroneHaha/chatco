"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/admin/ui/modal";

interface HistoryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentMethod = "Wallet_Prepay" | "Wallet_Scanned" | "Voucher";

const PAYMENT_METHOD_DISPLAY: Record<PaymentMethod, { label: string; color: string }> = {
  Wallet_Prepay: { label: "Prepaid", color: "text-emerald-400" },
  Wallet_Scanned: { label: "Scanned", color: "text-purple-400" },
  Voucher: { label: "Voucher", color: "text-pink-400" },
};

interface Transaction {
  id: string;
  passengerName: string;
  passengerId: string;
  passengerRole: string;
  from: string;
  to: string;
  distance: number;
  baseFare: number;
  succeedingKm: number;
  succeedingFare: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  conductorName: string;
  unitNumber: string;
  driverName: string;
  timestamp: number;
}

const MOCK_HISTORY: Transaction[] = [
  {
    id: "TXN-1714000000002",
    passengerName: "Ana Santos",
    passengerId: "USR-105",
    passengerRole: "Regular",
    from: "malolos",
    to: "calumpit",
    distance: 12,
    baseFare: 13.0,
    succeedingKm: 11,
    succeedingFare: 16.5,
    discountAmount: 0,
    totalAmount: 29.5,
    paymentMethod: "Wallet_Prepay",
    conductorName: "Mark",
    unitNumber: "RIZ 2024",
    driverName: "Ramon",
    timestamp: new Date().getTime() - 1800000,
  },
  {
    id: "TXN-1714000000000",
    passengerName: "Juan Dela Cruz",
    passengerId: "USR-102",
    passengerRole: "Student",
    from: "meycauayan",
    to: "malolos",
    distance: 22,
    baseFare: 13.0,
    succeedingKm: 21,
    succeedingFare: 31.5,
    discountAmount: 8.9,
    totalAmount: 35.6,
    paymentMethod: "Wallet_Scanned",
    conductorName: "Mark",
    unitNumber: "RIZ 2024",
    driverName: "Ramon",
    timestamp: new Date().getTime() - 3600000,
  },
  {
    id: "TXN-1713999999999",
    passengerName: "Maria Clara",
    passengerId: "USR-099",
    passengerRole: "Regular",
    from: "bocaue",
    to: "balagtas",
    distance: 4,
    baseFare: 13.0,
    succeedingKm: 3,
    succeedingFare: 4.5,
    discountAmount: 0,
    totalAmount: 17.5,
    paymentMethod: "Wallet_Scanned",
    conductorName: "Mark",
    unitNumber: "RIZ 2024",
    driverName: "Ramon",
    timestamp: new Date().getTime() - 7200000,
  },
  {
    id: "TXN-1713999999998",
    passengerName: "Pedro Reyes",
    passengerId: "USR-110",
    passengerRole: "Senior",
    from: "marilao",
    to: "guiguinto",
    distance: 12,
    baseFare: 13.0,
    succeedingKm: 11,
    succeedingFare: 16.5,
    discountAmount: 5.9,
    totalAmount: 23.6,
    paymentMethod: "Wallet_Prepay",
    conductorName: "Mark",
    unitNumber: "RIZ 2024",
    driverName: "Ramon",
    timestamp: new Date().getTime() - 10800000,
  },
  {
    id: "TXN-1713999999997",
    passengerName: "Carlos Garcia",
    passengerId: "USR-112",
    passengerRole: "Regular",
    from: "meycauayan",
    to: "marilao",
    distance: 4,
    baseFare: 13.0,
    succeedingKm: 3,
    succeedingFare: 4.5,
    discountAmount: 0,
    totalAmount: 17.5,
    paymentMethod: "Wallet_Scanned",
    conductorName: "Mark",
    unitNumber: "RIZ 2024",
    driverName: "Ramon",
    timestamp: new Date().getTime() - 86400000,
  },
  {
    id: "TXN-1713999999996",
    passengerName: "Sofia Lim",
    passengerId: "USR-115",
    passengerRole: "Student",
    from: "bocaue",
    to: "malolos",
    distance: 13,
    baseFare: 13.0,
    succeedingKm: 12,
    succeedingFare: 18.0,
    discountAmount: 6.2,
    totalAmount: 24.8,
    paymentMethod: "Wallet_Prepay",
    conductorName: "Mark",
    unitNumber: "RIZ 2024",
    driverName: "Ramon",
    timestamp: new Date().getTime() - 172800000,
  },
];

function toLocalDateString(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HistoryLogModal({ isOpen, onClose }: HistoryLogModalProps) {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<PaymentMethod | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHistory(MOCK_HISTORY);
      setExpandedId(null);
      setDateFrom("");
      setDateTo("");
      setShowDateFilter(false);
      setFilterMethod("ALL");
    }
  }, [isOpen]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const hasDateFilter = dateFrom !== "" || dateTo !== "";

  const filteredHistory = history.filter((tx) => {
    const txDate = toLocalDateString(tx.timestamp);

    if (filterMethod !== "ALL" && tx.paymentMethod !== filterMethod) return false;
    if (dateFrom !== "" && txDate < dateFrom) return false;
    if (dateTo !== "" && txDate > dateTo) return false;

    return true;
  });

  const filteredTotal = filteredHistory.reduce((sum, tx) => sum + tx.totalAmount, 0);

  const prepaidCount = history.filter(tx => tx.paymentMethod === "Wallet_Prepay").length;
  const scannedCount = history.filter(tx => tx.paymentMethod === "Wallet_Scanned").length;

  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-3 p-2 max-h-[80vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Transaction History</h2>
            <p className="text-white/40 text-xs mt-0.5">
              {history.length} total
              <span className="mx-1.5 text-white/20">·</span>
              <span className="text-purple-400 font-medium">{scannedCount} scanned</span>
              <span className="mx-1.5 text-white/20">·</span>
              <span className="text-emerald-400 font-medium">{prepaidCount} prepaid</span>
            </p>
          </div>

          {/* Date Filter Toggle */}
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              hasDateFilter
                ? "bg-[#62A0EA]/20 border-[#62A0EA]/40 text-[#62A0EA]"
                : showDateFilter
                  ? "bg-white/10 border-white/20 text-white/70"
                  : "bg-transparent border-white/10 text-white/40 hover:bg-white/5"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            Date
            {hasDateFilter && (
              <svg className="w-3 h-3 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>

        {/* Date Filter Panel */}
        {showDateFilter && (
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo || undefined}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-white text-xs focus:outline-none focus:border-[#1A5FB4] [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-white text-xs focus:outline-none focus:border-[#1A5FB4] [color-scheme:dark]"
                />
              </div>
            </div>
            {hasDateFilter && (
              <button
                onClick={clearDateFilter}
                className="w-full text-xs text-white/40 hover:text-white/70 transition-colors py-0.5"
              >
                Clear date filter
              </button>
            )}
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {(["ALL", "Wallet_Prepay", "Wallet_Scanned"] as const).map((method) => (
            <button
              key={method}
              onClick={() => setFilterMethod(method)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                filterMethod === method
                  ? method === "Wallet_Prepay"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : method === "Wallet_Scanned"
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-400"
                      : "bg-[#1A5FB4]/20 border-[#1A5FB4]/40 text-[#62A0EA]"
                  : "bg-transparent border-white/10 text-white/40 hover:bg-white/5"
              }`}
            >
              {method === "ALL" ? "All" : PAYMENT_METHOD_DISPLAY[method]?.label}
            </button>
          ))}
        </div>

        {/* Filtered Summary */}
        {hasDateFilter && (
          <div className="flex items-center justify-between bg-[#62A0EA]/10 border border-[#62A0EA]/20 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-[10px] font-semibold text-[#62A0EA]/60 uppercase tracking-wider">Filtered Results</p>
              <p className="text-white text-sm font-semibold mt-0.5">{filteredHistory.length} transaction{filteredHistory.length !== 1 ? "s" : ""}</p>
            </div>
            <p className="text-lg font-extrabold text-[#62A0EA]">₱{filteredTotal.toFixed(2)}</p>
          </div>
        )}

        {/* List */}
        {filteredHistory.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-sm py-10 gap-2">
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
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredHistory.map((tx) => {
              const methodDisplay = PAYMENT_METHOD_DISPLAY[tx.paymentMethod];
              const isPrepaid = tx.paymentMethod === "Wallet_Prepay";
              const isScanned = tx.paymentMethod === "Wallet_Scanned";

              return (
                <div key={tx.id} className={`border rounded-xl overflow-hidden transition-colors ${
                  isPrepaid ? "border-emerald-500/20" : isScanned ? "border-purple-500/20" : "border-white/10"
                }`}>
                  {/* Collapsed Row */}
                  <button
                    onClick={() => toggleExpand(tx.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-semibold truncate">{tx.passengerName}</p>
                        {isPrepaid && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 leading-none">
                            Prepaid
                          </span>
                        )}
                        {isScanned && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30 leading-none">
                            Scanned
                          </span>
                        )}
                      </div>
                      <p className="text-white/40 text-xs mt-0.5 truncate">
                        {new Date(tx.timestamp).toLocaleDateString()} • {tx.from} → {tx.to}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                      <p className="text-[#62A0EA] font-bold">₱{tx.totalAmount.toFixed(2)}</p>
                      <svg className={`w-4 h-4 text-white/30 transition-transform ${expandedId === tx.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                    </div>
                  </button>

                  {/* Expanded Receipt */}
                  {expandedId === tx.id && (
                    <div className="bg-white/5 p-4 border-t border-dashed border-white/10 text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between"><span className="text-gray-400">Txn ID:</span><span className="text-white">{tx.id}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Date:</span><span className="text-white">{new Date(tx.timestamp).toLocaleString()}</span></div>

                      <div className="border-t border-dashed border-white/10 pt-2 space-y-1">
                        <p className="text-white/50 font-bold uppercase text-[10px]">Passenger</p>
                        <div className="flex justify-between"><span className="text-gray-400">Name:</span><span className="text-white">{tx.passengerName}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">ID:</span><span className="text-white">{tx.passengerId}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Role:</span><span className="text-white">{tx.passengerRole}</span></div>
                      </div>

                      <div className="border-t border-dashed border-white/10 pt-2 space-y-1">
                        <p className="text-white/50 font-bold uppercase text-[10px]">Route & Fare</p>
                        <div className="flex justify-between"><span className="text-gray-400">Route:</span><span className="text-white capitalize">{tx.from} → {tx.to}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">First Km:</span><span className="text-white">₱{tx.baseFare.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Succeeding:</span><span className="text-white">₱{tx.succeedingFare.toFixed(2)}</span></div>
                        {tx.discountAmount > 0 && <div className="flex justify-between text-green-400"><span>Discount:</span><span>-₱{tx.discountAmount.toFixed(2)}</span></div>}
                        <div className="flex justify-between font-bold text-base text-[#62A0EA] border-t border-white/10 pt-2 mt-1"><span>Total:</span><span>₱{tx.totalAmount.toFixed(2)}</span></div>
                      </div>

                      <div className="border-t border-dashed border-white/10 pt-2 space-y-1">
                        <p className="text-white/50 font-bold uppercase text-[10px]">Unit Info</p>
                        <div className="flex justify-between"><span className="text-gray-400">Conductor:</span><span className="text-white">{tx.conductorName}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Driver:</span><span className="text-white">{tx.driverName}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Unit No:</span><span className="text-white">{tx.unitNumber}</span></div>
                      </div>

                      {/* Payment Method */}
                      <div className={`border-t border-dashed pt-2 mt-1 ${isPrepaid ? "border-emerald-500/30" : isScanned ? "border-purple-500/30" : "border-white/10"}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Payment Method:</span>
                          <span className={`font-bold text-sm ${methodDisplay.color}`}>
                            {isPrepaid && (
                              <svg className="w-3.5 h-3.5 inline mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                            )}
                            {isScanned && (
                              <svg className="w-3.5 h-3.5 inline mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg>
                            )}
                            {methodDisplay.label}
                          </span>
                        </div>
                        {isPrepaid && (
                          <p className="text-emerald-400/60 text-[10px] mt-1 text-right">Passenger paid via self-scan</p>
                        )}
                        {isScanned && (
                          <p className="text-purple-400/60 text-[10px] mt-1 text-right">Conductor scanned passenger wallet</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}