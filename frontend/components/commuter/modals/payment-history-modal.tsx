"use client";

import { useState } from "react";

// --- BACKEND CONTEXT & TYPES ---
// Maps to: Transaction.TransactionID, Transaction.FinalAmount, Transaction.CreatedAt
// Route name would be derived from Route.RouteName based on ShiftID/RouteID

interface MockTransaction {
  transactionId: string; // Transaction.TransactionID
  route: string;         // Derived from Route table
  amount: number;        // Transaction.FinalAmount
  date: string;          // Transaction.CreatedAt
  paymentMethod: string; // Transaction.PaymentMethod
}

// Mock Data: Simulates fetching GET /api/commuter/transactions?method=wallet
const MOCK_HISTORY: MockTransaction[] = [
  { transactionId: "TXN-88291", route: "Marilao to Calumpit", amount: 28.00, date: "2026-04-06T14:20:00Z", paymentMethod: "Wallet_Scanned" },
  { transactionId: "TXN-88105", route: "Bocaue to Malolos", amount: 16.00, date: "2026-04-06T08:15:00Z", paymentMethod: "Wallet_Prepay" },
  { transactionId: "TXN-87920", route: "Tikay to Marilao", amount: 13.00, date: "2026-04-05T17:45:00Z", paymentMethod: "Wallet_Scanned" },
  { transactionId: "TXN-87412", route: "Calumpit to Balagtas", amount: 22.00, date: "2026-04-05T09:30:00Z", paymentMethod: "Wallet_Prepay" },
  { transactionId: "TXN-86100", route: "Malolos to Meycauayan", amount: 34.00, date: "2026-04-04T16:00:00Z", paymentMethod: "Wallet_Scanned" },
];

interface PaymentHistoryModalProps {
  onClose: () => void;
}

export default function PaymentHistoryModal({ onClose }: PaymentHistoryModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'scanned' | 'prepay'>('all');

  // Simulate filtering based on PaymentMethod enum from ERD
  const filteredHistory = MOCK_HISTORY.filter(tx => {
    if (selectedFilter === 'scanned') return tx.paymentMethod === 'Wallet_Scanned';
    if (selectedFilter === 'prepay') return tx.paymentMethod === 'Wallet_Prepay';
    return true;
  });

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Card - Made taller to look like a sub-page */}
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-slide-in-from-bottom duration-300 flex flex-col pb-safe" style={{ maxHeight: '85vh' }}>
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#071A2E]">Payment History</h2>
            <p className="text-xs text-gray-500 mt-0.5">CHATCO Wallet Transactions</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex-shrink-0 flex gap-2 px-5 pt-4 pb-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'scanned', label: 'Scanned' },
            { key: 'prepay', label: 'Prepaid' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedFilter(tab.key as typeof selectedFilter)}
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
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
              <p className="text-gray-400 font-medium text-sm">No transactions found</p>
            </div>
          ) : (
            <div className="mt-3 space-y-1">
              {filteredHistory.map((tx) => {
                const { date, time } = formatDateTime(tx.date);
                return (
                  <div key={tx.transactionId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                    
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#1A5FB4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H21M3.375 14.25h.008M21 12.75H3.375m0 0V6.375c0-.621.504-1.125 1.125-1.125h12.75c.621 0 1.125.504 1.125 1.125v7.875" />
                      </svg>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#071A2E] truncate">{tx.route}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400">{date}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-[11px] text-gray-400">{time}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#071A2E]">- ₱{tx.amount.toFixed(2)}</p>
                      <p className="text-[10px] text-[#1A5FB4] font-medium">
                        {tx.paymentMethod === 'Wallet_Scanned' ? 'QR Scanned' : 'Prepaid'}
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