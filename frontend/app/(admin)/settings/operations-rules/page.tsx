// app/(admin)/settings/operations-rules/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { defaultOperationsRules, type OperationsRulesConfig } from '@/app/(admin)/settings/data/settings-data';
import { getSettings, updateSetting } from '@/lib/admin/services/setting.service';

export default function OperationsRulesPage() {
  const [rules, setRules] = useState<OperationsRulesConfig>({ ...defaultOperationsRules });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSettings('operations');
      setRules({
        speedLimitKmh: data.speed_limit_kmh ?? defaultOperationsRules.speedLimitKmh,
        maxShiftHours: data.max_shift_hours ?? defaultOperationsRules.maxShiftHours,
        remittanceGraceMinutes: data.remittance_grace_minutes ?? defaultOperationsRules.remittanceGraceMinutes,
        remittanceReminderIntervalMinutes: data.remittance_reminder_interval_minutes ?? defaultOperationsRules.remittanceReminderIntervalMinutes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load operations rules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRules(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setIsSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await Promise.all([
        updateSetting('speed_limit_kmh', rules.speedLimitKmh, 'operations'),
        updateSetting('max_shift_hours', rules.maxShiftHours, 'operations'),
        updateSetting('remittance_grace_minutes', rules.remittanceGraceMinutes, 'operations'),
        updateSetting('remittance_reminder_interval_minutes', rules.remittanceReminderIntervalMinutes, 'operations'),
      ]);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save operations rules');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-12 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="h-8 w-56 rounded bg-gray-700 animate-pulse mx-auto" />
          <div className="h-40 bg-[#131C2E] border border-[#1E2D45] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Operations & Fleet Rules</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">

          <div className="bg-[#131C2E] border border-[#1E2D45] p-4 sm:p-6 rounded-lg">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Safety Thresholds</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Overspeeding Limit (km/h)</label>
                <p className="text-xs text-slate-500 mb-2">Triggers alert on monitoring map if exceeded.</p>
                <input
                  type="number"
                  name="speedLimitKmh"
                  value={rules.speedLimitKmh}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Maximum Shift Duration (Hours)</label>
                <p className="text-xs text-slate-500 mb-2">Flags conductor in remittance if exceeded.</p>
                <input
                  type="number"
                  name="maxShiftHours"
                  value={rules.maxShiftHours}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#131C2E] border border-[#1E2D45] p-4 sm:p-6 rounded-lg">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Remittance Reminders</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Grace Period (Minutes)</label>
                <p className="text-xs text-slate-500 mb-2">Wait after automatic shift closeout before the first reminder.</p>
                <input type="number" min="1" max="1440" name="remittanceGraceMinutes" value={rules.remittanceGraceMinutes} onChange={handleChange} required className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Repeat Interval (Minutes)</label>
                <p className="text-xs text-slate-500 mb-2">Minimum time between reminders for the same pending shift.</p>
                <input type="number" min="5" max="10080" name="remittanceReminderIntervalMinutes" value={rules.remittanceReminderIntervalMinutes} onChange={handleChange} required className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
              </div>
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
