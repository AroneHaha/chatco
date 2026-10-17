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
  Check,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { defaultAppConfiguration, type AppConfiguration } from '@/app/(admin)/settings/data/settings-data';
import { getSettings, updateSetting } from '@/lib/admin/services/setting.service';
import { MAINTENANCE_ROLES, parseMaintenanceRoles, type MaintenanceRole } from '@/lib/maintenance';

const ROLE_LABELS: Record<MaintenanceRole, string> = { COMMUTER: 'Commuters', CONDUCTOR: 'Conductors' };

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
        className={`relative h-6 w-11 rounded-full bg-[#2A3951] admin-light:bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#8CB9F0] admin-light:peer-focus-visible:ring-[#1A5FB4] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#111A2B] admin-light:peer-focus-visible:ring-offset-white peer-disabled:opacity-50 ${tone === 'amber' ? 'peer-checked:bg-amber-500' : 'peer-checked:bg-[#62A0EA] admin-light:peer-checked:bg-[#1A5FB4]'}`}
      />
    </label>
  );
}

function SaveConfirmation({
  enabled,
  roles,
  message,
  requireIdUpload,
  isSaving,
  error,
  onCancel,
  onConfirm,
  theme,
}: {
  enabled: boolean;
  roles: MaintenanceRole[];
  message: string;
  requireIdUpload: boolean;
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  /** The `data-admin-theme` scope the form sits in; the portal leaves it. */
  theme?: string;
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
      data-admin-theme={theme}
      role="alertdialog"
      aria-labelledby="config-confirm-title"
      aria-describedby="config-confirm-description"
      aria-busy={isSaving}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onCancel();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-[#23344F] admin-light:border-[#CBD5E1] bg-[#111A2B] admin-light:bg-white p-5 text-white admin-light:text-slate-900 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 admin-light:text-amber-700">
        <Save size={21} aria-hidden="true" />
      </span>
      <h2 id="config-confirm-title" className="text-lg font-semibold">
        Save all configuration changes?
      </h2>
      <p id="config-confirm-description" className="mt-2 text-sm leading-relaxed text-slate-400 admin-light:text-slate-500">
        {enabled
          ? `Maintenance will apply to ${roles.map(role => ROLE_LABELS[role].toLowerCase()).join(' and ')}. They will see your notice when signing in. Admin access stays available.`
          : 'Maintenance will be off. Commuters and conductors can sign in.'}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-400 admin-light:text-slate-500">
        Valid ID will be {requireIdUpload ? 'required' : 'optional'} for regular commuter signup.
        All changes apply after you confirm.
      </p>
      {enabled && (
        <div className="mt-4 rounded-lg border border-[#23344F] admin-light:border-[#CBD5E1] bg-[#0E1628] admin-light:bg-[#F8FAFC] p-3">
          <p className="text-xs font-medium text-slate-300 admin-light:text-slate-700">Message shown to users</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">
            {message}
          </p>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 admin-light:text-red-700"
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
          className="min-h-11 rounded-lg border border-[#23344F] admin-light:border-[#CBD5E1] px-4 text-sm font-medium text-slate-300 admin-light:text-slate-700 hover:bg-white/5 admin-light:hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CB9F0] admin-light:focus-visible:ring-[#1A5FB4] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={onConfirm}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-4 text-sm font-semibold text-white hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CB9F0] admin-light:focus-visible:ring-[#1A5FB4] disabled:opacity-50"
        >
          {isSaving && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
          {isSaving ? 'Saving...' : 'Confirm and save'}
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
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [confirmationTheme, setConfirmationTheme] = useState<string | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSettings('app');
      const loadedConfig = {
        maintenanceMode: data.maintenance_mode === 'true',
        maintenanceRoles: parseMaintenanceRoles(data.maintenance_roles),
        maintenanceMessage: data.maintenance_message?.trim()
          ? data.maintenance_message
          : defaultAppConfiguration.maintenanceMessage,
        requireIdUpload:
          data.require_id_upload !== undefined
            ? data.require_id_upload === 'true'
            : defaultAppConfiguration.requireIdUpload,
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
    (config.maintenanceMode !== savedConfig.maintenanceMode ||
      config.maintenanceMessage !== savedConfig.maintenanceMessage ||
      config.maintenanceRoles.join(',') !== savedConfig.maintenanceRoles.join(',') ||
      config.requireIdUpload !== savedConfig.requireIdUpload);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || showSaveConfirmation || !hasChanges) return;
    if (config.maintenanceRoles.length === 0) {
      setError('Select at least one role for maintenance.');
      return;
    }
    setError(null);
    setSaveError(null);
    // The dialog is portalled to <body>, outside this page's theme scope, so
    // it copies the scope the form sits in (same as RowActionsMenu).
    setConfirmationTheme(e.currentTarget.closest('[data-admin-theme]')?.getAttribute('data-admin-theme') ?? undefined);
    setShowSaveConfirmation(true);
  };

  const confirmSave = async () => {
    if (isSaving || !showSaveConfirmation || !hasChanges) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await Promise.all([
        updateSetting('maintenance_message', config.maintenanceMessage.trim(), 'app'),
        updateSetting('require_id_upload', String(config.requireIdUpload), 'app'),
        updateSetting('maintenance_roles', JSON.stringify(config.maintenanceRoles), 'app'),
      ]);
      // Save the selected roles and message before enabling maintenance.
      await updateSetting('maintenance_mode', String(config.maintenanceMode), 'app');
      setSavedConfig({ ...config });
      setIsSaved(true);
      setShowSaveConfirmation(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="@container/app-config min-w-0 px-4 pb-6 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <header className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#62A0EA]/20 admin-light:border-[#1A5FB4]/20 bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10 text-[#62A0EA] admin-light:text-[#1A5FB4]">
            <Settings2 size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white admin-light:text-slate-900">App Configuration</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-400 admin-light:text-slate-500">
              Manage app access and commuter signup.
            </p>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 admin-light:text-red-700"
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
            <div className="h-[25rem] rounded-xl border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#111A2B] admin-light:bg-white p-5 @[36rem]/app-config:h-80">
              <div className="animate-pulse space-y-5">
                <div className="h-5 w-40 rounded bg-[#23344F] admin-light:bg-slate-200" />
                <div className="h-4 w-3/4 rounded bg-[#23344F] admin-light:bg-slate-200" />
                <div className="h-24 rounded-lg bg-[#23344F] admin-light:bg-slate-200" />
                <div className="h-16 rounded-lg bg-[#23344F] admin-light:bg-slate-200" />
              </div>
            </div>
            <div className="h-72 rounded-xl border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#111A2B] admin-light:bg-white p-5">
              <div className="animate-pulse space-y-6">
                <div className="h-5 w-40 rounded bg-[#23344F] admin-light:bg-slate-200" />
                <div className="h-16 rounded-lg bg-[#23344F] admin-light:bg-slate-200" />
                <div className="h-16 rounded-lg bg-[#23344F] admin-light:bg-slate-200" />
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <fieldset disabled={isSaving || savedConfig === null} className="min-w-0 space-y-5">
              <legend className="sr-only">App settings</legend>
              <section
                aria-labelledby="maintenance-title"
                className={`min-w-0 overflow-hidden rounded-xl border bg-[#111A2B] admin-light:bg-white transition-colors ${config.maintenanceMode ? 'border-amber-500/40' : 'border-[#1E2D45] admin-light:border-[#E2E8F0]'}`}
              >
                <div className="border-b border-[#1E2D45] admin-light:border-[#E2E8F0] p-4 @[36rem]/app-config:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2
                        id="maintenance-title"
                        className="flex items-center gap-2 text-sm font-semibold text-white admin-light:text-slate-900"
                      >
                        <Wrench size={17} className="shrink-0 text-amber-400 admin-light:text-amber-700" aria-hidden="true" /> App
                        availability
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">
                        Control access while updates are in progress.
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-medium ${config.maintenanceMode ? 'bg-amber-500/10 text-amber-300 admin-light:text-amber-700' : 'bg-emerald-500/10 text-emerald-300 admin-light:text-emerald-700'}`}
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
                        className="text-sm font-medium text-slate-200 admin-light:text-slate-800"
                      >
                        Maintenance mode
                      </label>
                      <p id="maintenance-mode-hint" className="mt-1 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">
                        Pause access for the selected roles. Click Save all changes and confirm to apply; open apps update on their next status check.
                      </p>
                    </div>
                    <ConfigSwitch
                      id="maintenance-mode"
                      checked={config.maintenanceMode}
                      onChange={(value) => set('maintenanceMode', value)}
                      tone="amber"
                    />
                  </div>
                  <fieldset className="border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-5">
                    <legend className="px-1 text-sm font-medium text-slate-200 admin-light:text-slate-800">Who is affected?</legend>
                    <p id="maintenance-roles-hint" className="mb-3 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">
                      Choose one or both. Admins can always sign in. Save changes to update an active maintenance period.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {MAINTENANCE_ROLES.map(role => (
                        <label key={role} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[#23344F] admin-light:border-[#CBD5E1] bg-[#0E1628] admin-light:bg-[#F8FAFC] px-4 text-sm text-slate-200 admin-light:text-slate-800">
                          <input
                            type="checkbox"
                            checked={config.maintenanceRoles.includes(role)}
                            aria-describedby="maintenance-roles-hint"
                            onChange={event => set('maintenanceRoles', MAINTENANCE_ROLES.filter(candidate =>
                              candidate === role ? event.target.checked : config.maintenanceRoles.includes(candidate)
                            ))}
                            className="h-4 w-4 accent-[#62A0EA] admin-light:accent-[#1A5FB4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8CB9F0] admin-light:focus-visible:outline-[#1A5FB4]"
                          />
                          {ROLE_LABELS[role]}
                        </label>
                      ))}
                    </div>
                    {config.maintenanceRoles.length === 0 && (
                      <p role="alert" className="mt-2 text-xs text-amber-300 admin-light:text-amber-700">Select at least one role for maintenance.</p>
                    )}
                  </fieldset>
                  <div className="border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-5">
                    <label
                      htmlFor="maintenance-reason"
                      className="mb-2 block text-sm font-medium text-slate-300 admin-light:text-slate-700"
                    >
                      Reason
                    </label>
                    <select
                      id="maintenance-reason"
                      value={maintenanceReason}
                      onChange={(event) => selectMaintenanceReason(event.target.value)}
                      aria-describedby="maintenance-reason-hint"
                      className="block min-h-11 w-full min-w-0 rounded-lg border border-[#23344F] admin-light:border-[#CBD5E1] bg-[#0E1628] admin-light:bg-[#F8FAFC] px-3 text-base text-white admin-light:text-slate-900 outline-none transition-colors focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4] focus:ring-2 focus:ring-[#62A0EA]/20 admin-light:focus:ring-[#1A5FB4]/20 disabled:opacity-50 @[36rem]/app-config:text-sm"
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
                  <div className="grid min-w-0 gap-4 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-5 @[36rem]/app-config:grid-cols-2">
                    <div className="min-w-0">
                      <label
                        htmlFor="maintenance-message"
                        className="mb-2 block text-sm font-medium text-slate-300 admin-light:text-slate-700"
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
                        className="block min-h-28 w-full resize-y rounded-lg border border-[#23344F] admin-light:border-[#CBD5E1] bg-[#0E1628] admin-light:bg-[#F8FAFC] px-3 py-2.5 text-base text-white admin-light:text-slate-900 placeholder:text-slate-500 admin-light:placeholder:text-slate-400 outline-none transition-colors focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4] focus:ring-2 focus:ring-[#62A0EA]/20 admin-light:focus:ring-[#1A5FB4]/20 disabled:opacity-50 @[36rem]/app-config:text-sm"
                      />
                      <div className="mt-2 flex items-start justify-between gap-3 text-[11px] text-slate-500">
                        <p id="maintenance-message-hint">Leave blank to use the default message.</p>
                        <span className="shrink-0 tabular-nums">{config.maintenanceMessage.length}/500</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-2 text-xs font-medium text-slate-400 admin-light:text-slate-500">Message preview</p>
                      <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-[#23344F] admin-light:border-[#CBD5E1] bg-[#0E1628] admin-light:bg-[#F8FAFC] px-4 py-5 text-center">
                        <Wrench size={20} className="text-[#62A0EA] admin-light:text-[#1A5FB4]" aria-hidden="true" />
                        <p className="text-sm font-semibold text-white admin-light:text-slate-900">We&apos;ll be right back</p>
                        <p className="w-full whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">
                          {config.maintenanceMessage.trim() || defaultAppConfiguration.maintenanceMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section
                aria-labelledby="registration-title"
                className="min-w-0 overflow-hidden rounded-xl border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#111A2B] admin-light:bg-white"
              >
                <div className="border-b border-[#1E2D45] admin-light:border-[#E2E8F0] p-4 @[36rem]/app-config:p-5">
                  <h2
                    id="registration-title"
                    className="flex items-center gap-2 text-sm font-semibold text-white admin-light:text-slate-900"
                  >
                    <UserRoundPlus size={17} className="shrink-0 text-[#62A0EA] admin-light:text-[#1A5FB4]" aria-hidden="true" />{' '}
                    Commuter signup
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">
                    Choose the requirements for new accounts.
                  </p>
                </div>
                <div className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0] px-4 @[36rem]/app-config:px-5">
                  <div className="flex items-start gap-3 py-5">
                    <IdCard
                      size={18}
                      className="mt-1 hidden shrink-0 text-slate-400 admin-light:text-slate-500 @[24rem]/app-config:block"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        id="require-id-label"
                        htmlFor="require-id"
                        className="text-sm font-medium text-slate-200 admin-light:text-slate-800"
                      >
                        Require valid ID
                      </label>
                      <p id="require-id-hint" className="mt-1 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">
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
                </div>
              </section>
            </fieldset>

            <div className="sticky bottom-0 flex flex-col gap-3 rounded-xl border border-[#23344F] admin-light:border-[#CBD5E1] bg-[#0E1628]/95 admin-light:bg-white/95 p-4 backdrop-blur @[28rem]/app-config:flex-row @[28rem]/app-config:items-center @[28rem]/app-config:justify-between">
              <p
                role="status"
                className={`flex min-w-0 items-center gap-2 text-xs ${isSaved && !hasChanges ? 'text-emerald-300 admin-light:text-emerald-700' : 'text-slate-400 admin-light:text-slate-500'}`}
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
                disabled={isSaving || showSaveConfirmation || !hasChanges}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CB9F0] admin-light:focus-visible:ring-[#1A5FB4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Save size={17} aria-hidden="true" />
                )}
                {isSaving ? 'Saving...' : 'Save all changes'}
              </button>
            </div>
          </form>
        )}
        {showSaveConfirmation && (
          <SaveConfirmation
            enabled={config.maintenanceMode}
            roles={config.maintenanceRoles}
            message={config.maintenanceMessage.trim() || defaultAppConfiguration.maintenanceMessage}
            requireIdUpload={config.requireIdUpload}
            isSaving={isSaving}
            error={saveError}
            onCancel={() => setShowSaveConfirmation(false)}
            onConfirm={() => void confirmSave()}
            theme={confirmationTheme}
          />
        )}
      </div>
    </div>
  );
}
