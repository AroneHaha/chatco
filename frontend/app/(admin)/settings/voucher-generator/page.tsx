// app/(admin)/settings/voucher-generator/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Badge } from '@/components/admin/ui/badge';
import { Ticket, Copy, CheckCircle, Trash2, RefreshCw, AlertCircle, X } from 'lucide-react';

interface Voucher {
  id: string;
  code: string;
  type: string;
  status: string;
  amount: number | null;
  expires_at: string | null;
  created_at: string;
}

export default function VoucherGeneratorPage() {
  const [voucherType, setVoucherType] = useState<'FREE_RIDE' | 'DISCOUNT'>('FREE_RIDE');
  const [amount, setAmount] = useState('1');
  const [quantity, setQuantity] = useState('5');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/vouchers', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Failed to load vouchers');
      const json = await res.json();
      setVouchers(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vouchers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: voucherType,
          amount: voucherType === 'DISCOUNT' ? parseFloat(amount) : null,
          quantity: parseInt(quantity) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to generate vouchers');
      showSuccess(`${quantity} voucher(s) generated successfully.`);
      await fetchVouchers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate vouchers');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete voucher "${code}"?`)) return;
    try {
      const res = await fetch(`/api/admin/vouchers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete voucher');
      showSuccess(`Voucher "${code}" deleted.`);
      await fetchVouchers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete voucher');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-12 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="h-8 w-56 rounded bg-gray-700 animate-pulse mx-auto" />
          <div className="h-48 bg-[#071A2E] border border-white/[0.06] rounded-2xl animate-pulse" />
          <div className="h-64 bg-[#071A2E] border border-white/[0.06] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Voucher Generator</h1>
            <p className="text-sm text-white/40 mt-1">Generate and manage commuter vouchers.</p>
          </div>
          <button onClick={fetchVouchers} title="Refresh" className="p-2.5 text-white/40 hover:text-white bg-[#071A2E] border border-white/[0.06] rounded-xl transition-colors self-start">
            <RefreshCw size={18} />
          </button>
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

        {/* Generator Form */}
        <GlassCard className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Ticket size={20} className="text-[#62A0EA]" />
            <h2 className="text-lg font-bold text-white">Generate Vouchers</h2>
          </div>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Type</label>
                <select value={voucherType} onChange={e => setVoucherType(e.target.value as 'FREE_RIDE' | 'DISCOUNT')} className="w-full px-3 py-2.5 bg-[#050F1A] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#62A0EA] [color-scheme:dark]">
                  <option value="FREE_RIDE" className="bg-gray-800">Free Ride</option>
                  <option value="DISCOUNT" className="bg-gray-800">Discount (₱)</option>
                </select>
              </div>
              {voucherType === 'DISCOUNT' && (
                <div>
                  <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Amount (₱)</label>
                  <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} min="1" className="w-full px-3 py-2.5 bg-[#050F1A] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#62A0EA]" />
                </div>
              )}
              <div>
                <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Quantity</label>
                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" max="100" className="w-full px-3 py-2.5 bg-[#050F1A] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#62A0EA]" />
              </div>
            </div>
            <button type="submit" disabled={isGenerating} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1A5FB4] text-white font-bold rounded-xl hover:bg-[#165a9f] transition-colors active:scale-95 disabled:opacity-50">
              <Ticket size={16} /> {isGenerating ? 'Generating...' : 'Generate Vouchers'}
            </button>
          </form>
        </GlassCard>

        {/* Voucher List */}
        <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-bold text-white">Active Vouchers ({vouchers.length})</h3>
          </div>
          <div className="divide-y divide-white/5 max-h-[50vh] overflow-y-auto">
            {vouchers.length === 0 ? (
              <div className="py-12 text-center text-white/20 text-sm">No vouchers generated yet.</div>
            ) : vouchers.map(voucher => (
              <div key={voucher.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-[#62A0EA] font-semibold truncate">{voucher.code}</span>
                    <Badge variant={voucher.status === 'Active' ? 'success' : 'info'}>{voucher.status}</Badge>
                  </div>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {voucher.type === 'FREE_RIDE' ? 'Free Ride' : `₱${voucher.amount} Discount`}
                    {voucher.expires_at && ` • Expires: ${new Date(voucher.expires_at).toLocaleDateString()}`}
                  </p>
                </div>
                <button onClick={() => copyCode(voucher.code, voucher.id)} className="p-1.5 text-white/20 hover:text-[#62A0EA] transition-colors" title="Copy code">
                  {copiedId === voucher.id ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <button onClick={() => handleDelete(voucher.id, voucher.code)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
