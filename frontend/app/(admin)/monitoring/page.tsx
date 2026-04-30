// app/(admin)/monitoring/page.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Gauge, Clock, MapPin, AlertTriangle, Archive } from 'lucide-react';
import { liveVehicleTracking } from './data/data-monitoring';

// Dynamically import the map and disable SSR (Leaflet requires the window object)
const CommuterMap = dynamic(() => import('@/components/admin/admin-commuter-map'), { 
  ssr: false,
  loading: () => <p className="text-white text-center">Loading map...</p> 
});

interface SosAlert {
  id: string;
  conductor: string;
  vehicle: string;
  message: string;
  time: string;
  coordinates: [number, number];
}

// NEW: Interface for historical SOS logs
interface SosHistoryLog {
  id: string;
  conductor: string;
  vehicle: string;
  message: string;
  triggeredAt: string;
  resolvedAt: string;
  coordinates: [number, number];
}

// --- MOCK DATA FOR COMMUTER DEMAND HEATMAP CIRCLES ---
interface DemandZone {
  id: string;
  coords: [number, number];
  radiusMeters: number;
  commuterCount: number;
  intensity: 'LOW' | 'MEDIUM' | 'HIGH';
}

const mockDemandHeatmap: DemandZone[] = [
  { id: 'zone-1', coords: [14.88645, 120.78596], radiusMeters: 400, commuterCount: 120, intensity: 'HIGH' },
  { id: 'zone-2', coords: [14.84941, 120.82352], radiusMeters: 300, commuterCount: 85, intensity: 'MEDIUM' },
  { id: 'zone-3', coords: [14.81816, 120.90600], radiusMeters: 500, commuterCount: 150, intensity: 'HIGH' },
  { id: 'zone-4', coords: [14.77813, 120.93709], radiusMeters: 250, commuterCount: 40, intensity: 'LOW' },
  { id: 'zone-5', coords: [14.74300, 120.95912], radiusMeters: 350, commuterCount: 95, intensity: 'MEDIUM' },
];

// NEW: Mock past SOS data so you can see the history table working immediately
const initialSosHistory: SosHistoryLog[] = [
  { id: 'sos-old-001', conductor: 'Mario Speedwagon', vehicle: 'DEF-456', message: 'Panic button triggered by conductor!', triggeredAt: 'Oct 24, 2023 - 10:15 AM', resolvedAt: 'Oct 24, 2023 - 10:22 AM', coordinates: [14.5980, 120.9830] },
  { id: 'sos-old-002', conductor: 'Crisostomo Ibarra', vehicle: 'GHI-789', message: 'Medical emergency reported.', triggeredAt: 'Oct 23, 2023 - 02:40 PM', resolvedAt: 'Oct 23, 2023 - 03:10 PM', coordinates: [14.6010, 120.9860] },
  { id: 'sos-old-003', conductor: 'Sisa Doe', vehicle: 'JKL-012', message: 'Panic button triggered by conductor!', triggeredAt: 'Oct 22, 2023 - 08:05 AM', resolvedAt: 'Oct 22, 2023 - 08:12 AM', coordinates: [14.5970, 120.9810] },
];

export default function MonitoringPage() {
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([
    { 
      id: 'sos-001', 
      conductor: 'Juan Dela Cruz', 
      vehicle: 'ABC-123', 
      message: 'Panic button triggered by conductor!', 
      time: 'Just now', 
      coordinates: [14.5995, 120.9842] 
    },
  ]);

  // NEW: State for SOS History & Pagination
  const [sosHistory, setSosHistory] = useState<SosHistoryLog[]>(initialSosHistory);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_ROWS_PER_PAGE = 5;

  const overspeedCount = liveVehicleTracking.filter(v => v.status === "overspeeding").length;
  const idleCount = liveVehicleTracking.filter(v => v.status === "idle").length;

  const metrics = [
    { title: 'Overspeeding', value: overspeedCount.toString(), icon: Gauge, color: 'text-red-400' },
    { title: 'Idle Vehicles', value: idleCount.toString(), icon: Clock, color: 'text-yellow-400' },
    { title: 'Demand Heatmap', value: mockDemandHeatmap.length.toString(), icon: MapPin, color: 'text-blue-400' },
  ];

  // UPDATED: Move alert to history instead of just deleting it
  const handleConfirmSos = (alertId: string) => {
    const alertToResolve = sosAlerts.find(a => a.id === alertId);
    if (!alertToResolve) return;

    const now = new Date();
    const formattedNow = now.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit', hour12: true
    });

    const historyLog: SosHistoryLog = {
      id: alertToResolve.id,
      conductor: alertToResolve.conductor,
      vehicle: alertToResolve.vehicle,
      message: alertToResolve.message,
      triggeredAt: `Today - ${alertToResolve.time}`,
      resolvedAt: formattedNow,
      coordinates: alertToResolve.coordinates,
    };

    // Add to the beginning of history array and remove from active alerts
    setSosHistory(prev => [historyLog, ...prev]);
    setSosAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Pagination logic for History Table
  const totalHistoryPages = Math.max(1, Math.ceil(sosHistory.length / HISTORY_ROWS_PER_PAGE));
  const currentHistoryData = sosHistory.slice(
    (historyPage - 1) * HISTORY_ROWS_PER_PAGE,
    historyPage * HISTORY_ROWS_PER_PAGE
  );

  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-6">Live Monitoring</h1>
      
      {/* Top Metrics */}
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
                      <p className="text-xs text-gray-400 mt-1 font-mono">Coords: {alert.coordinates[0]}, {alert.coordinates[1]}</p>
                      <div className="flex items-center text-xs text-gray-400 mt-2">
                        <Clock size={12} className="mr-1" />
                        {alert.time}
                      </div>
                    </div>
                  </div>
                  
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
      
      {/* Map Container */}
      <div className="h-[calc(100vh-280px)]">
        <CommuterMap 
          isDesktop={true} 
          demandZones={mockDemandHeatmap}
          sosLocations={sosAlerts.map(a => a.coordinates)}
        />
      </div>

      {/* ─── LIVE VEHICLE TRACKING TABLE ─── */}
      <div className="mt-6 pb-8">
        <GlassCard className="p-5">
          <h2 className="text-lg font-bold text-white mb-4">Active Vehicle Tracking</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Unit</th>
                  <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Driver</th>
                  <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Zone</th>
                  <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider text-center">Speed</th>
                  <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {liveVehicleTracking.map((v) => (
                  <tr 
                    key={v.unit} 
                    className={`transition-colors ${
                      v.status === "overspeeding" ? "bg-red-500/[0.06] border-l-2 border-l-red-500" : 
                      v.status === "idle" ? "opacity-50" : 
                      "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="py-3.5 pr-4">
                      <span className="text-sm font-semibold text-white/90">{v.unit}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-sm text-white/60">{v.driver}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-sm text-white/60">{v.zone}</span>
                    </td>
                    <td className="py-3.5 pr-4 text-center">
                      <span className={`text-sm font-semibold flex items-center justify-center gap-1 ${
                        v.status === "overspeeding" ? "text-red-400" : 
                        v.status === "idle" ? "text-white/30" : "text-white/70"
                      }`}>
                        {v.status === "overspeeding" && (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                          </svg>
                        )}
                        {v.speed} km/h
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        v.status === "normal" ? "bg-green-500/15 text-green-400" : 
                        v.status === "overspeeding" ? "bg-red-500/15 text-red-400 font-bold" : 
                        "bg-yellow-500/15 text-yellow-400"
                      }`}>
                        {v.status === "overspeeding" ? "OVERSPEEDING" : v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* ─── NEW: SOS HISTORY LOG TABLE ─── */}
      <div className="mt-6 pb-8">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Archive size={18} className="text-white/40" />
              <h2 className="text-lg font-bold text-white">SOS History Log</h2>
            </div>
            <span className="text-[10px] bg-white/[0.06] text-white/40 px-2 py-0.5 rounded">
              {sosHistory.length} Total Resolved
            </span>
          </div>
          
          {sosHistory.length === 0 ? (
            <div className="py-8 text-center text-white/20 text-sm">
              No SOS history yet.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Conductor</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Vehicle</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Message</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider hidden md:table-cell">Triggered</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Resolved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {currentHistoryData.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors opacity-70 hover:opacity-100">
                        <td className="py-3.5 pr-4">
                          <span className="text-sm text-white/70 font-medium">{log.conductor}</span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="text-sm text-white/50 font-mono">{log.vehicle}</span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="text-sm text-white/50">{log.message}</span>
                        </td>
                        <td className="py-3.5 pr-4 hidden md:table-cell">
                          <span className="text-xs text-white/30">{log.triggeredAt}</span>
                        </td>
                        <td className="py-3.5">
                          <span className="inline-flex items-center gap-1 text-xs text-green-400/70 bg-green-500/10 px-2 py-0.5 rounded-md">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {log.resolvedAt}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-xs text-white/30">
                  Page <span className="text-white/50 font-medium">{historyPage}</span> of <span className="text-white/50 font-medium">{totalHistoryPages}</span>
                </p>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                    disabled={historyPage === 1}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/[0.04] text-white/40 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={() => setHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))}
                    disabled={historyPage === totalHistoryPages}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/[0.06] text-white/60 hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </GlassCard>
      </div>

    </>
  );
}