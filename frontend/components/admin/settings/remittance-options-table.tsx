// components/admin/settings/remittance-options-table.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Edit, Trash, RefreshCw, AlertCircle, X } from 'lucide-react';

interface RemittanceOption {
  id: string;
  option_name: string;
  is_active: boolean;
}

export function RemittanceOptionsTable() {
  const [options, setOptions] = useState<RemittanceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/remittance-options', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setOptions(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load remittance options');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/remittance-options/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      showSuccess(`"${name}" deleted.`);
      await fetchOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (isLoading) {
    return (
      <GlassCard className="p-4">
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />)}</div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      {error && (
        <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertCircle size={16} className="text-red-400" /><p className="text-sm text-red-400">{error}</p></div>
          <button onClick={() => setError(null)} className="text-red-400"><X size={16} /></button>
        </div>
      )}
      {successMsg && (
        <div className="mb-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-emerald-400">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400"><X size={16} /></button>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">{options.length} option(s)</p>
        <button onClick={fetchOptions} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"><RefreshCw size={14} /></button>
      </div>
      <div className="divide-y divide-[#1E2D45]">
        {options.length === 0 ? (
          <div className="py-8 text-center text-slate-600 text-sm">No remittance options yet.</div>
        ) : options.map(opt => (
          <div key={opt.id} className="flex items-center justify-between py-3 px-2 hover:bg-white/[0.03] transition-colors">
            <div>
              <span className="text-sm text-white font-medium">{opt.option_name}</span>
              {!opt.is_active && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-slate-500/15 text-slate-400">Inactive</span>}
            </div>
            <button onClick={() => handleDelete(opt.id, opt.option_name)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-md transition-colors"><Trash size={16} /></button>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
