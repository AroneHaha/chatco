// app/(admin)/settings/financial-rules/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { defaultFinancialRules, type FinancialRulesConfig } from '@/app/(admin)/settings/data/settings-data';
import { getSettings, updateSetting } from '@/lib/admin/services/setting.service';

export default function FinancialRulesPage() {
  const [rules, setRules] = useState<FinancialRulesConfig>({ ...defaultFinancialRules });
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch saved settings from API on mount
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSettings('financial');
      // Map DB keys → form field names. DB keys use snake_case.
      setRules({
        ridesForFreeReward: data.rides_for_free_reward ?? defaultFinancialRules.ridesForFreeReward,
        regularDiscount: data.regular_discount ?? defaultFinancialRules.regularDiscount,
        studentDiscount: data.student_discount ?? defaultFinancialRules.studentDiscount,
        seniorDiscount: data.senior_discount ?? defaultFinancialRules.seniorDiscount,
        pwdDiscount: data.pwd_discount ?? defaultFinancialRules.pwdDiscount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financial rules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRules(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setIsSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      // Save each field individually to the key-value store
      await Promise.all([
        updateSetting('rides_for_free_reward', rules.ridesForFreeReward, 'financial'),
        updateSetting('regular_discount', rules.regularDiscount, 'financial'),
        updateSetting('student_discount', rules.studentDiscount, 'financial'),
        updateSetting('senior_discount', rules.seniorDiscount, 'financial'),
        updateSetting('pwd_discount', rules.pwdDiscount, 'financial'),
      ]);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save financial rules');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="min-h-screen pb-12 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="h-8 w-48 rounded bg-gray-700 animate-pulse mx-auto" />
          <div className="space-y-4">
            <div className="h-40 bg-[#131C2E] border border-[#1E2D45] rounded-lg animate-pulse" />
            <div className="h-32 bg-[#131C2E] border border-[#1E2D45] rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Financial Rules</h1>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">

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

          <div className="flex justify-center pt-2 pb-8">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#62A0EA] text-white font-medium rounded-lg hover:bg-[#4A8BD4] transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              <span>{isSaving ? 'Saving...' : isSaved ? 'Changes Saved!' : 'Save Rules'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
