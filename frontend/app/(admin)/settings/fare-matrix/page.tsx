// app/(admin)/settings/fare-matrix/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Save, X, MapPin, Search, RefreshCw, AlertCircle } from 'lucide-react';
import * as farePointService from '@/lib/admin/services/fare-point.service';
import type { FarePoint } from '@/lib/admin/services/fare-point.service';

interface RouteOption {
  id: string;
  name: string;
}

export default function FareMatrixPage() {
  const [farePoints, setFarePoints] = useState<FarePoint[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [expandedPoint, setExpandedPoint] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fare preview
  const [previewFrom, setPreviewFrom] = useState<number | null>(null);
  const [previewTo, setPreviewTo] = useState<number | null>(null);

  // New point form state
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newPointNumber, setNewPointNumber] = useState('');
  const [newRegular, setNewRegular] = useState('18');
  const [newDiscounted, setNewDiscounted] = useState('14.4');
  const [newLandmarks, setNewLandmarks] = useState('');
  const [newSubStops, setNewSubStops] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editPointNumber, setEditPointNumber] = useState('');
  const [editRegular, setEditRegular] = useState('');
  const [editDiscounted, setEditDiscounted] = useState('');
  const [editLandmarks, setEditLandmarks] = useState('');
  const [editSubStops, setEditSubStops] = useState('');

  // Fetch routes for dropdown
  useEffect(() => {
    fetch('/api/admin/routes', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(res => {
        const routeList = (res.data ?? []) as RouteOption[];
        setRoutes(routeList);
        if (routeList.length > 0 && !selectedRouteId) {
          setSelectedRouteId(routeList[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch fare points
  const fetchFarePoints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await farePointService.list(selectedRouteId || undefined);
      setFarePoints(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fare points');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRouteId]);

  useEffect(() => {
    if (selectedRouteId) fetchFarePoints();
  }, [fetchFarePoints, selectedRouteId]);

  // Filtered points by search
  const filteredPoints = useMemo(() => {
    if (!searchQuery.trim()) return farePoints;
    const q = searchQuery.toLowerCase();
    return farePoints.filter(p =>
      p.name.toLowerCase().includes(q) ||
      String(p.point_number).includes(q) ||
      p.code.toLowerCase().includes(q)
    );
  }, [farePoints, searchQuery]);

  // Fare preview calculation
  const previewResult = useMemo(() => {
    if (previewFrom === null || previewTo === null || previewFrom === previewTo) return null;
    const from = farePoints.find(p => p.point_number === previewFrom);
    const to = farePoints.find(p => p.point_number === previewTo);
    if (!from || !to) return null;

    const regularDiff = Math.abs(from.regular_fare - to.regular_fare);
    const discountedDiff = Math.abs(from.discounted_fare - to.discounted_fare);
    return {
      regular: regularDiff,
      discounted: discountedDiff,
      from: from.name,
      to: to.name,
    };
  }, [previewFrom, previewTo, farePoints]);

  // ── Handlers ──

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId) { setError('Please select a route first.'); return; }
    if (!newName || !newCode || !newPointNumber) { setError('Name, code, and point number are required.'); return; }

    try {
      await farePointService.create({
        route_id: selectedRouteId,
        point_number: parseInt(newPointNumber),
        code: newCode.toUpperCase(),
        name: newName,
        landmarks: newLandmarks || undefined,
        sub_stops: newSubStops || undefined,
        regular_fare: parseFloat(newRegular) || 0,
        discounted_fare: parseFloat(newDiscounted) || 0,
      });
      setSuccessMessage(`Fare point "${newName}" created successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      // Reset form
      setNewName(''); setNewCode(''); setNewPointNumber(''); setNewRegular('18'); setNewDiscounted('14.4'); setNewLandmarks(''); setNewSubStops('');
      setShowAddForm(false);
      await fetchFarePoints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create fare point');
    }
  };

  const startEdit = (point: FarePoint) => {
    setEditingId(point.id);
    setEditName(point.name);
    setEditCode(point.code);
    setEditPointNumber(String(point.point_number));
    setEditRegular(String(point.regular_fare));
    setEditDiscounted(String(point.discounted_fare));
    setEditLandmarks(point.landmarks ?? '');
    setEditSubStops(point.sub_stops ?? '');
    setExpandedPoint(point.id);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await farePointService.update(editingId, {
        name: editName,
        code: editCode.toUpperCase(),
        point_number: parseInt(editPointNumber),
        regular_fare: parseFloat(editRegular) || 0,
        discounted_fare: parseFloat(editDiscounted) || 0,
        landmarks: editLandmarks || null,
        sub_stops: editSubStops || null,
      });
      setSuccessMessage(`Fare point "${editName}" updated successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setEditingId(null);
      await fetchFarePoints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update fare point');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete fare point "${name}"? This cannot be undone.`)) return;
    try {
      await farePointService.remove(id);
      setSuccessMessage(`Fare point "${name}" deleted.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchFarePoints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete fare point');
    }
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen pb-12 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="text-center"><div className="h-8 w-48 rounded bg-gray-700 animate-pulse mx-auto" /></div>
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#131C2E] border border-[#1E2D45] rounded-lg animate-pulse" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Fare Matrix Management</h1>
          <p className="text-sm text-slate-400 mt-1">Manage fare points, regular & discounted fares for each route.</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertCircle size={16} className="text-red-400" /><p className="text-sm text-red-400">{error}</p></div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-emerald-400">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300"><X size={16} /></button>
          </div>
        )}

        {/* Route Selector + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <select
              value={selectedRouteId}
              onChange={(e) => { setSelectedRouteId(e.target.value); setExpandedPoint(null); }}
              className="flex-1 px-4 py-2.5 bg-[#131C2E] border border-[#1E2D45] rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] [color-scheme:dark]"
            >
              {routes.map(r => <option key={r.id} value={r.id} className="bg-gray-800">{r.name}</option>)}
            </select>
            <button onClick={fetchFarePoints} title="Refresh" className="p-2.5 text-slate-400 hover:text-white hover:bg-[#1A2540] rounded-lg transition-colors">
              <RefreshCw size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stops..."
                className="w-full sm:w-48 pl-9 pr-3 py-2.5 bg-[#131C2E] border border-[#1E2D45] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA]"
              />
            </div>
            <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 px-4 py-2.5 bg-[#62A0EA] text-white font-medium rounded-lg hover:bg-[#4A8BD4] transition-colors flex-shrink-0">
              <Plus size={18} /><span className="hidden sm:inline">Add Stop</span>
            </button>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">New Fare Point</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Stop Name *</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required placeholder="e.g., Calumpit Terminal" className="w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Code * (max 10 chars)</label>
                <input type="text" value={newCode} onChange={e => setNewCode(e.target.value)} required maxLength={10} placeholder="e.g., C01" className="w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] uppercase" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Point Number *</label>
                <input type="number" value={newPointNumber} onChange={e => setNewPointNumber(e.target.value)} required min="1" placeholder="e.g., 1" className="w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Regular Fare (₱)</label>
                  <input type="number" step="0.01" value={newRegular} onChange={e => setNewRegular(e.target.value)} className="w-full px-3 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Discounted (₱)</label>
                  <input type="number" step="0.01" value={newDiscounted} onChange={e => setNewDiscounted(e.target.value)} className="w-full px-3 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Landmarks (optional)</label>
                <input type="text" value={newLandmarks} onChange={e => setNewLandmarks(e.target.value)} placeholder="e.g., Near Calumpit Bridge" className="w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Sub-stops (optional, comma-separated)</label>
                <input type="text" value={newSubStops} onChange={e => setNewSubStops(e.target.value)} placeholder="e.g., Gatbuca, San Miguel" className="w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors">
                  <Plus size={16} /> Add Fare Point
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Fare Points List */}
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-[#1E2D45]">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Code</div>
            <div className="col-span-3">Stop Name</div>
            <div className="col-span-2 text-center">Regular</div>
            <div className="col-span-2 text-center">Discounted</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#1E2D45]">
            {filteredPoints.length === 0 ? (
              <div className="py-12 text-center text-slate-600 text-sm">
                {farePoints.length === 0 ? 'No fare points for this route yet. Click "Add Stop" to create one.' : 'No stops match your search.'}
              </div>
            ) : (
              filteredPoints.map((point) => (
                <div key={point.id}>
                  {/* Main Row */}
                  <div
                    className={`flex sm:grid sm:grid-cols-12 gap-2 px-4 py-3 items-center transition-colors ${editingId === point.id ? 'bg-[#62A0EA]/5' : 'hover:bg-[#0E1628]'}`}
                  >
                    <div className="sm:col-span-1 flex items-center gap-2">
                      <button onClick={() => setExpandedPoint(expandedPoint === point.id ? null : point.id)} className="text-slate-500 hover:text-white">
                        {expandedPoint === point.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <span className="text-sm font-bold text-slate-400">{point.point_number}</span>
                    </div>
                    <div className="sm:col-span-3">
                      {editingId === point.id ? (
                        <input type="text" value={editCode} onChange={e => setEditCode(e.target.value)} maxLength={10} className="w-full px-2 py-1 bg-[#0E1628] border border-[#1E2D45] rounded text-white text-sm uppercase" />
                      ) : (
                        <span className="text-sm font-mono text-[#62A0EA] font-semibold">{point.code}</span>
                      )}
                    </div>
                    <div className="sm:col-span-3 flex-1">
                      {editingId === point.id ? (
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-2 py-1 bg-[#0E1628] border border-[#1E2D45] rounded text-white text-sm" />
                      ) : (
                        <span className="text-sm text-white font-medium">{point.name}</span>
                      )}
                    </div>
                    <div className="sm:col-span-2 text-center">
                      {editingId === point.id ? (
                        <input type="number" step="0.01" value={editRegular} onChange={e => setEditRegular(e.target.value)} className="w-20 px-2 py-1 bg-[#0E1628] border border-[#1E2D45] rounded text-white text-sm text-center" />
                      ) : (
                        <span className="text-sm text-slate-300 font-mono">₱{Number(point.regular_fare).toFixed(2)}</span>
                      )}
                    </div>
                    <div className="sm:col-span-2 text-center">
                      {editingId === point.id ? (
                        <input type="number" step="0.01" value={editDiscounted} onChange={e => setEditDiscounted(e.target.value)} className="w-20 px-2 py-1 bg-[#0E1628] border border-[#1E2D45] rounded text-white text-sm text-center" />
                      ) : (
                        <span className="text-sm text-emerald-400 font-mono">₱{Number(point.discounted_fare).toFixed(2)}</span>
                      )}
                    </div>
                    <div className="sm:col-span-1 flex items-center justify-end gap-1">
                      {editingId === point.id ? (
                        <>
                          <button onClick={handleSaveEdit} title="Save" className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"><Save size={14} /></button>
                          <button onClick={() => setEditingId(null)} title="Cancel" className="p-1.5 text-slate-400 hover:bg-[#1A2540] rounded-md transition-colors"><X size={14} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(point)} title="Edit" className="p-1.5 text-slate-400 hover:text-[#62A0EA] hover:bg-[#62A0EA]/10 rounded-md transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(point.id, point.name)} title="Delete" className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details (edit mode or view mode) */}
                  {expandedPoint === point.id && editingId !== point.id && (
                    <div className="bg-[#0E1628] px-4 py-3 border-t border-[#1E2D45]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Landmarks</p>
                          <p className="text-sm text-slate-300">{point.landmarks || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Sub-stops</p>
                          <p className="text-sm text-slate-300">{point.sub_stops || '—'}</p>
                        </div>
                      </div>
                      {editingId === point.id && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Landmarks</label>
                            <input type="text" value={editLandmarks} onChange={e => setEditLandmarks(e.target.value)} className="w-full px-2 py-1 bg-[#131C2E] border border-[#1E2D45] rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Sub-stops</label>
                            <input type="text" value={editSubStops} onChange={e => setEditSubStops(e.target.value)} className="w-full px-2 py-1 bg-[#131C2E] border border-[#1E2D45] rounded text-white text-sm" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded edit details */}
                  {expandedPoint === point.id && editingId === point.id && (
                    <div className="bg-[#0E1628] px-4 py-3 border-t border-[#1E2D45]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Landmarks</label>
                          <input type="text" value={editLandmarks} onChange={e => setEditLandmarks(e.target.value)} className="w-full px-2 py-1 bg-[#131C2E] border border-[#1E2D45] rounded text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Sub-stops</label>
                          <input type="text" value={editSubStops} onChange={e => setEditSubStops(e.target.value)} className="w-full px-2 py-1 bg-[#131C2E] border border-[#1E2D45] rounded text-white text-sm" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Fare Preview Calculator */}
        {farePoints.length >= 2 && (
          <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><MapPin size={16} className="text-[#62A0EA]" /> Fare Preview Calculator</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">From (point number)</label>
                <select value={previewFrom ?? ''} onChange={e => setPreviewFrom(e.target.value ? parseInt(e.target.value) : null)} className="w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm [color-scheme:dark]">
                  <option value="">Select origin...</option>
                  {farePoints.map(p => <option key={p.id} value={p.point_number} className="bg-gray-800">{p.point_number} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">To (point number)</label>
                <select value={previewTo ?? ''} onChange={e => setPreviewTo(e.target.value ? parseInt(e.target.value) : null)} className="w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm [color-scheme:dark]">
                  <option value="">Select destination...</option>
                  {farePoints.map(p => <option key={p.id} value={p.point_number} className="bg-gray-800">{p.point_number} — {p.name}</option>)}
                </select>
              </div>
            </div>
            {previewResult && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Regular Fare</p>
                  <p className="text-xl font-bold text-white font-mono">₱{previewResult.regular.toFixed(2)}</p>
                </div>
                <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Discounted Fare</p>
                  <p className="text-xl font-bold text-emerald-400 font-mono">₱{previewResult.discounted.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
