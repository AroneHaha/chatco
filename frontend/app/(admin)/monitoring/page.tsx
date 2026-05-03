// app/(admin)/monitoring/page.tsx
'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Gauge, Clock, MapPin, AlertTriangle, Archive, Filter, CalendarDays } from 'lucide-react';
import { liveVehicleTracking } from './data/data-monitoring';

// Dynamically import the map and disable SSR (Leaflet requires the window object)
interface CommuterMapProps {
  isDesktop?: boolean;
  demandZones: DemandZone[];
  sosLocations: [number, number][];
}

const CommuterMap = dynamic<CommuterMapProps>(() => import('@/components/admin/admin-commuter-map'), {
  ssr: false,
  loading: () => <p className="text-white text-center">Loading map...</p>
});

interface SosAlert {
  id: string;
  conductor: string;
  vehicle: string;
  message: string;
  time: string;
  triggeredDate: string; // Added for proper filtering
  coordinates: [number, number];
}

interface SosHistoryLog {
  id: string;
  conductor: string;
  vehicle: string;
  message: string;
  triggeredAt: string;
  resolvedAt: string;
  triggeredDate: string; // Added for proper filtering
  coordinates: [number, number];
}

interface OverspeedLog {
  id: string;
  unit: string;
  driver: string;
  speed: number;
  zone: string;
  loggedAt: string;
  loggedDate: string; // Added for proper filtering
}

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

const initialSosHistory: SosHistoryLog[] = [
  { id: 'sos-old-001', conductor: 'Mario Speedwagon', vehicle: 'DEF-456', message: 'Panic button triggered by conductor!', triggeredAt: 'Oct 24, 2023 - 10:15 AM', resolvedAt: 'Oct 24, 2023 - 10:22 AM', triggeredDate: '2023-10-24', coordinates: [14.5980, 120.9830] },
  { id: 'sos-old-002', conductor: 'Crisostomo Ibarra', vehicle: 'GHI-789', message: 'Medical emergency reported.', triggeredAt: 'Oct 23, 2023 - 02:40 PM', resolvedAt: 'Oct 23, 2023 - 03:10 PM', triggeredDate: '2023-10-23', coordinates: [14.6010, 120.9860] },
  { id: 'sos-old-003', conductor: 'Sisa Doe', vehicle: 'JKL-012', message: 'Panic button triggered by conductor!', triggeredAt: 'Oct 22, 2023 - 08:05 AM', resolvedAt: 'Oct 22, 2023 - 08:12 AM', triggeredDate: '2023-10-22', coordinates: [14.5970, 120.9810] },
];

// Mock Overspeeding History
const initialOverspeedHistory: OverspeedLog[] = [
  { id: 'ov-001', unit: 'VMY 9183', driver: 'Mark Arone Dela Cruz', speed: 72, zone: 'Malolos–Meycauayan', loggedAt: 'Nov 15, 2023 - 09:12 AM', loggedDate: '2023-11-15' },
  { id: 'ov-002', unit: 'TNB 8462', driver: 'Nardong Putik', speed: 68, zone: 'Meycauayan–Calumpit', loggedAt: 'Nov 14, 2023 - 04:30 PM', loggedDate: '2023-11-14' },
  { id: 'ov-003', unit: 'VMY 9183', driver: 'Mark Arone Dela Cruz', speed: 65, zone: 'Calumpit', loggedAt: 'Nov 10, 2023 - 08:45 AM', loggedDate: '2023-11-10' },
];

export default function MonitoringPage() {
  const today = new Date().toISOString().split('T')[0];

  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([
    {
      id: 'sos-001',
      conductor: 'Juan Dela Cruz',
      vehicle: 'ABC-123',
      message: 'Panic button triggered by conductor!',
      time: 'Just now',
      triggeredDate: today,
      coordinates: [14.5995, 120.9842]
    },
  ]);

  const [sosHistory, setSosHistory] = useState<SosHistoryLog[]>(initialSosHistory);
  const [overspeedHistory, setOverspeedHistory] = useState<OverspeedLog[]>(initialOverspeedHistory);

  // Pagination States
  const [sosPage, setSosPage] = useState(1);
  const [overspeedPage, setOverspeedPage] = useState(1);
  const ROWS_PER_PAGE = 5;

  // NEW: Filter States
  const [filterSosDate, setFilterSosDate] = useState('');
  const [filterOverspeedDate, setFilterOverspeedDate] = useState('');
  const [showOverspeedOnly, setShowOverspeedOnly] = useState(false);

  const overspeedCount = liveVehicleTracking.filter(v => v.status === "overspeeding").length;
  const idleCount = liveVehicleTracking.filter(v => v.status === "idle").length;

  const metrics = [
    { title: 'Overspeeding', value: overspeedCount.toString(), icon: Gauge, color: 'text-red-400' },
    { title: 'Idle Vehicles', value: idleCount.toString(), icon: Clock, color: 'text-amber-400' },
    { title: 'Demand Heatmap', value: mockDemandHeatmap.length.toString(), icon: MapPin, color: 'text-[#62A0EA]' },
  ];

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
      triggeredDate: alertToResolve.triggeredDate,
      coordinates: alertToResolve.coordinates,
    };

    setSosHistory(prev => [historyLog, ...prev]);
    setSosAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Filtered Data Logic
  const filteredVehicles = useMemo(() => {
    if (!showOverspeedOnly) return liveVehicleTracking;
    return liveVehicleTracking.filter(v => v.status === "overspeeding");
  }, [showOverspeedOnly]);

  const filteredSosHistory = useMemo(() => {
    if (!filterSosDate) return sosHistory;
    return sosHistory.filter(log => log.triggeredDate === filterSosDate);
  }, [filterSosDate, sosHistory]);

  const filteredOverspeedHistory = useMemo(() => {
    if (!filterOverspeedDate) return overspeedHistory;
    return overspeedHistory.filter(log => log.loggedDate === filterOverspeedDate);
  }, [filterOverspeedDate, overspeedHistory]);

  // Pagination Logic
  const totalSosPages = Math.max(1, Math.ceil(filteredSosHistory.length / ROWS_PER_PAGE));
  const currentSosData = filteredSosHistory.slice((sosPage - 1) * ROWS_PER_PAGE, sosPage * ROWS_PER_PAGE);

  const totalOverspeedPages = Math.max(1, Math.ceil(filteredOverspeedHistory.length / ROWS_PER_PAGE));
  const currentOverspeedData = filteredOverspeedHistory.slice((overspeedPage - 1) * ROWS_PER_PAGE, overspeedPage * ROWS_PER_PAGE);

  // Reset pages when filters change
  const handleSosDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterSosDate(e.target.value);
    setSosPage(1);
  };
  const handleOverspeedDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterOverspeedDate(e.target.value);
    setOverspeedPage(1);
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-6">Live Monitoring</h1>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {metrics.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4 flex items-center space-x-4">
              <div className={`p-3 bg-[#0E1628] rounded-full ${item.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">{item.title}</p>
                <p className="text-2xl font-bold text-white">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-Time SOS Alert Display */}
      {sosAlerts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle size={20} className="text-red-400" />
            <h2 className="text-xl font-bold text-red-400">Active SOS Alerts ({sosAlerts.length})</h2>
            <span className="relative flex h-3 w-3 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>

          <div className="space-y-3">
            {sosAlerts.map((alert) => (
              <div key={alert.id} className="bg-red-400/5 border border-red-400/20 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="text-red-400 mt-0.5 flex-shrink-0" size={24} />
                    <div>
                      <p className="text-base font-semibold text-white">{alert.message}</p>
                      <p className="text-sm text-slate-300 mt-1">
                        Vehicle: <span className="font-medium text-white">{alert.vehicle}</span> | Conductor: <span className="font-medium text-white">{alert.conductor}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-mono">Coords: {alert.coordinates[0]}, {alert.coordinates[1]}</p>
                      <div className="flex items-center text-xs text-slate-500 mt-2">
                        <Clock size={12} className="mr-1" />
                        {alert.time}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleConfirmSos(alert.id)}
                    className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors shadow-lg shadow-red-500/25"
                  >
                    Confirm & Resolve SOS
                  </button>
                </div>
              </div>
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
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold text-white">Active Vehicle Tracking</h2>

            {/* NEW: Overspeed Toggle Filter */}
            <div className="flex items-center gap-2 bg-[#0E1628] p-1 rounded-md border border-[#1E2D45]">
              <button
                onClick={() => setShowOverspeedOnly(false)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  !showOverspeedOnly ? 'bg-[#62A0EA] text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setShowOverspeedOnly(true)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  showOverspeedOnly ? 'bg-red-400/20 text-red-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Gauge size={12} />
                Overspeeding Only
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1E2D45]">
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Zone</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Speed</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2D45]">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-600 text-sm">No vehicles match the filter.</td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => (
                    <tr
                      key={v.unit}
                      className={`transition-colors ${
                        v.status === "overspeeding" ? "bg-red-400/5 border-l-2 border-l-red-400" :
                        v.status === "idle" ? "opacity-50" :
                        "hover:bg-[#0E1628]"
                      }`}
                    >
                      <td className="py-3.5 pr-4">
                        <span className="text-sm font-semibold text-white">{v.unit}</span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-sm text-slate-400">{v.driver}</span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-sm text-slate-400">{v.zone}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <span className={`text-sm font-semibold flex items-center justify-center gap-1 ${
                          v.status === "overspeeding" ? "text-red-400" :
                          v.status === "idle" ? "text-slate-600" : "text-slate-300"
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
                          v.status === "normal" ? "bg-sky-400/15 text-sky-400" :
                          v.status === "overspeeding" ? "bg-red-400/15 text-red-400 font-bold" :
                          "bg-amber-400/15 text-amber-400"
                        }`}>
                          {v.status === "overspeeding" ? "OVERSPEEDING" : v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── HISTORY LOGS GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 pb-8">

        {/* SOS HISTORY LOG TABLE */}
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Archive size={18} className="text-slate-500" />
              <h2 className="text-lg font-bold text-white">SOS History</h2>
            </div>

            {/* NEW: SOS Date Filter */}
            <div className="relative flex items-center">
              <CalendarDays size={14} className="absolute left-2.5 text-slate-500 pointer-events-none" />
              <input
                type="date"
                value={filterSosDate}
                onChange={handleSosDateChange}
                className="bg-[#0E1628] border border-[#1E2D45] rounded-md text-xs text-slate-300 pl-8 pr-2 py-1.5 focus:outline-none focus:border-[#62A0EA]/50 [color-scheme:dark]"
              />
              {filterSosDate && (
                <button onClick={() => { setFilterSosDate(''); setSosPage(1); }} className="absolute right-2 text-slate-500 hover:text-white text-xs">✕</button>
              )}
            </div>
          </div>

          {filteredSosHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-600 text-sm">No SOS history for this date.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#1E2D45]">
                      <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Conductor</th>
                      <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                      <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Triggered</th>
                      <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2D45]">
                    {currentSosData.map((log) => (
                      <tr key={log.id} className="hover:bg-[#0E1628] transition-colors opacity-70 hover:opacity-100">
                        <td className="py-3 pr-3">
                          <span className="text-sm text-slate-300 font-medium">{log.conductor}</span>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="text-sm text-slate-400 font-mono">{log.vehicle}</span>
                        </td>
                        <td className="py-3 pr-3 hidden md:table-cell">
                          <span className="text-xs text-slate-500">{log.triggeredAt}</span>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 text-xs text-sky-400/70 bg-sky-400/10 px-2 py-0.5 rounded-md">
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
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1E2D45]">
                <p className="text-xs text-slate-500">Page {sosPage} of {totalSosPages}</p>
                <div className="flex items-center gap-2">
                  <button disabled={sosPage === 1} onClick={() => setSosPage(p => p - 1)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#0E1628] border border-[#1E2D45] text-slate-400 hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-all">Previous</button>
                  <button disabled={sosPage === totalSosPages} onClick={() => setSosPage(p => p + 1)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#131C2E] border border-[#1E2D45] text-slate-300 hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-all">Next</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* NEW: OVERSPEEDING HISTORY LOG TABLE */}
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Gauge size={18} className="text-red-400/60" />
              <h2 className="text-lg font-bold text-white">Overspeeding History</h2>
            </div>

            {/* NEW: Overspeed Date Filter */}
            <div className="relative flex items-center">
              <CalendarDays size={14} className="absolute left-2.5 text-slate-500 pointer-events-none" />
              <input
                type="date"
                value={filterOverspeedDate}
                onChange={handleOverspeedDateChange}
                className="bg-[#0E1628] border border-[#1E2D45] rounded-md text-xs text-slate-300 pl-8 pr-2 py-1.5 focus:outline-none focus:border-red-400/50 [color-scheme:dark]"
              />
              {filterOverspeedDate && (
                <button onClick={() => { setFilterOverspeedDate(''); setOverspeedPage(1); }} className="absolute right-2 text-slate-500 hover:text-white text-xs">✕</button>
              )}
            </div>
          </div>

          {filteredOverspeedHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-600 text-sm">No overspeeding logs for this date.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#1E2D45]">
                      <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                      <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                      <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Speed</th>
                      <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Zone</th>
                      <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Logged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2D45]">
                    {currentOverspeedData.map((log) => (
                      <tr key={log.id} className="hover:bg-[#0E1628] transition-colors opacity-70 hover:opacity-100">
                        <td className="py-3 pr-3">
                          <span className="text-sm text-slate-300 font-semibold">{log.unit}</span>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="text-sm text-slate-400">{log.driver}</span>
                        </td>
                        <td className="py-3 pr-3 text-center">
                          <span className="text-sm font-bold text-red-400">{log.speed} km/h</span>
                        </td>
                        <td className="py-3 pr-3 hidden md:table-cell">
                          <span className="text-xs text-slate-500">{log.zone}</span>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400/70 bg-amber-400/10 px-2 py-0.5 rounded-md">
                            <Clock size={12} />
                            {log.loggedAt}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1E2D45]">
                <p className="text-xs text-slate-500">Page {overspeedPage} of {totalOverspeedPages}</p>
                <div className="flex items-center gap-2">
                  <button disabled={overspeedPage === 1} onClick={() => setOverspeedPage(p => p - 1)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#0E1628] border border-[#1E2D45] text-slate-400 hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-all">Previous</button>
                  <button disabled={overspeedPage === totalOverspeedPages} onClick={() => setOverspeedPage(p => p + 1)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#131C2E] border border-[#1E2D45] text-slate-300 hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-all">Next</button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </>
  );
}