// app/(admin)/settings/app-configuration/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Save,
  AlertCircle,
  Settings2,
  Wrench,
  UserRoundPlus,
  IdCard,
  Smartphone,
  Check,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { defaultAppConfiguration, type AppConfiguration } from '@/app/(admin)/settings/data/settings-data';
import { getSettings, updateSetting } from '@/lib/admin/services/setting.service';

const MAINTENANCE_REASONS = [
  {
    id: 'maintenance',
    label: 'Under maintenance',
    message: defaultAppConfiguration.maintenanceMessage,
  },
  {
    id: 'system-update',
    label: 'System update',
    message:
      "We're updating CHATCO to improve your experience. Please check back shortly. Thank you for your patience!",
  },
  {
    id: 'technical-issue',
    label: 'Technical issue',
    message:
      "CHATCO is temporarily unavailable due to a technical issue. We're working to restore access as soon as possible.",
  },
  {
    id: 'service-interruption',
    label: 'Service interruption',
    message:
      'CHATCO is experiencing a temporary service interruption. Please try again later. Thank you for your understanding!',
  },
];

function getMaintenanceReason(message: string) {
  const effectiveMessage = message.trim() || defaultAppConfiguration.maintenanceMessage;
  return MAINTENANCE_REASONS.find((reason) => reason.message === effectiveMessage)?.id ?? 'custom';
}

function ConfigSwitch({
  id,
  checked,
  onChange,
  tone = 'blue',
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tone?: 'blue' | 'amber';
}) {
  return (
    <label className="relative inline-flex h-11 w-12 shrink-0 cursor-pointer items-center">
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 rounded-full bg-[#2A3951] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#8CB9F0] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#111A2B] peer-disabled:opacity-50 ${tone === 'amber' ? 'peer-checked:bg-amber-500' : 'peer-checked:bg-[#62A0EA]'}`}
      />
    </label>
  );
}

function MaintenanceConfirmation({
  enabled,
  message,
  isSaving,
  error,
  onCancel,
  onConfirm,
}: {
  enabled: boolean;
  message: string;
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby="maintenance-confirm-title"
      aria-describedby="maintenance-confirm-description"
      aria-busy={isSaving}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onCancel();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-[#23344F] bg-[#111A2B] p-5 text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
        <Wrench size={21} aria-hidden="true" />
      </span>
      <h2 id="maintenance-confirm-title" className="text-lg font-semibold">
        {enabled ? 'Enable maintenance mode?' : 'Disable maintenance mode?'}
      </h2>
      <p id="maintenance-confirm-description" className="mt-2 text-sm leading-relaxed text-slate-400">
        {enabled
          ? 'The commuter and conductor apps will be paused. Admin access stays available. This takes effect when you confirm.'
          : 'The commuter and conductor apps will become available again. This takes effect when you confirm.'}
      </p>
      {enabled && (
        <div className="mt-4 rounded-lg border border-[#23344F] bg-[#0E1628] p-3">
          <p className="text-xs font-medium text-slate-300">Message shown to users</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-400">
            {message}
          </p>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          autoFocus
          disabled={isSaving}
          onClick={onCancel}
          className="min-h-11 rounded-lg border border-[#23344F] px-4 text-sm font-medium text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CB9F0] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={onConfirm}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-4 text-sm font-semibold text-white hover:bg-[#4A8BD4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CB9F0] disabled:opacity-50"
        >
          {isSaving && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
          {isSaving ? 'Applying...' : enabled ? 'Enable maintenance' : 'Disable maintenance'}
        </button>
      </div>
    </dialog>,
    document.body
  );
}

export default function AppConfigurationPage() {
  const [config, setConfig] = useState<AppConfiguration>({ ...defaultAppConfiguration });
  const [maintenanceReason, setMaintenanceReason] = useState('maintenance');
  const [savedConfig, setSavedConfig] = useState<AppConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMaintenanceMode, setPendingMaintenanceMode] = useState<boolean | null>(null);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSettings('app');
      const loadedConfig = {
        maintenanceMode: data.maintenance_mode === 'true',
        maintenanceMessage: data.maintenance_message?.trim()
          ? data.maintenance_message
          : defaultAppConfiguration.maintenanceMessage,
        requireIdUpload:
          data.require_id_upload !== undefined
            ? data.require_id_upload === 'true'
            : defaultAppConfiguration.requireIdUpload,
        requirePhoneVerification: data.require_phone_verification === 'true',
      };
      setConfig(loadedConfig);
      setMaintenanceReason(getMaintenanceReason(loadedConfig.maintenanceMessage));
      setSavedConfig(loadedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const set = <K extends keyof AppConfiguration>(key: K, value: AppConfiguration[K]) => {
    setConfig((previous) => ({ ...previous, [key]: value }));
    setIsSaved(false);
  };

  const selectMaintenanceReason = (id: string) => {
    setMaintenanceReason(id);
    const reason = MAINTENANCE_REASONS.find((option) => option.id === id);
    if (reason) set('maintenanceMessage', reason.message);
  };

  const hasChanges =
    savedConfig !== null &&
    (config.maintenanceMessage !== savedConfig.maintenanceMessage ||
      config.requireIdUpload !== savedConfig.requireIdUpload ||
      config.requirePhoneVerification !== savedConfig.requirePhoneVerification);

  const confirmMaintenanceMode = async () => {
    if (isSaving || pendingMaintenanceMode === null || savedConfig === null) return;
    setIsSaving(true);
    setMaintenanceError(null);
    try {
      // Store the message first so enabling maintenance never exposes the old message.
      if (pendingMaintenanceMode) {
        await updateSetting('maintenance_message', config.maintenanceMessage.trim(), 'app');
        setSavedConfig(
          (previous) => previous && { ...previous, maintenanceMessage: config.maintenanceMessage }
        );
      }
      await updateSetting('maintenance_mode', String(pendingMaintenanceMode), 'app');
      setConfig((previous) => ({ ...previous, maintenanceMode: pendingMaintenanceMode }));
      setSavedConfig((previous) => previous && { ...previous, maintenanceMode: pendingMaintenanceMode });
      setPendingMaintenanceMode(null);
      setIsSaved(true);
    } catch (err) {
      setMaintenanceError(err instanceof Error ? err.message : 'Failed to change maintenance mode');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || pendingMaintenanceMode !== null || !hasChanges) return;
    setIsSaving(true);
    setError(null);
    try {
      await Promise.all([
        updateSetting('maintenance_message', config.maintenanceMessage.trim(), 'app'),
        updateSetting('require_id_upload', String(config.requireIdUpload), 'app'),
        updateSetting('require_phone_verification', String(config.requirePhoneVerification), 'app'),
      ]);
      setSavedConfig({ ...config });
      setIsSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="@container/app-config min-w-0 px-4 pb-6 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <header className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#62A0EA]">
            <Settings2 size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white">App Configuration</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Manage app access and commuter signup.
            </p>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
          >
            <AlertCircle size={17} className="shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 break-words">{error}</p>
            {savedConfig === null && (
              <button
                type="button"
                onClick={() => void fetchSettings()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 font-medium hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                <RefreshCw size={15} aria-hidden="true" /> Retry
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div role="status" aria-label="Loading app configuration" className="space-y-5">
            <div className="h-[25rem] rounded-xl border border-[#1E2D45] bg-[#111A2B] p-5 @[36rem]/app-config:h-80">
              <div className="animate-pulse space-y-5">
                <div className="h-5 w-40 rounded bg-[#23344F]" />
                <div className="h-4 w-3/4 rounded bg-[#23344F]" />
                <div className="h-24 rounded-lg bg-[#23344F]" />
                <div className="h-16 rounded-lg bg-[#23344F]" />
              </div>
            </div>
            <div className="h-72 rounded-xl border border-[#1E2D45] bg-[#111A2B] p-5">
              <div className="animate-pulse space-y-6">
                <div className="h-5 w-40 rounded bg-[#23344F]" />
                <div className="h-16 rounded-lg bg-[#23344F]" />
                <div className="h-16 rounded-lg bg-[#23344F]" />
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <fieldset disabled={isSaving || savedConfig === null} className="min-w-0 space-y-5">
              <legend className="sr-only">App settings</legend>
              <section
                aria-labelledby="maintenance-title"
                className={`min-w-0 overflow-hidden rounded-xl border bg-[#111A2B] transition-colors ${config.maintenanceMode ? 'border-amber-500/40' : 'border-[#1E2D45]'}`}
              >
                <div className="border-b border-[#1E2D45] p-4 @[36rem]/app-config:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2
                        id="maintenance-title"
                        className="flex items-center gap-2 text-sm font-semibold text-white"
                      >
                        <Wrench size={17} className="shrink-0 text-amber-400" aria-hidden="true" /> App
                        availability
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        Control access while updates are in progress.
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-medium ${config.maintenanceMode ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}
                    >
                      {config.maintenanceMode ? 'Maintenance' : 'Online'}
                    </span>
                  </div>
                </div>
                <div className="space-y-5 p-4 @[36rem]/app-config:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <label
                        id="maintenance-mode-label"
                        htmlFor="maintenance-mode"
                        className="text-sm font-medium text-slate-200"
                      >
                        Maintenance mode
                      </label>
                      <p id="maintenance-mode-hint" className="mt-1 text-xs leading-relaxed text-slate-400">
                        Pause the commuter and conductor apps. Changes apply immediately after confirmation.
                      </p>
                    </div>
                    <ConfigSwitch
                      id="maintenance-mode"
                      checked={config.maintenanceMode}
                      onChange={(value) => {
                        setMaintenanceError(null);
                        setPendingMaintenanceMode(value);
                      }}
                      tone="amber"
                    />
                  </div>
                  <div className="border-t border-[#1E2D45] pt-5">
                    <label
                      htmlFor="maintenance-reason"
                      className="mb-2 block text-sm font-medium text-slate-300"
                    >
                      Reason
                    </label>
                    <select
                      id="maintenance-reason"
                      value={maintenanceReason}
                      onChange={(event) => selectMaintenanceReason(event.target.value)}
                      aria-describedby="maintenance-reason-hint"
                      className="block min-h-11 w-full min-w-0 rounded-lg border border-[#23344F] bg-[#0E1628] px-3 text-base text-white outline-none transition-colors focus:border-[#62A0EA] focus:ring-2 focus:ring-[#62A0EA]/20 disabled:opacity-50 @[36rem]/app-config:text-sm"
                    >
                      {MAINTENANCE_REASONS.map((reason) => (
                        <option key={reason.id} value={reason.id}>
                          {reason.label}
                        </option>
                      ))}
                      <option value="custom">Custom message</option>
                    </select>
                    <p id="maintenance-reason-hint" className="mt-2 text-[11px] text-slate-500">
                      Pick a reason to fill the message, or write your own below.
                    </p>
                  </div>
                  <div className="grid min-w-0 gap-4 border-t border-[#1E2D45] pt-5 @[36rem]/app-config:grid-cols-2">
                    <div className="min-w-0">
                      <label
                        htmlFor="maintenance-message"
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        Maintenance message
                      </label>
                      <textarea
                        id="maintenance-message"
                        value={config.maintenanceMessage}
                        onChange={(event) => {
                          set('maintenanceMessage', event.target.value);
                          setMaintenanceReason('custom');
                        }}
                        rows={4}
                        maxLength={500}
                        placeholder="We'll be back shortly. Thank you for your patience!"
                        aria-describedby="maintenance-message-hint"
                        className="block min-h-28 w-full resize-y rounded-lg border border-[#23344F] bg-[#0E1628] px-3 py-2.5 text-base text-white placeholder:text-slate-500 outline-none transition-colors focus:border-[#62A0EA] focus:ring-2 focus:ring-[#62A0EA]/20 disabled:opacity-50 @[36rem]/app-config:text-sm"
                      />
                      <div className="mt-2 flex items-start justify-between gap-3 text-[11px] text-slate-500">
                        <p id="maintenance-message-hint">Leave blank to use the default message.</p>
                        <span className="shrink-0 tabular-nums">{config.maintenanceMessage.length}/500</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-2 text-xs font-medium text-slate-400">Message preview</p>
                      <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-[#23344F] bg-[#0E1628] px-4 py-5 text-center">
                        <Wrench size={20} className="text-[#62A0EA]" aria-hidden="true" />
                        <p className="text-sm font-semibold text-white">We&apos;ll be right back</p>
                        <p className="w-full whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-400">
                          {config.maintenanceMessage.trim() || defaultAppConfiguration.maintenanceMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section
                aria-labelledby="registration-title"
                className="min-w-0 overflow-hidden rounded-xl border border-[#1E2D45] bg-[#111A2B]"
              >
                <div className="border-b border-[#1E2D45] p-4 @[36rem]/app-config:p-5">
                  <h2
                    id="registration-title"
                    className="flex items-center gap-2 text-sm font-semibold text-white"
                  >
                    <UserRoundPlus size={17} className="shrink-0 text-[#62A0EA]" aria-hidden="true" />{' '}
                    Commuter signup
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Choose the requirements for new accounts.
                  </p>
                </div>
                <div className="divide-y divide-[#1E2D45] px-4 @[36rem]/app-config:px-5">
                  <div className="flex items-start gap-3 py-5">
                    <IdCard
                      size={18}
                      className="mt-1 hidden shrink-0 text-slate-400 @[24rem]/app-config:block"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        id="require-id-label"
                        htmlFor="require-id"
                        className="text-sm font-medium text-slate-200"
                      >
                        Require valid ID
                      </label>
                      <p id="require-id-hint" className="mt-1 text-xs leading-relaxed text-slate-400">
                        Require ID from regular commuters. Student, Senior, and PWD applicants always need one
                        for their discount.
                      </p>
                    </div>
                    <ConfigSwitch
                      id="require-id"
                      checked={config.requireIdUpload}
                      onChange={(value) => set('requireIdUpload', value)}
                    />
                  </div>
                  <div className="flex items-start gap-3 py-5">
                    <Smartphone
                      size={18}
                      className="mt-1 hidden shrink-0 text-slate-400 @[24rem]/app-config:block"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        id="verify-phone-label"
                        htmlFor="verify-phone"
                        className="text-sm font-medium text-slate-200"
                      >
                        Verify phone number
                      </label>
                      <p id="verify-phone-hint" className="mt-1 text-xs leading-relaxed text-slate-400">
                        Require a one-time code sent to the commuter&apos;s mobile number.
                      </p>
                    </div>
                    <ConfigSwitch
                      id="verify-phone"
                      checked={config.requirePhoneVerification}
                      onChange={(value) => set('requirePhoneVerification', value)}
                    />
                  </div>
                </div>
              </section>
            </fieldset>

            <div className="sticky bottom-0 flex flex-col gap-3 rounded-xl border border-[#23344F] bg-[#0E1628]/95 p-4 backdrop-blur @[28rem]/app-config:flex-row @[28rem]/app-config:items-center @[28rem]/app-config:justify-between">
              <p
                role="status"
                className={`flex min-w-0 items-center gap-2 text-xs ${isSaved && !hasChanges ? 'text-emerald-300' : 'text-slate-400'}`}
              >
                {isSaved && !hasChanges && <Check size={16} className="shrink-0" aria-hidden="true" />}
                {isSaving
                  ? 'Saving your changes...'
                  : hasChanges
                    ? 'You have unsaved changes.'
                    : isSaved
                      ? 'Changes saved.'
                      : 'Changes apply after saving.'}
              </p>
              <button
                type="submit"
                disabled={isSaving || pendingMaintenanceMode !== null || !hasChanges}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4A8BD4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CB9F0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Save size={17} aria-hidden="true" />
                )}
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
        {pendingMaintenanceMode !== null && (
          <MaintenanceConfirmation
            enabled={pendingMaintenanceMode}
            message={config.maintenanceMessage.trim() || defaultAppConfiguration.maintenanceMessage}
            isSaving={isSaving}
            error={maintenanceError}
            onCancel={() => setPendingMaintenanceMode(null)}
            onConfirm={() => void confirmMaintenanceMode()}
          />
        )}
      </div>
    </div>
  );
}
