// app/(admin)/settings/app-configuration/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card'; 
import BackButton from '@/components/admin/ui/back-button';       
import { Save, AlertTriangle } from 'lucide-react';
import { defaultAppConfiguration, type AppConfiguration } from '@/app/(admin)/settings/data/settings-data';

export default function AppConfigurationPage() {
  const [config, setConfig] = useState<AppConfiguration>({ ...defaultAppConfiguration });
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        
        {/* Left-aligned Back Button */}
        <div className="pt-2">
          <BackButton href="/settings" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">App Configuration</h1>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Maintenance Mode */}
          <GlassCard className="p-4 sm:p-6 border-2 border-transparent has-[:checked]:border-yellow-500/50 transition-colors">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                  <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0" />
                  <span>Maintenance Mode</span>
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  When enabled, the Commuter app shows a maintenance screen. Admins and Conductors can still log in.
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
                  <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </div>
            </div>
          </GlassCard>

          {/* Registration Requirements */}
          <GlassCard className="p-4 sm:p-6">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Commuter Registration Requirements</h2>
              <p className="text-sm text-gray-400 mt-1">Toggle fields to mandatory during the commuter signup process.</p>
            </div>
            
            <div className="space-y-6">
              {/* Require ID Upload */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-white font-medium">Force Valid ID Upload</p>
                  <p className="text-xs text-gray-500 mt-0.5">Commuters cannot register without uploading a picture of their ID.</p>
                </div>
                <div className="w-full sm:w-auto flex justify-start sm:justify-end flex-shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.requireIdUpload} 
                      onChange={(e) => { setConfig(prev => ({ ...prev, requireIdUpload: e.target.checked })); setIsSaved(false); }} 
                      className="sr-only peer" 
                    />
                    <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>

              <hr className="border-white/10" />

              {/* Require Phone Verification */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-white font-medium">Require Phone Number Verification</p>
                  <p className="text-xs text-gray-500 mt-0.5">Commuters must input a valid OTP sent to their mobile number.</p>
                </div>
                <div className="w-full sm:w-auto flex justify-start sm:justify-end flex-shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.requirePhoneVerification} 
                      onChange={(e) => { setConfig(prev => ({ ...prev, requirePhoneVerification: e.target.checked })); setIsSaved(false); }} 
                      className="sr-only peer" 
                    />
                    <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Mobile-Friendly Save Button */}
          <div className="flex justify-center pt-2 pb-8">
            <button 
              type="submit" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors active:scale-95"
            >
              <Save size={18} />
              <span>{isSaved ? 'Configuration Saved!' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}