// app/(admin)/settings/financial-rules/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, AlertCircle, Percent, Gift, Lock, UserRound, GraduationCap, HeartHandshake, Accessibility, type LucideIcon } from 'lucide-react';
import { defaultFinancialRules, type FinancialRulesConfig } from '@/app/(admin)/settings/data/settings-data';
import { getSettings, updateSetting } from '@/lib/admin/services/setting.service';
import { SkeletonFinancialRules } from '@/components/admin/ui/skeleton';
import { SettingsSection, UnitInput } from '@/components/admin/ui/settings-section';

// Editable discount types (Regular is fixed at full fare, rendered separately).
const DISCOUNT_FIELDS: { name: keyof FinancialRulesConfig; label: string; icon: LucideIcon }[] = [
  { name: 'studentDiscount', label: 'Student', icon: GraduationCap },
  { name: 'seniorDiscount', label: 'Senior Citizen', icon: HeartHandshake },
  { name: 'pwdDiscount', label: 'PWD', icon: Accessibility },
];

function TypeIcon({ icon: Icon, muted = false }: { icon: LucideIcon; muted?: boolean }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${muted ? 'bg-white/5 text-slate-500' : 'bg-[#62A0EA]/10 text-[#8CB9F0]'}`}>
      <Icon size={16} aria-hidden="true" />
    </span>
  );
}

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
    return <SkeletonFinancialRules />;
  }

  const rides = Number(rules.ridesForFreeReward);

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Financial Rules</h1>
          <p className="mt-1 text-sm text-slate-400">Commuter discount rates and the loyalty reward.</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">

          <SettingsSection icon={Percent} title="Commuter Discount Rates" description="Discount percentage for each commuter type.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Regular always pays full fare — shown as a fixed fact, not a
                  disabled input that looks editable. */}
              <div className="flex items-center gap-3 rounded-lg border border-[#1E2D45] bg-[#0E1628]/60 p-3">
                <TypeIcon icon={UserRound} muted />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-300">Regular</p>
                  <p className="text-xs text-slate-500">Pays the full fare</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-slate-400">
                  <Lock size={13} aria-hidden="true" className="text-slate-500" />
                  {rules.regularDiscount}%
                </span>
              </div>
              {DISCOUNT_FIELDS.map((field) => (
                <label key={field.name} className="flex items-center gap-3 rounded-lg border border-[#1E2D45] bg-[#0E1628] p-3 transition-colors focus-within:border-[#62A0EA]/60">
                  <TypeIcon icon={field.icon} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">{field.label}</span>
                    <span className="block text-xs text-slate-500">Discount rate</span>
                  </span>
                  <span className="relative w-24 shrink-0">
                    <input
                      type="number"
                      name={field.name}
                      value={rules[field.name]}
                      onChange={handleChange}
                      min={0}
                      max={100}
                      step="any"
                      required
                      className="block w-full rounded-md border border-[#1E2D45] bg-[#131C2E] py-2 pl-3 pr-7 text-right text-sm font-semibold tabular-nums text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors"
                    />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">%</span>
                  </span>
                </label>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection icon={Gift} title="Loyalty Program" description="Commuters earn a free ride after a set number of paid rides.">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <label className="block w-full sm:max-w-56">
                <span className="mb-1.5 block text-xs font-medium text-slate-300">Paid rides for 1 free ride</span>
                <UnitInput name="ridesForFreeReward" value={rules.ridesForFreeReward} onChange={handleChange} min={1} max={100} step={1} required unit="rides" />
              </label>
              {/* Live read-back of what the number means for commuters. */}
              <p className="flex-1 rounded-lg border border-[#62A0EA]/15 bg-[#62A0EA]/5 px-4 py-3 text-sm text-slate-300">
                {Number.isInteger(rides) && rides >= 1
                  ? <>After every <span className="font-semibold text-white">{rides} paid {rides === 1 ? 'ride' : 'rides'}</span>, the commuter earns <span className="font-semibold text-[#8CB9F0]">1 free ride</span>.</>
                  : 'Enter a whole number from 1 to 100.'}
              </p>
            </div>
          </SettingsSection>

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
