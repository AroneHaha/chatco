// app/(admin)/settings/page.tsx
import Link from 'next/link';
import { Calculator, MapPin, Wallet, PiggyBank, Ticket, Gauge, Shield, MessageCircleQuestion, Settings2, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  const settingsModules = [
    { title: 'Fare Matrix', description: 'Set base fares and per-kilometer rates for all routes.', icon: Calculator, href: '/settings/fare-matrix', color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
    { title: 'Routes', description: 'Define new routes or edit existing ones, including waypoints.', icon: MapPin, href: '/settings/routes', color: 'text-green-400', bgColor: 'bg-green-500/15' },
    { title: 'Remittance Options', description: 'Add or edit who the conductors can remit money to.', icon: Wallet, href: '/settings/remittance-options', color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
    { title: 'Financial Rules', description: 'Manage wallet limits, commuter discounts, and loyalty rewards.', icon: PiggyBank, href: '/settings/financial-rules', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15' },
    { title: 'Voucher Generator', description: 'Generate bulk promo codes for free rides or wallet credits.', icon: Ticket, href: '/settings/voucher-generator', color: 'text-pink-400', bgColor: 'bg-pink-500/15' },
    { title: 'Operations Rules', description: 'Set speed limits, shift durations, and expense categories.', icon: Gauge, href: '/settings/operations-rules', color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
    { title: 'Safety & Notifications', description: 'Set emergency hotlines and customize push notification texts.', icon: Shield, href: '/settings/safety-notifications', color: 'text-red-400', bgColor: 'bg-red-500/15' },
    { title: 'FAQ Management', description: 'Manage questions and answers for the commuter AI assistant.', icon: MessageCircleQuestion, href: '/settings/faq-management', color: 'text-cyan-400', bgColor: 'bg-cyan-500/15' },
    { title: 'App Configuration', description: 'Toggle maintenance mode and set registration requirements.', icon: Settings2, href: '/settings/app-configuration', color: 'text-slate-300', bgColor: 'bg-slate-500/15' },
  ];

  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-6">System Settings</h1>
      <div className="max-w-3xl">
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg overflow-hidden divide-y divide-[#1E2D45]">
          {settingsModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <Link key={index} href={module.href} className="block">
                <div className="flex items-center gap-4 px-5 py-4 hover:bg-[#1A2540] transition-colors">
                  <div className={`p-2.5 rounded-lg ${module.bgColor}`}>
                    <Icon className={module.color} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white">{module.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{module.description}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-500 flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}