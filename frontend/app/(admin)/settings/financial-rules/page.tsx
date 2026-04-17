// app/(admin)/settings/financial-rules/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Save } from 'lucide-react';

export default function FinancialRulesPage() {
  const [rules, setRules] = useState({
    minLoad: '20',
    maxLoad: '1000',
    ridesForFreeReward: '10',
    regularDiscount: '0',
    studentDiscount: '20',
    seniorDiscount: '20',
    pwdDiscount: '20',
  });

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
    <>
      <h1 className="text-3xl font-bold text-white mb-6">Financial Rules</h1>
      
      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        
        {/* Wallet Limits */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Wallet Load Limits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Minimum Load (₱)</label>
              <input type="number" name="minLoad" value={rules.minLoad} onChange={handleChange} required className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Maximum Load (₱)</label>
              <input type="number" name="maxLoad" value={rules.maxLoad} onChange={handleChange} required className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500" />
            </div>
          </div>
        </GlassCard>

        {/* Commuter Discounts */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Commuter Discount Rates (%)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Regular</label>
              <input type="number" name="regularDiscount" value={rules.regularDiscount} onChange={handleChange} readOnly className="block w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-gray-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Student</label>
              <input type="number" name="studentDiscount" value={rules.studentDiscount} onChange={handleChange} required className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Senior Citizen</label>
              <input type="number" name="seniorDiscount" value={rules.seniorDiscount} onChange={handleChange} required className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">PWD</label>
              <input type="number" name="pwdDiscount" value={rules.pwdDiscount} onChange={handleChange} required className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500" />
            </div>
          </div>
        </GlassCard>

        {/* Loyalty Program */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Loyalty Program (Rewards)</h2>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-300 mb-1">Paid rides required for 1 Free Ride</label>
            <input type="number" name="ridesForFreeReward" value={rules.ridesForFreeReward} onChange={handleChange} required className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500" />
          </div>
        </GlassCard>

        <button type="submit" className="flex items-center space-x-2 px-6 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">
          <Save size={18} />
          <span>{isSaved ? 'Changes Saved!' : 'Save Rules'}</span>
        </button>
      </form>
    </>
  );
}