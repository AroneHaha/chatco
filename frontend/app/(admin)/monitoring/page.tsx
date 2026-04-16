// app/(admin)/monitoring/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Gauge, Clock, MapPin } from 'lucide-react';

const AdminCommuterMap = dynamic(() => import('@/components/admin/admin-commuter-map'), { 
  ssr: false,
  loading: () => <p className="text-white text-center">Loading map...</p> 
});

export default function MonitoringPage() {
  const metrics = [
    { title: 'Overspeeding', value: '0', icon: Gauge, color: 'text-red-400' },
    { title: 'Congestion', value: '0', icon: Clock, color: 'text-yellow-400' },
    { title: 'Demand Heatmap', value: '0', icon: MapPin, color: 'text-blue-400' },
  ];

  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-6">Live Monitoring</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {metrics.map((item, index) => {
          const Icon = item.icon;
          return (
            <GlassCard key={index} className="p-4 flex items-center space-x-4">
              <div className={`p-3 bg-gray-800/50 rounded-full ${item.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">{item.title}</p>
                <p className="text-2xl font-bold text-white">{item.value}</p>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="h-[calc(100vh-280px)]">
        <AdminCommuterMap isDesktop={true} />
      </div>
    </>
  );
}