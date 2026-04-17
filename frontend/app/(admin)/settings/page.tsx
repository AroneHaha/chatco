// app/(admin)/settings/page.tsx
import Link from 'next/link';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Calculator, MapPin, Wallet, PiggyBank, Ticket, Gauge, Shield, MessageCircleQuestion, Settings2 } from 'lucide-react';

export default function SettingsPage() {
  const settingsModules = [
    {
      title: 'Fare Matrix',
      description: 'Set base fares and per-kilometer rates for all routes.',
      icon: Calculator,
      href: '/settings/fare-matrix',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
    },
    {
      title: 'Routes',
      description: 'Define new routes or edit existing ones, including waypoints.',
      icon: MapPin,
      href: '/settings/routes',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
    },
    {
      title: 'Remittance Options',
      description: 'Add or edit who the conductors can remit money to.',
      icon: Wallet,
      href: '/settings/remittance-options',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
    },
    {
      title: 'Financial Rules',
      description: 'Manage wallet limits, commuter discounts, and loyalty rewards.',
      icon: PiggyBank,
      href: '/settings/financial-rules',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
    },
    {
      title: 'Voucher Generator',
      description: 'Generate bulk promo codes for free rides or wallet credits.',
      icon: Ticket,
      href: '/settings/voucher-generator',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      borderColor: 'border-pink-500/30',
    },
    {
      title: 'Operations Rules',
      description: 'Set speed limits, shift durations, and expense categories.',
      icon: Gauge,
      href: '/settings/operations-rules',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
    },
    {
      title: 'Safety & Notifications',
      description: 'Set emergency hotlines and customize push notification texts.',
      icon: Shield,
      href: '/settings/safety-notifications',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
    },
    {
      title: 'FAQ Management',
      description: 'Manage questions and answers for the commuter AI assistant.',
      icon: MessageCircleQuestion,
      href: '/settings/faq-management',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/30',
    },
    {
      title: 'App Configuration',
      description: 'Toggle maintenance mode and set registration requirements.',
      icon: Settings2,
      href: '/settings/app-configuration',
      color: 'text-gray-300',
      bgColor: 'bg-white/10',
      borderColor: 'border-white/20',
    },
  ];

  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-6">System Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsModules.map((module, index) => {
          const Icon = module.icon;
          return (
            <Link key={index} href={module.href}>
              <GlassCard className="p-6 h-full hover:bg-white/5 transition-colors cursor-pointer">
                <div className={`inline-flex p-3 rounded-lg ${module.bgColor} ${module.borderColor} border mb-4`}>
                  <Icon className={module.color} size={24} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{module.title}</h3>
                <p className="text-sm text-gray-400">{module.description}</p>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </>
  );
}