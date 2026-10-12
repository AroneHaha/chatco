// app/(admin)/settings/voucher-generator/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Ticket, Copy, CheckCircle, Trash2, RefreshCw, X, Bus, Banknote, Gift, Clock, type LucideIcon } from 'lucide-react';
import { SettingsSection } from '@/components/admin/ui/settings-section';
import { Modal } from '@/components/admin/ui/modal';

interface Voucher {
  id: string;
  code: string;
  type: string;
  status: string;
  amount: number | null;
  expires_at: string | null;
  created_at: string;
  generation_batch_id: string | null;
  commuter_id: string | null;
  commuter?: { id: string; first_name: string; surname: string } | null;
  generated_by_id: string | null;
  generated_by_first_name: string | null;
  generated_by_last_name: string | null;
}

interface VoucherGenerationDetails {
  type: 'FREE_RIDE' | 'DISCOUNT';
  amount: number | null;
  quantity: number;
  allow_duplicates: boolean;
  validity_hours: number | null;
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
 * Display status. Generated vouchers use AVAILABLE; legacy codes may use Active.
 * A code past expires_at reads as Expired even
 * before the backend flips its status (that happens lazily, on use or when the
 * owner opens Rewards).
 */
function voucherStatus(voucher: Voucher, now: number): { label: string; dot: string; usable: boolean } {
  const s = voucher.status.toUpperCase();
  const pastExpiry = voucher.expires_at !== null && new Date(voucher.expires_at).getTime() <= now;
  if (s === 'USED') return { label: 'Used', dot: 'bg-slate-500', usable: false };
  if (s === 'EXPIRED' || pastExpiry) return { label: 'Expired', dot: 'bg-red-400', usable: false };
  if (!voucher.commuter_id) return { label: 'Unassigned', dot: 'bg-amber-400', usable: false };
  if (s !== 'AVAILABLE') return { label: 'Unavailable', dot: 'bg-slate-500', usable: false };
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
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [validityHours, setValidityHours] = useState('24');
  const generationRequest = useRef<{ signature: string; key: string } | null>(null);
  const generationInFlight = useRef(false);
  const [generationToConfirm, setGenerationToConfirm] = useState<VoucherGenerationDetails | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [historyType, setHistoryType] = useState<'ALL' | 'FREE_RIDE' | 'DISCOUNT'>('ALL');
  const [dateRange, setDateRange] = useState<'last_7_days' | 'this_month' | 'all'>('last_7_days');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const historyRequest = useRef<AbortController | null>(null);
  const historyList = useRef<HTMLDivElement | null>(null);
  const historySentinel = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [voucherToDelete, setVoucherToDelete] = useState<Voucher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deletionRequest = useRef(false);

  const fetchVouchers = useCallback(async (cursor: string | null = null) => {
    // Gate repeated observer notifications synchronously, and cancel a prior
    // history request when refreshing or switching filters.
    if (cursor && historyRequest.current) return;
    historyRequest.current?.abort();
    const controller = new AbortController();
    historyRequest.current = controller;
    if (!cursor) {
      setVouchers([]);
      setNextCursor(null);
      historyList.current?.scrollTo({ top: 0 });
    }
    setIsLoading(true);
    setHistoryError(null);
    try {
      const params = new URLSearchParams({ pagination: 'cursor', per_page: '10', date_range: dateRange });
      if (historyType !== 'ALL') params.set('type', historyType);
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/admin/vouchers?${params}`, { headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!res.ok) throw new Error('Failed to load vouchers');
      const json = await res.json();
      if (historyRequest.current !== controller || controller.signal.aborted) return;
      const result = json.data ?? {};
      const items: Voucher[] = result.data ?? [];
      setVouchers(previous => cursor
        ? Array.from(new Map([...previous, ...items].map(voucher => [voucher.id, voucher])).values())
        : items);
      setNextCursor(result.next_cursor ?? null);
    } catch (err) {
      if (historyRequest.current !== controller || controller.signal.aborted) return;
      setHistoryError(err instanceof Error ? err.message : 'Failed to load vouchers');
    } finally {
      if (historyRequest.current === controller) {
        historyRequest.current = null;
        setIsLoading(false);
      }
    }
  }, [dateRange, historyType]);

  useEffect(() => {
    void fetchVouchers();
    return () => {
      historyRequest.current?.abort();
      historyRequest.current = null;
    };
  }, [fetchVouchers, historyRefresh]);

  // Observe the bottom of the history's own scroll container, matching the
  // existing admin shift-history flow. Failed batches require an explicit retry.
  useEffect(() => {
    if (!nextCursor || isLoading || historyError) return;
    const root = historyList.current;
    const sentinel = historySentinel.current;
    if (!root || !sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void fetchVouchers(nextCursor);
    }, { root, threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchVouchers, nextCursor, isLoading, historyError]);

  // Clock for the time-left labels; minute precision is all they show.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (generationInFlight.current) return;
    setGenerationError(null);
    setGenerationToConfirm({
      type: voucherType,
      amount: voucherType === 'DISCOUNT' ? parseFloat(amount) : null,
      quantity: Number(quantity),
      allow_duplicates: allowDuplicates,
      validity_hours: hasTimeLimit ? Number(validityHours) : null,
    });
  };

  const closeGenerationModal = () => {
    if (generationInFlight.current) return;
    setGenerationToConfirm(null);
    setGenerationError(null);
  };

  const confirmGeneration = async () => {
    if (!generationToConfirm || generationInFlight.current) return;
    // Submit the exact details reviewed in the modal, retaining the same
    // request key on failure so a retry cannot distribute a second batch.
    const payload = generationToConfirm;
    const signature = JSON.stringify(payload);
    const previousRequest = generationRequest.current;
    const pendingRequest = previousRequest && previousRequest.signature === signature
      ? previousRequest
      : { signature, key: crypto.randomUUID() };
    generationRequest.current = pendingRequest;
    const requestKey = pendingRequest.key;
    generationInFlight.current = true;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, idempotency_key: requestKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to generate vouchers');
      generationRequest.current = null;
      setGenerationToConfirm(null);
      showSuccess(`${data.data?.length ?? payload.quantity} voucher(s) distributed successfully.`);
      setHistoryRefresh(previous => previous + 1);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate vouchers');
    } finally {
      generationInFlight.current = false;
      setIsGenerating(false);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const closeDeleteModal = () => {
    if (deletionRequest.current) return;
    setVoucherToDelete(null);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!voucherToDelete || deletionRequest.current) return;
    const { id, code } = voucherToDelete;
    deletionRequest.current = true;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/vouchers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete voucher');
      showSuccess(`Voucher "${code}" deleted.`);
      setVouchers(previous => previous.filter(voucher => voucher.id !== id));
      setVoucherToDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete voucher');
    } finally {
      deletionRequest.current = false;
      setIsDeleting(false);
    }
  };

  const qty = parseInt(quantity) || 0;

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        {/* Title — centered like the other Settings pages */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Voucher Generator</h1>
          <p className="mt-1 text-sm text-slate-400">Generate and randomly distribute vouchers to eligible commuters.</p>
        </div>

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
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} min="0.01" max="99999999.99" required className="block w-full rounded-md border border-[#1E2D45] bg-[#0E1628] py-2 pl-7 pr-3 text-sm font-semibold tabular-nums text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
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

            <div className="space-y-3 border-t border-[#1E2D45] pt-4">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={hasTimeLimit} onChange={event => setHasTimeLimit(event.target.checked)} className="accent-[#62A0EA]" />
                Set a time limit
              </label>
              {hasTimeLimit ? (
                <label className="block sm:max-w-xs">
                  <span className="mb-1.5 block text-xs font-medium text-slate-300">Valid for (hours)</span>
                  <input type="number" min="24" max="87600" step="1" required value={validityHours} onChange={event => setValidityHours(event.target.value)} aria-describedby="voucher-validity-help" className="block w-full rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm font-semibold tabular-nums text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
                  <span id="voucher-validity-help" className="mt-1.5 block text-xs text-slate-500">Minimum 24 hours, starting when the vouchers are generated.</span>
                </label>
              ) : (
                <p className="text-xs text-slate-500">No time limit. Each voucher can still be used only once.</p>
              )}
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={allowDuplicates} onChange={event => setAllowDuplicates(event.target.checked)} className="mt-0.5 accent-[#62A0EA]" />
              Allow a commuter to receive multiple vouchers in this batch. Each commuter receives at most one by default.
            </label>

            <div className="flex flex-col gap-3 border-t border-[#1E2D45] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">
                {qty >= 1 && qty <= 100
                  ? <>Distributes <span className="font-semibold text-white">{qty}</span> {voucherType === 'FREE_RIDE' ? 'free-ride' : `₱${amount || '0'} discount`} {qty === 1 ? 'voucher' : 'vouchers'} to {allowDuplicates ? 'random eligible commuters' : 'different eligible commuters'}.</>
                  : 'Quantity must be from 1 to 100.'}
              </p>
              <button type="submit" disabled={isGenerating} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#4A8BD4] active:scale-95 disabled:opacity-50 sm:w-auto">
                <Ticket size={16} aria-hidden="true" /> {isGenerating ? 'Distributing...' : 'Generate & Distribute'}
              </button>
            </div>
          </form>
        </SettingsSection>

        {/* Distribution history */}
        <section className="overflow-hidden rounded-lg border border-[#1E2D45] bg-[#131C2E]">
          <div className="flex items-center justify-between gap-3 border-b border-[#1E2D45] px-4 py-3 sm:px-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              Distribution History
              <span className="text-xs font-normal tabular-nums text-slate-400">{vouchers.length} loaded</span>
            </h2>
            <button type="button" onClick={() => setHistoryRefresh(previous => previous + 1)} disabled={isLoading} title="Refresh" aria-label="Refresh vouchers" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-[#1A2540] hover:text-white disabled:opacity-50">
              <RefreshCw size={16} className={isLoading ? 'motion-safe:animate-spin' : ''} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 border-b border-[#1E2D45] px-4 py-3 sm:grid-cols-2 sm:px-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-300">Voucher type</span>
              <select value={historyType} onChange={event => setHistoryType(event.target.value as typeof historyType)} className="w-full rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA]">
                <option value="ALL">All types</option>
                <option value="DISCOUNT">Discounted</option>
                <option value="FREE_RIDE">Free ride</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-300">Date range</span>
              <select value={dateRange} onChange={event => setDateRange(event.target.value as typeof dateRange)} className="w-full rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA]">
                <option value="last_7_days">Last 7 days</option>
                <option value="this_month">This month</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>
          <div ref={historyList} className="max-h-[60vh] overflow-y-auto p-4 sm:p-5" aria-busy={isLoading}>
            {vouchers.length === 0 && !isLoading && !historyError ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Ticket size={28} className="text-slate-600" aria-hidden="true" />
                <p className="text-sm text-slate-400">No vouchers match these filters.</p>
                <p className="text-xs text-slate-500">Try a different voucher type or date range.</p>
              </div>
            ) : <ul className="space-y-3">{vouchers.map(voucher => {
              const status = voucherStatus(voucher, now);
              const typeInfo = voucherTypeInfo(voucher);
              const generatorName = [voucher.generated_by_first_name, voucher.generated_by_last_name].filter(Boolean).join(' ');
              const recipientName = voucher.commuter
                ? `${voucher.commuter.first_name} ${voucher.commuter.surname}`
                : voucher.commuter_id ? `Commuter ${voucher.commuter_id}` : 'Unassigned';
              return (
                <li key={voucher.id} className="rounded-lg border border-[#1E2D45] bg-[#0E1628] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="break-all font-mono text-sm font-semibold text-white">{voucher.code}</span>
                        <button type="button" onClick={() => copyCode(voucher.code, voucher.id)} className="shrink-0 rounded p-1 text-slate-500 transition-colors hover:text-[#62A0EA]" title="Copy code" aria-label={`Copy ${voucher.code}`}>
                          {copiedId === voucher.id ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1.5"><typeInfo.icon size={13} aria-hidden="true" />{typeInfo.label}</span>
                        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setVoucherToDelete(voucher); setDeleteError(null); }} className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-400/10 hover:text-red-400" title="Delete" aria-label={`Delete ${voucher.code}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Distributed to</dt>
                      <dd className="mt-1 break-words font-medium text-slate-200">{recipientName}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Generated by</dt>
                      <dd className="mt-1 break-words text-slate-200">{generatorName || (voucher.generated_by_id ? `Admin ${voucher.generated_by_id}` : voucher.type === 'REWARD' ? 'System loyalty reward' : 'Not recorded')}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{voucher.generation_batch_id ? 'Distributed at' : 'Created at'}</dt>
                      <dd className="mt-1 text-slate-200"><time dateTime={voucher.created_at}>{new Date(voucher.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</time></dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Time limit</dt>
                      <dd className="mt-1 flex flex-wrap items-center gap-2 text-slate-200">
                        {voucher.expires_at ? <time dateTime={voucher.expires_at}>{new Date(voucher.expires_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</time> : 'No time limit'}
                        <ExpiryLabel expiresAt={voucher.expires_at} usable={status.usable} now={now} />
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}</ul>}
            <div ref={historySentinel} className="flex min-h-8 flex-col items-center justify-center gap-2 pt-3 text-xs" role="status" aria-live="polite">
              {isLoading ? <p className="text-slate-400">Loading vouchers...</p> : historyError ? (
                <>
                  <p className="text-red-400">{historyError}</p>
                  <button type="button" onClick={() => void fetchVouchers(nextCursor)} className="rounded-md bg-[#1A2540] px-3 py-1.5 text-slate-300 hover:text-white">Retry</button>
                </>
              ) : vouchers.length > 0 && !nextCursor ? <p className="text-slate-500">All matching vouchers loaded.</p> : null}
            </div>
          </div>
        </section>
        {generationToConfirm && (
          <Modal isOpen onClose={closeGenerationModal}>
            <div className="space-y-5">
              <div className="pr-8">
                <h2 className="text-lg font-bold text-white">Generate Vouchers</h2>
                <p className="mt-1 text-sm text-slate-400">Confirm these details before distributing vouchers to randomly selected eligible commuters.</p>
              </div>
              <dl className="space-y-3 rounded-md border border-[#1E2D45] bg-[#0E1628] p-4 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-400">Voucher type</dt><dd className="font-medium text-white">{generationToConfirm.type === 'FREE_RIDE' ? 'Free ride' : 'Discounted'}</dd></div>
                {generationToConfirm.type === 'DISCOUNT' && <div className="flex justify-between gap-4"><dt className="text-slate-400">Discount per voucher</dt><dd className="font-medium text-white">₱{Number(generationToConfirm.amount).toFixed(2)}</dd></div>}
                <div className="flex justify-between gap-4"><dt className="text-slate-400">Quantity</dt><dd className="font-medium text-white">{generationToConfirm.quantity}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-400">Time limit</dt><dd className="text-right font-medium text-white">{generationToConfirm.validity_hours === null ? 'No time limit' : `${generationToConfirm.validity_hours} hours after generation`}</dd></div>
                <div><dt className="text-slate-400">Distribution</dt><dd className="mt-1 text-white">{generationToConfirm.allow_duplicates ? 'A commuter may receive multiple vouchers in this batch.' : 'One voucher per commuter in this batch.'}</dd></div>
              </dl>
              {generationError && <p role="alert" className="text-sm text-red-400">{generationError}</p>}
              <div className="flex justify-end gap-2 border-t border-[#1E2D45] pt-4">
                <button type="button" onClick={closeGenerationModal} disabled={isGenerating} className="rounded-md border border-[#1E2D45] px-5 py-2.5 text-sm text-slate-300 transition-colors hover:bg-[#131C2E] disabled:opacity-50">Cancel</button>
                <button type="button" onClick={() => void confirmGeneration()} disabled={isGenerating} className="flex items-center gap-2 rounded-md bg-[#62A0EA] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4A8BD4] disabled:opacity-50">
                  <Ticket size={16} aria-hidden="true" />
                  {isGenerating ? 'Distributing...' : 'Generate & Distribute'}
                </button>
              </div>
            </div>
          </Modal>
        )}
        {voucherToDelete && (
          <Modal isOpen onClose={closeDeleteModal}>
            <div className="space-y-5">
              <div className="pr-8">
                <h2 className="text-lg font-bold text-white">Delete Voucher</h2>
                <p className="mt-1 text-sm text-slate-400">Are you sure you want to delete this voucher?</p>
              </div>
              <div className="space-y-1 rounded-md border border-[#1E2D45] bg-[#0E1628] p-4">
                <p className="break-all font-mono text-sm font-semibold text-white">{voucherToDelete.code}</p>
                <p className="text-sm text-slate-400">{voucherTypeInfo(voucherToDelete).label}</p>
                {voucherToDelete.commuter && <p className="text-sm text-slate-400">Distributed to {voucherToDelete.commuter.first_name} {voucherToDelete.commuter.surname}</p>}
              </div>
              {deleteError && <p role="alert" className="text-sm text-red-400">{deleteError}</p>}
              <div className="flex justify-end gap-2 border-t border-[#1E2D45] pt-4">
                <button type="button" onClick={closeDeleteModal} disabled={isDeleting} className="rounded-md border border-[#1E2D45] px-5 py-2.5 text-sm text-slate-300 transition-colors hover:bg-[#131C2E] disabled:opacity-50">Cancel</button>
                <button type="button" onClick={() => void handleDelete()} disabled={isDeleting} className="flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                  <Trash2 size={16} aria-hidden="true" />
                  {isDeleting ? 'Deleting...' : 'Delete Voucher'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
