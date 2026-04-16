// app/(admin)/monitoring/page.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Gauge, Clock, MapPin, AlertTriangle } from 'lucide-react';

const AdminCommuterMap = dynamic(() => import('@/components/admin/admin-commuter-map'), { 
  ssr: false,
  loading: () => <p className="text-white text-center">Loading map...</p> 
});

interface SosAlert {
  id: string;
  conductor: string;
  vehicle: string;
  message: string;
  time: string;
  coordinates: string;
}

export default function MonitoringPage() {
  // Real-time mock SOS state
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([
    { 
      id: 'sos-001', 
      conductor: 'Juan Dela Cruz', 
      vehicle: 'ABC-123', 
      message: 'Panic button triggered by conductor!', 
      time: 'Just now', 
      coordinates: '14.5995, 120.9842' 
    },
  ]);

  const metrics = [
    { title: 'Overspeeding', value: '0', icon: Gauge, color: 'text-red-400' },
    { title: 'Congestion', value: '0', icon: Clock, color: 'text-yellow-400' },
    { title: 'Demand Heatmap', value: '0', icon: MapPin, color: 'text-blue-400' },
  ];

  // Handler for Admin Confirmation
  const handleConfirmSos = (alertId: string) => {
    // In production, this is where you trigger the Laravel API 
    // to send a push notification to the commuter/conductor to close their SOS screen.
    setSosAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

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

      {/* Real-Time SOS Alert Display */}
      {sosAlerts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle size={20} className="text-red-500" />
            <h2 className="text-xl font-bold text-red-400">Active SOS Alerts ({sosAlerts.length})</h2>
            {/* Pulsing live indicator */}
            <span className="relative flex h-3 w-3 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
          
          <div className="space-y-3">
            {sosAlerts.map((alert) => (
              <GlassCard key={alert.id} className="p-4 bg-red-900/20 border-2 border-red-500/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="text-red-400 mt-0.5 flex-shrink-0" size={24} />
                    <div>
                      <p className="text-base font-semibold text-white">{alert.message}</p>
                      <p className="text-sm text-gray-300 mt-1">
                        Vehicle: <span className="font-medium text-white">{alert.vehicle}</span> | Conductor: <span className="font-medium text-white">{alert.conductor}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1 font-mono">Coords: {alert.coordinates}</p>
                      <div className="flex items-center text-xs text-gray-400 mt-2">
                        <Clock size={12} className="mr-1" />
                        {alert.time}
                      </div>
                    </div>
                  </div>
                  
                  {/* Admin Confirmation Button */}
                  <button
                    onClick={() => handleConfirmSos(alert.id)}
                    className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-500/25"
                  >
                    Confirm & Resolve SOS
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-280px)]">
        <AdminCommuterMap isDesktop={true} />
      </div>
    </>
  );
}