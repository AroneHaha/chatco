// app/(admin)/settings/safety-notifications/page.tsx
'use client';

import { useState } from 'react';
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

  const inputClasses = "block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";
  const textareaClasses = "w-full bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-xs sm:text-sm p-3 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] resize-none font-mono leading-relaxed";
  const labelClasses = "block text-xs font-medium text-slate-300 mb-1.5";

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="pt-2"><BackButton href="/settings" /></div>
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Safety & Notifications</h1>
        </div>

        <form onSubmit={handleSave}>
          <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 sm:p-6 space-y-6">

            {/* Emergency Contacts */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PhoneCall size={16} className="text-red-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emergency Contacts</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Emergency Hotline Number</label>
                  <p className="text-xs text-slate-500 mb-2">Displayed to conductors in case of severe emergencies.</p>
                  <input type="text" value={safetyConfig.emergencyHotline} onChange={(e) => handleSafetyChange('emergencyHotline', e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>Admin SOS Notification Email</label>
                  <p className="text-xs text-slate-500 mb-2">Receives a backup email when an SOS is triggered.</p>
                  <input type="email" value={safetyConfig.adminSOSEmail} onChange={(e) => handleSafetyChange('adminSOSEmail', e.target.value)} className={inputClasses} />
                </div>
              </div>
            </div>

            <hr className="border-[#1E2D45]" />

            {/* Push Notification Templates */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-[#62A0EA]" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Push Notification Templates</p>
              </div>
              <p className="text-xs text-slate-400 mb-4">Use the variables in curly braces to inject dynamic data.</p>
              <div className="space-y-4">
                {templates.map((template: NotificationTemplate) => (
                  <div key={template.id} className="p-4 bg-[#0E1628] rounded-md border border-[#1E2D45]">
                    <h3 className="text-sm sm:text-base font-semibold text-white break-words">{template.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 break-words">{template.description}</p>
                    <textarea value={template.content} onChange={(e) => handleTemplateChange(template.id, e.target.value)} rows={4} className={`${textareaClasses} mt-3`} />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {template.variables.map((variable: string) => (
                        <span key={variable} className="px-2 py-0.5 bg-[#62A0EA]/20 text-[#62A0EA] text-[10px] sm:text-xs rounded-full border border-[#62A0EA]/30 font-mono">{variable}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-[#1E2D45]" />

            {/* Account Registration Emails */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Mail size={16} className="text-sky-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Registration Emails</p>
              </div>

              <div className="mb-4">
                <label className={labelClasses}>Sender Gmail Address</label>
                <p className="text-xs text-slate-500 mb-2">The email address that will appear as the sender for registration emails.</p>
                <input type="email" value={safetyConfig.senderGmail} onChange={(e) => handleSafetyChange('senderGmail', e.target.value)} placeholder="noreply@chatco.com" className={inputClasses} />
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-sky-400/5 rounded-md border border-sky-400/20">
                  <h3 className="text-sm sm:text-base font-semibold text-sky-400 break-words">Successful Account Creation</h3>
                  <p className="text-xs text-slate-400 mt-1 break-words">Sent when the admin approves and verifies the commuter&apos;s ID.</p>
                  <textarea value={accountApprovedTemplate} onChange={(e) => { setAccountApprovedTemplate(e.target.value); setIsSaved(false); }} rows={6} className={`${textareaClasses} mt-3`} style={{ '--tw-ring-color': 'rgb(56 189 248)' } as any} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {approvedTemplateVariables.map((variable: string) => (
                      <span key={variable} className="px-2 py-0.5 bg-sky-400/20 text-sky-300 text-[10px] sm:text-xs rounded-full border border-sky-400/30 font-mono">{variable}</span>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-red-500/5 rounded-md border border-red-500/20">
                  <h3 className="text-sm sm:text-base font-semibold text-red-400 break-words">Rejected Account Creation</h3>
                  <p className="text-xs text-slate-400 mt-1 break-words">Sent when the admin rejects the registration due to invalid ID.</p>
                  <textarea value={accountRejectedTemplate} onChange={(e) => { setAccountRejectedTemplate(e.target.value); setIsSaved(false); }} rows={6} className={`${textareaClasses} mt-3`} style={{ '--tw-ring-color': 'rgb(239 68 68)' } as any} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rejectedTemplateVariables.map((variable: string) => (
                      <span key={variable} className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[10px] sm:text-xs rounded-full border border-red-500/30 font-mono">{variable}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
          <div className="flex justify-center pt-6 pb-8">
            <button type="submit" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#62A0EA] text-white font-medium rounded-lg hover:bg-[#4A8BD4] transition-colors active:scale-95">
              <Save size={18} /><span>{isSaved ? 'Changes Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}