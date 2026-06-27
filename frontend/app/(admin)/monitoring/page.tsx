// app/(admin)/monitoring/page.tsx
'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Gauge, Clock, MapPin, AlertTriangle, Archive, CalendarDays, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { useFleetPoll, type FleetVehicle } from '@/lib/admin/services/monitoring.service';
import { SkeletonMetric, SkeletonTable, SkeletonMap } from '@/components/admin/ui/skeleton';

// Dynamically import the map and disable SSR (Leaflet requires the window object)
const AdminCommuterMap = dynamic<{
  liveVehicles?: import('@/components/admin/admin-commuter-map').LiveVehicleMarker[];
  demandZones?: { id: string; coords: [number, number]; radiusMeters: number; commuterCount: number; intensity: 'LOW' | 'MEDIUM' | 'HIGH' }[];
  sosLocations?: [number, number][];
}>(() => import('@/components/admin/admin-commuter-map'), {
  ssr: false,
  loading: () => <SkeletonMap height="100%" label="Live Map Loading…" />,
});

export default function MonitoringPage() {
  const { fleet, isLoading, isRefreshing, error, lastFetchedAt, refetch } = useFleetPoll(5000);

  // Filter: show all, stale only, or by capacity
  const [filterStaleOnly, setFilterStaleOnly] = useState(false);

  const filteredFleet = useMemo(() => {
    if (!filterStaleOnly) return fleet;
    return fleet.filter(v => v.is_stale);
  }, [fleet, filterStaleOnly]);

  // Metrics computed from live fleet data
  const staleCount = fleet.filter(v => v.is_stale).length;
  const fullCount = fleet.filter(v => v.capacity_status === 'FULL').length;
  const activeCount = fleet.length;

  const metrics = [
    { title: 'Active Vehicles', value: activeCount.toString(), icon: MapPin, color: 'text-[#62A0EA]' },
    { title: 'Stale Units (>10min)', value: staleCount.toString(), icon: WifiOff, color: 'text-amber-400' },
    { title: 'Full Capacity', value: fullCount.toString(), icon: Gauge, color: 'text-red-400' },
  ];

  // Map fleet data to the map component's LiveVehicleMarker format
  const liveMapVehicles = useMemo(() =>
    fleet.map(v => ({
      id: v.id,
      unit_number: v.unit_number,
      plate_number: v.plate_number,
      lat: v.lat ?? 0,
      lng: v.lng ?? 0,
      speed: v.speed,
      capacity: v.capacity_status,
      route_name: v.route_name,
      driver_name: v.driver_name,
      conductor_name: v.conductor_name,
      is_stale: v.is_stale,
      minutes_since_update: v.minutes_since_update,
    })).filter(v => v.lat !== 0 && v.lng !== 0), // only show vehicles with GPS
    [fleet]
  );

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-gray-700 animate-pulse" />
        <SkeletonMetric count={3} />
        <SkeletonMap height="calc(100vh - 280px)" label="Loading Monitoring Map…" />
        <SkeletonTable rows={5} columns={6} title="Active Vehicle Tracking" />
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Failed to load monitoring data</h2>
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#62A0EA] hover:bg-[#99C1F1] text-white rounded-md text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header with live indicator */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Live Monitoring</h1>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {isRefreshing ? (
            <span className="flex items-center gap-1.5 text-[#62A0EA]">
              <RefreshCw size={12} className="animate-spin" />
              Refreshing…
            </span>
          ) : lastFetchedAt ? (
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live · Updated {lastFetchedAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          ) : null}
        </div>
      </div>

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

      {/* Map Container */}
      <div className="h-[calc(100vh-280px)] min-h-[400px]">
        <AdminCommuterMap
          liveVehicles={liveMapVehicles}
        />
      </div>

      {/* ─── LIVE VEHICLE TRACKING TABLE ─── */}
      <div className="mt-6 pb-8">
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold text-white">Active Vehicle Tracking</h2>

            {/* Stale Toggle Filter */}
            <div className="flex items-center gap-2 bg-[#0E1628] p-1 rounded-md border border-[#1E2D45]">
              <button
                onClick={() => setFilterStaleOnly(false)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  !filterStaleOnly ? 'bg-[#62A0EA] text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                All ({fleet.length})
              </button>
              <button
                onClick={() => setFilterStaleOnly(true)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  filterStaleOnly ? 'bg-amber-400/20 text-amber-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <WifiOff size={12} />
                Stale Only ({staleCount})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1E2D45]">
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Route</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Speed</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Capacity</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2D45]">
                {filteredFleet.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-600 text-sm">
                      {fleet.length === 0
                        ? 'No active vehicles on shift right now.'
                        : 'No vehicles match the filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredFleet.map((v) => (
                    <tr
                      key={v.id}
                      className={`transition-colors ${
                        v.is_stale ? 'bg-amber-400/5 border-l-2 border-l-amber-400' : 'hover:bg-[#0E1628]'
                      }`}
                    >
                      <td className="py-3.5 pr-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white">{v.unit_number}</span>
                          <span className="text-xs text-slate-500 font-mono">{v.plate_number}</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-sm text-slate-400">{v.driver_name ?? '—'}</span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-sm text-slate-400">{v.route_name ?? '—'}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <span className={`text-sm font-semibold ${
                          v.speed !== null && v.speed > 60 ? 'text-red-400' : 'text-slate-300'
                        }`}>
                          {v.speed !== null ? `${v.speed} km/h` : '—'}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          v.capacity_status === 'AVAILABLE' ? 'bg-green-400/15 text-green-400' :
                          v.capacity_status === 'STANDING' ? 'bg-yellow-400/15 text-yellow-400' :
                          'bg-red-400/15 text-red-400 font-bold'
                        }`}>
                          {v.capacity_status}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        {v.is_stale ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-400/15 text-amber-400">
                            <WifiOff size={10} />
                            Stale · {v.minutes_since_update}m ago
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-400/15 text-emerald-400">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            Live
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
