// app/(admin)/settings/financial-rules/page.tsx
'use client';

import { useState } from 'react';
import BackButton from '@/components/admin/ui/back-button';
import { Save } from 'lucide-react';
import { defaultFinancialRules, type FinancialRulesConfig } from '@/app/(admin)/settings/data/settings-data';

export default function FinancialRulesPage() {
  const [rules, setRules] = useState<FinancialRulesConfig>({ ...defaultFinancialRules });
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRules(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        {/* Left-aligned Back Button */}
        <div className="pt-2">
          <BackButton href="/settings" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Financial Rules</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {/* Wallet Limits */}
          <div className="bg-[#131C2E] border border-[#1E2D45] p-4 sm:p-6 rounded-lg">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Wallet Load Limits</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Minimum Load (₱)</label>
                <input
                  type="number"
                  name="minLoad"
                  value={rules.minLoad}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Maximum Load (₱)</label>
                <input
                  type="number"
                  name="maxLoad"
                  value={rules.maxLoad}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Commuter Discounts */}
          <div className="bg-[#131C2E] border border-[#1E2D45] p-4 sm:p-6 rounded-lg">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Commuter Discount Rates (%)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Regular</label>
                <input
                  type="number"
                  name="regularDiscount"
                  value={rules.regularDiscount}
                  onChange={handleChange}
                  readOnly
                  className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Student</label>
                <input
                  type="number"
                  name="studentDiscount"
                  value={rules.studentDiscount}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Senior Citizen</label>
                <input
                  type="number"
                  name="seniorDiscount"
                  value={rules.seniorDiscount}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">PWD</label>
                <input
                  type="number"
                  name="pwdDiscount"
                  value={rules.pwdDiscount}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Loyalty Program */}
          <div className="bg-[#131C2E] border border-[#1E2D45] p-4 sm:p-6 rounded-lg">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Loyalty Program (Rewards)</h2>
            <div className="max-w-sm w-full">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Paid rides required for 1 Free Ride</label>
              <input
                type="number"
                name="ridesForFreeReward"
                value={rules.ridesForFreeReward}
                onChange={handleChange}
                required
                className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors"
              />
            </div>
          </div>

          {/* Mobile-Friendly Save Button */}
          <div className="flex justify-center pt-2 pb-8">
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#62A0EA] text-white font-medium rounded-lg hover:bg-[#4A8BD4] transition-colors active:scale-95"
            >
              <Save size={18} />
              <span>{isSaved ? 'Changes Saved!' : 'Save Rules'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
