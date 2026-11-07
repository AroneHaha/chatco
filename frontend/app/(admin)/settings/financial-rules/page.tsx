// app/(admin)/settings/financial-rules/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, AlertCircle, Percent, Gift, Lock, UserRound, Tag, Banknote, CalendarClock } from 'lucide-react';
import { defaultFinancialRules, type FinancialRulesConfig } from '@/app/(admin)/settings/data/settings-data';
import { getSettings, updateSetting } from '@/lib/admin/services/setting.service';
import { fareForBarangays } from '@/lib/shared/fare/fare-matrix.service';
import { SkeletonFinancialRules } from '@/components/admin/ui/skeleton';
import { SettingsSection, UnitInput } from '@/components/admin/ui/settings-section';
import { MONTH_NAMES } from '@/components/admin/ui/admin-date-picker';
import { ConfirmSaveDialog } from '@/components/admin/ui/confirm-save-dialog';

const peso = (amount: number) => `₱${amount.toFixed(2)}`;
/** Month name for a 1-12 month number; wraps 0 → December and 13 → January. */
const monthName = (month: number) => MONTH_NAMES[(month + 11) % 12];
/** "17" and "17.00" are the same value; only a real difference counts as a change. */
const differs = (a: string, b: string) => a !== b && (a === '' || b === '' || Number(a) !== Number(b));

/** Editable fields as the confirm dialog lists them. */
const FIELDS: { key: keyof FinancialRulesConfig; label: string; format: (value: string) => string }[] = [
  { key: 'minimumFare', label: 'Minimum fare', format: (v) => peso(Number(v)) },
  { key: 'baseBarangayCount', label: 'Barangays covered', format: (v) => `${v} brgy` },
  { key: 'succeedingFare', label: 'Each barangay after', format: (v) => peso(Number(v)) },
  { key: 'discountRate', label: 'Student, Senior Citizen, PWD discount', format: (v) => `${Number(v)}%` },
  { key: 'studentRenewalMonth', label: 'Student renewal month', format: (v) => monthName(Number(v)) },
  { key: 'ridesForFreeReward', label: 'Paid rides for 1 free ride', format: (v) => `${v} rides` },
];
const FARE_KEYS: (keyof FinancialRulesConfig)[] = ['minimumFare', 'baseBarangayCount', 'succeedingFare', 'discountRate'];

export default function FinancialRulesPage() {
  const [rules, setRules] = useState<FinancialRulesConfig>({ ...defaultFinancialRules });
  // The rules as last loaded/saved: Save stays off until something differs.
  const [savedRules, setSavedRules] = useState<FinancialRulesConfig>({ ...defaultFinancialRules });
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTheme, setConfirmTheme] = useState<string | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch saved settings from API on mount
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSettings('financial');
      // Map DB keys → form field names. DB keys use snake_case.
      const loaded = {
        ridesForFreeReward: data.rides_for_free_reward ?? defaultFinancialRules.ridesForFreeReward,
        regularDiscount: data.regular_discount ?? defaultFinancialRules.regularDiscount,
        discountRate: data.discount_rate ?? defaultFinancialRules.discountRate,
        minimumFare: data.base_fare_regular ?? defaultFinancialRules.minimumFare,
        succeedingFare: data.succeeding_fare_regular ?? defaultFinancialRules.succeedingFare,
        baseBarangayCount: data.base_barangay_count ?? defaultFinancialRules.baseBarangayCount,
        studentRenewalMonth: data.student_renewal_month ?? defaultFinancialRules.studentRenewalMonth,
      };
      setRules(loaded);
      setSavedRules(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financial rules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setRules(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setIsSaved(false);
  };

  const changedFields = FIELDS.filter(({ key }) => differs(rules[key], savedRules[key]));
  const hasChanges = changedFields.length > 0;

  // Submit (after the browser's min/max checks) only opens the confirm dialog.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || showConfirm || !hasChanges) return;
    setError(null);
    setSaveError(null);
    // The dialog is portalled to <body>, outside this page's theme scope.
    setConfirmTheme(e.currentTarget.closest('[data-admin-theme]')?.getAttribute('data-admin-theme') ?? undefined);
    setShowConfirm(true);
  };

  const handleSave = async () => {
    if (isSaving || !hasChanges) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      // Save each field individually to the key-value store. The server
      // re-prices the fare matrix for each of the four fare rules and
      // serializes those saves itself (App\Support\FareRules).
      await Promise.all([
        updateSetting('rides_for_free_reward', rules.ridesForFreeReward, 'financial'),
        updateSetting('regular_discount', rules.regularDiscount, 'financial'),
        updateSetting('discount_rate', rules.discountRate, 'financial'),
        updateSetting('base_fare_regular', rules.minimumFare, 'financial'),
        updateSetting('succeeding_fare_regular', rules.succeedingFare, 'financial'),
        updateSetting('base_barangay_count', rules.baseBarangayCount, 'financial'),
        // Refused while a renewal period runs or for this/next month; the other rules still save.
        updateSetting('student_renewal_month', rules.studentRenewalMonth, 'financial'),
      ]);
      setSavedRules({ ...rules });
      setShowConfirm(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save financial rules');
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
  const succeedingFare = Number(rules.succeedingFare);
  const baseCount = Number(rules.baseBarangayCount);
  const fareValid = rules.minimumFare !== '' && minimumFare >= 1 && minimumFare <= 1000;
  const rateValid = rules.discountRate !== '' && discountRate >= 0 && discountRate <= 100;
  const succeedingValid = rules.succeedingFare !== '' && succeedingFare >= 0 && succeedingFare <= 1000;
  const countValid = rules.baseBarangayCount !== '' && Number.isInteger(baseCount) && baseCount >= 0 && baseCount <= 100;
  const faresValid = fareValid && succeedingValid && countValid;
  // Worked example for the read-back: a trip 6 barangays past the minimum zone.
  const exampleBarangays = baseCount + 6;
  const previewRules = { baseFareRegular: minimumFare, baseBarangayCount: baseCount, succeedingFareRegular: succeedingFare, discountRate };
  const exampleFare = fareForBarangays(previewRules, exampleBarangays, false);
  const renewalMonth = Number(rules.studentRenewalMonth);
  // No sudden deadlines: this month and next can't be picked (Manila time, as the server checks),
  // except the month already saved, which stays selectable as the current value.
  const thisMonth = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'numeric' }).format(new Date()));
  const blockedMonths = [thisMonth, thisMonth % 12 + 1].filter((month) => String(month) !== savedRules.studentRenewalMonth);
  const confirmNotes = [
    ...(changedFields.some(({ key }) => FARE_KEYS.includes(key))
      ? ['Every stop in the fare matrix is re-priced, and conductors are signed out to load the new fares.'] : []),
    ...(differs(rules.studentRenewalMonth, savedRules.studentRenewalMonth)
      ? [`Every current student will renew in the next ${monthName(renewalMonth)}, whenever they became a Student.`] : []),
  ];

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

        <form onSubmit={handleSubmit} className="space-y-6">

          <SettingsSection icon={Banknote} title="Fares" description="How every trip is priced. The fare matrix, the conductor and commuter calculators, and charging all follow these.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-300 admin-light:text-slate-700">Minimum fare</span>
                <UnitInput name="minimumFare" value={rules.minimumFare} onChange={handleChange} min={1} max={1000} step={0.01} required unit="PHP" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-300 admin-light:text-slate-700">Barangays covered</span>
                <UnitInput name="baseBarangayCount" value={rules.baseBarangayCount} onChange={handleChange} min={0} max={100} step={1} required unit="brgy" unitWidth="pr-12" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-300 admin-light:text-slate-700">Each barangay after</span>
                <UnitInput name="succeedingFare" value={rules.succeedingFare} onChange={handleChange} min={0} max={1000} step={0.01} required unit="PHP" />
              </label>
            </div>
            {/* Live read-back of the pricing rule, with a worked example. */}
            <p className="mt-4 text-sm text-slate-300 admin-light:text-slate-700">
              {!faresValid
                ? 'Enter a minimum fare from ₱1.00 to ₱1,000.00, a whole number of barangays from 0 to 100, and a per-barangay fare from ₱0.00 to ₱1,000.00.'
                : <>A trip through up to <span className="font-semibold text-white admin-light:text-slate-900">{baseCount} barangays</span> costs {peso(minimumFare)}; each barangay after that adds {peso(succeedingFare)}. Both the pickup and drop-off barangays count, so a {exampleBarangays}-barangay trip costs <span className="font-semibold text-white admin-light:text-slate-900">{peso(exampleFare)}</span>. Saving re-prices every stop in the fare matrix.</>}
            </p>
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
                      ? `Minimum fare becomes ${peso(fareForBarangays(previewRules, 0, true))}. Every discounted fare is recalculated on save.`
                      : 'Enter a rate from 0 to 100.'}
                  </span>
                </span>
                <UnitInput name="discountRate" value={rules.discountRate} onChange={handleChange} min={0} max={100} step={0.01} required unit="%" unitWidth="pr-7" className="w-24 shrink-0" />
              </label>
              <label className="flex items-center gap-3 pt-3">
                <CalendarClock size={18} aria-hidden="true" className="shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-white admin-light:text-slate-900">Student renewal month</span>
                  <span className="block text-xs text-slate-500">
                    Reminders start {monthName(renewalMonth - 1)} 25. Students renew in {monthName(renewalMonth)}; anyone who doesn&apos;t pays Regular from {monthName(renewalMonth + 1)} 1.
                    {blockedMonths.length > 0 && (
                      <span className="block">
                        {blockedMonths.map(monthName).join(' and ')} {blockedMonths.length === 1 ? 'is' : 'are'} too soon.
                      </span>
                    )}
                  </span>
                </span>
                <select
                  name="studentRenewalMonth"
                  value={rules.studentRenewalMonth}
                  onChange={handleChange}
                  className="w-36 shrink-0 rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-white admin-light:text-slate-900 scheme-dark admin-light:scheme-light transition-colors focus:outline-none focus:ring-1 focus:ring-[#62A0EA] admin-light:focus:ring-[#1A5FB4]"
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={String(index + 1)} disabled={blockedMonths.includes(index + 1)} className="bg-[#0E1628] admin-light:bg-white">{name}</option>
                  ))}
                </select>
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
              disabled={isSaving || !hasChanges}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white font-medium rounded-lg hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              <span>{isSaved ? 'Changes Saved!' : 'Save Rules'}</span>
            </button>
          </div>
        </form>
      </div>

      {showConfirm && (
        <ConfirmSaveDialog
          title="Save financial rules?"
          description={`${changedFields.length} ${changedFields.length === 1 ? 'change applies' : 'changes apply'} after you confirm.`}
          rows={changedFields.map(({ key, label, format }) => ({
            label,
            value: `${format(savedRules[key])} → ${format(rules[key])}`,
          }))}
          notes={confirmNotes}
          isSaving={isSaving}
          error={saveError}
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => void handleSave()}
          theme={confirmTheme}
        />
      )}
    </div>
  );
}
