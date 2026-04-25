// app/(admin)/settings/financial-rules/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import BackButton from '@/components/admin/ui/back-button';
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
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        
        {/* Centered Back Button */}
        <div className="flex justify-center pt-2">
          <BackButton href="/settings" />
        </div>

        {/* Centered Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Financial Rules</h1>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Wallet Limits */}
          <GlassCard className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Wallet Load Limits</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Minimum Load (₱)</label>
                <input 
                  type="number" 
                  name="minLoad" 
                  value={rules.minLoad} 
                  onChange={handleChange} 
                  required 
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Maximum Load (₱)</label>
                <input 
                  type="number" 
                  name="maxLoad" 
                  value={rules.maxLoad} 
                  onChange={handleChange} 
                  required 
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                />
              </div>
            </div>
          </GlassCard>

          {/* Commuter Discounts */}
          <GlassCard className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Commuter Discount Rates (%)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Regular</label>
                <input 
                  type="number" 
                  name="regularDiscount" 
                  value={rules.regularDiscount} 
                  onChange={handleChange} 
                  readOnly 
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-500 cursor-not-allowed" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Student</label>
                <input 
                  type="number" 
                  name="studentDiscount" 
                  value={rules.studentDiscount} 
                  onChange={handleChange} 
                  required 
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Senior Citizen</label>
                <input 
                  type="number" 
                  name="seniorDiscount" 
                  value={rules.seniorDiscount} 
                  onChange={handleChange} 
                  required 
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">PWD</label>
                <input 
                  type="number" 
                  name="pwdDiscount" 
                  value={rules.pwdDiscount} 
                  onChange={handleChange} 
                  required 
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                />
              </div>
            </div>
          </GlassCard>

          {/* Loyalty Program */}
          <GlassCard className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Loyalty Program (Rewards)</h2>
            <div className="max-w-sm w-full">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Paid rides required for 1 Free Ride</label>
              <input 
                type="number" 
                name="ridesForFreeReward" 
                value={rules.ridesForFreeReward} 
                onChange={handleChange} 
                required 
                className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
              />
            </div>
          </GlassCard>

          {/* Centered Save Button */}
          <div className="flex justify-center pt-2 pb-8">
            <button 
              type="submit" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors active:scale-95"
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