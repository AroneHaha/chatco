// app/(admin)/settings/safety-notifications/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Save, PhoneCall, MessageSquare } from 'lucide-react';

interface NotificationTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  variables: string[];
}

export default function SafetyNotificationsPage() {
  const [emergencyHotline, setEmergencyHotline] = useState('911');
  const [adminSOSEmail, setAdminSOSEmail] = useState('admin@chatco.com');

  const [templates, setTemplates] = useState<NotificationTemplate[]>([
    {
      id: 'sos-admin',
      title: 'SOS Alert (To Admin)',
      description: 'Sent to the admin dashboard when a conductor triggers the panic button.',
      content: '🚨 EMERGENCY ALERT!\n\nUnit: {vehiclePlate}\nConductor: {conductorName}\nLocation: {latitude}, {longitude}\nTime: {timestamp}\n\nImmediate action required!',
      variables: ['{vehiclePlate}', '{conductorName}', '{latitude}', '{longitude}', '{timestamp}'],
    },
    {
      id: 'wallet-loaded',
      title: 'Wallet Loaded (To Commuter)',
      description: 'Sent to the commuter when they successfully top up their wallet.',
      content: 'Hi {commuterName}! 💵\n\nYour Chatco wallet has been successfully loaded with ₱{amount}. Your new balance is ₱{newBalance}.\n\nKeep safe on your ride!',
      variables: ['{commuterName}', '{amount}', '{newBalance}'],
    },
    {
      id: 'ride-receipt',
      title: 'Digital Receipt (To Commuter)',
      description: 'Sent after a cashless transaction is completed.',
      content: '🧾 Ride Receipt\n\nPlate: {vehiclePlate}\nRoute: {routeName}\nFare: ₱{fareAmount}\nPayment: {paymentMethod}\nDate: {date}\n\nThank you for riding with Chatco!',
      variables: ['{vehiclePlate}', '{routeName}', '{fareAmount}', '{paymentMethod}', '{date}'],
    }
  ]);

  const [isSaved, setIsSaved] = useState(false);

  const handleTemplateChange = (id: string, newContent: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, content: newContent } : t));
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-6">Safety & Notifications</h1>
      
      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        
        {/* Emergency Contacts */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <PhoneCall size={20} className="text-red-400" />
            <span>Emergency Contacts</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Emergency Hotline Number</label>
              <p className="text-xs text-gray-500 mb-2">Displayed to conductors in case of severe emergencies.</p>
              <input 
                type="text" 
                value={emergencyHotline} 
                onChange={(e) => { setEmergencyHotline(e.target.value); setIsSaved(false); }} 
                className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Admin SOS Notification Email</label>
              <p className="text-xs text-gray-500 mb-2">Receives a backup email when an SOS is triggered.</p>
              <input 
                type="email" 
                value={adminSOSEmail} 
                onChange={(e) => { setAdminSOSEmail(e.target.value); setIsSaved(false); }} 
                className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500" 
              />
            </div>
          </div>
        </GlassCard>

        {/* Notification Templates */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <MessageSquare size={20} className="text-red-400" />
            <span>Push Notification Templates</span>
          </h2>
          <p className="text-xs text-gray-500 mb-6">Use the variables in curly braces to inject dynamic data into the messages.</p>
          
          <div className="space-y-6">
            {templates.map((template) => (
              <div key={template.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="mb-3">
                  <h3 className="text-base font-semibold text-white">{template.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                </div>
                
                <textarea 
                  value={template.content}
                  onChange={(e) => handleTemplateChange(template.id, e.target.value)}
                  rows={4}
                  className="w-full bg-black/30 border border-white/20 rounded-md text-white text-sm p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                />
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {template.variables.map((variable) => (
                    <span key={variable} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30 font-mono">
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <button type="submit" className="flex items-center space-x-2 px-6 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">
          <Save size={18} />
          <span>{isSaved ? 'Changes Saved!' : 'Save Settings'}</span>
        </button>
      </form>
    </>
  );
}