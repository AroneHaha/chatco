// app/(admin)/settings/fare-matrix/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Pencil, Trash2, X, MapPin, Search, Route, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import * as farePointService from '@/lib/admin/services/fare-point.service';
import type { FarePoint as ApiFarePoint } from '@/lib/admin/services/fare-point.service';
import * as routeService from '@/lib/admin/services/route.service';
import type { AdminRoute } from '@/lib/admin/services/route.service';
import type { RouteCoordinate } from '@/lib/admin/services/route.service';
import { formatPeso } from '@/lib/utils/display';
import { getSettings } from '@/lib/admin/services/setting.service';
import { fareForBarangays } from '@/lib/shared/fare/fare-matrix.service';
import { defaultFinancialRules } from '@/app/(admin)/settings/data/settings-data';
import { SkeletonFareMatrix } from '@/components/admin/ui/skeleton/skeleton-fare-matrix';
import { SuccessModal } from '@/components/admin/ui/success-modal';

const FarePointMapPicker = dynamic(() => import('@/components/admin/routes/fare-point-map-picker'), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse rounded-2xl border border-white/10 admin-light:border-[#CBD5E1] bg-[#050F1A] admin-light:bg-[#F8FAFC]" />,
});

// Adapter: convert API fare point to the format the original UI expects
interface FarePoint {
  id: string;
  pointNumber: number;
  name: string;
  regularFare: number;
  discountedFare: number;
  subStops?: string[];
  landmarks?: string;
  latitude: number | null;
  longitude: number | null;
}

function normalizeStringList(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  if (!value) return [];

  // Some existing rows contain a JSON-encoded array, while older rows use a
  // comma-separated string. Accept both so Admin and Conductor render the same
  // sub-area data regardless of when the row was created.
  try {
    const decoded: unknown = JSON.parse(value);
    if (Array.isArray(decoded)) {
      return decoded
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } catch {
    // Plain comma-separated value; handled below.
  }

  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function mapApiToLocal(api: ApiFarePoint): FarePoint {
  const subStops = normalizeStringList(api.sub_stops);
  const landmarks = normalizeStringList(api.landmarks);
  const combinedSubStops = [...subStops, ...landmarks].filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index
  );

  return {
    id: api.id,
    pointNumber: api.point_number,
    name: api.name,
    regularFare: Number(api.regular_fare),
    discountedFare: Number(api.discounted_fare),
    // Older rows store conductor subpoints in `landmarks`; newer edits use
    // `sub_stops`. Present one combined list until every row is migrated.
    subStops: combinedSubStops.length > 0 ? combinedSubStops : undefined,
    landmarks: landmarks.length > 0 ? landmarks.join(', ') : undefined,
    latitude: api.latitude === null ? null : Number(api.latitude),
    longitude: api.longitude === null ? null : Number(api.longitude),
  };
}

function mergeSubDropoffs(value: string, draft: string): string {
  const items = value.split(',').map((item) => item.trim()).filter(Boolean);
  const next = draft.trim();

  if (next && !items.some((item) => item.toLowerCase() === next.toLowerCase())) {
    items.push(next);
  }

  return items.join(', ');
}

function SubDropoffEditor({
  value,
  onChange,
  draft,
  onDraftChange,
}: {
  value: string;
  onChange: (value: string) => void;
  draft: string;
  onDraftChange: (value: string) => void;
}) {
  const items = useMemo(
    () => value.split(',').map((item) => item.trim()).filter(Boolean),
    [value]
  );

  const addItem = () => {
    const merged = mergeSubDropoffs(value, draft);
    if (merged === value) return;
    onChange(merged);
    onDraftChange('');
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index).join(', '));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder="e.g. Crossing or Public Market"
          className="block min-w-0 flex-1 rounded-xl border border-white/10 admin-light:border-[#CBD5E1] bg-[#050F1A] admin-light:bg-[#F8FAFC] px-3 py-2.5 text-sm text-white admin-light:text-slate-900 placeholder:text-white/25 admin-light:placeholder:text-slate-400 focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4] focus:outline-none focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30"
        />
        <button type="button" onClick={addItem} className="flex items-center gap-1.5 rounded-xl bg-white/10 admin-light:bg-slate-100 px-3 py-2.5 text-xs font-bold text-white admin-light:text-slate-900 hover:bg-white/15 admin-light:hover:bg-slate-200">
          <Plus size={14} /> Add to list
        </button>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span key={`${item}-${index}`} className="flex items-center gap-1.5 rounded-lg border border-[#62A0EA]/20 admin-light:border-[#1A5FB4]/20 bg-[#1A5FB4]/10 px-2.5 py-1.5 text-xs text-[#BFDBFE] admin-light:text-[#1A5FB4]">
              {item}
              <button type="button" onClick={() => removeItem(index)} className="text-white/35 admin-light:text-slate-500 hover:text-red-300 admin-light:hover:text-red-600" aria-label={`Remove ${item}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-white/25 admin-light:text-slate-400">Optional. These choices appear under the Point Area in the conductor fare calculator and use the same fare.</p>
      )}
    </div>
  );
}

// Used until Financial Rules load; match the backend defaults (App\Support\FareRules).
const DEFAULT_FARE_RULES = {
  minimumFare: Number(defaultFinancialRules.minimumFare),
  discountRate: Number(defaultFinancialRules.discountRate),
  succeedingFare: Number(defaultFinancialRules.succeedingFare),
  baseBarangayCount: Number(defaultFinancialRules.baseBarangayCount),
};
type PageFareRules = typeof DEFAULT_FARE_RULES;

/** Fare for a trip under these rules (the shared formula the backend charges with). */
function ruleFare(rules: PageFareRules, barangaysTraversed: number, discounted: boolean) {
  return fareForBarangays({
    baseFareRegular: rules.minimumFare,
    baseBarangayCount: rules.baseBarangayCount,
    succeedingFareRegular: rules.succeedingFare,
    discountRate: rules.discountRate,
  }, barangaysTraversed, discounted);
}

/** A stop's fares are generated from Financial Rules, so the forms show them instead of asking. */
function StopFareNote({ rules, pointNumber }: { rules: PageFareRules; pointNumber: number }) {
  return (
    <p className="@[32rem]/fare-matrix:col-span-2 text-xs text-white/50 admin-light:text-slate-500">
      Fare from stop 1: <span className="font-semibold text-white admin-light:text-slate-900">{formatPeso(ruleFare(rules, pointNumber, false))}</span>
      {' '}regular, <span className="font-semibold text-white admin-light:text-slate-900">{formatPeso(ruleFare(rules, pointNumber, true))}</span> discounted.
      {' '}Set by Financial Rules.
    </p>
  );
}

export default function FareMatrixPage() {
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [apiFarePoints, setApiFarePoints] = useState<ApiFarePoint[]>([]);
  const [farePoints, setFarePoints] = useState<FarePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fare preview
  const [previewFrom, setPreviewFrom] = useState<number | null>(null);
  const [previewTo, setPreviewTo] = useState<number | null>(null);

  // Live values from Financial Rules (same settings and defaults the backend
  // prices with: FareCalculationService floors every trip at base_fare_regular).
  const [fareRules, setFareRules] = useState(DEFAULT_FARE_RULES);

  // New point form state
  const [newName, setNewName] = useState('');
  const [newSubStops, setNewSubStops] = useState('');
  const [newSubStopDraft, setNewSubStopDraft] = useState('');
  const [newLocation, setNewLocation] = useState<RouteCoordinate | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editSubStops, setEditSubStops] = useState('');
  const [editSubStopDraft, setEditSubStopDraft] = useState('');
  const [editLocation, setEditLocation] = useState<RouteCoordinate | null>(null);

  const fetchRoutes = useCallback(async () => {
    try {
      const data = await routeService.listRoutes();
      setRoutes(data);
      setSelectedRouteId((current) => {
        if (current && data.some((route) => route.id === current)) return current;
        return data.find((route) => route.status === 'ACTIVE')?.id ?? data[0]?.id ?? '';
      });
      if (data.length === 0) setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load routes');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRoutes();
  }, [fetchRoutes]);

  useEffect(() => {
    let active = true;
    getSettings('financial')
      .then((data) => {
        if (!active) return;
        const number = (value: string | undefined, fallback: number) => {
          const parsed = Number(value);
          return value !== undefined && value !== '' && Number.isFinite(parsed) ? parsed : fallback;
        };
        const minimumFare = number(data.base_fare_regular, DEFAULT_FARE_RULES.minimumFare);
        const discountRate = number(data.discount_rate, DEFAULT_FARE_RULES.discountRate);
        setFareRules({
          minimumFare,
          discountRate,
          succeedingFare: number(data.succeeding_fare_regular, DEFAULT_FARE_RULES.succeedingFare),
          baseBarangayCount: number(data.base_barangay_count, DEFAULT_FARE_RULES.baseBarangayCount),
        });
      })
      .catch(() => {
        if (active) setError('Could not load Financial Rules; fare figures below may be out of date.');
      });
    return () => { active = false; };
  }, []);

  // Fetch Fare Points only for the selected route.
  const fetchFarePoints = useCallback(async () => {
    if (!selectedRouteId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await farePointService.list(selectedRouteId);
      setApiFarePoints(data);
      setFarePoints(data.map(mapApiToLocal));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fare points');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRouteId]);

  useEffect(() => {
    void fetchFarePoints();
  }, [fetchFarePoints]);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  // Filtered points by search
  const filteredPoints = useMemo(() => {
    if (!searchQuery.trim()) return farePoints;
    const q = searchQuery.toLowerCase();
    return farePoints.filter(p =>
      p.name.toLowerCase().includes(q) ||
      String(p.pointNumber).includes(q) ||
      (p.subStops?.some(s => s.toLowerCase().includes(q)))
    );
  }, [farePoints, searchQuery]);

  // Fare preview: the same formula the backend charges with (App\Support\FareRules).
  const farePreview = useMemo(() => {
    if (!previewFrom || !previewTo || previewFrom === previewTo) return null;
    const from = farePoints.find(p => p.pointNumber === previewFrom);
    const to = farePoints.find(p => p.pointNumber === previewTo);
    if (!from || !to) return null;
    // Both ends count: stop 1 to stop 6 traverses 6 barangays.
    const barangaysTraveled = Math.abs(from.pointNumber - to.pointNumber) + 1;
    return {
      fareResult: {
        fromPoint: from,
        toPoint: to,
        barangaysTraveled,
        regularFare: ruleFare(fareRules, barangaysTraveled, false),
        discountedFare: ruleFare(fareRules, barangaysTraveled, true),
        baseFare: fareRules.minimumFare,
        succeedingFare: fareRules.succeedingFare,
        succeedingCount: Math.max(0, barangaysTraveled - fareRules.baseBarangayCount),
      }
    };
  }, [previewFrom, previewTo, farePoints, fareRules]);

  // Stays open until the admin dismisses it.
  const showSuccess = (msg: string) => setSuccessMsg(msg);

  const scrollToForm = (id: 'fare-point-add-form' | 'fare-point-edit-form') => {
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleToggleAddForm = () => {
    const willOpen = !showAddForm;
    setShowAddForm(willOpen);
    setError(null);

    if (willOpen) {
      setEditingPoint(null);
      scrollToForm('fare-point-add-form');
    }
  };

  const handleAddPoint = async () => {
    if (!selectedRouteId) {
      setError('No route is set up yet, so a Point Area cannot be added.');
      return;
    }
    if (!newName.trim()) {
      setError('Enter a name for the new Point Area.');
      scrollToForm('fare-point-add-form');
      return;
    }
    if (!newLocation) {
      setError('Choose the Point Area location on the map before adding it.');
      scrollToForm('fare-point-add-form');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const normalizedSubStops = mergeSubDropoffs(newSubStops, newSubStopDraft);
      setNewSubStops(normalizedSubStops);
      setNewSubStopDraft('');
      await farePointService.create({
        route_id: selectedRouteId,
        point_number: farePoints.length + 1,
        code: `P${String(farePoints.length + 1).padStart(2, '0')}`,
        name: newName.trim(),
        landmarks: null,
        sub_stops: normalizedSubStops || null,
        latitude: newLocation[0],
        longitude: newLocation[1],
      });
      showSuccess(`Point "${newName}" added successfully.`);
      setNewName(''); setNewSubStops(''); setNewSubStopDraft('');
      setNewLocation(null);
      setShowAddForm(false);
      await Promise.all([fetchFarePoints(), fetchRoutes()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add fare point');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (pointNumber: number) => {
    const point = farePoints.find(p => p.pointNumber === pointNumber);
    if (!point) return;
    setShowAddForm(false);
    setError(null);
    setEditName(point.name);
    setEditSubStops(point.subStops ? point.subStops.join(', ') : '');
    setEditSubStopDraft('');
    setEditLocation(point.latitude !== null && point.longitude !== null
      ? [point.latitude, point.longitude]
      : null);
    setEditingPoint(pointNumber);
    scrollToForm('fare-point-edit-form');
  };

  const handleSaveEdit = async () => {
    if (!editingPoint || !editName.trim()) return;
    const point = farePoints.find(p => p.pointNumber === editingPoint);
    if (!point) return;
    setIsSaving(true);
    setError(null);
    try {
      if (!editLocation) throw new Error('Choose the Point Area location on the map.');
      const normalizedSubStops = mergeSubDropoffs(editSubStops, editSubStopDraft);
      setEditSubStops(normalizedSubStops);
      setEditSubStopDraft('');
      await farePointService.update(point.id, {
        name: editName.trim(),
        // Saving an old row migrates its legacy landmark choices into the
        // canonical sub_stops field, so removals and additions stay in sync.
        landmarks: null,
        sub_stops: normalizedSubStops || null,
        latitude: editLocation[0],
        longitude: editLocation[1],
      });
      showSuccess(`Point "${editName}" updated successfully.`);
      setEditingPoint(null);
      await Promise.all([fetchFarePoints(), fetchRoutes()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update fare point');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (pointNumber: number) => {
    if (!confirm(`Delete point #${pointNumber}? This action cannot be undone.`)) return;
    const point = farePoints.find(p => p.pointNumber === pointNumber);
    if (!point) return;
    setIsSaving(true);
    setError(null);
    try {
      await farePointService.remove(point.id);
      showSuccess(`Point #${pointNumber} deleted.`);
      if (previewFrom === pointNumber) setPreviewFrom(null);
      if (previewTo === pointNumber) setPreviewTo(null);
      await Promise.all([fetchFarePoints(), fetchRoutes()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete fare point');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMovePoint = async (pointNumber: number, direction: -1 | 1) => {
    if (!selectedRouteId) return;
    const currentIndex = apiFarePoints.findIndex((point) => point.point_number === pointNumber);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= apiFarePoints.length) return;

    const reordered = [...apiFarePoints];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    setIsSaving(true);
    setError(null);
    try {
      await farePointService.reorder(selectedRouteId, reordered.map((point) => point.id));
      await Promise.all([fetchFarePoints(), fetchRoutes()]);
      showSuccess('Fare Point order updated. The route line on the maps is unchanged.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder Fare Points');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = "block min-w-0 w-full px-3 py-2.5 bg-[#050F1A] admin-light:bg-[#F8FAFC] border border-white/10 admin-light:border-[#CBD5E1] rounded-xl text-white admin-light:text-slate-900 text-sm placeholder:text-white/25 admin-light:placeholder:text-slate-400 focus:outline-none focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4] focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30 transition-colors";

  // ── Loading State ──
  if (isLoading) {
    return <SkeletonFareMatrix />;
  }

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="@container/fare-matrix mx-auto min-w-0 w-full max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 @[40rem]/fare-matrix:flex-row @[40rem]/fare-matrix:items-center @[40rem]/fare-matrix:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl @[40rem]/fare-matrix:text-3xl font-bold text-white admin-light:text-slate-900">Fare Matrix Management</h1>
            <p className="text-sm text-white/40 admin-light:text-slate-500 mt-1 break-words">{farePoints.length} point areas on {selectedRoute?.name ?? 'the selected route'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={fetchFarePoints} title="Refresh" className="p-2.5 text-white/40 admin-light:text-slate-500 hover:text-white admin-light:hover:text-slate-900 bg-[#071A2E] admin-light:bg-white border border-white/[0.06] admin-light:border-[#E2E8F0] rounded-xl transition-colors">
              <RefreshCw size={18} />
            </button>
            <button
              type="button"
              onClick={handleToggleAddForm}
              disabled={!selectedRoute}
              className="w-full @[40rem]/fare-matrix:w-auto flex items-center justify-center gap-2 whitespace-nowrap px-5 py-2.5 bg-[#1A5FB4] text-white font-bold rounded-xl hover:bg-[#165a9f] transition-colors active:scale-95 shadow-lg shadow-[#1A5FB4]/30"
            >
              {showAddForm ? <X size={18} /> : <Plus size={18} />}
              <span>{showAddForm ? 'Cancel' : 'Add Point Area'}</span>
            </button>
          </div>
        </div>


        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-400 admin-light:text-red-600">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 admin-light:text-red-600 hover:text-red-300 admin-light:hover:text-red-600"><X size={16} /></button>
          </div>
        )}

        {/* Success Banner */}
        <SuccessModal message={successMsg} onClose={() => setSuccessMsg(null)} />

        {/* The route-line editor (components/admin/routes/route-editor.tsx,
            saved through PUT /admin/routes/{id}/geometry) is hidden from this
            page on purpose; both are kept so it can be mounted again. */}

        {/* Fare Info Banner */}
        <div className="bg-[#071A2E] admin-light:bg-white border border-white/[0.06] admin-light:border-[#E2E8F0] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Route size={24} aria-hidden="true" className="flex-shrink-0 text-[#62A0EA] admin-light:text-[#1A5FB4]" />
            <div>
              <h2 className="text-white admin-light:text-slate-900 font-bold text-sm">Barangay-Based Fare System</h2>
              <p className="text-white/40 admin-light:text-slate-500 text-xs mt-0.5">Base fare covers first {fareRules.baseBarangayCount} barangays traveled, {formatPeso(fareRules.succeedingFare)} per succeeding barangay. Set in Financial Rules.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 @[28rem]/fare-matrix:grid-cols-3">
            <div className="bg-[#050F1A]/60 admin-light:bg-[#F8FAFC] rounded-xl px-4 py-3 text-center border border-white/5 admin-light:border-[#E2E8F0]">
              <p className="text-[10px] text-white/30 admin-light:text-slate-500 uppercase tracking-wider font-semibold">Base Fare</p>
              <p className="text-xl font-extrabold text-white admin-light:text-slate-900 mt-1">{formatPeso(fareRules.minimumFare)}</p>
              <p className="text-[10px] text-white/25 admin-light:text-slate-400 mt-0.5">First {fareRules.baseBarangayCount} barangays</p>
            </div>
            <div className="bg-[#050F1A]/60 admin-light:bg-[#F8FAFC] rounded-xl px-4 py-3 text-center border border-white/5 admin-light:border-[#E2E8F0]">
              <p className="text-[10px] text-white/30 admin-light:text-slate-500 uppercase tracking-wider font-semibold">Succeeding</p>
              <p className="text-xl font-extrabold text-white admin-light:text-slate-900 mt-1">{formatPeso(fareRules.succeedingFare)}</p>
              <p className="text-[10px] text-white/25 admin-light:text-slate-400 mt-0.5">Per barangay</p>
            </div>
            <div className="bg-[#050F1A]/60 admin-light:bg-[#F8FAFC] rounded-xl px-4 py-3 text-center border border-white/5 admin-light:border-[#E2E8F0]">
              <p className="text-[10px] text-white/30 admin-light:text-slate-500 uppercase tracking-wider font-semibold">Discount</p>
              <p className="text-xl font-extrabold text-white admin-light:text-slate-900 mt-1">{fareRules.discountRate}%</p>
              <p className="text-[10px] text-white/25 admin-light:text-slate-400 mt-0.5">Student/Senior/PWD</p>
            </div>
          </div>
        </div>

        {/* Fare Preview Tool */}
        <div className="bg-[#071A2E] admin-light:bg-white border border-white/[0.06] admin-light:border-[#E2E8F0] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-white/30 admin-light:text-slate-500" />
            <h3 className="text-[10px] font-bold text-white/30 admin-light:text-slate-500 uppercase tracking-wider">Fare Calculator Preview</h3>
          </div>
          <div className="grid grid-cols-1 @[32rem]/fare-matrix:grid-cols-2 gap-3 mb-4">
            <div className="min-w-0">
              <label className="text-[10px] text-white/30 admin-light:text-slate-500 uppercase tracking-wider block mb-1.5">From (Point #)</label>
              <select
                value={previewFrom ?? ''}
                onChange={(e) => setPreviewFrom(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 bg-[#050F1A] admin-light:bg-[#F8FAFC] border border-white/10 admin-light:border-[#CBD5E1] rounded-xl text-sm text-white admin-light:text-slate-900 focus:outline-none focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4] transition-colors"
              >
                <option value="">Select pickup point</option>
                {farePoints.map(p => (
                  <option key={p.pointNumber} value={p.pointNumber}>{p.pointNumber}. {p.name}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-white/30 admin-light:text-slate-500 uppercase tracking-wider block mb-1.5">To (Point #)</label>
              <select
                value={previewTo ?? ''}
                onChange={(e) => setPreviewTo(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 bg-[#050F1A] admin-light:bg-[#F8FAFC] border border-white/10 admin-light:border-[#CBD5E1] rounded-xl text-sm text-white admin-light:text-slate-900 focus:outline-none focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4] transition-colors"
              >
                <option value="">Select drop-off point</option>
                {farePoints.map(p => (
                  <option key={p.pointNumber} value={p.pointNumber}>{p.pointNumber}. {p.name}</option>
                ))}
              </select>
            </div>
          </div>
          {farePreview ? (
            <div className="bg-[#050F1A]/60 admin-light:bg-[#F8FAFC] rounded-xl p-4 border border-white/5 admin-light:border-[#E2E8F0] space-y-2">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">A</span>
                <span className="min-w-0 break-words text-sm text-white admin-light:text-slate-900 font-medium">{farePreview.fareResult.fromPoint.name}</span>
                <svg className="w-4 h-4 text-white/20 admin-light:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                <span className="w-5 h-5 rounded-full bg-[#FF6D3A] text-white flex items-center justify-center text-[9px] font-bold">B</span>
                <span className="min-w-0 break-words text-sm text-white admin-light:text-slate-900 font-medium">{farePreview.fareResult.toPoint.name}</span>
              </div>
              <div className="flex justify-between text-sm"><span className="text-white/60 admin-light:text-slate-600">Barangays Traveled</span><span className="font-semibold text-white admin-light:text-slate-900">{farePreview.fareResult.barangaysTraveled}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/60 admin-light:text-slate-600">Base Fare</span><span className="font-semibold text-white admin-light:text-slate-900">{formatPeso(farePreview.fareResult.baseFare)}</span></div>
              {farePreview.fareResult.succeedingCount > 0 && (
                <div className="flex justify-between text-sm"><span className="text-white/60 admin-light:text-slate-600">Succeeding ({farePreview.fareResult.succeedingCount} x {formatPeso(farePreview.fareResult.succeedingFare)})</span><span className="font-semibold text-white admin-light:text-slate-900">{formatPeso(farePreview.fareResult.succeedingFare * farePreview.fareResult.succeedingCount)}</span></div>
              )}
              <div className="border-t border-dashed border-white/10 admin-light:border-[#CBD5E1] my-2" />
              <div className="flex justify-between text-sm"><span className="text-white/60 admin-light:text-slate-600">Regular</span><span className="font-semibold text-white admin-light:text-slate-900">{formatPeso(farePreview.fareResult.regularFare)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/60 admin-light:text-slate-600">Discounted</span><span className="font-semibold text-white admin-light:text-slate-900">{formatPeso(farePreview.fareResult.discountedFare)}</span></div>
            </div>
          ) : (
            <div className="text-white/20 admin-light:text-slate-400 text-xs text-center py-3">
              Select both points to preview fare
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">

          {/* Add Point Form */}
          {showAddForm && (
            <div id="fare-point-add-form" className="bg-[#1A5FB4]/5 border border-[#1A5FB4]/30 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white admin-light:text-slate-900">New Point Area</h3>
              <div className="grid grid-cols-1 @[32rem]/fare-matrix:grid-cols-2 gap-4">
                {/* Full width: the next field (Sub Pickup) is also
                    spans both columns, so a single-column Point Name left an
                    empty cell beside it instead of the two stacking flush. */}
                <div className="@[32rem]/fare-matrix:col-span-2">
                  <label className="block text-[10px] text-white/30 admin-light:text-slate-500 uppercase tracking-wider mb-1.5">Point Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Jollibee Crossing" className={inputClasses} />
                </div>
                <div className="@[32rem]/fare-matrix:col-span-2">
                  <label className="block text-[10px] text-white/30 admin-light:text-slate-500 uppercase tracking-wider mb-1.5">Sub Pickup / Drop-off Points</label>
                  <SubDropoffEditor
                    value={newSubStops}
                    onChange={setNewSubStops}
                    draft={newSubStopDraft}
                    onDraftChange={setNewSubStopDraft}
                  />
                </div>
                <StopFareNote rules={fareRules} pointNumber={farePoints.length + 1} />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/30 admin-light:text-slate-500">Point Location</label>
                <FarePointMapPicker
                  value={newLocation}
                  onChange={setNewLocation}
                  routeGeometry={selectedRoute?.geometry ?? []}
                />
              </div>
              <button type="button" onClick={handleAddPoint} disabled={isSaving} className="px-6 py-2.5 bg-[#1A5FB4] text-white text-sm font-bold rounded-xl hover:bg-[#165a9f] transition-colors active:scale-95 disabled:opacity-50">
                {isSaving ? 'Adding...' : 'Add Point'}
              </button>
            </div>
          )}

          {/* Edit Point Form */}
          {editingPoint !== null && (
            <div id="fare-point-edit-form" className="bg-[#1A5FB4]/5 border border-[#1A5FB4]/30 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white admin-light:text-slate-900">Edit Point #{editingPoint}</h3>
              <div className="grid grid-cols-1 @[32rem]/fare-matrix:grid-cols-2 gap-4">
                {/* Full width, same reasoning as the Add form above. */}
                <div className="@[32rem]/fare-matrix:col-span-2">
                  <label className="block text-[10px] text-white/30 admin-light:text-slate-500 uppercase tracking-wider mb-1.5">Point Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClasses} />
                </div>
                <div className="@[32rem]/fare-matrix:col-span-2">
                  <label className="block text-[10px] text-white/30 admin-light:text-slate-500 uppercase tracking-wider mb-1.5">Sub Pickup / Drop-off Points</label>
                  <SubDropoffEditor
                    value={editSubStops}
                    onChange={setEditSubStops}
                    draft={editSubStopDraft}
                    onDraftChange={setEditSubStopDraft}
                  />
                </div>
                <StopFareNote rules={fareRules} pointNumber={editingPoint} />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/30 admin-light:text-slate-500">Point Location</label>
                <FarePointMapPicker
                  value={editLocation}
                  onChange={setEditLocation}
                  routeGeometry={selectedRoute?.geometry ?? []}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={handleSaveEdit} disabled={isSaving} className="px-6 py-2.5 bg-[#1A5FB4] text-white text-sm font-bold rounded-xl hover:bg-[#165a9f] transition-colors active:scale-95 disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditingPoint(null)} className="px-6 py-2.5 bg-white/10 admin-light:bg-slate-100 text-white admin-light:text-slate-900 text-sm font-bold rounded-xl hover:bg-white/20 admin-light:hover:bg-slate-200 transition-colors active:scale-95">Cancel</button>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 admin-light:text-slate-500" />
            <input
              type="text"
              placeholder="Search point areas or landmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#071A2E] admin-light:bg-white border border-white/[0.06] admin-light:border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3 text-sm text-white admin-light:text-slate-900 placeholder:text-white/25 admin-light:placeholder:text-slate-400 focus:outline-none focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4] focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30 transition-colors"
            />
            {searchQuery.trim() && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 admin-light:bg-slate-100 hover:bg-white/20 admin-light:hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={12} className="text-white/60 admin-light:text-slate-600" />
              </button>
            )}
          </div>

          {/* Results count */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-[10px] text-white/25 admin-light:text-slate-400">
              {searchQuery.trim() ? `${filteredPoints.length} of ${farePoints.length} point areas` : `${farePoints.length} point areas total`}
            </p>
            <p className="min-w-0 break-words text-[10px] text-white/25 admin-light:text-slate-400">{selectedRoute?.name ?? 'No route selected'}</p>
          </div>

          {/* Point Areas List */}
          <div className="bg-[#071A2E] admin-light:bg-white border border-white/[0.06] admin-light:border-[#E2E8F0] rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/5 admin-light:divide-[#E2E8F0] max-h-[60vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filteredPoints.length === 0 ? (
                <div className="py-12 text-center text-white/20 admin-light:text-slate-400 text-sm">
                  No fare points found. Click &quot;Add Point Area&quot; to create one.
                </div>
              ) : filteredPoints.map((point) => {
                const isBaseZone = point.regularFare <= fareRules.minimumFare;

                return (
                  <div key={point.pointNumber}>
                    <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3.5 hover:bg-white/[0.03] admin-light:hover:bg-[#F8FAFC] transition-colors @[32rem]/fare-matrix:grid-cols-[2rem_minmax(0,1fr)_auto]">
                      {/* Point Number Badge */}
                      {/* One neutral tone: the zone is already spelled out under the name. */}
                      <span className="text-center text-base font-bold tabular-nums text-slate-300 admin-light:text-slate-600">
                        {point.pointNumber}
                      </span>

                      {/* Name + Landmark indicator */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <MapPin size={12} className="text-white/40 admin-light:text-slate-400 flex-shrink-0" />
                          <span className="min-w-0 flex-1 text-sm text-white admin-light:text-slate-900 font-medium truncate" title={point.name}>{point.name}</span>
                          {point.subStops && point.subStops.length > 0 && (
                            <span className="shrink-0 text-[11px] text-slate-400 admin-light:text-slate-500">
                              {point.subStops.length} sub-area{point.subStops.length === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                        {isBaseZone && (
                          <p className="text-[9px] text-white/40 admin-light:text-slate-500 ml-4 mt-0.5">Base fare zone</p>
                        )}
                      </div>

                      {/* Fares */}
                      <div className="col-start-2 flex min-w-0 items-center justify-between gap-3 @[32rem]/fare-matrix:col-start-auto @[32rem]/fare-matrix:justify-end">
                        <div className="shrink-0 @[32rem]/fare-matrix:text-right">
                          <p className="text-xs font-bold text-white admin-light:text-slate-900">{formatPeso(point.regularFare)}</p>
                          <p className="text-[10px] text-white/60 admin-light:text-slate-500">{formatPeso(point.discountedFare)}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={() => handleMovePoint(point.pointNumber, -1)} disabled={point.pointNumber === 1 || isSaving} className="p-1.5 text-white/20 admin-light:text-slate-400 hover:text-white admin-light:hover:text-slate-900 disabled:opacity-20" title="Move earlier">
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" onClick={() => handleMovePoint(point.pointNumber, 1)} disabled={point.pointNumber === farePoints.length || isSaving} className="p-1.5 text-white/20 admin-light:text-slate-400 hover:text-white admin-light:hover:text-slate-900 disabled:opacity-20" title="Move later">
                            <ArrowDown size={13} />
                          </button>
                          <button type="button" onClick={() => handleStartEdit(point.pointNumber)} className="p-1.5 text-white/20 admin-light:text-slate-400 hover:text-[#62A0EA] admin-light:hover:text-[#1A5FB4] transition-colors" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => handleDelete(point.pointNumber)} className="p-1.5 text-white/20 admin-light:text-slate-400 hover:text-red-400 admin-light:hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sub-areas stay visible so Admin sees the same choices as Conductor. */}
                    {point.subStops && point.subStops.length > 0 && (
                      <div className="bg-[#050F1A]/60 admin-light:bg-[#F8FAFC] px-4 py-3 mx-4 mb-3 rounded-xl border border-white/5 admin-light:border-[#E2E8F0]">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 admin-light:text-slate-500 font-bold mb-2">Sub pickup / drop-off points in this area</p>
                        <div className="flex flex-wrap gap-2">
                          {point.subStops.map((stop, idx) => (
                            <div key={idx} className="flex min-w-0 max-w-full items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] admin-light:bg-white border border-white/5 admin-light:border-[#E2E8F0]">
                              <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-[#62A0EA] admin-light:bg-[#1A5FB4]" />
                              <span className="min-w-0 break-words text-xs text-white/60 admin-light:text-slate-600">{stop}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
