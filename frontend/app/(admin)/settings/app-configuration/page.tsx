// app/(admin)/settings/app-configuration/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Save, AlertTriangle } from 'lucide-react';

export default function AppConfigurationPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [requireIdUpload, setRequireIdUpload] = useState(true);
  const [requirePhoneVerification, setRequirePhoneVerification] = useState(false);

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-6">App Configuration</h1>
      
      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        
        {/* Maintenance Mode */}
        <GlassCard className="p-6 border-2 border-transparent has-[:checked]:border-yellow-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                <AlertTriangle size={20} className="text-yellow-400" />
                <span>Maintenance Mode</span>
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                When enabled, the Commuter app shows a maintenance screen. Admins and Conductors can still log in.
              </p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={maintenanceMode} 
                onChange={(e) => { setMaintenanceMode(e.target.checked); setIsSaved(false); }} 
                className="sr-only peer" 
              />
              <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-500"></div>
            </label>
          </div>
        </GlassCard>

        {/* Registration Requirements */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Commuter Registration Requirements</h2>
          <p className="text-sm text-gray-400 mb-6">Toggle fields to mandatory during the commuter signup process.</p>
          
          <div className="space-y-6">
            {/* Require ID Upload */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Force Valid ID Upload</p>
                <p className="text-xs text-gray-500">Commuters cannot register without uploading a picture of their ID.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={requireIdUpload} 
                  onChange={(e) => { setRequireIdUpload(e.target.checked); setIsSaved(false); }} 
                  className="sr-only peer" 
                />
                <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <hr className="border-white/10" />

            {/* Require Phone Verification */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Require Phone Number Verification</p>
                <p className="text-xs text-gray-500">Commuters must input a valid OTP sent to their mobile number.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={requirePhoneVerification} 
                  onChange={(e) => { setRequirePhoneVerification(e.target.checked); setIsSaved(false); }} 
                  className="sr-only peer" 
                />
                <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </div>
        </GlassCard>

        <button type="submit" className="flex items-center space-x-2 px-6 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">
          <Save size={18} />
          <span>{isSaved ? 'Configuration Saved!' : 'Save Configuration'}</span>
        </button>
      </form>
    </>
  );
}