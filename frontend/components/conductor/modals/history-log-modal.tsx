"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/admin/ui/modal";

interface HistoryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Frontend-only Interface & Mock Data
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
  paymentMethod: 'CHATCO Wallet' | 'GCash';
  conductorName: string;
  unitNumber: string;
  driverName: string;
  timestamp: number;
}

const MOCK_HISTORY: Transaction[] = [
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
    paymentMethod: "CHATCO Wallet",
    conductorName: "Mark",
    unitNumber: "RIZ 2024",
    driverName: "Ramon",
    timestamp: new Date().getTime() - 3600000 // 1 hour ago
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
    paymentMethod: "GCash",
    conductorName: "Mark",
    unitNumber: "RIZ 2024",
    driverName: "Ramon",
    timestamp: new Date().getTime() - 7200000 // 2 hours ago
  }
];

export default function HistoryLogModal({ isOpen, onClose }: HistoryLogModalProps) {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Replaced getTransactionHistory() with mock data
      setHistory(MOCK_HISTORY);
    }
  }, [isOpen]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 p-2 max-h-[70vh] flex flex-col">
        <h2 className="text-xl font-bold text-white">Transaction History</h2>
        
        {history.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm py-10">
            No transactions yet.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {history.map((tx) => (
              <div key={tx.id} className="border border-white/10 rounded-xl overflow-hidden">
                {/* Collapsed View */}
                <button 
                  onClick={() => toggleExpand(tx.id)} 
                  className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left"
                >
                  <div>
                    <p className="text-white text-sm font-semibold">{tx.passengerName}</p>
                    <p className="text-white/40 text-xs">{new Date(tx.timestamp).toLocaleDateString()} • {tx.from} → {tx.to}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#62A0EA] font-bold">₱{tx.totalAmount.toFixed(2)}</p>
                    <svg className={`w-4 h-4 text-white/30 mx-auto transition-transform ${expandedId === tx.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                </button>

                {/* Expanded Receipt View */}
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
                      <div className="flex justify-between"><span className="text-gray-400">Method:</span><span className="text-white">{tx.paymentMethod}</span></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}