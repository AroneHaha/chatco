"use client";

import { useState } from "react";

type ExpenseCategory = "FUEL" | "MAINTENANCE" | "MISC";

interface LogExpenseModalProps { isOpen: boolean; onClose: () => void; }

export default function LogExpenseModal({ isOpen, onClose }: LogExpenseModalProps) {
  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); console.log({ category, description, amount: parseFloat(amount) }); onClose(); };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center pointer-events-auto" onClick={onClose}>
      <div className="bg-[#050F1A] border border-white/10 rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:max-w-md md:mx-4 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-xl font-extrabold text-white">Log Expense</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 pt-5 space-y-5 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-3">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ val: "FUEL" as const, label: "⛽ Fuel" }, { val: "MAINTENANCE" as const, label: "🔧 Maint." }, { val: "MISC" as const, label: "📝 Misc" }].map((cat) => (<button key={cat.val} type="button" onClick={() => setCategory(cat.val)} className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${category === cat.val ? "bg-[#1A5FB4] text-white border-[#1A5FB4] shadow-md shadow-blue-500/20" : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"}`}>{cat.label}</button>))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-2">Description</label>
            <input type="text" placeholder="e.g., Partial Gas Fill-up" value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#1A5FB4] focus:ring-1 focus:ring-[#1A5FB4]/50 transition-colors" />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-2">Amount (₱)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-bold">₱</span>
              <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-lg font-extrabold text-white placeholder-white/20 focus:outline-none focus:border-[#1A5FB4] focus:ring-1 focus:ring-[#1A5FB4]/50 transition-colors" />
            </div>
          </div>
        </form>
        <div className="p-6 pt-2 border-t border-white/10 mt-auto flex-shrink-0">
          <button type="submit" onClick={handleSubmit} disabled={!category || !amount} className="w-full bg-[#1A5FB4] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[#165a9f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            Save Expense
          </button>
        </div>
      </div>
    </div>
  );
}