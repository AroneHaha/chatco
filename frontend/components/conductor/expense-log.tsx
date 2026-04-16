"use client";

import { useState } from "react";
import LogExpenseModal from "@/components/conductor/modals/log-expense-modal";

type ExpenseCategory = "FUEL" | "MAINTENANCE" | "MISC";

interface ExpenseEntry { id: string; time: string; description: string; category: ExpenseCategory; amount: number; }

const mockExpenses: ExpenseEntry[] = [
  { id: "e_001", time: "08:15 AM", description: "Partial Gasoline Fill-up", category: "FUEL", amount: 500.0 },
  { id: "e_002", time: "10:30 AM", description: "Oil change (2T Oil)", category: "MAINTENANCE", amount: 150.0 },
  { id: "e_003", time: "01:45 PM", description: "Terminal Parking Fee", category: "MISC", amount: 50.0 },
  { id: "e_004", time: "04:20 PM", description: "Top-up Gasoline", category: "FUEL", amount: 300.0 },
  { id: "e_005", time: "05:10 PM", description: "Washer fluid", category: "MAINTENANCE", amount: 45.0 },
];

export default function ExpenseLog() {
  const [activeFilter, setActiveFilter] = useState<"ALL" | ExpenseCategory>("ALL");
  const [showModal, setShowModal] = useState(false);
  
  const totalExpenses = mockExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const filteredExpenses = activeFilter === "ALL" ? mockExpenses : mockExpenses.filter((e) => e.category === activeFilter);
  
  const getStyles = (c: ExpenseCategory) => c === "FUEL" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : c === "MAINTENANCE" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30";
  const getIcon = (c: ExpenseCategory) => c === "FUEL" ? "⛽" : c === "MAINTENANCE" ? "🔧" : "📝";

  return (
    <div className="h-full w-full bg-gray-100 flex flex-col overflow-hidden relative">
      <div className="md:hidden h-full flex flex-col">
        <div className="sticky top-0 z-20 bg-[#050F1A]/95 backdrop-blur-xl border-b border-white/10 p-4 shadow-lg flex-shrink-0">
          <div className="flex justify-between items-start mb-3">
            <div><h1 className="text-xl font-extrabold text-white">Shift Expenses</h1><p className="text-xs text-white/40 mt-0.5">Operational costs deducted</p></div>
            <div className="bg-red-500/15 rounded-xl p-3 text-center border border-red-500/20"><p className="text-lg font-extrabold text-red-400">-₱{totalExpenses.toFixed(0)}</p><p className="text-[9px] font-semibold text-red-400/60 uppercase">Total Spent</p></div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">{["ALL", "FUEL", "MAINTENANCE", "MISC"].map((f) => (<button key={f} onClick={() => setActiveFilter(f as any)} className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors border ${activeFilter === f ? "bg-[#1A5FB4] text-white border-[#1A5FB4]" : "bg-white/5 text-white/50 border-white/10"}`}>{f}</button>))}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-3">
          {filteredExpenses.map((e) => (
            <div key={e.id} className="bg-[#050F1A] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg border border-white/5">{getIcon(e.category)}</div><div><p className="font-bold text-white text-sm">{e.description}</p><div className="flex items-center gap-2 mt-1"><p className="text-[11px] text-white/40">{e.time}</p><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${getStyles(e.category)}`}>{e.category}</span></div></div></div>
              <p className="font-extrabold text-red-400 text-sm">-₱{e.amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="absolute bottom-24 right-6 z-30"><button onClick={() => setShowModal(true)} className="w-14 h-14 rounded-2xl bg-[#1A5FB4] flex items-center justify-center shadow-xl shadow-blue-500/30 border-4 border-gray-100"><svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg></button></div>
      </div>
      <div className="hidden md:flex h-full w-full flex-col overflow-hidden">
        <div className="flex-shrink-0 w-full max-w-5xl mx-auto pt-8 px-8">
          <div className="bg-[#050F1A] rounded-2xl border border-white/10 shadow-xl p-6">
            <div className="flex justify-between items-center mb-5">
              <div><h1 className="text-3xl font-extrabold text-white tracking-tight">Expense Log</h1><p className="text-sm text-white/40 mt-1">Track operational costs for the current shift.</p></div>
              <div className="flex items-center gap-6">
                <div className="bg-red-500/15 rounded-xl p-4 text-center border border-red-500/20"><p className="text-2xl font-extrabold text-red-400">-₱{totalExpenses.toFixed(0)}</p><p className="text-[10px] font-semibold text-red-400/60 uppercase mt-1">Total Spent</p></div>
                <button onClick={() => setShowModal(true)} className="bg-[#1A5FB4] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[#165a9f] transition-colors flex items-center gap-2 h-fit"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Log New</button>
              </div>
            </div>
            <div className="flex gap-2">{["ALL", "FUEL", "MAINTENANCE", "MISC"].map((f) => (<button key={f} onClick={() => setActiveFilter(f as any)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeFilter === f ? "bg-[#1A5FB4] text-white" : "bg-white/5 text-white/50"}`}>{f}</button>))}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 pt-6"><div className="w-full max-w-5xl mx-auto grid grid-cols-2 gap-4 pb-8">{filteredExpenses.map((e) => (<div key={e.id} className="bg-[#050F1A] border border-white/10 rounded-2xl p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg border border-white/5">{getIcon(e.category)}</div><div><p className="font-bold text-white text-sm">{e.description}</p><div className="flex items-center gap-2 mt-1"><p className="text-[11px] text-white/40">{e.time}</p><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${getStyles(e.category)}`}>{e.category}</span></div></div></div><p className="font-extrabold text-red-400 text-sm">-₱{e.amount.toFixed(2)}</p></div>))}</div></div>
      </div>
      <LogExpenseModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}