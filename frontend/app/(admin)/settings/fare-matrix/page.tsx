// app/(admin)/settings/fare-matrix/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, MapPin, Search, Route, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import * as farePointService from '@/lib/admin/services/fare-point.service';
import type { FarePoint as ApiFarePoint } from '@/lib/admin/services/fare-point.service';
import * as routeService from '@/lib/admin/services/route.service';
import type { AdminRoute } from '@/lib/admin/services/route.service';
import type { RouteCoordinate } from '@/lib/admin/services/route.service';
import { formatPeso } from '@/lib/utils/display';

const RouteEditor = dynamic(() => import('@/components/admin/routes/route-editor'), {
  ssr: false,
  loading: () => <div className="h-[560px] animate-pulse rounded-2xl border border-white/5 bg-[#071A2E]" />,
});

const FarePointMapPicker = dynamic(() => import('@/components/admin/routes/fare-point-map-picker'), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse rounded-2xl border border-white/10 bg-[#050F1A]" />,
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

function mapApiToLocal(api: ApiFarePoint): FarePoint {
  return {
    id: api.id,
    pointNumber: api.point_number,
    name: api.name,
    regularFare: Number(api.regular_fare),
    discountedFare: Number(api.discounted_fare),
    subStops: api.sub_stops ? api.sub_stops.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    landmarks: api.landmarks ?? undefined,
    latitude: api.latitude === null ? null : Number(api.latitude),
    longitude: api.longitude === null ? null : Number(api.longitude),
  };
}

function SubDropoffEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState('');
  const items = useMemo(
    () => value.split(',').map((item) => item.trim()).filter(Boolean),
    [value]
  );

  const addItem = () => {
    const next = draft.trim();
    if (!next) return;
    if (!items.some((item) => item.toLowerCase() === next.toLowerCase())) {
      onChange([...items, next].join(', '));
    }
    setDraft('');
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
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder="e.g. Crossing or Public Market"
          className="block min-w-0 flex-1 rounded-xl border border-white/10 bg-[#050F1A] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-[#62A0EA] focus:outline-none focus:ring-1 focus:ring-[#62A0EA]/30"
        />
        <button type="button" onClick={addItem} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-bold text-white hover:bg-white/15">
          <Plus size={14} /> Add
        </button>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span key={`${item}-${index}`} className="flex items-center gap-1.5 rounded-lg border border-[#62A0EA]/20 bg-[#1A5FB4]/10 px-2.5 py-1.5 text-xs text-[#BFDBFE]">
              {item}
              <button type="button" onClick={() => removeItem(index)} className="text-white/35 hover:text-red-300" aria-label={`Remove ${item}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-white/25">Optional. These choices appear under the Point Area in the conductor fare calculator and use the same fare.</p>
      )}
    </div>
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
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');

  const [expandedPoint, setExpandedPoint] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fare preview
  const [previewFrom, setPreviewFrom] = useState<number | null>(null);
  const [previewTo, setPreviewTo] = useState<number | null>(null);

  // New point form state
  const [newName, setNewName] = useState('');
  const [newRegular, setNewRegular] = useState('18');
  const [newDiscounted, setNewDiscounted] = useState('14.4');
  const [newSubStops, setNewSubStops] = useState('');
  const [newLocation, setNewLocation] = useState<RouteCoordinate | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editRegular, setEditRegular] = useState('');
  const [editDiscounted, setEditDiscounted] = useState('');
  const [editSubStops, setEditSubStops] = useState('');
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

  // Fare preview calculation (simple diff — original used calculateFare which
  // depended on the hardcoded initialFarePoints; we compute inline now)
  const farePreview = useMemo(() => {
    if (!previewFrom || !previewTo || previewFrom === previewTo) return null;
    const from = farePoints.find(p => p.pointNumber === previewFrom);
    const to = farePoints.find(p => p.pointNumber === previewTo);
    if (!from || !to) return null;
    const regularDiff = Math.abs(from.regularFare - to.regularFare);
    const discountedDiff = Math.abs(from.discountedFare - to.discountedFare);
    const barangaysTraveled = Math.abs(from.pointNumber - to.pointNumber);
    return {
      fareResult: {
        fromPoint: from,
        toPoint: to,
        barangaysTraveled,
        regularFare: regularDiff,
        discountedFare: discountedDiff,
        baseFare: Math.min(from.regularFare, to.regularFare),
        succeedingFare: 2,
        succeedingCount: Math.max(0, barangaysTraveled - 4),
      }
    };
  }, [previewFrom, previewTo, farePoints]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleAddPoint = async () => {
    if (!newName.trim() || !selectedRouteId) return;
    setIsSaving(true);
    setError(null);
    try {
      if (!newLocation) throw new Error('Choose the Point Area location on the map.');
      await farePointService.create({
        route_id: selectedRouteId,
        point_number: farePoints.length + 1,
        code: `P${String(farePoints.length + 1).padStart(2, '0')}`,
        name: newName.trim(),
        regular_fare: parseFloat(newRegular) || 18,
        discounted_fare: parseFloat(newDiscounted) || 14.4,
        sub_stops: newSubStops.trim() || undefined,
        latitude: newLocation[0],
        longitude: newLocation[1],
      });
      showSuccess(`Point "${newName}" added successfully.`);
      setNewName(''); setNewRegular('18'); setNewDiscounted('14.4'); setNewSubStops('');
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
    setEditName(point.name);
    setEditRegular(point.regularFare.toString());
    setEditDiscounted(point.discountedFare.toString());
    setEditSubStops(point.subStops ? point.subStops.join(', ') : '');
    setEditLocation(point.latitude !== null && point.longitude !== null
      ? [point.latitude, point.longitude]
      : null);
    setEditingPoint(pointNumber);
    window.setTimeout(() => {
      document.getElementById('fare-point-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleSaveEdit = async () => {
    if (!editingPoint || !editName.trim()) return;
    const point = farePoints.find(p => p.pointNumber === editingPoint);
    if (!point) return;
    setIsSaving(true);
    setError(null);
    try {
      if (!editLocation) throw new Error('Choose the Point Area location on the map.');
      await farePointService.update(point.id, {
        name: editName.trim(),
        regular_fare: parseFloat(editRegular) || 18,
        discounted_fare: parseFloat(editDiscounted) || 14.4,
        sub_stops: editSubStops.trim() || undefined,
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
      if (expandedPoint === pointNumber) setExpandedPoint(null);
      if (previewFrom === pointNumber) setPreviewFrom(null);
      if (previewTo === pointNumber) setPreviewTo(null);
      await Promise.all([fetchFarePoints(), fetchRoutes()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete fare point');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRoute = async () => {
    if (!newRouteName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const created = await routeService.createRoute(newRouteName.trim());
      setNewRouteName('');
      setShowCreateRoute(false);
      await fetchRoutes();
      setSelectedRouteId(created.id);
      showSuccess(`Route "${created.name}" created. Add Fare Points and publish its geometry when ready.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create route');
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
      showSuccess('Fare Point order updated. Review the route draft before publishing.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder Fare Points');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = "block w-full px-3 py-2.5 bg-[#050F1A] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#62A0EA] focus:ring-1 focus:ring-[#62A0EA]/30 transition-colors";

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="min-h-screen pb-12 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="h-8 w-64 rounded bg-gray-700 animate-pulse" />
          <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-[#071A2E] border border-white/[0.06] rounded-2xl animate-pulse" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Fare Matrix Management</h1>
            <p className="text-sm text-white/40 mt-1">{farePoints.length} point areas on {selectedRoute?.name ?? 'the selected route'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchFarePoints} title="Refresh" className="p-2.5 text-white/40 hover:text-white bg-[#071A2E] border border-white/[0.06] rounded-xl transition-colors">
              <RefreshCw size={18} />
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              disabled={!selectedRoute}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1A5FB4] text-white font-bold rounded-xl hover:bg-[#165a9f] transition-colors active:scale-95 shadow-lg shadow-[#1A5FB4]/30"
            >
              {showAddForm ? <X size={18} /> : <Plus size={18} />}
              <span>{showAddForm ? 'Cancel' : 'Add Point Area'}</span>
            </button>
          </div>
        </div>

        {/* Route selection controls Fare Points, map geometry, and hailing coverage together. */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#071A2E] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/30">Managed Route</label>
              <select
                value={selectedRouteId}
                onChange={(event) => {
                  setSelectedRouteId(event.target.value);
                  setPreviewFrom(null);
                  setPreviewTo(null);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#050F1A] px-3 py-2.5 text-sm text-white outline-none focus:border-[#62A0EA]"
              >
                {routes.length === 0 && <option value="">No routes created</option>}
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>{route.name} ({route.status})</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => setShowCreateRoute((visible) => !visible)} className="flex items-center justify-center gap-2 rounded-xl border border-[#62A0EA]/30 px-4 py-2.5 text-sm font-semibold text-[#93C5FD] hover:bg-[#1A5FB4]/10">
              <Plus size={16} /> New Route
            </button>
          </div>
          {showCreateRoute && (
            <div className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3 sm:flex-row">
              <input value={newRouteName} onChange={(event) => setNewRouteName(event.target.value)} placeholder="e.g. Calumpit–Marilao via McArthur Highway" className={inputClasses} />
              <button type="button" onClick={handleCreateRoute} disabled={isSaving || !newRouteName.trim()} className="whitespace-nowrap rounded-xl bg-[#1A5FB4] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">Create Route</button>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
            <p className="text-sm text-emerald-400">{successMsg}</p>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300"><X size={16} /></button>
          </div>
        )}

        {selectedRoute && (
          <RouteEditor
            route={selectedRoute}
            farePoints={apiFarePoints}
            onRouteChanged={fetchRoutes}
            onEditFarePoint={handleStartEdit}
          />
        )}

        {/* Fare Info Banner */}
        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#1A5FB4]/15 flex items-center justify-center flex-shrink-0">
              <Route size={20} className="text-[#62A0EA]" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Barangay-Based Fare System</h2>
              <p className="text-white/40 text-xs mt-0.5">Base fare covers first 4 barangays traveled, ₱2 per succeeding barangay</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#050F1A]/60 rounded-xl px-4 py-3 text-center border border-white/5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Base Fare</p>
              <p className="text-xl font-extrabold text-[#62A0EA] mt-1">₱18.00</p>
              <p className="text-[10px] text-white/25 mt-0.5">First 4 barangays</p>
            </div>
            <div className="bg-[#050F1A]/60 rounded-xl px-4 py-3 text-center border border-white/5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Succeeding</p>
              <p className="text-xl font-extrabold text-emerald-400 mt-1">₱2.00</p>
              <p className="text-[10px] text-white/25 mt-0.5">Per barangay</p>
            </div>
            <div className="bg-[#050F1A]/60 rounded-xl px-4 py-3 text-center border border-white/5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Discount</p>
              <p className="text-xl font-extrabold text-amber-400 mt-1">20%</p>
              <p className="text-[10px] text-white/25 mt-0.5">Student/Senior/PWD</p>
            </div>
          </div>
        </div>

        {/* Fare Preview Tool */}
        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-white/30" />
            <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Fare Calculator Preview</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">From (Point #)</label>
              <select
                value={previewFrom ?? ''}
                onChange={(e) => setPreviewFrom(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 bg-[#050F1A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#62A0EA] transition-colors"
              >
                <option value="">Select pickup point</option>
                {farePoints.map(p => (
                  <option key={p.pointNumber} value={p.pointNumber}>{p.pointNumber}. {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">To (Point #)</label>
              <select
                value={previewTo ?? ''}
                onChange={(e) => setPreviewTo(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 bg-[#050F1A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#62A0EA] transition-colors"
              >
                <option value="">Select drop-off point</option>
                {farePoints.map(p => (
                  <option key={p.pointNumber} value={p.pointNumber}>{p.pointNumber}. {p.name}</option>
                ))}
              </select>
            </div>
          </div>
          {farePreview ? (
            <div className="bg-[#050F1A]/60 rounded-xl p-4 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">A</span>
                <span className="text-sm text-white font-medium">{farePreview.fareResult.fromPoint.name}</span>
                <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                <span className="w-5 h-5 rounded-full bg-[#FF6D3A] text-white flex items-center justify-center text-[9px] font-bold">B</span>
                <span className="text-sm text-white font-medium">{farePreview.fareResult.toPoint.name}</span>
              </div>
              <div className="flex justify-between text-sm"><span className="text-white/60">Barangays Traveled</span><span className="font-semibold text-white">{farePreview.fareResult.barangaysTraveled} pts</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/60">Base Fare</span><span className="font-semibold text-white">{formatPeso(farePreview.fareResult.baseFare)}</span></div>
              {farePreview.fareResult.succeedingCount > 0 && (
                <div className="flex justify-between text-sm"><span className="text-white/60">Succeeding ({farePreview.fareResult.succeedingCount} x {formatPeso(farePreview.fareResult.succeedingFare)})</span><span className="font-semibold text-white">{formatPeso(farePreview.fareResult.succeedingFare * farePreview.fareResult.succeedingCount)}</span></div>
              )}
              <div className="border-t border-dashed border-white/10 my-2" />
              <div className="flex justify-between text-sm"><span className="text-white/60">Regular</span><span className="font-semibold text-[#62A0EA]">{formatPeso(farePreview.fareResult.regularFare)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/60">Discounted</span><span className="font-semibold text-emerald-400">{formatPeso(farePreview.fareResult.discountedFare)}</span></div>
            </div>
          ) : (
            <div className="text-white/20 text-xs text-center py-3">
              Select both points to preview fare
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">

          {/* Add Point Form */}
          {showAddForm && (
            <div id="fare-point-edit-form" className="bg-[#1A5FB4]/5 border border-[#1A5FB4]/30 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">New Point Area</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Point Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Jollibee Crossing" className={inputClasses} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Sub Pickup / Drop-off Points</label>
                  <SubDropoffEditor value={newSubStops} onChange={setNewSubStops} />
                </div>
                <div>
                  <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Regular Fare (₱)</label>
                  <input type="number" step="0.25" value={newRegular} onChange={(e) => setNewRegular(e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Discounted Fare (₱)</label>
                  <input type="number" step="0.25" value={newDiscounted} onChange={(e) => setNewDiscounted(e.target.value)} className={inputClasses} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/30">Point Location</label>
                <FarePointMapPicker
                  value={newLocation}
                  onChange={setNewLocation}
                  routeGeometry={selectedRoute?.active_version?.geometry ?? []}
                />
              </div>
              <button type="button" onClick={handleAddPoint} disabled={isSaving} className="px-6 py-2.5 bg-[#1A5FB4] text-white text-sm font-bold rounded-xl hover:bg-[#165a9f] transition-colors active:scale-95 disabled:opacity-50">
                {isSaving ? 'Adding...' : 'Add Point'}
              </button>
            </div>
          )}

          {/* Edit Point Form */}
          {editingPoint !== null && (
            <div className="bg-[#1A5FB4]/5 border border-[#1A5FB4]/30 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Edit Point #{editingPoint}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Point Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClasses} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Sub Pickup / Drop-off Points</label>
                  <SubDropoffEditor value={editSubStops} onChange={setEditSubStops} />
                </div>
                <div>
                  <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Regular Fare (₱)</label>
                  <input type="number" step="0.25" value={editRegular} onChange={(e) => setEditRegular(e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Discounted Fare (₱)</label>
                  <input type="number" step="0.25" value={editDiscounted} onChange={(e) => setEditDiscounted(e.target.value)} className={inputClasses} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/30">Point Location</label>
                <FarePointMapPicker
                  value={editLocation}
                  onChange={setEditLocation}
                  routeGeometry={selectedRoute?.active_version?.geometry ?? []}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={handleSaveEdit} disabled={isSaving} className="px-6 py-2.5 bg-[#1A5FB4] text-white text-sm font-bold rounded-xl hover:bg-[#165a9f] transition-colors active:scale-95 disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditingPoint(null)} className="px-6 py-2.5 bg-white/10 text-white text-sm font-bold rounded-xl hover:bg-white/20 transition-colors active:scale-95">Cancel</button>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search point areas or landmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#071A2E] border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#62A0EA] focus:ring-1 focus:ring-[#62A0EA]/30 transition-colors"
            />
            {searchQuery.trim() && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <X size={12} className="text-white/60" />
              </button>
            )}
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] text-white/25">
              {searchQuery.trim() ? `${filteredPoints.length} of ${farePoints.length} point areas` : `${farePoints.length} point areas total`}
            </p>
            <p className="text-[10px] text-white/25">{selectedRoute?.name ?? 'No route selected'}</p>
          </div>

          {/* Point Areas List */}
          <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filteredPoints.length === 0 ? (
                <div className="py-12 text-center text-white/20 text-sm">
                  No fare points found. Click &quot;Add Point Area&quot; to create one.
                </div>
              ) : filteredPoints.map((point) => {
                const isExpanded = expandedPoint === point.pointNumber;
                const isBaseZone = point.regularFare <= 18;

                return (
                  <div key={point.pointNumber}>
                    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors">
                      {/* Point Number Badge */}
                      <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${isBaseZone ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#62A0EA]/15 text-[#62A0EA]'}`}>
                        {point.pointNumber}
                      </span>

                      {/* Name + Landmark indicator */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <MapPin size={12} className={isBaseZone ? 'text-emerald-400/60 flex-shrink-0' : 'text-[#62A0EA]/60 flex-shrink-0'} />
                          <span className="text-sm text-white font-medium truncate">{point.name}</span>
                          {point.subStops && point.subStops.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedPoint(isExpanded ? null : point.pointNumber)}
                              className="p-0.5 text-white/30 hover:text-white transition-colors flex-shrink-0"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                        </div>
                        {isBaseZone && (
                          <p className="text-[9px] text-emerald-400/50 ml-4 mt-0.5">Base fare zone</p>
                        )}
                      </div>

                      {/* Fares */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-[#62A0EA]">{formatPeso(point.regularFare)}</p>
                          <p className="text-[10px] text-emerald-400/70">{formatPeso(point.discountedFare)}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={() => handleMovePoint(point.pointNumber, -1)} disabled={point.pointNumber === 1 || isSaving} className="p-1.5 text-white/20 hover:text-white disabled:opacity-20" title="Move earlier">
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" onClick={() => handleMovePoint(point.pointNumber, 1)} disabled={point.pointNumber === farePoints.length || isSaving} className="p-1.5 text-white/20 hover:text-white disabled:opacity-20" title="Move later">
                            <ArrowDown size={13} />
                          </button>
                          <button type="button" onClick={() => handleStartEdit(point.pointNumber)} className="p-1.5 text-white/20 hover:text-[#62A0EA] transition-colors" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => handleDelete(point.pointNumber)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Sub-Stops */}
                    {isExpanded && point.subStops && point.subStops.length > 0 && (
                      <div className="bg-[#050F1A]/60 px-4 py-3 mx-4 mb-3 rounded-xl border border-white/5">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold mb-2">Sub pickup / drop-off points in this area</p>
                        <div className="flex flex-wrap gap-2">
                          {point.subStops.map((stop, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#62A0EA]" />
                              <span className="text-xs text-white/60">{stop}</span>
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
