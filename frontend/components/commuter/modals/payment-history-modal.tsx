"use client";

import { useState, useEffect } from "react";
import {
  getPaymentHistory,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getPaymentStatusColor,
  type GCashPaymentIntent,
  type PaymentMethod,
} from "@/lib/gcash-payment";
import { getPointByNumber } from "@/lib/fare-matrix-data";

interface PaymentHistoryModalProps {
  onClose: () => void;
}

export default function PaymentHistoryModal({ onClose }: PaymentHistoryModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "gcash" | "cash">("all");
  const [history, setHistory] = useState<GCashPaymentIntent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getPaymentHistory("c_001").then((data) => {
      setHistory(data);
      setIsLoading(false);
    });
  }, []);

  const filteredHistory = history.filter((tx) => {
    if (selectedFilter === "gcash")
      return tx.paymentMethod === "GCash_Scanned" || tx.paymentMethod === "GCash_Direct";
    if (selectedFilter === "cash") return tx.paymentMethod === "Cash";
    return true;
  });

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const getRouteLabel = (tx: GCashPaymentIntent) => {
    const pickup = getPointByNumber(tx.pickupPoint);
    const dropoff = getPointByNumber(tx.dropoffPoint);
    return `${pickup?.name || "Point " + tx.pickupPoint} → ${dropoff?.name || "Point " + tx.dropoffPoint}`;
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
            <h2 className="text-lg font-bold text-[#071A2E]">
              Payment History
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cashless Fare Transactions
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex-shrink-0 flex gap-2 px-5 pt-4 pb-2">
          {[
            { key: "all", label: "All" },
            { key: "gcash", label: "GCash" },
            { key: "cash", label: "Cash" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setSelectedFilter(tab.key as typeof selectedFilter)
              }
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedFilter === tab.key
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
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg
                className="w-16 h-16 text-gray-200 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
              <p className="text-gray-400 font-medium text-sm">
                No transactions found
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-1">
              {filteredHistory.map((tx) => {
                const { date, time } = formatDateTime(tx.createdAt);
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-[#1A5FB4]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
                        />
                      </svg>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#071A2E] truncate">
                        {getRouteLabel(tx)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400">
                          {date}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-[11px] text-gray-400">
                          {time}
                        </span>
                      </div>
                    </div>

                    {/* Amount & Status */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#071A2E]">
                        - ₱{tx.amount.toFixed(2)}
                      </p>
                      <p
                        className={`text-[10px] font-medium ${getPaymentStatusColor(tx.status)}`}
                      >
                        {getPaymentMethodLabel(tx.paymentMethod as PaymentMethod)}
                        {tx.status !== "paid" &&
                          ` · ${getPaymentStatusLabel(tx.status)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}