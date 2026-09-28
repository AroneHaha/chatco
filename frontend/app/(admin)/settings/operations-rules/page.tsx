// app/(admin)/settings/operations-rules/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Save, AlertCircle, ShieldAlert, Gauge, Timer, BellRing, Hourglass, Repeat, ArrowRight, type LucideIcon } from 'lucide-react';
import { defaultOperationsRules, type OperationsRulesConfig } from '@/app/(admin)/settings/data/settings-data';
import { getSettings, updateSetting } from '@/lib/admin/services/setting.service';
import { SettingsSection, UnitInput } from '@/components/admin/ui/settings-section';
import { SkeletonOperationsRules } from '@/components/admin/ui/skeleton';

/** 90 → "1h 30m", 60 → "1h", 45 → "45m", 1440 → "1d". */
function formatMinutes(total: number): string {
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  return [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(' ') || '0m';
}

function RuleField({ icon: Icon, label, help, children }: { icon: LucideIcon; label: string; help: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-3 rounded-lg border border-[#1E2D45] bg-[#0E1628]/60 p-3 transition-colors focus-within:border-[#62A0EA]/60">
      <span className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#62A0EA]/10 text-[#8CB9F0]">
          <Icon size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-white">{label}</span>
          <span className="block text-xs text-slate-500">{help}</span>
        </span>
      </span>
      {children}
    </label>
  );
}

function TimelineStep({ label, highlight = false }: { label: string; highlight?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${highlight ? 'bg-[#62A0EA]' : 'bg-slate-500'}`} />
      <span className={highlight ? 'font-semibold text-white' : 'text-slate-300'}>{label}</span>
    </li>
  );
}

function TimelineGap({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-1.5 pl-4 text-xs font-semibold tabular-nums text-[#8CB9F0] sm:pl-0">
      <ArrowRight size={13} aria-hidden="true" className="rotate-90 sm:rotate-0" />
      {text}
    </li>
  );
}

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
    return <SkeletonOperationsRules />;
  }

  const grace = Number(rules.remittanceGraceMinutes);
  const interval = Number(rules.remittanceReminderIntervalMinutes);
  const timelineValid = grace >= 1 && interval >= 5;

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Operations & Fleet Rules</h1>
          <p className="mt-1 text-sm text-slate-400">Speed alerts, shift limits and remittance reminders.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">

          <SettingsSection icon={ShieldAlert} title="Safety Thresholds" description="Limits that raise alerts for units and conductors.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* min/max mirror AdminSettingController's rules, so an
                  out-of-range value is caught here instead of as a 422. */}
              <RuleField icon={Gauge} label="Overspeeding limit" help="Monitoring flags a unit driving faster than this (10–120).">
                <UnitInput min="10" max="120" step="1" name="speedLimitKmh" value={rules.speedLimitKmh} onChange={handleChange} required unit="km/h" />
              </RuleField>
              <RuleField icon={Timer} label="Maximum shift duration" help="Remittance flags a conductor whose shift runs longer (1–48).">
                <UnitInput min="1" max="48" step="1" name="maxShiftHours" value={rules.maxShiftHours} onChange={handleChange} required unit="hours" unitWidth="pr-16" />
              </RuleField>
            </div>
          </SettingsSection>

          <SettingsSection icon={BellRing} title="Remittance Reminders" description="When conductors are reminded to remit after a shift closes automatically.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <RuleField icon={Hourglass} label="Grace period" help="Wait after the shift closes before the first reminder.">
                <UnitInput min="1" max="1440" name="remittanceGraceMinutes" value={rules.remittanceGraceMinutes} onChange={handleChange} required unit="min" />
              </RuleField>
              <RuleField icon={Repeat} label="Repeat interval" help="Minimum time between reminders for the same shift.">
                <UnitInput min="5" max="10080" name="remittanceReminderIntervalMinutes" value={rules.remittanceReminderIntervalMinutes} onChange={handleChange} required unit="min" />
              </RuleField>
            </div>

            {/* Read-back of the two numbers as a timeline */}
            <ol aria-label="Reminder timeline" className="mt-4 flex flex-col gap-2 rounded-lg border border-[#62A0EA]/15 bg-[#62A0EA]/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3">
              {timelineValid ? (
                <>
                  <TimelineStep label="Shift closes" />
                  <TimelineGap text={`+${formatMinutes(grace)}`} />
                  <TimelineStep label="1st reminder" highlight />
                  <TimelineGap text={`every ${formatMinutes(interval)}`} />
                  <TimelineStep label="Next reminders until remitted" />
                </>
              ) : (
                <li className="text-slate-400">Grace period must be at least 1 minute and the interval at least 5.</li>
              )}
            </ol>
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
