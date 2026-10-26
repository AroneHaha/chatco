// app/(admin)/settings/financial-rules/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, AlertCircle, Percent, Gift, Lock, UserRound, Tag, Banknote } from 'lucide-react';
import { defaultFinancialRules, type FinancialRulesConfig } from '@/app/(admin)/settings/data/settings-data';
import { getSettings, updateSetting } from '@/lib/admin/services/setting.service';
import { SkeletonFinancialRules } from '@/components/admin/ui/skeleton';
import { SettingsSection, UnitInput } from '@/components/admin/ui/settings-section';

const peso = (amount: number) => `₱${amount.toFixed(2)}`;

export default function FinancialRulesPage() {
  const [rules, setRules] = useState<FinancialRulesConfig>({ ...defaultFinancialRules });
  // The minimum fare the fare matrix is currently priced at, for the shift read-back.
  const [savedMinimumFare, setSavedMinimumFare] = useState(defaultFinancialRules.minimumFare);
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
      const minimumFare = data.base_fare_regular ?? defaultFinancialRules.minimumFare;
      setRules({
        ridesForFreeReward: data.rides_for_free_reward ?? defaultFinancialRules.ridesForFreeReward,
        regularDiscount: data.regular_discount ?? defaultFinancialRules.regularDiscount,
        discountRate: data.discount_rate ?? defaultFinancialRules.discountRate,
        minimumFare,
      });
      setSavedMinimumFare(minimumFare);
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
      // Save each field individually to the key-value store. The server
      // re-prices the fare matrix for the minimum fare and discount rate, and
      // serializes those two saves itself.
      await Promise.all([
        updateSetting('rides_for_free_reward', rules.ridesForFreeReward, 'financial'),
        updateSetting('regular_discount', rules.regularDiscount, 'financial'),
        updateSetting('discount_rate', rules.discountRate, 'financial'),
        updateSetting('base_fare_regular', rules.minimumFare, 'financial'),
      ]);
      setSavedMinimumFare(rules.minimumFare);
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
  const minimumFare = Number(rules.minimumFare);
  const discountRate = Number(rules.discountRate);
  const fareValid = rules.minimumFare !== '' && minimumFare >= 1 && minimumFare <= 1000;
  const rateValid = rules.discountRate !== '' && discountRate >= 0 && discountRate <= 100;
  const shift = fareValid ? Math.round((minimumFare - Number(savedMinimumFare)) * 100) / 100 : 0;

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white admin-light:text-slate-900">Financial Rules</h1>
          <p className="mt-1 text-sm text-slate-400 admin-light:text-slate-500">Fares, the commuter discount and the loyalty reward.</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 admin-light:text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-400 admin-light:text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">

          <SettingsSection icon={Banknote} title="Fares" description="The lowest fare a passenger pays. Changing it moves the whole fare matrix.">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <label className="block w-full sm:max-w-56">
                <span className="mb-1.5 block text-xs font-medium text-slate-300 admin-light:text-slate-700">Minimum fare</span>
                <UnitInput name="minimumFare" value={rules.minimumFare} onChange={handleChange} min={1} max={1000} step={0.01} required unit="PHP" />
              </label>
              {/* Live read-back of what saving does to the fare matrix. */}
              <p className="flex-1 text-sm text-slate-300 admin-light:text-slate-700">
                {!fareValid
                  ? 'Enter an amount from ₱1.00 to ₱1,000.00.'
                  : shift === 0
                    ? <>Every fare in the fare matrix keeps its current amount.</>
                    : <>Saving {shift > 0 ? 'raises' : 'lowers'} <span className="font-semibold text-white admin-light:text-slate-900">every fare in the fare matrix by {peso(Math.abs(shift))}</span>, keeping the gaps between stops.</>}
              </p>
            </div>
          </SettingsSection>

          <SettingsSection icon={Percent} title="Commuter Discount" description="One rate for Student, Senior Citizen and PWD commuters.">
            <div className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
              {/* Regular always pays full fare — shown as a fixed fact, not a
                  disabled input that looks editable. */}
              <div className="flex items-center gap-3 pb-3">
                <UserRound size={18} aria-hidden="true" className="shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-300 admin-light:text-slate-700">Regular</p>
                  <p className="text-xs text-slate-500">Pays the full fare</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-slate-400 admin-light:text-slate-500">
                  <Lock size={13} aria-hidden="true" className="text-slate-500" />
                  {rules.regularDiscount}%
                </span>
              </div>
              <label className="flex items-center gap-3 pt-3">
                <Tag size={18} aria-hidden="true" className="shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-white admin-light:text-slate-900">Student, Senior Citizen, PWD</span>
                  <span className="block text-xs text-slate-500">
                    {fareValid && rateValid
                      ? `Minimum fare becomes ${peso(Math.round(minimumFare * (100 - discountRate)) / 100)}. Every discounted fare is recalculated on save.`
                      : 'Enter a rate from 0 to 100.'}
                  </span>
                </span>
                <UnitInput name="discountRate" value={rules.discountRate} onChange={handleChange} min={0} max={100} step={0.01} required unit="%" unitWidth="pr-7" className="w-24 shrink-0" />
              </label>
            </div>
          </SettingsSection>

          <SettingsSection icon={Gift} title="Loyalty Program" description="Commuters earn a free ride after a set number of paid rides.">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <label className="block w-full sm:max-w-56">
                <span className="mb-1.5 block text-xs font-medium text-slate-300 admin-light:text-slate-700">Paid rides for 1 free ride</span>
                <UnitInput name="ridesForFreeReward" value={rules.ridesForFreeReward} onChange={handleChange} min={1} max={100} step={1} required unit="rides" />
              </label>
              {/* Live read-back of what the number means for commuters. */}
              <p className="flex-1 rounded-lg border border-[#62A0EA]/15 admin-light:border-[#1A5FB4]/15 bg-[#62A0EA]/5 admin-light:bg-[#1A5FB4]/5 px-4 py-3 text-sm text-slate-300 admin-light:text-slate-700">
                {Number.isInteger(rides) && rides >= 1
                  ? <>After every <span className="font-semibold text-white admin-light:text-slate-900">{rides} paid {rides === 1 ? 'ride' : 'rides'}</span>, the commuter earns <span className="font-semibold text-[#8CB9F0] admin-light:text-[#1A5FB4]">1 free ride</span>.</>
                  : 'Enter a whole number from 1 to 100.'}
              </p>
            </div>
          </SettingsSection>

          <div className="flex justify-center pt-2 pb-8">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white font-medium rounded-lg hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
