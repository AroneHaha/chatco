// app/(admin)/settings/routes/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Pencil, Trash2, X, Save, RefreshCw, AlertCircle } from 'lucide-react';

interface Route {
  id: string;
  name: string;
  status: string | null;
  waypoints: string | null;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [waypoints, setWaypoints] = useState('');

  const fetchRoutes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/routes', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Failed to load routes');
      const json = await res.json();
      setRoutes(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load routes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await fetch('/api/admin/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), status, waypoints: waypoints.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create route');
      showSuccess(`Route "${name}" created.`);
      setName(''); setStatus('ACTIVE'); setWaypoints(''); setShowAddForm(false);
      await fetchRoutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create route');
    }
  };

  const startEdit = (route: Route) => {
    setEditingId(route.id);
    setName(route.name);
    setStatus(route.status ?? 'ACTIVE');
    setWaypoints(route.waypoints ?? '');
    setShowAddForm(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/admin/routes/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), status, waypoints: waypoints.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to update route');
      showSuccess(`Route "${name}" updated.`);
      setEditingId(null); setName(''); setStatus('ACTIVE'); setWaypoints('');
      await fetchRoutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route');
    }
  };

  const handleDelete = async (id: string, routeName: string) => {
    if (!confirm(`Delete route "${routeName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/routes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete route');
      showSuccess(`Route "${routeName}" deleted.`);
      await fetchRoutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete route');
    }
  };

  const inputClasses = "block w-full px-3 py-2.5 bg-[#050F1A] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#62A0EA] focus:ring-1 focus:ring-[#62A0EA]/30 transition-colors";

  if (isLoading) {
    return (
      <div className="min-h-screen pb-12 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="h-8 w-48 rounded bg-gray-700 animate-pulse mx-auto" />
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-[#071A2E] border border-white/[0.06] rounded-2xl animate-pulse" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Routes Management</h1>
            <p className="text-sm text-white/40 mt-1">{routes.length} route(s) configured</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchRoutes} title="Refresh" className="p-2.5 text-white/40 hover:text-white bg-[#071A2E] border border-white/[0.06] rounded-xl transition-colors">
              <RefreshCw size={18} />
            </button>
            <button onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1A5FB4] text-white font-bold rounded-xl hover:bg-[#165a9f] transition-colors active:scale-95 shadow-lg shadow-[#1A5FB4]/30">
              {showAddForm ? <X size={18} /> : <Plus size={18} />}
              <span>{showAddForm ? 'Cancel' : 'Add Route'}</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertCircle size={16} className="text-red-400" /><p className="text-sm text-red-400">{error}</p></div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
          </div>
        )}

        {/* Success */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
            <p className="text-sm text-emerald-400">{successMsg}</p>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300"><X size={16} /></button>
          </div>
        )}

        {/* Add/Edit Form */}
        {(showAddForm || editingId) && (
          <div className="bg-[#1A5FB4]/5 border border-[#1A5FB4]/30 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">{editingId ? `Edit Route` : 'New Route'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Route Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Malolos - Meycauayan" className={inputClasses} />
              </div>
              <div>
                <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className={`${inputClasses} [color-scheme:dark]`}>
                  <option value="ACTIVE" className="bg-gray-800">Active</option>
                  <option value="INACTIVE" className="bg-gray-800">Inactive</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Waypoints (comma-separated)</label>
                <input type="text" value={waypoints} onChange={e => setWaypoints(e.target.value)} placeholder="e.g., Malolos Terminal, Guiguinto, Meycauayan" className={inputClasses} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={editingId ? handleSaveEdit : handleAdd} className="px-6 py-2.5 bg-[#1A5FB4] text-white text-sm font-bold rounded-xl hover:bg-[#165a9f] transition-colors active:scale-95 flex items-center gap-2">
                <Save size={16} /> {editingId ? 'Save Changes' : 'Add Route'}
              </button>
              <button onClick={() => { setEditingId(null); setShowAddForm(false); setName(''); setStatus('ACTIVE'); setWaypoints(''); }} className="px-6 py-2.5 bg-white/10 text-white text-sm font-bold rounded-xl hover:bg-white/20 transition-colors active:scale-95">Cancel</button>
            </div>
          </div>
        )}

        {/* Routes List */}
        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {routes.length === 0 ? (
              <div className="py-12 text-center text-white/20 text-sm">No routes found. Click "Add Route" to create one.</div>
            ) : routes.map(route => (
              <div key={route.id} className="flex items-center gap-3 px-4 py-4 hover:bg-white/[0.03] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#62A0EA]/15 flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-[#62A0EA]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium truncate">{route.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${route.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                      {route.status ?? 'ACTIVE'}
                    </span>
                  </div>
                  {route.waypoints && (
                    <p className="text-xs text-white/30 mt-0.5 truncate">{route.waypoints}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => startEdit(route)} className="p-1.5 text-white/20 hover:text-[#62A0EA] transition-colors" title="Edit"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(route.id, route.name)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
