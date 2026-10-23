// app/(admin)/monitoring/page.tsx
'use client';

import { useEffect, useState, useMemo, useRef, useId, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Gauge, Clock, MapPin, AlertTriangle, Archive, Phone, Building2, ShieldAlert,
  AlertCircle, RefreshCw, Coffee, CheckCircle2, Search, X, LocateFixed,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useFleetPoll } from '@/lib/admin/services/monitoring.service';
import {
  useMonitoringData,
  useSosLocations,
  SOS_HISTORY_PER_PAGE,
  type DemandZone,
  type SafetyHistorySort,
  type SosHistoryOutcome,
  type SosAlert,
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
  sosLocations?: import('@/components/admin/admin-commuter-map').SosMapMarker[];
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

function TableHeading({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th scope="col" className={`sticky top-0 z-10 border-b border-[#26354D] admin-light:border-[#E2E8F0] bg-[#101A2B] admin-light:bg-[#F8FAFC] px-5 py-3 text-xs font-medium text-slate-400 admin-light:text-slate-500 ${className}`}>{children}</th>;
}

function HistoryPagination({ page, pages, start, end, count, onChange }: {
  page: number; pages: number; start: number; end: number; count: number; onChange: (page: number) => void;
}) {
  const buttonClass = 'flex min-h-9 items-center gap-1.5 rounded-md border border-[#2A3A52] admin-light:border-[#E2E8F0] px-3 text-xs font-medium text-slate-300 admin-light:text-slate-700 transition-colors hover:bg-white/5 admin-light:hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] disabled:cursor-default disabled:opacity-35';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] px-5 py-4">
      <p className="text-xs text-slate-400 admin-light:text-slate-500 tabular-nums">Showing <span className="text-slate-200 admin-light:text-slate-700">{start}–{end}</span> of {count} records</p>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Previous history page" disabled={page === 1} onClick={() => onChange(page - 1)} className={buttonClass}><ChevronLeft size={14} />Previous</button>
        <span className="px-2 text-xs text-slate-400 admin-light:text-slate-500 tabular-nums">{page} / {pages}</span>
        <button type="button" aria-label="Next history page" disabled={page === pages} onClick={() => onChange(page + 1)} className={buttonClass}>Next<ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

function SosResolutionDialog({ alert, location, onCancel, onConfirm }: {
  alert: SosAlert;
  /** From useSosLocations: null when unavailable, undefined while looking up. */
  location: string | null | undefined;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolvingRef = useRef(false);
  const titleId = useId();
  const [hotline, setHotline] = useState<string | null>(null);
  const [attribution, setAttribution] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [detailsError, setDetailsError] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [lat, lon] = alert.coordinates;
  // Shown when reverse geocoding is unconfigured or fails, so staff can
  // still relay an exact position.
  const coordinateText = Number.isFinite(lat) && Number.isFinite(lon) ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    let active = true;

    // Only the hotline is fetched here (fresh on every open); the address
    // comes from the page's shared lookup.
    void fetch('/api/admin/monitoring/sos-location', {
      headers: { Accept: 'application/json' },
    })
      .then(async response => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message ?? 'Unable to load SOS response details.');
        return body?.data;
      })
      .then(details => {
        if (!active) return;
        setHotline(typeof details?.emergency_hotline === 'string' ? details.emergency_hotline : null);
        setAttribution(typeof details?.attribution === 'string' ? details.attribution : null);
      })
      .catch(() => {
        if (active) setDetailsError(true);
      })
      .finally(() => {
        if (active) setIsLoadingDetails(false);
      });

    return () => {
      active = false;
      dialog?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  const resolve = async () => {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    setIsResolving(true);
    setResolveError(null);
    try {
      await onConfirm();
      onCancel();
    } catch (error) {
      setResolveError(error instanceof Error ? error.message : 'Unable to resolve this SOS. Please try again.');
    } finally {
      resolvingRef.current = false;
      setIsResolving(false);
    }
  };

  const steps = [
    {
      title: 'Call the landing page emergency contact',
      description: 'Notify the listed emergency contact that an SOS was triggered.',
      icon: Phone,
      content: isLoadingDetails
        ? 'Loading contact number…'
        : detailsError
          ? 'Unable to load contact number.'
          : hotline || 'No contact number is configured.',
    },
    {
      title: 'Alert office staff',
      description: `Announce the SOS to office staff so they can take action. Share ${alert.sender}’s alert and location.`,
      icon: Building2,
      content: location === undefined
        ? 'Looking up the alert location…'
        : location || coordinateText || 'Location unavailable.',
    },
    {
      title: 'Contact the emergency response team',
      description: 'Use the emergency team number when one is assigned.',
      icon: ShieldAlert,
      content: 'Placeholder — number not configured yet',
    },
  ];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-busy={isResolving}
      onCancel={event => { event.preventDefault(); if (!isResolving) onCancel(); }}
      onClick={event => { if (event.target === event.currentTarget && !isResolving) onCancel(); }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-[#2A3A52] admin-light:border-[#CBD5E1] bg-[#131C2E] p-5 text-white shadow-2xl backdrop:bg-black/70 sm:p-6 admin-light:bg-white admin-light:text-slate-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <ShieldAlert size={30} aria-hidden="true" className="shrink-0 text-red-400 admin-light:text-red-600" />
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold">Confirm SOS resolution</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-400 admin-light:text-slate-500">Follow these response steps before closing the alert.</p>
          </div>
        </div>
        <button type="button" autoFocus disabled={isResolving} onClick={onCancel} aria-label="Close confirmation" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#1E2D45] hover:text-white admin-light:hover:bg-slate-100 admin-light:hover:text-slate-900 disabled:opacity-50">
          <X size={19} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-[#2A3A52] bg-[#0E1628] p-3 admin-light:border-[#E2E8F0] admin-light:bg-[#F8FAFC]">
        <p className="text-xs font-semibold text-slate-200 admin-light:text-slate-800">{alert.note}</p>
        <p className="mt-1 text-xs text-slate-400 admin-light:text-slate-500">{alert.sender} · {alert.senderRole === 'CONDUCTOR' ? 'Conductor' : 'Commuter'}</p>
      </div>

      <ol className="mt-4 list-none space-y-3 p-0">
        {steps.map((step) => {
          const StepIcon = step.icon;
          return (
            <li key={step.title} className="rounded-xl border border-[#2A3A52] bg-[#0E1628] p-3 admin-light:border-[#E2E8F0] admin-light:bg-[#F8FAFC]">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-100 admin-light:text-slate-900"><StepIcon size={15} aria-hidden="true" className="shrink-0 text-[#99C1F1] admin-light:text-[#1A5FB4]" />{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400 admin-light:text-slate-600">{step.description}</p>
                <p className="mt-2 text-xs font-semibold text-slate-200 admin-light:text-slate-800">{step.content}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {location && attribution && <p className="mt-3 text-[10px] text-slate-500 admin-light:text-slate-500">Location data: {attribution}</p>}

      {resolveError && <p role="alert" className="mt-4 rounded-lg border border-red-500 bg-[#35131B] p-3 text-sm text-red-200 admin-light:border-red-300 admin-light:bg-red-50 admin-light:text-red-700">{resolveError}</p>}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" disabled={isResolving} onClick={onCancel} className="min-h-11 rounded-lg border border-[#2A3A52] bg-[#0E1628] px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-[#1A263B] admin-light:border-[#CBD5E1] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50">Keep alert open</button>
        <button type="button" disabled={isResolving} onClick={() => { void resolve(); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-600 bg-red-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-wait disabled:opacity-50">
          {isResolving ? 'Resolving…' : 'Confirm & resolve'}
        </button>
      </div>
    </dialog>
  );
}

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
  const [historySort, setHistorySort] = useState<SafetyHistorySort>('recent');

  // Pagination States
  const [sosPage, setSosPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // Filter States — SOS history date/status are sent to the server, which
  // filters and paginates in SQL.
  const [filterSosDate, setFilterSosDate] = useState('');
  const [filterSosStatus, setFilterSosStatus] = useState<SosHistoryOutcome>('ALL');
  const [filterBreakOnly, setFilterBreakOnly] = useState(false);

  // Live fleet data (real API, 5s poll)
  const { fleet, isLoading, lastFetchedAt, error, refetch } = useFleetPoll(5000);
  // Real SOS alerts (polls /api/admin/sos every 5s) + real overspeed feed.
  // The hook exposes its own error/loading state — we surface it as a banner
  // so SOS feed failures don't silently render as an empty active-alerts list.
  const { data, error: sosError, refetch: refetchSos, resolveSos } = useMonitoringData(
    overspeedPage,
    filterOverspeedDate,
    historySort,
    { page: sosPage, date: filterSosDate, outcome: filterSosStatus },
  );

  const sosAlerts = data.sosAlerts;
  const sosHistory = data.sosHistory;
  const { locations: sosLocations, attribution: sosAttribution } = useSosLocations(sosAlerts);
  const sosMapMarkers = useMemo(
    () => sosAlerts.map(alert => ({ id: alert.id, coords: alert.coordinates, location: sosLocations[alert.id] })),
    [sosAlerts, sosLocations],
  );
  const [sosToResolve, setSosToResolve] = useState<SosAlert | null>(null);
  const [fleetSearch, setFleetSearch] = useState('');

  // The two history logs share one panel and switch by tab — each keeps its
  // own date filter and page, so flipping tabs never loses your place.
  const [historyTab, setHistoryTab] = useState<'sos' | 'overspeed'>('sos');

  // ─── Deep-link from the notification bell ──────────────────────
  // SOS_TRIGGERED links here as ?sosId={id}; OVERSPEED_FLAGGED as
  // ?overspeedId={id}. Neither has a per-item modal — both render inline
  // (SOS as cards with status/Resolve actions, overspeed as history
  // table rows) — so each deep-link scrolls to and highlights the matching
  // element instead, same idea as handleFocusVehicle's scroll-into-view for
  // a fleet row.
  const [highlightedSosId, setHighlightedSosId] = useState<string | null>(null);
  const [highlightedResolvedSosId, setHighlightedResolvedSosId] = useState<string | null>(null);
  const focusedResolvedSosRef = useRef<string | null>(null);
  const [highlightedOverspeedId, setHighlightedOverspeedId] = useState<string | null>(null);
  useEffect(() => {
    const sosId = searchParams.get('sosId');
    const resolvedSosId = searchParams.get('resolvedSosId');
    const overspeedId = searchParams.get('overspeedId');
    if (!sosId && !overspeedId && !resolvedSosId) return;
    if (sosId) setHighlightedSosId(sosId);
    if (resolvedSosId) {
      setHighlightedResolvedSosId(resolvedSosId);
      setHistoryTab('sos');
      // A just-closed alert is among the newest, so it lands on the first
      // unfiltered "Recent first" page of the server-paginated history.
      setFilterSosDate('');
      setFilterSosStatus('ALL');
      setSosPage(1);
      setHistorySort('recent');
    }
    if (overspeedId) {
      setHighlightedOverspeedId(overspeedId);
      setHistoryTab('overspeed');
      // A freshly-flagged episode is always "today" — clear any leftover
      // date filter/page so it's guaranteed to be on the page it lands on.
      setFilterOverspeedDate('');
      setOverspeedPage(1);
      setHistorySort('recent');
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

  // Reuse the fleet feed's active-shift break state for counts, list, and filter.
  const breakUnits = useMemo(() => fleet.filter(v => v.is_on_break), [fleet]);
  const breakCount = breakUnits.length;
  const activeCount = fleet.length;

  // `alert` escalates a card's styling only while its count is actually
  // non-zero. A scheduled break is ordinary shift activity.
  const metrics = [
    { title: 'Active Vehicles', hint: 'On shift today', value: activeCount.toString(), icon: MapPin, color: 'text-[#62A0EA] admin-light:text-[#1A5FB4]', alert: false },
    { title: 'On break', hint: 'Active units with a scheduled break', value: breakCount.toString(), icon: Coffee, color: 'text-sky-400 admin-light:text-sky-700', alert: false },
    { title: 'Active SOS', hint: 'Awaiting resolution', value: sosAlerts.length.toString(), icon: AlertTriangle, color: 'text-red-400 admin-light:text-red-600', alert: sosAlerts.length > 0 },
  ];

  const filteredFleet = useMemo(() => {
    const query = fleetSearch.trim().toLowerCase();
    return (filterBreakOnly ? breakUnits : fleet).filter((vehicle) => !query || [
      vehicle.unit_number, vehicle.plate_number, vehicle.driver_name, vehicle.conductor_name, vehicle.route_name,
    ].some((value) => value?.toLowerCase().includes(query)));
  }, [fleet, breakUnits, filterBreakOnly, fleetSearch]);

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
      break_duration_minutes: v.break_duration_minutes,
      is_stale: v.is_stale,
      minutes_since_update: v.minutes_since_update,
    })).filter(v => v.lat !== 0 && v.lng !== 0),
    [fleet]
  );

  // The active SOS card opens a response checklist before backend resolution.
  const handleConfirmSos = (alert: SosAlert) => setSosToResolve(alert);

  const filteredOverspeedHistory = data.overspeedHistory;

  // Both history feeds re-poll every 5s and can shrink under the viewer (a
  // filter narrows). The page number is therefore clamped to the valid range
  // on every render rather than trusted as-is — otherwise the "Next" guard
  // (page === totalPages) never matches an out-of-range page and you can walk
  // forward through empty tables indefinitely.
  const totalSosPages = Math.max(1, data.sosHistoryLastPage);
  const safeSosPage = Math.min(Math.max(sosPage, 1), totalSosPages);
  const goToSosPage = (page: number) => setSosPage(Math.min(Math.max(page, 1), totalSosPages));
  const currentSosData = sosHistory;
  // SOS history is paginated on the server: when the result set shrinks
  // below the requested page, request the last page that still has rows.
  useEffect(() => {
    if (sosPage > data.sosHistoryLastPage) setSosPage(Math.max(1, data.sosHistoryLastPage));
  }, [sosPage, data.sosHistoryLastPage]);

  useEffect(() => {
    if (!highlightedResolvedSosId || focusedResolvedSosRef.current === highlightedResolvedSosId || historyTab !== 'sos') return;
    const row = document.getElementById(`sos-history-${highlightedResolvedSosId}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      focusedResolvedSosRef.current = highlightedResolvedSosId;
    }
  }, [highlightedResolvedSosId, sosHistory, historyTab, isLoading]);

  const totalOverspeedPages = Math.max(1, data.overspeedLastPage);
  const safeOverspeedPage = Math.min(Math.max(overspeedPage, 1), totalOverspeedPages);
  const goToOverspeedPage = (page: number) => setOverspeedPage(Math.min(Math.max(page, 1), totalOverspeedPages));
  const currentOverspeedData = filteredOverspeedHistory;

  // ── Loading State ──
  // Mirrors the loaded layout: status strip → map + shift overview → fleet table.
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-gray-700 admin-light:bg-slate-200 animate-pulse" />
        <SkeletonMetric count={3} />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
          <SkeletonMap height="440px" label="Loading Monitoring Map…" />
          <div className="hidden lg:block rounded-xl border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white animate-pulse" />
        </div>
        <SkeletonTable rows={5} columns={6} title="Active Vehicle Tracking" />
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 admin-light:text-red-600 mb-4" />
        <h2 className="text-lg font-semibold text-white admin-light:text-slate-900 mb-2">Failed to load monitoring data</h2>
        <p className="text-sm text-slate-400 admin-light:text-slate-500 mb-4">{error}</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-[#62A0EA] admin-light:bg-[#1A5FB4] hover:bg-[#99C1F1] admin-light:hover:bg-[#164A8F] text-white rounded-md text-sm font-medium transition-colors">Try Again</button>
      </div>
    );
  }

  // Keep fleet counts together above the map, with room for labels on desktop.
  const statusStrip = (
    <div className="mb-5 grid grid-cols-3 overflow-hidden rounded-xl border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#101A2B] admin-light:bg-[#F8FAFC] divide-x divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
      {metrics.map((item) => {
        const Icon = item.icon;
        const isRed = item.color === 'text-red-400 admin-light:text-red-600';
        return (
          <div
            key={item.title}
            title={item.hint}
            className={`flex items-center gap-3 px-3 py-3 md:px-5 lg:gap-4 lg:py-4 transition-colors ${
              item.alert ? (isRed ? 'bg-red-400/10 admin-light:bg-red-50' : 'bg-amber-400/10') : ''
            }`}
          >
            <Icon size={18} className={`hidden sm:block flex-shrink-0 ${item.alert ? item.color : 'text-slate-500'}`} />
            <div className="min-w-0">
              <p className={`text-xl font-semibold leading-tight tabular-nums lg:text-2xl ${item.alert ? item.color : 'text-white admin-light:text-slate-900'}`}>{item.value}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-400 admin-light:text-slate-500 truncate lg:text-xs">{item.title}</p>
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
      <StickyPageHeader className="mb-4 md:mb-5 md:flex md:items-center md:justify-between md:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white admin-light:text-slate-900">Live Monitoring</h1>
          <p className="mt-1.5 hidden text-sm text-slate-400 admin-light:text-slate-500 md:block">Fleet locations, emergency alerts, and safety records.</p>
        </div>
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <div className="text-right text-xs text-slate-400 admin-light:text-slate-500">
            <p className="flex items-center justify-end gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Auto-refresh · 5s</p>
            {lastFetchedAt && <p className="mt-1 text-slate-500 tabular-nums">Updated {lastFetchedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>}
          </div>
        </div>
      </StickyPageHeader>

      {statusStrip}

      {/* SOS feed error banner — shown when the SOS polling loop fails.
          Fleet errors are already handled by the error state above; this
          banner is specifically for the SOS hook, which previously failed
          silently and rendered zero alerts with no indication. */}
      {sosError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={16} className="text-red-400 admin-light:text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-400 admin-light:text-red-600 truncate">
              SOS feed unavailable: {sosError}
            </p>
          </div>
          <button
            onClick={() => refetchSos()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 admin-light:text-red-700 rounded-md text-xs font-medium transition-colors flex-shrink-0"
          >
            <RefreshCw size={12} /> Retry SOS
          </button>
        </div>
      )}

      {/* Map and shift overview share a row on large screens. */}
      <section aria-label="Live fleet and shift overview" className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px] gap-4 lg:gap-5">
        <div id="monitoring-map" className="order-2 flex h-[340px] min-w-0 flex-col overflow-hidden rounded-xl border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white sm:h-[400px] lg:order-1 lg:h-[440px] 2xl:h-[480px]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#1E2D45] admin-light:border-[#E2E8F0] px-4 py-3.5">
            <h2 className="text-sm font-semibold text-white admin-light:text-slate-900">Fleet map</h2>
            <p className="text-xs text-slate-400 admin-light:text-slate-500 tabular-nums">{liveMapVehicles.length} units with GPS</p>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <AdminCommuterMap
              liveVehicles={liveMapVehicles}
              demandZones={data.demandZones}
              sosLocations={sosMapMarkers}
              focusPosition={focusPosition}
              focusNonce={focusNonce}
            />
          </div>
        </div>

        <aside
          aria-label="Shift overview"
          className={`order-1 lg:order-2 flex flex-col rounded-xl border lg:h-[440px] 2xl:h-[480px] min-h-0 ${
            sosAlerts.length > 0 ? 'bg-[#131C2E] admin-light:bg-white border-red-400/30' : 'bg-[#131C2E] admin-light:bg-white border-[#1E2D45] admin-light:border-[#E2E8F0]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#1E2D45] admin-light:border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white admin-light:text-slate-900">Shift overview</h2>
              {sosAlerts.length > 0 && (
                <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span>
              )}
            </div>
            <span className={`text-sm font-semibold tabular-nums ${
              sosAlerts.length > 0 ? 'text-red-400 admin-light:text-red-600' : 'text-slate-500'
            }`}>{sosAlerts.length}</span>
          </div>

          {sosAlerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-6">
              <CheckCircle2 size={28} className="text-emerald-400/70 admin-light:text-emerald-700 mb-2" />
              <p className="text-sm font-semibold text-slate-300 admin-light:text-slate-700">All clear</p>
              <p className="text-xs text-slate-500 mt-1">No ongoing SOS alerts.</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 max-h-[420px] lg:max-h-none overflow-y-auto scrollbar-themed p-3 space-y-3">
              {sosAlerts.map((alert) => {
                const isAcknowledged = alert.status === "ACKNOWLEDGED";
                const roleLabel = alert.senderRole === "CONDUCTOR" ? "Conductor" : "Commuter";
                const location = sosLocations[alert.id];
                return (
                  <div
                    key={alert.id}
                    id={`sos-alert-${alert.id}`}
                    className={`rounded-lg border bg-[#35131B] p-3 transition-shadow admin-light:bg-[#FFF1F2] ${
                      highlightedSosId === alert.id
                        ? 'border-[#62A0EA] admin-light:border-[#1A5FB4] ring-2 ring-[#62A0EA]/50 admin-light:ring-[#1A5FB4]/50'
                        : 'border-red-500 admin-light:border-red-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-red-400 admin-light:text-red-600">
                        <AlertTriangle size={13} /> SOS
                      </span>
                      <span className="flex items-center text-[11px] text-slate-500"><Clock size={11} className="mr-1" />{alert.time}</span>
                    </div>
                    <p className="text-sm font-semibold text-white admin-light:text-slate-900 mt-1.5 break-words">{alert.note}</p>
                    <p className="text-xs text-slate-300 admin-light:text-slate-700 mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-white admin-light:text-slate-900">{alert.sender}</span>
                      <span className="text-slate-500">· {roleLabel}</span>
                    </p>
                    {location !== null && (
                      <p className={`mt-1.5 flex items-start gap-1.5 text-xs break-words ${location ? 'text-slate-200 admin-light:text-slate-800' : 'text-slate-500'}`}>
                        <MapPin size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                        {location ?? 'Looking up location…'}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 mt-1.5">
                      <p className="text-[11px] text-slate-500 font-mono">{alert.coordinates[0].toFixed(5)}, {alert.coordinates[1].toFixed(5)}</p>
                      {isAcknowledged ? (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 admin-light:text-amber-700 font-medium flex-shrink-0">
                          <CheckCircle2 size={12} /> Acknowledged
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-red-400 admin-light:text-red-600 font-medium flex-shrink-0">
                          <span aria-hidden="true" className="inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                          Awaiting response
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleConfirmSos(alert)} className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold transition-colors">Confirm &amp; Resolve</button>
                    </div>
                  </div>
                );
              })}
              {sosAttribution && sosAlerts.some(alert => sosLocations[alert.id]) && (
                <p className="px-1 text-[10px] text-slate-500">Location data: {sosAttribution}</p>
              )}
            </div>
          )}
        </aside>
      </section>

      <section aria-labelledby="fleet-heading" className="mt-5 min-w-0 overflow-hidden rounded-xl border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white">
        <div className="border-b border-[#1E2D45] admin-light:border-[#E2E8F0] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="fleet-heading" className="text-base font-semibold text-white admin-light:text-slate-900">Active vehicle tracking</h2>
              <p className="mt-1 text-xs text-slate-400 admin-light:text-slate-500">Units on shift today. Select a unit to view its location.</p>
            </div>
            <span className="shrink-0 text-xs text-slate-400 admin-light:text-slate-500 tabular-nums">{filteredFleet.length} / {fleet.length} units</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-w-0 flex-1 basis-full items-center gap-2.5 rounded-lg border border-[#2A3A52] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white px-3 focus-within:border-[#62A0EA] admin-light:focus-within:border-[#1A5FB4] lg:max-w-sm lg:basis-0">
              <Search size={15} aria-hidden="true" className="shrink-0 text-slate-500" />
              <input type="search" aria-label="Search active fleet" placeholder="Search unit, plate, crew, or route" value={fleetSearch} onChange={(event) => setFleetSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-xs text-slate-200 admin-light:text-slate-700 outline-none placeholder:text-slate-500" />
              {fleetSearch && <button type="button" aria-label="Clear fleet search" onClick={() => setFleetSearch('')} className="rounded p-1 text-slate-400 admin-light:text-slate-500 hover:text-white admin-light:hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4]"><X size={13} /></button>}
            </label>
            <div role="group" aria-label="Filter active vehicles" className="flex items-center gap-1">
              <button type="button" aria-pressed={!filterBreakOnly} onClick={() => setFilterBreakOnly(false)} className={`min-h-9 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] ${!filterBreakOnly ? 'bg-white/8 admin-light:bg-slate-100 text-white admin-light:text-slate-900' : 'text-slate-400 admin-light:text-slate-500 hover:bg-white/5 admin-light:hover:bg-[#F8FAFC] hover:text-slate-200 admin-light:hover:text-slate-700'}`}>All units <span className="ml-1 text-slate-500 tabular-nums">{fleet.length}</span></button>
              <button type="button" aria-pressed={filterBreakOnly} onClick={() => setFilterBreakOnly(true)} className={`flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] ${filterBreakOnly ? 'bg-sky-400/10 text-sky-300 admin-light:text-sky-700' : 'text-slate-400 admin-light:text-slate-500 hover:bg-white/5 admin-light:hover:bg-[#F8FAFC] hover:text-slate-200 admin-light:hover:text-slate-700'}`}><Coffee size={13} />On break <span className="ml-1 tabular-nums">{breakCount}</span></button>
            </div>
          </div>
        </div>
        <div className="max-h-[440px] overflow-auto scrollbar-themed">
          <table aria-label="Active vehicle tracking" className="w-full min-w-[840px] table-fixed text-left">
            <colgroup><col className="w-[18%]" /><col className="w-[25%]" /><col className="w-[16%]" /><col className="w-[16%]" /><col className="w-[18%]" /><col className="w-[7%]" /></colgroup>
            <thead><tr>
              <TableHeading>Unit / plate</TableHeading>
              <TableHeading>Crew</TableHeading>
              <TableHeading className="pr-8 text-right">Speed</TableHeading>
              <TableHeading>Capacity</TableHeading>
              <TableHeading>Status</TableHeading>
              <TableHeading className="px-2"><span className="sr-only">Map location</span></TableHeading>
            </tr></thead>
            <tbody className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
              {filteredFleet.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center">
                  <p className="text-sm font-medium text-slate-300 admin-light:text-slate-700">{fleet.length === 0 ? 'No vehicles on shift' : 'No matching vehicles'}</p>
                  <p className="mt-1 text-xs text-slate-500">{fleet.length === 0 ? 'Active units will appear here when their shift starts.' : 'Try another search or switch to all units.'}</p>
                </td></tr>
              ) : filteredFleet.map((v) => (
                <tr key={v.id} id={`fleet-unit-${v.id}`} onClick={() => handleFocusVehicle(v)} className={`group transition-colors ${v.has_gps ? 'cursor-pointer' : ''} ${focusedVehicleId === v.id ? 'bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10 ring-1 ring-inset ring-[#62A0EA]/40 admin-light:ring-[#1A5FB4]/40' : v.is_on_break ? 'bg-sky-400/5 hover:bg-sky-400/10' : 'hover:bg-white/3 admin-light:hover:bg-[#F8FAFC]'}`}>
                  <td className="px-5 py-4"><p className="truncate text-sm font-semibold text-white admin-light:text-slate-900" title={v.unit_number}>{v.unit_number}</p><p className="mt-1 truncate font-mono text-[11px] text-slate-400 admin-light:text-slate-500" title={v.plate_number}>{v.plate_number}</p></td>
                  <td className="px-5 py-4">
                    <p className="truncate text-sm text-slate-200 admin-light:text-slate-700" title={v.driver_name ?? undefined}>{v.driver_name ?? 'Unassigned driver'}</p>
                    <p className="mt-1 truncate text-xs text-slate-400 admin-light:text-slate-500" title={v.conductor_name ?? undefined}>Conductor: {v.conductor_name ?? 'Unassigned'}</p>
                  </td>
                  <td className="pl-5 pr-8 py-4 text-right whitespace-nowrap"><span className={`text-sm font-semibold tabular-nums ${v.speed !== null && v.speed > SPEED_LIMIT_KMH ? 'text-red-300 admin-light:text-red-700' : 'text-slate-200 admin-light:text-slate-700'}`}>{v.speed ?? '—'}</span>{v.speed !== null && <span className="ml-1 text-[10px] text-slate-500">km/h</span>}</td>
                  <td className="px-5 py-4"><span className={`text-xs font-medium ${v.capacity_status === 'AVAILABLE' ? 'text-emerald-300 admin-light:text-emerald-700' : v.capacity_status === 'STANDING' ? 'text-amber-300 admin-light:text-amber-700' : 'text-red-300 admin-light:text-red-700'}`}>{v.capacity_status === 'AVAILABLE' ? 'Available' : v.capacity_status === 'STANDING' ? 'Standing' : 'Full'}</span></td>
                  <td className="px-5 py-4">
                    {v.is_on_break ? <div><span className="text-xs font-medium text-sky-300 admin-light:text-sky-700">On break</span><p className="mt-1 text-[11px] text-slate-400 admin-light:text-slate-500">{formatElapsedMinutes(v.break_duration_minutes)} elapsed</p></div> : !v.has_gps ? <span className="text-xs text-slate-400 admin-light:text-slate-500">Awaiting GPS</span> : v.is_stale ? (
                      <div><span className="text-xs font-medium text-amber-300 admin-light:text-amber-700">GPS delayed</span><p className="mt-1 text-[11px] text-slate-400 admin-light:text-slate-500">{formatElapsedMinutes(v.minutes_since_update)} ago</p></div>
                    ) : <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 admin-light:text-emerald-700"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Live</span>}
                  </td>
                  <td className="px-2 py-4"><button type="button" onClick={(event) => { event.stopPropagation(); handleFocusVehicle(v); }} disabled={!v.has_gps} aria-label={`Locate unit ${v.unit_number} on map`} title={v.has_gps ? 'Locate on map' : 'No GPS position reported'} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 admin-light:text-slate-500 transition-colors hover:bg-[#62A0EA]/10 admin-light:hover:bg-[#1A5FB4]/10 hover:text-[#99C1F1] admin-light:hover:text-[#164A8F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] disabled:cursor-default disabled:opacity-25"><LocateFixed size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="history-heading" className="mb-8 mt-5 min-w-0 overflow-hidden rounded-xl border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white">
        <div className="px-5 pb-3 pt-5">
          <h2 id="history-heading" className="text-base font-semibold text-white admin-light:text-slate-900">Safety history</h2>
          <p className="mt-1 text-xs text-slate-400 admin-light:text-slate-500">Closed emergency alerts and recorded overspeeding incidents.</p>
        </div>
        {/* Filters sit in the tab row because they filter the active tab.
            Below xl they drop to a toolbar under the tabs, keeping the tab
            underline on the row's border. */}
        <div className="border-[#1E2D45] admin-light:border-[#E2E8F0] xl:flex xl:items-center xl:justify-between xl:gap-4 xl:border-b xl:px-5">
          <div role="tablist" aria-label="History logs" className="flex gap-5 self-stretch border-b border-[#1E2D45] admin-light:border-[#E2E8F0] px-5 xl:items-end xl:border-b-0 xl:px-0" onKeyDown={(event) => {
            const next = event.key === 'Home' ? 'sos' : event.key === 'End' ? 'overspeed' : event.key === 'ArrowRight' || event.key === 'ArrowLeft' ? (isSosTab ? 'overspeed' : 'sos') : null;
            if (!next) return;
            event.preventDefault();
            setHistoryTab(next);
            event.currentTarget.querySelector<HTMLButtonElement>(`[id="history-tab-${next}"]`)?.focus();
          }}>
            <button type="button" role="tab" id="history-tab-sos" aria-controls="history-panel-sos" aria-selected={isSosTab} tabIndex={isSosTab ? 0 : -1} onClick={() => setHistoryTab('sos')} className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] ${isSosTab ? 'border-[#62A0EA] admin-light:border-[#1A5FB4] text-white admin-light:text-slate-900' : 'border-transparent text-slate-400 admin-light:text-slate-500 hover:text-slate-200 admin-light:hover:text-slate-700'}`}><Archive size={15} />SOS History<span className="ml-1 text-xs text-slate-500 tabular-nums">{data.sosHistoryTotal}</span></button>
            <button type="button" role="tab" id="history-tab-overspeed" aria-controls="history-panel-overspeed" aria-selected={!isSosTab} tabIndex={!isSosTab ? 0 : -1} onClick={() => setHistoryTab('overspeed')} className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] ${!isSosTab ? 'border-red-400 text-white admin-light:text-slate-900' : 'border-transparent text-slate-400 admin-light:text-slate-500 hover:text-slate-200 admin-light:hover:text-slate-700'}`}><Gauge size={15} />Overspeeding<span className="ml-1 text-xs text-slate-500 tabular-nums">{data.overspeedTotal}</span></button>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-[#1E2D45] admin-light:border-[#E2E8F0] px-5 py-3 xl:border-b-0 xl:px-0 xl:py-1.5">
            {isSosTab && (
              <select aria-label="Filter SOS history by status" value={filterSosStatus} onChange={(event) => { setFilterSosStatus(event.target.value as SosHistoryOutcome); setSosPage(1); }} className="min-h-9 rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white px-3 py-2 text-xs text-slate-300 admin-light:text-slate-700 outline-none focus-visible:border-[#62A0EA] admin-light:focus-visible:border-[#1A5FB4] focus-visible:ring-2 focus-visible:ring-[#62A0EA]/30 admin-light:focus-visible:ring-[#1A5FB4]/30 [color-scheme:dark] admin-light:[color-scheme:light]">
                <option value="ALL">All statuses</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            )}
            <AdminDatePicker key={isSosTab ? 'sos-date' : 'overspeed-date'} popover yearNavigation triggerClassName="w-40 min-h-9 py-2" accent={isSosTab ? 'blue' : 'red'} align="right" ariaLabel={isSosTab ? 'Filter SOS history by date' : 'Filter overspeeding history by date'} value={isSosTab ? filterSosDate : filterOverspeedDate} onChange={(next) => { if (isSosTab) { setFilterSosDate(next); setSosPage(1); } else { setFilterOverspeedDate(next); setOverspeedPage(1); } }} />
            <select
              aria-label="Sort safety history"
              value={historySort}
              onChange={(event) => {
                setHistorySort(event.target.value as SafetyHistorySort);
                setSosPage(1);
                setOverspeedPage(1);
              }}
              className="min-h-9 rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white px-3 py-2 text-xs text-slate-300 admin-light:text-slate-700 outline-none focus-visible:border-[#62A0EA] admin-light:focus-visible:border-[#1A5FB4] focus-visible:ring-2 focus-visible:ring-[#62A0EA]/30 admin-light:focus-visible:ring-[#1A5FB4]/30 [color-scheme:dark] admin-light:[color-scheme:light]"
            >
              <option value="recent">Recent first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        <div role="tabpanel" id={`history-panel-${historyTab}`} aria-labelledby={`history-tab-${historyTab}`}>
          {isSosTab ? currentSosData.length === 0 ? (
            <div className="px-5 py-12 text-center"><Archive size={24} aria-hidden="true" className="mx-auto mb-3 text-slate-500" /><p className="text-sm font-medium text-slate-300 admin-light:text-slate-700">{filterSosDate || filterSosStatus !== 'ALL' ? 'No SOS alerts match these filters' : 'No SOS history yet'}</p><p className="mt-1 text-xs text-slate-500">Resolved and cancelled alerts are recorded here.</p></div>
          ) : (
            <>
              <div className="max-h-[440px] overflow-auto scrollbar-themed">
                <table aria-label="SOS history" className="w-full min-w-[840px] table-fixed text-left xl:min-w-[1020px]">
                  <thead><tr>
                    <TableHeading className="w-[24%] xl:w-[18%]">Sender</TableHeading>
                    <TableHeading className="hidden xl:table-cell xl:w-[18%]">Alert details</TableHeading>
                    <TableHeading className="w-[21%] xl:w-[18%]">Triggered</TableHeading>
                    <TableHeading className="w-[14%] xl:w-[10%]">Status</TableHeading>
                    <TableHeading className="w-[20%] xl:w-[18%]">Resolved by</TableHeading>
                    <TableHeading className="w-[21%] xl:w-[18%]">Closed</TableHeading>
                  </tr></thead>
                  <tbody className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
                    {currentSosData.map((log) => (
                      <tr key={log.id} id={`sos-history-${log.id}`} className={`transition-colors ${highlightedResolvedSosId === log.id ? 'bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10 ring-1 ring-inset ring-[#62A0EA]/40 admin-light:ring-[#1A5FB4]/40' : 'hover:bg-white/3 admin-light:hover:bg-[#F8FAFC]'}`}>
                        <td className="px-5 py-4"><p className="truncate text-sm font-medium text-slate-200 admin-light:text-slate-700" title={log.sender}>{log.sender}</p><p className="mt-1 text-xs text-slate-400 admin-light:text-slate-500">{log.senderRole === 'CONDUCTOR' ? 'Conductor' : 'Commuter'}</p><p className="mt-1 truncate text-xs text-slate-500 xl:hidden" title={log.note}>{log.note}</p></td>
                        <td className="hidden px-5 py-4 xl:table-cell"><p className="line-clamp-2 break-words text-xs leading-relaxed text-slate-300 admin-light:text-slate-700" title={log.note}>{log.note}</p></td>
                        <td className="px-5 py-4 text-xs leading-relaxed text-slate-300 admin-light:text-slate-700 tabular-nums">{log.triggeredAt}</td>
                        <td className="px-5 py-4"><span className={`text-xs font-medium ${log.status === 'CANCELLED' ? 'text-slate-400 admin-light:text-slate-500' : 'text-sky-300 admin-light:text-sky-700'}`}>{log.status === 'CANCELLED' ? 'Cancelled' : 'Resolved'}</span></td>
                        <td className="px-5 py-4"><span className="block truncate text-sm text-slate-300 admin-light:text-slate-700" title={log.status === 'CANCELLED' ? 'Cancelled by sender' : log.resolvedBy ?? 'Resolving admin was not recorded'}>{log.status === 'CANCELLED' ? '—' : log.resolvedBy ?? 'Not recorded'}</span></td>
                        <td className="px-5 py-4 text-xs leading-relaxed text-slate-300 admin-light:text-slate-700 tabular-nums">{log.resolvedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <HistoryPagination page={safeSosPage} pages={totalSosPages} start={(safeSosPage - 1) * SOS_HISTORY_PER_PAGE + 1} end={(safeSosPage - 1) * SOS_HISTORY_PER_PAGE + currentSosData.length} count={data.sosHistoryTotal} onChange={goToSosPage} />
            </>
          ) : filteredOverspeedHistory.length === 0 ? (
            <div className="px-5 py-12 text-center"><Gauge size={24} aria-hidden="true" className="mx-auto mb-3 text-slate-500" /><p className="text-sm font-medium text-slate-300 admin-light:text-slate-700">No overspeeding incidents{filterOverspeedDate ? ' for this date' : ' recorded'}</p><p className="mt-1 text-xs text-slate-500">Speed violations will appear here when detected.</p></div>
          ) : (
            <>
              <div className="max-h-[440px] overflow-auto scrollbar-themed">
                <table aria-label="Overspeeding history" className="w-full min-w-[760px] table-fixed text-left">
                  <thead><tr>
                    <TableHeading className="w-[16%]">Unit / plate</TableHeading>
                    <TableHeading className="w-[23%]">Driver</TableHeading>
                    <TableHeading className="w-[23%]">Conductor</TableHeading>
                    <TableHeading className="w-[17%] text-right">Top speed</TableHeading>
                    <TableHeading className="w-[21%]">Recorded</TableHeading>
                  </tr></thead>
                  <tbody className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
                    {currentOverspeedData.map((log) => (
                      <tr key={log.id} id={`overspeed-log-${log.id}`} className={`transition-colors ${highlightedOverspeedId === log.id ? 'bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10 ring-1 ring-inset ring-[#62A0EA]/40 admin-light:ring-[#1A5FB4]/40' : 'hover:bg-white/3 admin-light:hover:bg-[#F8FAFC]'}`}>
                        <td className="px-5 py-4"><span className="block truncate font-mono text-sm font-semibold text-slate-200 admin-light:text-slate-700" title={log.unit}>{log.unit}</span></td>
                        <td className="px-5 py-4"><span className="block truncate text-sm text-slate-300 admin-light:text-slate-700" title={log.driver}>{log.driver}</span></td>
                        <td className="px-5 py-4"><span className="block truncate text-sm text-slate-300 admin-light:text-slate-700" title={log.conductor}>{log.conductor}</span></td>
                        <td className="px-5 py-4 text-right whitespace-nowrap"><span className="text-sm font-semibold text-red-300 admin-light:text-red-700 tabular-nums">{log.speed}</span><span className="ml-1 text-[10px] text-slate-500">km/h</span></td>
                        <td className="px-5 py-4"><p className="text-xs text-slate-300 admin-light:text-slate-700 tabular-nums">{log.loggedDate}</p><p className="mt-1 text-xs text-slate-400 admin-light:text-slate-500">{log.loggedAt}</p></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <HistoryPagination page={safeOverspeedPage} pages={totalOverspeedPages} start={(safeOverspeedPage - 1) * ROWS_PER_PAGE + 1} end={(safeOverspeedPage - 1) * ROWS_PER_PAGE + currentOverspeedData.length} count={data.overspeedTotal} onChange={goToOverspeedPage} />
            </>
          )}
        </div>
      </section>
      {sosToResolve && (
        <SosResolutionDialog
          alert={sosToResolve}
          location={sosLocations[sosToResolve.id]}
          onCancel={() => setSosToResolve(null)}
          onConfirm={() => resolveSos(sosToResolve.id)}
        />
      )}
    </>
  );
}
