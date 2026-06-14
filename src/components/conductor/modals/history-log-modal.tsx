"use client";

import { useState, useMemo, useCallback } from "react";
import { X } from "lucide-react";
import { getShiftTransactions, type Transaction } from "@/lib/conductor/services/transactions.service";
import type { PaymentMethodType } from "@/types";

interface HistoryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
}

type PaymentMethod = PaymentMethodType;

const PAYMENT_METHOD_DISPLAY: Record<string, { label: string; color: string }> = {
  Voucher: { label: "Voucher", color: "text-pink-400" },
  GCash_Scanned: { label: "GCash", color: "text-blue-400" },
  GCash_Direct: { label: "GCash", color: "text-blue-400" },
  Cash: { label: "Cash", color: "text-green-400" },
};

export default function HistoryLogModal({ isOpen, onClose, shiftId }: HistoryLogModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<PaymentMethod | "ALL">("ALL");

  // Track open state to detect transitions (derived state pattern)
  const [wasOpen, setWasOpen] = useState(false);

  // Reset state when modal opens
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setExpandedId(null);
    setFilterMethod("ALL");
  }
  if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  // Compute history from localStorage synchronously whenever modal is open and shiftId changes
  const history = useMemo<Transaction[]>(() => {
    if (!isOpen || !shiftId) return [];
    return getShiftTransactions(shiftId);
  }, [isOpen, shiftId]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const filteredHistory = history.filter((tx) => {
    if (filterMethod !== "ALL" && tx.paymentMethod !== filterMethod) return false;
    return true;
  });

  const filteredTotal = filteredHistory.reduce((sum, tx) => sum + tx.finalAmount, 0);

  const gcashCount = history.filter(tx => tx.paymentMethod === "GCash_Scanned" || tx.paymentMethod === "GCash_Direct").length;
  const cashCount = history.filter(tx => tx.paymentMethod === "Cash").length;
  const voucherCount = history.filter(tx => tx.paymentMethod === "Voucher").length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50">
      <div className="relative bg-[#1A2540] border border-[#2A3A55] rounded-xl shadow-2xl w-full max-w-md mx-0 sm:mx-4 max-h-[85vh] sm:max-h-[90vh] flex flex-col rounded-b-none sm:rounded-b-xl mb-16 sm:mb-0">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/8 transition-colors z-20"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="space-y-3 p-2 flex flex-col">
            <div>
              <h2 className="text-xl font-bold text-white">Transaction History</h2>
              <p className="text-white/40 text-xs mt-0.5">
                {history.length} total
                {gcashCount > 0 && (<><span className="mx-1.5 text-white/20">·</span><span className="text-blue-400 font-medium">{gcashCount} GCash</span></>)}
                {cashCount > 0 && (<><span className="mx-1.5 text-white/20">·</span><span className="text-green-400 font-medium">{cashCount} cash</span></>)}
                {voucherCount > 0 && (<><span className="mx-1.5 text-white/20">·</span><span className="text-pink-400 font-medium">{voucherCount} voucher</span></>)}
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {(["ALL", "GCash_Scanned", "Cash", "Voucher"] as const).map((method) => {
                const display = method === "ALL" ? "All" : PAYMENT_METHOD_DISPLAY[method]?.label || method;
                const isActive = filterMethod === method;
                let activeStyle = "bg-[#1A5FB4]/20 border-[#1A5FB4]/40 text-[#62A0EA]";
                if (method === "GCash_Scanned") activeStyle = "bg-blue-500/20 border-blue-500/40 text-blue-400";
                else if (method === "Cash") activeStyle = "bg-green-500/20 border-green-500/40 text-green-400";
                else if (method === "Voucher") activeStyle = "bg-pink-500/20 border-pink-500/40 text-pink-400";

                return (
                  <button
                    key={method}
                    onClick={() => setFilterMethod(method)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                      isActive
                        ? activeStyle
                        : "bg-transparent border-white/10 text-white/40 hover:bg-white/5"
                    }`}
                  >
                    {display}
                  </button>
                );
              })}
            </div>

            {filteredHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-sm py-10 gap-2">
                <svg className="w-10 h-10 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <p>No transactions found.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredHistory.map((tx) => {
                  const methodDisplay = PAYMENT_METHOD_DISPLAY[tx.paymentMethod] || { label: tx.paymentMethod, color: "text-white/50" };

                  return (
                    <div key={tx.transactionId} className="border border-white/10 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleExpand(tx.transactionId)}
                        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-white text-sm font-semibold truncate">{tx.passengerName}</p>
                          <p className="text-white/40 text-xs mt-0.5 truncate">{tx.from} → {tx.to}</p>
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                          <p className={`font-bold ${methodDisplay.color}`}>₱{tx.finalAmount.toFixed(2)}</p>
                          <svg className={`w-4 h-4 text-white/30 transition-transform ${expandedId === tx.transactionId ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                        </div>
                      </button>

                      {expandedId === tx.transactionId && (
                        <div className="bg-white/5 p-4 border-t border-dashed border-white/10 text-xs space-y-1.5">
                          <div className="flex justify-between"><span className="text-gray-400">Txn ID:</span><span className="text-white">{tx.transactionId}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Payment:</span><span className={`font-bold ${methodDisplay.color}`}>{methodDisplay.label}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Distance:</span><span className="text-white">{tx.distance} km</span></div>
                          <div className="flex justify-between font-bold text-base text-[#62A0EA] border-t border-white/10 pt-2 mt-1"><span>Total:</span><span>₱{tx.finalAmount.toFixed(2)}</span></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {filteredHistory.length > 0 && (
              <div className="flex items-center justify-between bg-[#62A0EA]/10 border border-[#62A0EA]/20 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-semibold text-[#62A0EA]/60 uppercase tracking-wider">Filtered Total</p>
                <p className="text-lg font-extrabold text-[#62A0EA]">₱{filteredTotal.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
