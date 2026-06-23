"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchPaymentHistory,
  type CommuterPayment,
  type PaymentStatus,
} from "@/lib/commuter/services/payment.service";

interface PaymentHistoryModalProps {
  onClose: () => void;
}

type TimeFilter = "all" | "today" | "week" | "month";

const PER_PAGE = 20;

// ─── Status badge (covers the full PaymentStatus lifecycle) ──────────
function getStatusBadge(status: PaymentStatus) {
  const badges: Record<PaymentStatus, { bg: string; text: string; label: string }> = {
    paid: { bg: "bg-green-50", text: "text-green-600", label: "Paid" },
    pending: { bg: "bg-yellow-50", text: "text-yellow-600", label: "Pending" },
    processing: { bg: "bg-blue-50", text: "text-blue-600", label: "Processing" },
    failed: { bg: "bg-red-50", text: "text-red-600", label: "Failed" },
    cancelled: { bg: "bg-gray-100", text: "text-gray-500", label: "Cancelled" },
    expired: { bg: "bg-gray-100", text: "text-gray-500", label: "Expired" },
    refunded: { bg: "bg-purple-50", text: "text-purple-600", label: "Refunded" },
  };
  return badges[status] ?? { bg: "bg-gray-50", text: "text-gray-600", label: status };
}

export default function PaymentHistoryModal({ onClose }: PaymentHistoryModalProps) {
  const [history, setHistory] = useState<CommuterPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadPage = useCallback(async (target: number) => {
    target === 1 ? setIsLoading(true) : setIsLoadingMore(true);
    setError(null);
    try {
      const result = await fetchPaymentHistory(target, PER_PAGE);
      setHistory((prev) => (target === 1 ? result.items : [...prev, ...result.items]));
      setPage(result.page);
      setLastPage(result.lastPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payment history.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  const filteredHistory = history.filter((tx) => {
    if (timeFilter === "all") return true;
    const txDate = new Date(tx.createdAt);
    const now = new Date();
    if (timeFilter === "today") return txDate.toDateString() === now.toDateString();
    if (timeFilter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return txDate >= weekAgo;
    }
    if (timeFilter === "month") {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Stats over the loaded + filtered set (only PAID counts toward spend).
  const paid = filteredHistory.filter((tx) => tx.status === "paid");
  const totalSpent = paid.reduce((s, tx) => s + tx.amount, 0);
  const rideCount = paid.length;
  const avgFare = rideCount > 0 ? totalSpent / rideCount : 0;
  const hasMore = page < lastPage;

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
      time: date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }),
    };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col pb-safe"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#071A2E]">Payment History</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your ride payments</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="flex-shrink-0 grid grid-cols-3 gap-2 px-5 pt-4 pb-2">
          <div className="bg-[#F0F7FF] rounded-xl p-3 text-center">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Spent</p>
            <p className="text-sm font-bold text-[#071A2E] mt-0.5">₱{totalSpent.toFixed(0)}</p>
          </div>
          <div className="bg-[#F0F7FF] rounded-xl p-3 text-center">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Rides</p>
            <p className="text-sm font-bold text-[#071A2E] mt-0.5">{rideCount}</p>
          </div>
          <div className="bg-[#F0F7FF] rounded-xl p-3 text-center">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Avg Fare</p>
            <p className="text-sm font-bold text-[#071A2E] mt-0.5">₱{avgFare.toFixed(0)}</p>
          </div>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex-shrink-0 flex gap-2 px-5 pt-2 pb-3">
          {([
            { key: "all" as TimeFilter, label: "All" },
            { key: "today" as TimeFilter, label: "Today" },
            { key: "week" as TimeFilter, label: "This Week" },
            { key: "month" as TimeFilter, label: "This Month" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTimeFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                timeFilter === tab.key
                  ? "bg-[#1A5FB4] text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#1A5FB4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-red-500 font-medium text-sm mb-3">{error}</p>
              <button
                onClick={() => loadPage(1)}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-[#1A5FB4] text-white"
              >
                Try again
              </button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p className="text-gray-400 font-medium text-sm">No transactions found</p>
            </div>
          ) : (
            <div className="mt-1 space-y-2">
              {filteredHistory.map((tx) => {
                const { date, time } = formatDateTime(tx.createdAt);
                const badge = getStatusBadge(tx.status);
                const isExpanded = expandedId === tx.id;

                return (
                  <div
                    key={tx.id}
                    className={`rounded-xl border transition-colors ${
                      isExpanded ? "border-[#1A5FB4]/20 bg-[#F0F7FF]/50" : "border-gray-100 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                      className="w-full flex items-center gap-3 p-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#1A5FB4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#071A2E] truncate">
                          {tx.pickupName} → {tx.dropoffName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-400">{date}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="text-[11px] text-gray-400">{time}</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                        <p className="text-sm font-bold text-[#071A2E]">- ₱{tx.amount.toFixed(2)}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>

                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Pickup</span>
                            <span className="font-medium text-[#071A2E]">{tx.pickupName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Drop-off</span>
                            <span className="font-medium text-[#071A2E]">{tx.dropoffName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Payment</span>
                            <span className="font-medium text-[#071A2E]">{tx.method}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Ref ID</span>
                            <span className="font-mono text-[#071A2E]">{tx.id}</span>
                          </div>
                          {tx.conductorName && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Conductor</span>
                              <span className="font-medium text-[#071A2E]">{tx.conductorName}</span>
                            </div>
                          )}
                          {tx.unitNumber && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Unit</span>
                              <span className="font-medium text-[#071A2E]">{tx.unitNumber}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-400">Fare</span>
                            <span className="font-bold text-[#071A2E]">₱{tx.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {hasMore && (
                <button
                  onClick={() => loadPage(page + 1)}
                  disabled={isLoadingMore}
                  className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-60"
                >
                  {isLoadingMore ? "Loading…" : "Load more"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
