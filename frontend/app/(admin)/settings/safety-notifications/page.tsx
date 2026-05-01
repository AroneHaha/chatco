// app/(admin)/settings/safety-notifications/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import BackButton from '@/components/admin/ui/back-button';
import { Save, PhoneCall, MessageSquare, Mail } from 'lucide-react';
import {
  defaultSafetyConfig,
  initialNotificationTemplates,
  initialAccountApprovedTemplate,
  initialAccountRejectedTemplate,
  approvedTemplateVariables,
  rejectedTemplateVariables,
  type NotificationTemplate,
  type SafetyConfig,
} from '@/app/(admin)/settings/data/settings-data';

export default function SafetyNotificationsPage() {
  const [safetyConfig, setSafetyConfig] = useState<SafetyConfig>({ ...defaultSafetyConfig });
  const [templates, setTemplates] = useState<NotificationTemplate[]>([...initialNotificationTemplates]);
  const [accountApprovedTemplate, setAccountApprovedTemplate] = useState(initialAccountApprovedTemplate);
  const [accountRejectedTemplate, setAccountRejectedTemplate] = useState(initialAccountRejectedTemplate);
  const [isSaved, setIsSaved] = useState(false);

  const handleTemplateChange = (id: string, newContent: string) => {
    setTemplates(prev => prev.map((t: NotificationTemplate) => t.id === id ? { ...t, content: newContent } : t));
    setIsSaved(false);
  };

  const handleSafetyChange = (field: keyof SafetyConfig, value: string) => {
    setSafetyConfig(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        
        {/* Left-aligned Back Button */}
        <div className="pt-2">
          <BackButton href="/settings" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Safety & Notifications</h1>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Emergency Contacts */}
          <GlassCard className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <PhoneCall size={20} className="text-red-400 flex-shrink-0" />
              <span>Emergency Contacts</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Emergency Hotline Number</label>
                <p className="text-xs text-gray-500 mb-2">Displayed to conductors in case of severe emergencies.</p>
                <input 
                  type="text" 
                  value={safetyConfig.emergencyHotline} 
                  onChange={(e) => handleSafetyChange('emergencyHotline', e.target.value)} 
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Admin SOS Notification Email</label>
                <p className="text-xs text-gray-500 mb-2">Receives a backup email when an SOS is triggered.</p>
                <input 
                  type="email" 
                  value={safetyConfig.adminSOSEmail} 
                  onChange={(e) => handleSafetyChange('adminSOSEmail', e.target.value)} 
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                />
              </div>
            </div>
          </GlassCard>

          {/* Notification Templates */}
          <GlassCard className="p-4 sm:p-6">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                <MessageSquare size={20} className="text-cyan-400 flex-shrink-0" />
                <span>Push Notification Templates</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">Use the variables in curly braces to inject dynamic data into the messages.</p>
            </div>
            
            <div className="space-y-6">
              {templates.map((template: NotificationTemplate) => (
                <div key={template.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="mb-3">
                    <h3 className="text-sm sm:text-base font-semibold text-white break-words">{template.title}</h3>
                    <p className="text-xs text-gray-400 mt-1 break-words">{template.description}</p>
                  </div>
                  
                  <textarea 
                    value={template.content}
                    onChange={(e) => handleTemplateChange(template.id, e.target.value)}
                    rows={4}
                    className="w-full bg-black/30 border border-white/20 rounded-lg text-white text-xs sm:text-sm p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono leading-relaxed"
                  />
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.variables.map((variable: string) => (
                      <span key={variable} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] sm:text-xs rounded-full border border-blue-500/30 font-mono">
                        {variable}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Account Registration Gmail Sender */}
          <GlassCard className="p-4 sm:p-6">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                <Mail size={20} className="text-green-400 flex-shrink-0" />
                <span>Account Registration Emails</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">Email templates sent to commuters upon registration review.</p>
            </div>

            {/* Gmail Sender Configuration */}
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Sender Gmail Address</label>
              <p className="text-xs text-gray-500 mb-2">The email address that will appear as the sender for these registration emails.</p>
              <input 
                type="email" 
                value={safetyConfig.senderGmail} 
                onChange={(e) => handleSafetyChange('senderGmail', e.target.value)} 
                placeholder="noreply@chatco.com"
                className="block w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder-gray-600" 
              />
            </div>

            <div className="space-y-6">
              {/* Successful Account Template */}
              <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/20">
                <div className="mb-3">
                  <h3 className="text-sm sm:text-base font-semibold text-green-400 break-words"> Successful Account Creation</h3>
                  <p className="text-xs text-gray-400 mt-1 break-words">Sent when the admin approves and verifies the commuter&apos;s ID.</p>
                </div>
                
                <textarea 
                  value={accountApprovedTemplate}
                  onChange={(e) => { setAccountApprovedTemplate(e.target.value); setIsSaved(false); }}
                  rows={6}
                  className="w-full bg-black/30 border border-white/20 rounded-lg text-white text-xs sm:text-sm p-3 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none font-mono leading-relaxed"
                />
                
                <div className="mt-3 flex flex-wrap gap-2">
                  {approvedTemplateVariables.map((variable: string) => (
                    <span key={variable} className="px-2 py-0.5 bg-green-500/20 text-green-300 text-[10px] sm:text-xs rounded-full border border-green-500/30 font-mono">
                      {variable}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rejected Account Template */}
              <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                <div className="mb-3">
                  <h3 className="text-sm sm:text-base font-semibold text-red-400 break-words"> Rejected Account Creation</h3>
                  <p className="text-xs text-gray-400 mt-1 break-words">Sent when the admin rejects the registration due to invalid ID or information.</p>
                </div>
                
                <textarea 
                  value={accountRejectedTemplate}
                  onChange={(e) => { setAccountRejectedTemplate(e.target.value); setIsSaved(false); }}
                  rows={6}
                  className="w-full bg-black/30 border border-white/20 rounded-lg text-white text-xs sm:text-sm p-3 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none font-mono leading-relaxed"
                />
                
                <div className="mt-3 flex flex-wrap gap-2">
                  {rejectedTemplateVariables.map((variable: string) => (
                    <span key={variable} className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[10px] sm:text-xs rounded-full border border-red-500/30 font-mono">
                      {variable}
                    </span>
                  ))}
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
              <span>{isSaved ? 'Changes Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}