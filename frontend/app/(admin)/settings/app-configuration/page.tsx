// app/(admin)/settings/app-configuration/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, AlertTriangle, AlertCircle } from 'lucide-react';
import { defaultAppConfiguration, type AppConfiguration } from '@/app/(admin)/settings/data/settings-data';
import { getSettings, updateSetting } from '@/lib/admin/services/setting.service';

export default function AppConfigurationPage() {
  const [config, setConfig] = useState<AppConfiguration>({ ...defaultAppConfiguration });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSettings('app');
      setConfig({
        maintenanceMode: data.maintenance_mode === 'true',
        maintenanceMessage: data.maintenance_message?.trim()
          ? data.maintenance_message
          : defaultAppConfiguration.maintenanceMessage,
        requireIdUpload: data.require_id_upload !== undefined ? data.require_id_upload === 'true' : defaultAppConfiguration.requireIdUpload,
        requirePhoneVerification: data.require_phone_verification === 'true',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await Promise.all([
        updateSetting('maintenance_mode', String(config.maintenanceMode), 'app'),
        updateSetting('maintenance_message', config.maintenanceMessage.trim(), 'app'),
        updateSetting('require_id_upload', String(config.requireIdUpload), 'app'),
        updateSetting('require_phone_verification', String(config.requirePhoneVerification), 'app'),
      ]);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-12 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="h-8 w-56 rounded bg-gray-700 animate-pulse mx-auto" />
          <div className="h-32 bg-[#131C2E] border border-[#1E2D45] rounded-lg animate-pulse" />
          <div className="h-48 bg-[#131C2E] border border-[#1E2D45] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">App Configuration</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">

          {/* Maintenance Mode */}
          <div className="bg-[#131C2E] border border-[#1E2D45] p-4 sm:p-6 border-2 border-transparent has-[:checked]:border-yellow-500/50 transition-colors rounded-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                  <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0" />
                  <span>Maintenance Mode</span>
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  When enabled, the public landing page shows a maintenance screen and the Commuter app is blocked. Admins and Conductors can still log in.
                </p>
              </div>

              <div className="w-full sm:w-auto flex justify-start sm:justify-end flex-shrink-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.maintenanceMode}
                    onChange={(e) => { setConfig(prev => ({ ...prev, maintenanceMode: e.target.checked })); setIsSaved(false); }}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-[#1E2D45] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </div>
            </div>

            {/* Maintenance message — what visitors see on the landing page. */}
            <div className="mt-5 pt-5 border-t border-[#1E2D45]">
              <label htmlFor="maintenance-message" className="block text-sm font-medium text-slate-300 mb-1.5">
                Maintenance message
              </label>
              <textarea
                id="maintenance-message"
                value={config.maintenanceMessage}
                onChange={(e) => { setConfig(prev => ({ ...prev, maintenanceMessage: e.target.value })); setIsSaved(false); }}
                rows={3}
                maxLength={500}
                placeholder="e.g. We're upgrading CHATCO and will be back shortly. Thanks for your patience!"
                className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] resize-none disabled:opacity-50"
                disabled={!config.maintenanceMode}
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Shown on the landing-page maintenance screen. Leave blank to use the default message.
              </p>
            </div>
          </div>

          {/* Registration Requirements */}
          <div className="bg-[#131C2E] border border-[#1E2D45] p-4 sm:p-6 rounded-lg">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Commuter Registration Requirements</h2>
              <p className="text-sm text-slate-400 mt-1">Toggle fields to mandatory during the commuter signup process.</p>
            </div>

            <div className="space-y-6">
              {/* Require ID Upload */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-white font-medium">Force Valid ID Upload</p>
                  <p className="text-xs text-slate-500 mt-0.5">Commuters cannot register without uploading a picture of their ID.</p>
                </div>
                <div className="w-full sm:w-auto flex justify-start sm:justify-end flex-shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.requireIdUpload}
                      onChange={(e) => { setConfig(prev => ({ ...prev, requireIdUpload: e.target.checked })); setIsSaved(false); }}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-[#1E2D45] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#62A0EA]"></div>
                  </label>
                </div>
              </div>

              <hr className="border-[#1E2D45]" />

              {/* Require Phone Verification */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-white font-medium">Require Phone Number Verification</p>
                  <p className="text-xs text-slate-500 mt-0.5">Commuters must input a valid OTP sent to their mobile number.</p>
                </div>
                <div className="w-full sm:w-auto flex justify-start sm:justify-end flex-shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.requirePhoneVerification}
                      onChange={(e) => { setConfig(prev => ({ ...prev, requirePhoneVerification: e.target.checked })); setIsSaved(false); }}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-[#1E2D45] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#62A0EA]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center pt-2 pb-8">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#62A0EA] text-white font-medium rounded-lg hover:bg-[#4A8BD4] transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              <span>{isSaving ? 'Saving...' : isSaved ? 'Configuration Saved!' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
