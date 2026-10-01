// app/(admin)/settings/voucher-generator/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Ticket, Copy, CheckCircle, Trash2, RefreshCw, AlertCircle, X, Bus, Banknote, Gift, Clock, type LucideIcon } from 'lucide-react';
import { SkeletonVoucherGenerator } from '@/components/admin/ui/skeleton';
import { SettingsSection } from '@/components/admin/ui/settings-section';

interface Voucher {
  id: string;
  code: string;
  type: string;
  status: string;
  amount: number | null;
  expires_at: string | null;
  created_at: string;
}

const GENERATE_TYPES: { value: 'FREE_RIDE' | 'DISCOUNT'; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'FREE_RIDE', label: 'Free Ride', description: 'Covers one full fare', icon: Bus },
  { value: 'DISCOUNT', label: 'Discount', description: 'Fixed peso amount off a fare', icon: Banknote },
];

function voucherTypeInfo(voucher: Voucher): { label: string; icon: LucideIcon } {
  if (voucher.type === 'DISCOUNT') return { label: `₱${Number(voucher.amount ?? 0).toFixed(2)} Discount`, icon: Banknote };
  if (voucher.type === 'REWARD') return { label: 'Loyalty Reward', icon: Gift };
  return { label: 'Free Ride', icon: Bus };
}

/**
 * Display status. Admin-generated codes are 'Active', reward codes
 * 'AVAILABLE'; both mean unused. A code past expires_at reads as Expired even
 * before the backend flips its status (that happens lazily, on use or when the
 * owner opens Rewards).
 */
function voucherStatus(voucher: Voucher, now: number): { label: string; dot: string; usable: boolean } {
  const s = voucher.status.toUpperCase();
  const pastExpiry = voucher.expires_at !== null && new Date(voucher.expires_at).getTime() <= now;
  if (s === 'USED') return { label: 'Used', dot: 'bg-slate-500', usable: false };
  if (s === 'EXPIRED' || pastExpiry) return { label: 'Expired', dot: 'bg-red-400', usable: false };
  return { label: 'Active', dot: 'bg-emerald-400', usable: true };
}

/** "3d 4h left" / "5h 12m left" / "45m left" for a future expiry. */
function formatTimeLeft(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes % 60}m left`;
  return `${Math.max(minutes, 1)}m left`;
}

function ExpiryLabel({ expiresAt, usable, now }: { expiresAt: string | null; usable: boolean; now: number }) {
  // No expiry date → nothing to count down (per the backend, expiry is optional).
  if (!expiresAt || !usable) return null;
  const expiry = new Date(expiresAt);
  const msLeft = expiry.getTime() - now;
  const isSoon = msLeft < 24 * 60 * 60 * 1000;
  return (
    <span
      title={`Expires ${expiry.toLocaleString()}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium tabular-nums ${
        isSoon ? 'bg-amber-400/10 text-amber-300' : 'bg-[#1A2540] text-slate-300'
      }`}
    >
      <Clock size={12} aria-hidden="true" />
      {formatTimeLeft(msLeft)}
    </span>
  );
}


export default function VoucherGeneratorPage() {
  const [voucherType, setVoucherType] = useState<'FREE_RIDE' | 'DISCOUNT'>('FREE_RIDE');
  const [amount, setAmount] = useState('1');
  const [quantity, setQuantity] = useState('5');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchVouchers = useCallback(async (targetPage = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vouchers?page=${targetPage}&per_page=20`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Failed to load vouchers');
      const json = await res.json();
      const result = json.data ?? {};
      setVouchers(result.data ?? []);
      setPage(result.current_page ?? targetPage);
      setLastPage(result.last_page ?? 1);
      setTotal(result.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vouchers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchVouchers(1); }, [fetchVouchers]);

  // Clock for the time-left labels; minute precision is all they show.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

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
      await fetchVouchers(1);
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
      await fetchVouchers(vouchers.length === 1 && page > 1 ? page - 1 : page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete voucher');
    }
  };

  if (isLoading && vouchers.length === 0) {
    return <SkeletonVoucherGenerator />;
  }

  const qty = parseInt(quantity) || 0;

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        {/* Title — centered like the other Settings pages */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Voucher Generator</h1>
          <p className="mt-1 text-sm text-slate-400">Generate and manage commuter vouchers.</p>
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

        {/* Generator */}
        <SettingsSection icon={Ticket} title="Generate Vouchers" description="Create a batch of single-use voucher codes.">
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Type as two choice cards instead of a dropdown */}
            <div role="radiogroup" aria-label="Voucher type" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {GENERATE_TYPES.map((option) => {
                const isSelected = voucherType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setVoucherType(option.value)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-[#62A0EA]/60 bg-[#62A0EA]/10'
                        : 'border-[#1E2D45] bg-[#0E1628] hover:border-[#2A3D5C]'
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${isSelected ? 'bg-[#62A0EA]/20 text-[#8CB9F0]' : 'bg-white/5 text-slate-500'}`}>
                      <option.icon size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{option.label}</span>
                      <span className="block text-xs text-slate-500">{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {voucherType === 'DISCOUNT' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-300">Discount amount</span>
                  <span className="relative block">
                    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">₱</span>
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} min="1" required className="block w-full rounded-md border border-[#1E2D45] bg-[#0E1628] py-2 pl-7 pr-3 text-sm font-semibold tabular-nums text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
                  </span>
                </label>
              )}
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-300">Quantity</span>
                <span className="relative block">
                  <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" max="100" required className="block w-full rounded-md border border-[#1E2D45] bg-[#0E1628] py-2 pl-3 pr-14 text-sm font-semibold tabular-nums text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">codes</span>
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#1E2D45] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">
                {qty >= 1 && qty <= 100
                  ? <>Creates <span className="font-semibold text-white">{qty}</span> {voucherType === 'FREE_RIDE' ? 'free-ride' : `₱${amount || '0'} discount`} {qty === 1 ? 'code' : 'codes'}.</>
                  : 'Quantity must be from 1 to 100.'}
              </p>
              <button type="submit" disabled={isGenerating} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#4A8BD4] active:scale-95 disabled:opacity-50 sm:w-auto">
                <Ticket size={16} aria-hidden="true" /> {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </form>
        </SettingsSection>

        {/* Voucher List */}
        <section className="overflow-hidden rounded-lg border border-[#1E2D45] bg-[#131C2E]">
          <div className="flex items-center justify-between gap-3 border-b border-[#1E2D45] px-4 py-3 sm:px-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              Vouchers
              <span className="rounded-full bg-[#1A2540] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-400">{total}</span>
            </h2>
            <button type="button" onClick={() => void fetchVouchers(page)} disabled={isLoading} title="Refresh" aria-label="Refresh vouchers" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-[#1A2540] hover:text-white disabled:opacity-50">
              <RefreshCw size={16} className={isLoading ? 'motion-safe:animate-spin' : ''} />
            </button>
          </div>
          <div className="max-h-[50vh] divide-y divide-[#1E2D45] overflow-y-auto">
            {vouchers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Ticket size={28} className="text-slate-600" aria-hidden="true" />
                <p className="text-sm text-slate-400">No vouchers yet.</p>
                <p className="text-xs text-slate-500">Generated codes will appear here.</p>
              </div>
            ) : vouchers.map(voucher => {
              const status = voucherStatus(voucher, now);
              const typeInfo = voucherTypeInfo(voucher);
              return (
                <div key={voucher.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:px-5">
                  <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#62A0EA]/10 text-[#8CB9F0] sm:flex">
                    <typeInfo.icon size={16} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`truncate font-mono text-sm font-semibold ${status.usable ? 'text-white' : 'text-slate-500 line-through decoration-slate-600'}`}>{voucher.code}</span>
                      <button type="button" onClick={() => copyCode(voucher.code, voucher.id)} className="shrink-0 rounded p-1 text-slate-500 transition-colors hover:text-[#62A0EA]" title="Copy code" aria-label={`Copy ${voucher.code}`}>
                        {copiedId === voucher.id ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      <span className="text-slate-400">{typeInfo.label}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        <span className="text-slate-400">{status.label}</span>
                      </span>
                    </div>
                  </div>
                  {/* Time left — only when the voucher has an expiry date */}
                  <ExpiryLabel expiresAt={voucher.expires_at} usable={status.usable} now={now} />
                  <button type="button" onClick={() => handleDelete(voucher.id, voucher.code)} className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-400/10 hover:text-red-400" title="Delete" aria-label={`Delete ${voucher.code}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
          {lastPage > 1 && (
            <div className="flex items-center justify-between border-t border-[#1E2D45] px-4 py-3">
              <button
                type="button"
                onClick={() => void fetchVouchers(page - 1)}
                disabled={page <= 1 || isLoading}
                className="rounded-md bg-[#1A2540] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:text-white disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">Page {page} of {lastPage}</span>
              <button
                type="button"
                onClick={() => void fetchVouchers(page + 1)}
                disabled={page >= lastPage || isLoading}
                className="rounded-md bg-[#1A2540] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:text-white disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
