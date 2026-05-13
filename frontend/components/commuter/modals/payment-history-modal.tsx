"use client";

import { useState, useEffect } from "react";
import {
  getPaymentHistory,
  getPaymentMethodLabel,
  type GCashPaymentIntent,
  type PaymentMethod,
} from "@/lib/gcash-payment";
import { getPointByNumber } from "@/lib/fare-matrix-data";

interface PaymentHistoryModalProps {
  onClose: () => void;
}

type TimeFilter = "all" | "today" | "week" | "month";

// ─── Status Badge Helper (safe fallback) ────────────────────────────
function getStatusBadge(status: string) {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    paid: { bg: "bg-green-50", text: "text-green-600", label: "Paid" },
    pending: { bg: "bg-yellow-50", text: "text-yellow-600", label: "Pending" },
    processing: { bg: "bg-blue-50", text: "text-blue-600", label: "Processing" },
    failed: { bg: "bg-red-50", text: "text-red-600", label: "Failed" },
  };
  return (
    badges[status] ?? { bg: "bg-gray-50", text: "text-gray-600", label: status }
  );
}

// ─── Mock Data Seeder ───────────────────────────────────────────────
const MOCK_RIDES: GCashPaymentIntent[] = [
  {
    id: "PAY-20260514-A1B2C",
    amount: 18, amountInCentavos: 1800, currency: "PHP",
    status: "paid", paymentMethod: "GCash_Scanned",
    commuterId: "c_001", commuterName: "Arone Dela Cruz",
    pickupPoint: 1, dropoffPoint: 3,
    conductorId: "cond_01", vehicleId: "JEEP-001", shiftId: "SH-001",
    createdAt: "2026-05-14T08:15:00Z", updatedAt: "2026-05-14T08:15:30Z",
  },
  {
    id: "PAY-20260513-D4E5F",
    amount: 22, amountInCentavos: 2200, currency: "PHP",
    status: "paid", paymentMethod: "GCash_Scanned",
    commuterId: "c_001", commuterName: "Arone Dela Cruz",
    pickupPoint: 1, dropoffPoint: 7,
    conductorId: "cond_02", vehicleId: "JEEP-003", shiftId: "SH-002",
    createdAt: "2026-05-13T17:30:00Z", updatedAt: "2026-05-13T17:30:30Z",
  },
  {
    id: "PAY-20260512-G7H8I",
    amount: 20, amountInCentavos: 2000, currency: "PHP",
    status: "paid", paymentMethod: "GCash_Direct",
    commuterId: "c_001", commuterName: "Arone Dela Cruz",
    pickupPoint: 3, dropoffPoint: 9,
    conductorId: "cond_01", vehicleId: "JEEP-001", shiftId: "SH-003",
    createdAt: "2026-05-12T09:45:00Z", updatedAt: "2026-05-12T09:45:30Z",
  },
  {
    id: "PAY-20260511-J9K0L",
    amount: 18, amountInCentavos: 1800, currency: "PHP",
    status: "paid", paymentMethod: "GCash_Scanned",
    commuterId: "c_001", commuterName: "Arone Dela Cruz",
    pickupPoint: 5, dropoffPoint: 8,
    conductorId: "cond_03", vehicleId: "JEEP-005", shiftId: "SH-004",
    createdAt: "2026-05-11T07:20:00Z", updatedAt: "2026-05-11T07:20:30Z",
  },
  {
    id: "PAY-20260510-M1N2O",
    amount: 24, amountInCentavos: 2400, currency: "PHP",
    status: "paid", paymentMethod: "GCash_Scanned",
    commuterId: "c_001", commuterName: "Arone Dela Cruz",
    pickupPoint: 1, dropoffPoint: 10,
    conductorId: "cond_02", vehicleId: "JEEP-003", shiftId: "SH-005",
    createdAt: "2026-05-10T18:00:00Z", updatedAt: "2026-05-10T18:00:30Z",
  },
  {
    id: "PAY-20260509-P3Q4R",
    amount: 20, amountInCentavos: 2000, currency: "PHP",
    status: "paid", paymentMethod: "GCash_Direct",
    commuterId: "c_001", commuterName: "Arone Dela Cruz",
    pickupPoint: 2, dropoffPoint: 7,
    conductorId: "cond_01", vehicleId: "JEEP-001", shiftId: "SH-006",
    createdAt: "2026-05-09T08:30:00Z", updatedAt: "2026-05-09T08:30:30Z",
  },
  {
    id: "PAY-20260508-S5T6U",
    amount: 22, amountInCentavos: 2200, currency: "PHP",
    status: "paid", paymentMethod: "GCash_Scanned",
    commuterId: "c_001", commuterName: "Arone Dela Cruz",
    pickupPoint: 4, dropoffPoint: 11,
    conductorId: "cond_03", vehicleId: "JEEP-005", shiftId: "SH-007",
    createdAt: "2026-05-08T16:45:00Z", updatedAt: "2026-05-08T16:45:30Z",
  },
  {
    id: "PAY-20260507-V7W8X",
    amount: 18, amountInCentavos: 1800, currency: "PHP",
    status: "paid", paymentMethod: "GCash_Scanned",
    commuterId: "c_001", commuterName: "Arone Dela Cruz",
    pickupPoint: 1, dropoffPoint: 4,
    conductorId: "cond_02", vehicleId: "JEEP-003", shiftId: "SH-008",
    createdAt: "2026-05-07T07:10:00Z", updatedAt: "2026-05-07T07:10:30Z",
  },
  {
    id: "PAY-20260506-Y9Z0A",
    amount: 26, amountInCentavos: 2600, currency: "PHP",
    status: "paid", paymentMethod: "GCash_Direct",
    commuterId: "c_001", commuterName: "Arone Dela Cruz",
    pickupPoint: 1, dropoffPoint: 12,
    conductorId: "cond_01", vehicleId: "JEEP-001", shiftId: "SH-009",
    createdAt: "2026-05-06T19:15:00Z", updatedAt: "2026-05-06T19:15:30Z",
  },
  {
    id: "PAY-20260505-B1C2D",
    amount: 20, amountInCentavos: 2000, currency: "PHP",
    status: "paid", paymentMethod: "GCash_Scanned",
    commuterId: "c_001", commuterName: "Arone Dela Cruz",
    pickupPoint: 6, dropoffPoint: 10,
    conductorId: "cond_03", vehicleId: "JEEP-005", shiftId: "SH-010",
    createdAt: "2026-05-05T09:00:00Z", updatedAt: "2026-05-05T09:00:30Z",
  },
];

function seedMockData(): GCashPaymentIntent[] {
  if (typeof window === "undefined") return [];
  const key = "chatco_mock_seeded";
  if (localStorage.getItem(key)) {
    // Already seeded — just return stored history
    const raw = localStorage.getItem("chatco_payment_history");
    if (raw) {
      try { return JSON.parse(raw); } catch { /* fallthrough */ }
    }
  }
  // Merge mock data into existing history
  const existing: GCashPaymentIntent[] = (() => {
    const raw = localStorage.getItem("chatco_payment_history");
    if (raw) { try { return JSON.parse(raw); } catch { return []; } }
    return [];
  })();
  const existingIds = new Set(existing.map((t) => t.id));
  const merged = [...MOCK_RIDES.filter((m) => !existingIds.has(m.id)), ...existing];
  localStorage.setItem("chatco_payment_history", JSON.stringify(merged));
  localStorage.setItem(key, "1");
  return merged;
}

export default function PaymentHistoryModal({ onClose }: PaymentHistoryModalProps) {
  const [history, setHistory] = useState<GCashPaymentIntent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // Seed mock data first, then load from service
    seedMockData();
    getPaymentHistory("c_001").then((data) => {
      // Only show GCash transactions (no cash)
      const gcashOnly = data.filter(
        (tx) => tx.paymentMethod === "GCash_Scanned" || tx.paymentMethod === "GCash_Direct"
      );
      setHistory(gcashOnly);
      setIsLoading(false);
    });
  }, []);

  const filteredHistory = history.filter((tx) => {
    if (timeFilter === "all") return true;
    const txDate = new Date(tx.createdAt);
    const now = new Date();
    if (timeFilter === "today") {
      return txDate.toDateString() === now.toDateString();
    }
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

  // Summary stats
  const totalSpent = filteredHistory.reduce((s, tx) => s + tx.amount, 0);
  const rideCount = filteredHistory.length;
  const avgFare = rideCount > 0 ? totalSpent / rideCount : 0;

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
      time: date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }),
    };
  };

  const getRouteLabel = (tx: GCashPaymentIntent) => {
    const pickup = getPointByNumber(tx.pickupPoint);
    const dropoff = getPointByNumber(tx.dropoffPoint);
    return `${pickup?.name || "Point " + tx.pickupPoint} → ${dropoff?.name || "Point " + tx.dropoffPoint}`;
  };

  const getPointName = (num: number) => {
    const pt = getPointByNumber(num);
    return pt?.name || "Point " + num;
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
            <p className="text-xs text-gray-500 mt-0.5">GCash Transactions</p>
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
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p className="text-gray-400 font-medium text-sm">No GCash transactions found</p>
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
                    {/* Collapsed Row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                      className="w-full flex items-center gap-3 p-3 text-left"
                    >
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#1A5FB4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                        </svg>
                      </div>

                      {/* Route & Time */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#071A2E] truncate">
                          {getRouteLabel(tx)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-400">{date}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="text-[11px] text-gray-400">{time}</span>
                        </div>
                      </div>

                      {/* Amount & Badge */}
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                        <p className="text-sm font-bold text-[#071A2E]">
                          - ₱{tx.amount.toFixed(2)}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Expand Chevron */}
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Pickup</span>
                            <span className="font-medium text-[#071A2E]">{getPointName(tx.pickupPoint)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Drop-off</span>
                            <span className="font-medium text-[#071A2E]">{getPointName(tx.dropoffPoint)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Payment</span>
                            <span className="font-medium text-[#071A2E]">{getPaymentMethodLabel(tx.paymentMethod as PaymentMethod)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Ref ID</span>
                            <span className="font-mono text-[#071A2E]">{tx.id}</span>
                          </div>
                          {tx.conductorId && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Conductor</span>
                              <span className="font-medium text-[#071A2E]">{tx.conductorId}</span>
                            </div>
                          )}
                          {tx.vehicleId && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Vehicle</span>
                              <span className="font-medium text-[#071A2E]">{tx.vehicleId}</span>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
