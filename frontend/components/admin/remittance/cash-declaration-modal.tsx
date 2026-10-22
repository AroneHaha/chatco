// components/admin/remittance/cash-declaration-modal.tsx
'use client';

import { useState, useEffect, useId } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { AlertTriangle, ArrowRight, Check } from 'lucide-react';
import type { RemittanceRecord } from '@/app/(admin)/remittance/data/remittance-data';

const fmtPHP = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Always show times on the corridor's clock (Philippine time), whatever the
// admin's device is set to.
const PH = 'Asia/Manila';
// A completed remittance's time_in/time_out are uncast DB timestamps
// ("2026-10-20 06:02:00", app timezone Asia/Manila, no offset). Pin the bare form to
// +08:00 (Manila has no DST): Safari can't parse it at all, and other
// browsers would read it in the device's own timezone.
const BARE_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;
const toDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(BARE_TIMESTAMP.test(value) ? `${value.replace(' ', 'T')}+08:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const fmtDay = (date: Date) => date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: PH });
const fmtClock = (date: Date) => date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: PH });
const sameDay = (a: Date, b: Date) => fmtDay(a) === fmtDay(b);

function fmtDuration(start: Date, end: Date): string | null {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (minutes < 0) return null;
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

interface CashDeclarationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful declaration — parent refetches the list. */
  onDeclared: () => void;
  /** The row being declared. Must be a real, ended, undeclared remittance
   * ("For Cash Declaration" or "Overdue" — never a still-active synthetic
   * "Pending" row, which has no Remittance row to attach a declaration to). */
  record: RemittanceRecord | null;
}

/**
 * The admin's cash count for a conductor's ended shift. This is the ONLY
 * place cash gets declared now — the conductor's End-of-Day flow only
 * submits (see components/conductor/remittance/ConfirmModal.tsx), leaving
 * the remittance PENDING until an admin counts the physical cash here.
 *
 * Shift context and expected cash sit beside the cash-count form. The live
 * comparison is reviewed in a confirmation dialog before it is submitted.
 */
export function CashDeclarationModal({ isOpen, onClose, onDeclared, record }: CashDeclarationModalProps) {
  const [cashDeclared, setCashDeclared] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmTitleId = useId();

  useEffect(() => {
    if (isOpen && record) {
      setCashDeclared(record.cashTotal.toFixed(2));
      setError(null);
      setConfirmOpen(false);
    }
  }, [isOpen, record]);

  if (!record) return null;

  const declaredAmount = parseFloat(cashDeclared) || 0;
  const shortage = Math.max(0, record.cashTotal - declaredAmount);
  const overage = Math.max(0, declaredAmount - record.cashTotal);
  const hasInvalidAmount = declaredAmount < 0 || cashDeclared.trim() === '';
  const outcome = shortage > 0 ? 'Shortage' : overage > 0 ? 'Overage' : 'Settled';

  const timeIn = toDate(record.timeIn);
  const timeOut = toDate(record.timeOut);
  const duration = timeIn && timeOut ? fmtDuration(timeIn, timeOut) : null;

  const submit = async () => {
    if (hasInvalidAmount || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/remittances/${record.shiftId}/cash-declaration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cash_declared: declaredAmount }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.message ?? `Failed to record cash declaration (HTTP ${res.status})`;
        throw new Error(msg);
      }

      setConfirmOpen(false);
      onDeclared();
      onClose();
    } catch (err) {
      // Back to the form so the admin sees the error beside the amount.
      setConfirmOpen(false);
      setError(err instanceof Error ? err.message : 'Failed to record cash declaration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasInvalidAmount) setConfirmOpen(true);
  };

  const differenceTone = shortage > 0
    ? 'text-red-400 admin-light:text-red-600'
    : overage > 0 ? 'text-emerald-400 admin-light:text-emerald-700' : 'text-slate-200 admin-light:text-slate-800';
  const differenceValue = shortage > 0 ? `−${fmtPHP(shortage)}` : overage > 0 ? `+${fmtPHP(overage)}` : fmtPHP(0);
  const label = 'text-[11px] font-semibold uppercase tracking-widest text-slate-400 admin-light:text-slate-500';

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!isSubmitting) onClose(); }} maxWidth="max-w-3xl" adminThemed>
      <header className="border-b border-[#2A3A55] pb-5 pr-8 admin-light:border-[#E2E8F0]">
        <p className={label}>Remittance</p>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white admin-light:text-slate-900">Cash declaration</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400 admin-light:text-slate-500">Count the cash handed over and reconcile it with this shift.</p>
      </header>

      <form onSubmit={handleSubmit} className="mt-5">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] sm:gap-7">
          <aside aria-label="Shift and collection details" className="min-w-0 border-b border-[#2A3A55] pb-5 sm:border-r sm:border-b-0 sm:pr-7 sm:pb-0 admin-light:border-[#E2E8F0]">
            <p className="text-base font-semibold break-words text-white admin-light:text-slate-900">{record.conductorName}</p>
            <p className="mt-1 text-xs text-slate-400 admin-light:text-slate-500">Unit {record.unitNumber}</p>

            <dl className="mt-5 space-y-3.5 text-xs">
              {record.driverName && (
                <div>
                  <dt className="text-slate-400 admin-light:text-slate-500">Driver</dt>
                  <dd className="mt-1 font-medium break-words text-slate-200 admin-light:text-slate-700">{record.driverName}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-400 admin-light:text-slate-500">Shift date</dt>
                <dd className="mt-1 font-medium text-slate-200 admin-light:text-slate-700">{timeIn ? fmtDay(timeIn) : record.date || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 admin-light:text-slate-500">Time in / time out</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-medium tabular-nums text-slate-200 admin-light:text-slate-700">
                  <span>{timeIn ? fmtClock(timeIn) : '—'}</span>
                  <ArrowRight size={12} aria-label="to" className="shrink-0 text-slate-500" />
                  <span>{timeOut ? `${fmtClock(timeOut)}${timeIn && !sameDay(timeIn, timeOut) ? ` (${fmtDay(timeOut)})` : ''}` : '—'}</span>
                </dd>
                {duration && <dd className="mt-1 text-slate-400 admin-light:text-slate-500">{duration} on duty</dd>}
              </div>
            </dl>

            <div className="mt-5 border-t border-[#2A3A55] pt-4 admin-light:border-[#E2E8F0]">
              <p className={label}>Expected cash</p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums break-all text-white admin-light:text-slate-900">{fmtPHP(record.cashTotal)}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">Cash fares recorded for this shift</p>
            </div>
          </aside>

          <section aria-labelledby="cash-count-heading" className="min-w-0">
            <h3 id="cash-count-heading" className="text-base font-semibold text-white admin-light:text-slate-900">How much cash was received?</h3>
            <p id="cash-declared-help" className="mt-1 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">Enter the physical cash you counted.</p>
            <label htmlFor="cash-declared" className={`mt-5 block ${label}`}>Cash counted</label>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#2A3A55] bg-[#131C2E] px-4 transition-colors focus-within:border-[#62A0EA] focus-within:ring-2 focus-within:ring-[#62A0EA]/15 admin-light:border-[#CBD5E1] admin-light:bg-[#F8FAFC] admin-light:focus-within:border-[#1A5FB4] admin-light:focus-within:ring-[#1A5FB4]/10">
              <span aria-hidden="true" className="text-2xl font-medium text-slate-400 admin-light:text-slate-500">₱</span>
              <input
                id="cash-declared"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={cashDeclared}
                onChange={(e) => setCashDeclared(e.target.value)}
                disabled={isSubmitting}
                autoFocus
                required
                aria-describedby={error ? 'cash-declared-help cash-declared-error' : 'cash-declared-help'}
                className="h-20 w-full min-w-0 bg-transparent text-3xl font-semibold tracking-tight tabular-nums text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:text-slate-500 sm:text-4xl admin-light:text-slate-900"
                placeholder="0.00"
              />
            </div>

            {error && <p id="cash-declared-error" role="alert" className="mt-2 text-xs leading-relaxed text-red-400 admin-light:text-red-600">{error}</p>}

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-slate-400 admin-light:text-slate-500">Expected cash</dt>
                <dd className="font-medium tabular-nums text-slate-200 admin-light:text-slate-700">{fmtPHP(record.cashTotal)}</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-slate-400 admin-light:text-slate-500">Cash counted</dt>
                <dd className="font-medium tabular-nums text-slate-200 admin-light:text-slate-700">{hasInvalidAmount ? '—' : fmtPHP(declaredAmount)}</dd>
              </div>
              <div aria-live="polite" aria-atomic="true" className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2A3A55] pt-3 admin-light:border-[#E2E8F0]">
                <dt className={`flex items-center gap-1.5 font-semibold ${hasInvalidAmount ? 'text-slate-400 admin-light:text-slate-500' : differenceTone}`}>
                  {!hasInvalidAmount && (shortage > 0 ? <AlertTriangle size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />)}
                  {hasInvalidAmount ? 'Difference' : shortage > 0 ? 'Shortage' : overage > 0 ? 'Overage' : 'Exact match'}
                </dt>
                <dd className={`text-lg font-semibold tabular-nums ${hasInvalidAmount ? 'text-slate-400 admin-light:text-slate-500' : differenceTone}`}>{hasInvalidAmount ? '—' : differenceValue}</dd>
              </div>
            </dl>

            <div className="mt-5 rounded-lg bg-[#131C2E] px-3.5 py-3 admin-light:bg-[#F8FAFC]">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 admin-light:text-slate-500">GCash collections</span>
                <span className="font-medium tabular-nums text-slate-200 admin-light:text-slate-700">{fmtPHP(record.gcashTotal)}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500 admin-light:text-slate-500">Paid digitally and excluded from the cash count.</p>
            </div>
          </section>
        </div>

        <footer className="mt-6 flex flex-col gap-4 border-t border-[#2A3A55] pt-4 sm:flex-row sm:items-center sm:justify-between admin-light:border-[#E2E8F0]">
          <p className="max-w-52 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">Review the amount before recording the declaration.</p>
          <div className="flex flex-col-reverse gap-2 min-[380px]:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-11 flex-1 rounded-md border border-[#2A3A55] px-4 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:text-slate-500 sm:flex-none admin-light:border-[#CBD5E1] admin-light:text-slate-700 admin-light:hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || hasInvalidAmount}
              className="min-h-11 flex-1 rounded-md border border-[#62A0EA] bg-[#62A0EA] px-4 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#85B6F0] disabled:cursor-not-allowed disabled:border-[#2A3A55] disabled:bg-[#1E293B] disabled:text-slate-500 sm:flex-none admin-light:border-[#1A5FB4] admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F] admin-light:disabled:border-[#E2E8F0] admin-light:disabled:bg-[#F1F5F9] admin-light:disabled:text-slate-400"
            >
              Review declaration <ArrowRight size={14} aria-hidden="true" className="ml-1.5 inline-block" />
            </button>
          </div>
        </footer>
      </form>

      {/* Confirmation: the declaration is only sent from here. Sits above the
          modal (z-60); Back to count is focused first so Enter never confirms. */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
          onClick={() => { if (!isSubmitting) setConfirmOpen(false); }}
          onKeyDown={(event) => { if (event.key === 'Escape' && !isSubmitting) { event.stopPropagation(); setConfirmOpen(false); } }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            onClick={(event) => event.stopPropagation()}
            className="max-h-full w-full max-w-sm overflow-y-auto rounded-xl border border-[#2A3A55] bg-[#1A2540] p-5 shadow-2xl sm:p-6 admin-light:border-[#E2E8F0] admin-light:bg-white"
          >
            <p className={label}>Final review</p>
            <h3 id={confirmTitleId} className="mt-1.5 text-xl font-semibold tracking-tight text-white admin-light:text-slate-900">
              Record cash declaration?
            </h3>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-widest text-slate-400 admin-light:text-slate-500">Cash received</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums break-all text-white admin-light:text-slate-900">{fmtPHP(declaredAmount)}</p>
            <p className="mt-2 text-sm font-medium break-words text-slate-200 admin-light:text-slate-700">{record.conductorName}</p>
            <p className="mt-1 text-xs text-slate-400 admin-light:text-slate-500">
              {timeIn ? fmtDay(timeIn) : record.date} · Unit {record.unitNumber}
            </p>
            <dl className="mt-5 space-y-3 border-y border-[#2A3A55] py-4 text-sm admin-light:border-[#E2E8F0]">
              <div className="flex justify-between gap-3"><dt className="text-slate-400 admin-light:text-slate-500">Expected</dt><dd className="font-medium tabular-nums text-white admin-light:text-slate-900">{fmtPHP(record.cashTotal)}</dd></div>
              <div className="flex justify-between gap-3"><dt className={`font-semibold ${differenceTone}`}>{outcome === 'Settled' ? 'Exact match' : outcome}</dt><dd className={`font-semibold tabular-nums ${differenceTone}`}>{differenceValue}</dd></div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">The remittance will be marked <span className="font-semibold text-white admin-light:text-slate-900">{outcome}</span>.</p>
            <div className="mt-5 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmOpen(false)}
                disabled={isSubmitting}
                className="min-h-11 rounded-md border border-[#2A3A55] bg-[#131C2E] text-sm font-semibold text-slate-200 transition-colors hover:bg-[#0E1628] disabled:cursor-not-allowed disabled:text-slate-500 admin-light:border-[#CBD5E1] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:bg-slate-50"
              >
                Back to count
              </button>
              <button
                type="button"
                onClick={(event) => { if (event.detail <= 1) void submit(); }}
                disabled={isSubmitting}
                className="min-h-11 rounded-md border border-[#62A0EA] bg-[#62A0EA] px-3 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#85B6F0] disabled:cursor-not-allowed disabled:border-[#2A3A55] disabled:bg-[#1E293B] disabled:text-slate-500 admin-light:border-[#1A5FB4] admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F]"
              >
                {isSubmitting ? 'Saving...' : 'Record declaration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
