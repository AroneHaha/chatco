// app/(admin)/monitoring/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Gauge, Clock, MapPin, AlertTriangle, Archive,
  AlertCircle, RefreshCw, WifiOff, CheckCircle2,
} from 'lucide-react';
import { useFleetPoll } from '@/lib/admin/services/monitoring.service';
import {
  useMonitoringData,
  type DemandZone,
} from './data/data-monitoring';
import { SkeletonMetric, SkeletonTable, SkeletonMap } from '@/components/admin/ui/skeleton';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import { formatElapsedMinutes } from '@/lib/utils/display';
import { useAdminNotifications } from '@/contexts/admin-notifications-context';

// Dynamically import the map and disable SSR (Leaflet requires the window object)
const AdminCommuterMap = dynamic<{
  liveVehicles?: import('@/components/admin/admin-commuter-map').LiveVehicleMarker[];
  demandZones?: DemandZone[];
  sosLocations?: [number, number][];
  focusPosition?: [number, number] | null;
  focusNonce?: number;
}>(() => import('@/components/admin/admin-commuter-map'), {
  ssr: false,
  loading: () => <SkeletonMap height="100%" label="Live Map Loading…" />,
});

// Highlight threshold for the live fleet table's speed column. Mirrors the
// backend's default `speed_limit_kmh` (LocationService::speedLimitKmh) — the
// recorded overspeed rows carry their own `threshold`, so this only tints the
// live readout.
const SPEED_LIMIT_KMH = 50;

export default function MonitoringPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { markRead: markMonitoringNotificationsRead } = useAdminNotifications().monitoring;
  // Opening the Monitoring module clears the nav badge (new SOS alerts +
  // new overspeeding episodes) — mirrors Remittance's markRead-on-open.
  useEffect(() => {
    markMonitoringNotificationsRead();
  }, [markMonitoringNotificationsRead]);

  const [overspeedPage, setOverspeedPage] = useState(1);
  const [filterOverspeedDate, setFilterOverspeedDate] = useState('');
  // Live fleet data (real API, 5s poll)
  const { fleet, isLoading, error, refetch } = useFleetPoll(5000);
  // Real SOS alerts (polls /api/admin/sos every 5s) + real overspeed feed.
  // The hook exposes its own error/loading state — we surface it as a banner
  // so SOS feed failures don't silently render as an empty active-alerts list.
  const { data, error: sosError, refetch: refetchSos, acknowledgeSos, resolveSos } = useMonitoringData(overspeedPage, filterOverspeedDate);

  const sosAlerts = data.sosAlerts;
  const sosHistory = data.sosHistory;

  // Pagination States
  const [sosPage, setSosPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // Filter States
  const [filterSosDate, setFilterSosDate] = useState('');
  const [filterStaleOnly, setFilterStaleOnly] = useState(false);

  // The two history logs share one panel and switch by tab — each keeps its
  // own date filter and page, so flipping tabs never loses your place.
  const [historyTab, setHistoryTab] = useState<'sos' | 'overspeed'>('sos');

  // ─── Deep-link from the notification bell ──────────────────────
  // SOS_TRIGGERED links here as ?sosId={id}; OVERSPEED_FLAGGED as
  // ?overspeedId={id}. Neither has a per-item modal — both render inline
  // (SOS as cards with Acknowledge/Resolve buttons, overspeed as history
  // table rows) — so each deep-link scrolls to and highlights the matching
  // element instead, same idea as handleFocusVehicle's scroll-into-view for
  // a fleet row.
  const [highlightedSosId, setHighlightedSosId] = useState<string | null>(null);
  const [highlightedOverspeedId, setHighlightedOverspeedId] = useState<string | null>(null);
  useEffect(() => {
    const sosId = searchParams.get('sosId');
    const overspeedId = searchParams.get('overspeedId');
    if (!sosId && !overspeedId) return;
    if (sosId) setHighlightedSosId(sosId);
    if (overspeedId) {
      setHighlightedOverspeedId(overspeedId);
      setHistoryTab('overspeed');
      // A freshly-flagged episode is always "today" — clear any leftover
      // date filter/page so it's guaranteed to be on the page it lands on.
      setFilterOverspeedDate('');
      setOverspeedPage(1);
    }
    router.replace('/monitoring');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately mount-only: reacting to `router`/`searchParams` would re-fire after router.replace() strips the params.
  }, []);
  useEffect(() => {
    if (!highlightedSosId) return;
    document.getElementById(`sos-alert-${highlightedSosId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedSosId]);
  useEffect(() => {
    if (!highlightedOverspeedId) return;
    document.getElementById(`overspeed-log-${highlightedOverspeedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedOverspeedId, data.overspeedHistory, historyTab]);
  // The SOS highlight only makes sense while the alert is still active —
  // once it's resolved it drops out of `sosAlerts` and there's nothing left
  // on screen to point at.
  useEffect(() => {
    if (highlightedSosId && !data.sosAlerts.some((a) => a.id === highlightedSosId)) {
      setHighlightedSosId(null);
    }
  }, [highlightedSosId, data.sosAlerts]);

  // Map focus — clicking a row flies the camera to that unit. This only moves
  // the viewport; the full marker set stays rendered so the rest of the fleet
  // remains visible around the focused unit.
  const [focusedVehicleId, setFocusedVehicleId] = useState<string | null>(null);
  const [focusPosition, setFocusPosition] = useState<[number, number] | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);

  const handleFocusVehicle = (v: { id: string; lat: number | null; lng: number | null }) => {
    if (v.lat === null || v.lng === null) return; // Nothing to fly to yet.
    setFocusedVehicleId(v.id);
    setFocusPosition([v.lat, v.lng]);
    setFocusNonce(n => n + 1); // Re-fly even if the same row is clicked again.
    document.getElementById('monitoring-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Metrics from live fleet. `is_stale` already excludes units on break
  // (LocationService), so this list is exactly "units that went silent".
  const staleUnits = useMemo(() => fleet.filter(v => v.is_stale), [fleet]);
  const staleCount = staleUnits.length;
  const activeCount = fleet.length;
  const attentionCount = sosAlerts.length + staleCount;

  // `alert` escalates a card's styling only while its count is actually
  // non-zero — a fleet that's often on break or briefly unresponsive
  // shouldn't sit permanently colored, or the color stops meaning anything.
  const metrics = [
    { title: 'Active Vehicles', hint: 'On shift today', value: activeCount.toString(), icon: MapPin, color: 'text-[#62A0EA]', alert: false },
    { title: 'Unresponsive', hint: 'No signal > 10 min', value: staleCount.toString(), icon: WifiOff, color: 'text-amber-400', alert: staleCount > 0 },
    { title: 'Active SOS', hint: 'Awaiting resolution', value: sosAlerts.length.toString(), icon: AlertTriangle, color: 'text-red-400', alert: sosAlerts.length > 0 },
  ];

  const filteredFleet = filterStaleOnly ? staleUnits : fleet;

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
      is_on_break: v.is_on_break,
      is_stale: v.is_stale,
      minutes_since_update: v.minutes_since_update,
    })).filter(v => v.lat !== 0 && v.lng !== 0),
    [fleet]
  );

  // SOS handlers — wired to real backend (acknowledge + resolve).
  const handleConfirmSos = (alertId: string) => { void resolveSos(alertId); };
  const handleAcknowledgeSos = (alertId: string) => { void acknowledgeSos(alertId); };

  const filteredSosHistory = useMemo(() => filterSosDate ? sosHistory.filter(l => l.triggeredDate === filterSosDate) : sosHistory, [filterSosDate, sosHistory]);
  const filteredOverspeedHistory = data.overspeedHistory;

  // Both history feeds re-poll every 5s and can shrink under the viewer (an SOS
  // gets resolved, a date filter narrows). The page number is therefore clamped
  // to the valid range on every render rather than trusted as-is — otherwise
  // the "Next" guard (page === totalPages) never matches an out-of-range page
  // and you can walk forward through empty tables indefinitely.
  const totalSosPages = Math.max(1, Math.ceil(filteredSosHistory.length / ROWS_PER_PAGE));
  const safeSosPage = Math.min(Math.max(sosPage, 1), totalSosPages);
  const goToSosPage = (page: number) => setSosPage(Math.min(Math.max(page, 1), totalSosPages));
  const currentSosData = filteredSosHistory.slice((safeSosPage - 1) * ROWS_PER_PAGE, safeSosPage * ROWS_PER_PAGE);

  const totalOverspeedPages = Math.max(1, data.overspeedLastPage);
  const safeOverspeedPage = Math.min(Math.max(overspeedPage, 1), totalOverspeedPages);
  const goToOverspeedPage = (page: number) => setOverspeedPage(Math.min(Math.max(page, 1), totalOverspeedPages));
  const currentOverspeedData = filteredOverspeedHistory;

  // ── Loading State ──
  // Mirrors the loaded layout: status strip → map + attention rail → fleet table.
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-gray-700 animate-pulse" />
        <SkeletonMetric count={3} />
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
          <SkeletonMap height="440px" label="Loading Monitoring Map…" />
          <div className="hidden xl:block rounded-lg border border-[#1E2D45] bg-[#131C2E] animate-pulse" />
        </div>
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
        <button onClick={() => refetch()} className="px-4 py-2 bg-[#62A0EA] hover:bg-[#99C1F1] text-white rounded-md text-sm font-medium transition-colors">Try Again</button>
      </div>
    );
  }

  // One segmented strip instead of three free-standing cards: the counts are
  // a single glance ("how is the fleet right now"), so they read as one
  // instrument. Rendered in the header row on md+ and under it on phones,
  // where the header is sticky and must stay one line tall.
  const statusStrip = (
    <div className="grid grid-cols-3 bg-[#131C2E] border border-[#1E2D45] rounded-lg divide-x divide-[#1E2D45] overflow-hidden">
      {metrics.map((item) => {
        const Icon = item.icon;
        const isRed = item.color === 'text-red-400';
        return (
          <div
            key={item.title}
            title={item.hint}
            className={`flex items-center gap-2.5 px-3 py-2.5 md:px-4 transition-colors ${
              item.alert ? (isRed ? 'bg-red-400/10' : 'bg-amber-400/10') : ''
            }`}
          >
            <Icon size={18} className={`hidden sm:block flex-shrink-0 ${item.alert ? item.color : 'text-slate-500'}`} />
            <div className="min-w-0">
              <p className={`text-lg font-bold leading-tight ${item.alert ? item.color : 'text-white'}`}>{item.value}</p>
              <p className="text-[11px] font-medium text-slate-400 truncate">{item.title}</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  const isSosTab = historyTab === 'sos';

  return (
    <>
      {/* Must stay the FIRST child: StickyPageHeader carries a negative top
          margin to reclaim <main>'s padding, so anything above it would lose
          16px underneath. The SOS banner therefore sits below it now. */}
      <StickyPageHeader className="mb-4 md:mb-6 md:flex md:items-center md:justify-between md:gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Monitoring</h1>
          <p className="hidden md:flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>
            Live · refreshes every 5 seconds
          </p>
        </div>
        <div className="hidden md:block md:w-[440px] flex-shrink-0">{statusStrip}</div>
      </StickyPageHeader>

      <div className="md:hidden mb-4">{statusStrip}</div>

      {/* SOS feed error banner — shown when the SOS polling loop fails.
          Fleet errors are already handled by the error state above; this
          banner is specifically for the SOS hook, which previously failed
          silently and rendered zero alerts with no indication. */}
      {sosError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400 truncate">
              SOS feed unavailable: {sosError}
            </p>
          </div>
          <button
            onClick={() => refetchSos()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-md text-xs font-medium transition-colors flex-shrink-0"
          >
            <RefreshCw size={12} /> Retry SOS
          </button>
        </div>
      )}

      {/* ─── LIVE ZONE ─── Map with an always-present "Needs attention" rail
          beside it (xl+). The rail holds active SOS alerts and silent units,
          so an incident appears next to its own marker instead of pushing the
          whole page down, and clicking a unit flies the map without scrolling.
          Below xl the rail stacks ABOVE the map so an SOS is still the first
          thing seen on a phone. */}
      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] gap-4 xl:gap-6">
        <div id="monitoring-map" className="order-2 xl:order-1 h-[340px] sm:h-[400px] xl:h-[560px] bg-[#131C2E] border border-[#1E2D45] rounded-lg p-1">
          <div className="w-full h-full rounded-md overflow-hidden">
            <AdminCommuterMap
              liveVehicles={liveMapVehicles}
              demandZones={data.demandZones}
              sosLocations={sosAlerts.map(a => a.coordinates)}
              focusPosition={focusPosition}
              focusNonce={focusNonce}
            />
          </div>
        </div>

        <aside
          aria-label="Needs attention"
          className={`order-1 xl:order-2 flex flex-col rounded-lg border xl:h-[560px] min-h-0 ${
            sosAlerts.length > 0 ? 'bg-[#131C2E] border-red-400/30' : 'bg-[#131C2E] border-[#1E2D45]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#1E2D45]">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Needs Attention</h2>
              {sosAlerts.length > 0 && (
                <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span>
              )}
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              sosAlerts.length > 0 ? 'bg-red-400/15 text-red-400' : attentionCount > 0 ? 'bg-amber-400/15 text-amber-400' : 'bg-[#0E1628] text-slate-500'
            }`}>{attentionCount}</span>
          </div>

          {attentionCount === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-6">
              <CheckCircle2 size={28} className="text-emerald-400/70 mb-2" />
              <p className="text-sm font-semibold text-slate-300">All clear</p>
              <p className="text-xs text-slate-500 mt-1">No active SOS, and every unit on shift is reporting.</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 max-h-[420px] xl:max-h-none overflow-y-auto scrollbar-themed p-3 space-y-3">
              {sosAlerts.map((alert) => {
                const isAcknowledged = alert.status === "ACKNOWLEDGED";
                const roleLabel = alert.senderRole === "CONDUCTOR" ? "Conductor" : "Commuter";
                return (
                  <div
                    key={alert.id}
                    id={`sos-alert-${alert.id}`}
                    className={`bg-red-400/5 border rounded-lg p-3 transition-shadow ${
                      highlightedSosId === alert.id
                        ? 'border-[#62A0EA] ring-2 ring-[#62A0EA]/50'
                        : 'border-red-400/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-red-400">
                        <AlertTriangle size={13} /> SOS
                      </span>
                      <span className="flex items-center text-[11px] text-slate-500"><Clock size={11} className="mr-1" />{alert.time}</span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-1.5 break-words">{alert.note}</p>
                    <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-white">{alert.sender}</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${alert.senderRole === "CONDUCTOR" ? "bg-sky-400/15 text-sky-300" : "bg-purple-400/15 text-purple-300"}`}>{roleLabel}</span>
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <p className="text-[11px] text-slate-500 font-mono">{alert.coordinates[0].toFixed(5)}, {alert.coordinates[1].toFixed(5)}</p>
                      {isAcknowledged ? (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium flex-shrink-0">
                          <CheckCircle2 size={12} /> Acknowledged
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-red-400 font-medium flex-shrink-0">
                          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
                          Awaiting response
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {!isAcknowledged && (
                        <button onClick={() => handleAcknowledgeSos(alert.id)} className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold transition-colors">Acknowledge</button>
                      )}
                      <button onClick={() => handleConfirmSos(alert.id)} className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold transition-colors">Confirm &amp; Resolve</button>
                    </div>
                  </div>
                );
              })}

              {staleUnits.length > 0 && (
                <div>
                  <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Unresponsive units</p>
                  <ul className="rounded-lg border border-amber-400/20 divide-y divide-amber-400/10 overflow-hidden">
                    {staleUnits.map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => handleFocusVehicle(v)}
                          disabled={!v.has_gps}
                          title={v.has_gps ? 'Show last known position on the map' : 'No GPS position reported yet'}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors disabled:cursor-default ${
                            focusedVehicleId === v.id ? 'bg-[#62A0EA]/10' : 'bg-amber-400/5 hover:bg-amber-400/10'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-white truncate">{v.unit_number} <span className="text-xs font-normal text-slate-500 font-mono">{v.plate_number}</span></span>
                            <span className="block text-xs text-slate-400 truncate">{v.driver_name ?? '—'}{v.route_name ? ` · ${v.route_name}` : ''}</span>
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 flex-shrink-0">
                            <WifiOff size={11} />{formatElapsedMinutes(v.minutes_since_update)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </aside>
      </section>

      {/* ─── LIVE VEHICLE TRACKING TABLE ─── */}
      <div className="mt-6 bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-white">Active Vehicle Tracking <span className="text-sm font-normal text-slate-500">— Today</span></h2>
          <div className="flex items-center gap-2 bg-[#0E1628] p-1 rounded-md border border-[#1E2D45]">
            <button onClick={() => setFilterStaleOnly(false)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!filterStaleOnly ? 'bg-[#62A0EA] text-white' : 'text-slate-500 hover:text-slate-300'}`}>All ({fleet.length})</button>
            <button onClick={() => setFilterStaleOnly(true)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${filterStaleOnly ? 'bg-amber-400/20 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}><WifiOff size={12} />Unresponsive Only ({staleCount})</button>
          </div>
        </div>
        {/* Scrolled rather than paginated: this table re-polls every 5s, so
            paging it would shuffle rows out from under the cursor. */}
        <div className="overflow-x-auto scrollbar-themed max-h-105 overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1E2D45]">
                <th className="sticky top-0 z-10 bg-[#131C2E] pb-3 pl-4 pr-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                <th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                <th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Route</th>
                <th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Speed</th>
                <th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Capacity</th>
                <th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2D45]">
              {filteredFleet.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-600 text-sm">{fleet.length === 0 ? 'No active vehicles on shift right now.' : 'No vehicles match the filter.'}</td></tr>
              ) : (
                filteredFleet.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => handleFocusVehicle(v)}
                    title={v.has_gps ? 'Show this unit on the map' : 'No GPS position reported yet'}
                    className={`transition-colors ${v.has_gps ? 'cursor-pointer' : 'cursor-default'} ${
                      focusedVehicleId === v.id
                        ? 'bg-[#62A0EA]/10 ring-1 ring-inset ring-[#62A0EA]/50'
                        : v.is_stale
                          ? 'bg-amber-400/10 ring-1 ring-inset ring-amber-400/30'
                          : 'hover:bg-[#0E1628]'
                    }`}
                  >
                    <td className="py-3.5 pl-4 pr-6"><div className="flex flex-col"><span className="text-sm font-semibold text-white">{v.unit_number}</span><span className="text-xs text-slate-500 font-mono">{v.plate_number}</span></div></td>
                    <td className="py-3.5 pr-4"><span className="text-sm text-slate-400">{v.driver_name ?? '—'}</span></td>
                    <td className="py-3.5 pr-4"><span className="text-sm text-slate-400">{v.route_name ?? '—'}</span></td>
                    <td className="py-3.5 pr-4 text-center"><span className={`text-sm font-semibold ${v.speed !== null && v.speed > SPEED_LIMIT_KMH ? 'text-red-400' : 'text-slate-300'}`}>{v.speed !== null ? `${v.speed} km/h` : '—'}</span></td>
                    <td className="py-3.5 pr-4 text-center"><span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${v.capacity_status === 'AVAILABLE' ? 'bg-green-400/15 text-green-400' : v.capacity_status === 'STANDING' ? 'bg-yellow-400/15 text-yellow-400' : 'bg-red-400/15 text-red-400 font-bold'}`}>{v.capacity_status}</span></td>
                    <td className="py-3.5 text-center">
                      {v.is_on_break ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/15 px-2.5 py-0.5 text-[11px] font-medium text-sky-300">On Break</span>
                      ) : !v.has_gps ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-400/15 text-slate-400" title="On shift, but the unit has not reported a GPS position yet"><WifiOff size={10} />Awaiting GPS</span>
                      ) : v.is_stale ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-400/15 text-amber-400"><WifiOff size={10} />Unresponsive · {formatElapsedMinutes(v.minutes_since_update)} ago</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-400/15 text-emerald-400"><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>Live</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── HISTORY ─── One tabbed panel. Both logs are retrospective and
          secondary to the live zone above; side by side, each got half the
          width and the 5-column overspeed table was cramped. Tabs give the
          active log the full width, and each keeps its own filter + page. */}
      <div className="mt-6 mb-8 bg-[#131C2E] border border-[#1E2D45] rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-3 border-b border-[#1E2D45]">
          <div role="tablist" aria-label="History logs" className="flex gap-1 -mb-px">
            <button
              role="tab"
              aria-selected={isSosTab}
              onClick={() => setHistoryTab('sos')}
              className={`flex items-center gap-2 px-3 py-2.5 border-b-2 text-sm font-semibold transition-colors ${
                isSosTab ? 'border-[#62A0EA] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Archive size={15} /> SOS History
              <span className="px-1.5 py-0.5 rounded bg-[#0E1628] text-[10px] font-semibold text-slate-400">{filteredSosHistory.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={!isSosTab}
              onClick={() => setHistoryTab('overspeed')}
              className={`flex items-center gap-2 px-3 py-2.5 border-b-2 text-sm font-semibold transition-colors ${
                !isSosTab ? 'border-red-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Gauge size={15} /> Overspeeding
              <span className="px-1.5 py-0.5 rounded bg-[#0E1628] text-[10px] font-semibold text-slate-400">{data.overspeedTotal}</span>
            </button>
          </div>
          <div className="pb-3 sm:pb-2">
            {isSosTab ? (
              <AdminDatePicker
                key="sos-date"
                accent="blue"
                align="right"
                ariaLabel="Filter SOS history by date"
                value={filterSosDate}
                onChange={(next) => { setFilterSosDate(next); setSosPage(1); }}
              />
            ) : (
              <AdminDatePicker
                key="overspeed-date"
                accent="red"
                align="right"
                ariaLabel="Filter overspeeding history by date"
                value={filterOverspeedDate}
                onChange={(next) => { setFilterOverspeedDate(next); setOverspeedPage(1); }}
              />
            )}
          </div>
        </div>

        <div role="tabpanel" className="p-5">
          {isSosTab ? (
            filteredSosHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-600 text-sm">No SOS history for this date.</div>
            ) : (
              <>
                <div className="overflow-x-auto scrollbar-themed max-h-105 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead><tr className="border-b border-[#1E2D45]"><th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sender</th><th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Triggered</th><th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved</th></tr></thead>
                    <tbody className="divide-y divide-[#1E2D45]">
                      {currentSosData.map((log) => (
                        <tr key={log.id} className="hover:bg-[#0E1628] transition-colors opacity-70 hover:opacity-100">
                          <td className="py-3 pr-3">
                            <span className="text-sm text-slate-300 font-medium">{log.sender}</span>
                            <span className={`ml-2 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${log.senderRole === "CONDUCTOR" ? "bg-sky-400/15 text-sky-300" : "bg-purple-400/15 text-purple-300"}`}>{log.senderRole === "CONDUCTOR" ? "Conductor" : "Commuter"}</span>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{log.note}</p>
                          </td>
                          <td className="py-3 pr-3 hidden md:table-cell"><span className="text-xs text-slate-500">{log.triggeredAt}</span></td>
                          <td className="py-3"><span className="inline-flex items-center gap-1 text-xs text-sky-400/70 bg-sky-400/10 px-2 py-0.5 rounded-md"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{log.resolvedAt}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1E2D45]">
                  <p className="text-xs text-slate-500">
                    Page {safeSosPage} of {totalSosPages} · {filteredSosHistory.length} total
                  </p>
                  <div className="flex items-center gap-2">
                    <button disabled={safeSosPage === 1} onClick={() => goToSosPage(safeSosPage - 1)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#0E1628] border border-[#1E2D45] text-slate-400 hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-all">Previous</button>
                    <button disabled={safeSosPage === totalSosPages} onClick={() => goToSosPage(safeSosPage + 1)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#131C2E] border border-[#1E2D45] text-slate-300 hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-all">Next</button>
                  </div>
                </div>
              </>
            )
          ) : filteredOverspeedHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-600 text-sm">No overspeeding logs for this date.</div>
          ) : (
            <>
              <div className="overflow-x-auto scrollbar-themed max-h-105 overflow-y-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-[#1E2D45]"><th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th><th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th><th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Conductor</th><th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Top Speed</th><th className="sticky top-0 z-10 bg-[#131C2E] pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Logged</th></tr></thead>
                  <tbody className="divide-y divide-[#1E2D45]">
                    {currentOverspeedData.map((log) => (
                      <tr
                        key={log.id}
                        id={`overspeed-log-${log.id}`}
                        className={`transition-colors opacity-70 hover:opacity-100 ${
                          highlightedOverspeedId === log.id
                            ? 'bg-[#62A0EA]/10 ring-1 ring-inset ring-[#62A0EA]/50'
                            : 'hover:bg-[#0E1628]'
                        }`}
                      >
                        <td className="py-3 pr-3"><span className="text-sm text-slate-300 font-semibold">{log.unit}</span></td>
                        <td className="py-3 pr-3"><span className="text-sm text-slate-400">{log.driver}</span></td>
                        <td className="py-3 pr-3"><span className="text-sm text-slate-400">{log.conductor}</span></td>
                        <td className="py-3 pr-3 text-center"><span className="text-sm font-bold text-red-400">{log.speed} km/h</span></td>
                        <td className="py-3"><span className="inline-flex items-center gap-1 text-xs text-amber-400/70 bg-amber-400/10 px-2 py-0.5 rounded-md"><Clock size={12} />{log.loggedAt}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1E2D45]">
                <p className="text-xs text-slate-500">
                  Page {safeOverspeedPage} of {totalOverspeedPages} · {data.overspeedTotal} total
                </p>
                <div className="flex items-center gap-2">
                  <button disabled={safeOverspeedPage === 1} onClick={() => goToOverspeedPage(safeOverspeedPage - 1)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#0E1628] border border-[#1E2D45] text-slate-400 hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-all">Previous</button>
                  <button disabled={safeOverspeedPage === totalOverspeedPages} onClick={() => goToOverspeedPage(safeOverspeedPage + 1)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#131C2E] border border-[#1E2D45] text-slate-300 hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-all">Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
