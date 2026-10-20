// components/admin/remittance/cash-declaration-modal.tsx
'use client';

import { useState, useEffect, useId } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { AlertTriangle, ArrowRight, Check, Clock } from 'lucide-react';
import type { RemittanceRecord } from '@/app/(admin)/remittance/data/remittance-data';

const fmtPHP = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Always show times on the corridor's clock (Philippine time), whatever the
// admin's device is set to.
const PH = 'Asia/Manila';
// A completed remittance's time_in/time_out are uncast DB timestamps
// ("2026-10-20 06:02:00", app timezone Asia/Manila, no offset), while
// remittance_due_at arrives as ISO with an offset. Pin the bare form to
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
 * Laid out around the one comparison being made: the system's expected cash
 * beside the cash physically counted, with the difference under them. The
 * declaration is only sent from the confirmation dialog.
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
  const dueAt = toDate(record.dueAt);
  const duration = timeIn && timeOut ? fmtDuration(timeIn, timeOut) : null;
  const isOverdue = record.remittanceStatus === 'Overdue';

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
    <Modal isOpen={isOpen} onClose={() => { if (!isSubmitting) onClose(); }} maxWidth="max-w-md sm:max-w-xl" adminThemed>
      <header className="border-b border-[#2A3A55] pb-5 pr-8 admin-light:border-[#E2E8F0]">
        <p className={label}>Cash declaration</p>
        <h2 className="mt-1 text-xl font-bold leading-snug text-white wrap-anywhere admin-light:text-slate-900">{record.conductorName}</h2>
        <p className="mt-0.5 text-sm text-slate-300 admin-light:text-slate-600">
          Unit {record.unitNumber}{record.driverName ? ` · Driver ${record.driverName}` : ''}
        </p>

        {/* When the shift ran and when the cash was due. */}
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[auto_auto_1fr] sm:gap-6">
          <div>
            <dt className="text-xs text-slate-400 admin-light:text-slate-500">Shift date</dt>
            <dd className="mt-0.5 text-sm font-medium text-white admin-light:text-slate-900">{timeIn ? fmtDay(timeIn) : record.date || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 admin-light:text-slate-500">Time in → time out</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-medium tabular-nums text-white admin-light:text-slate-900">
              {timeIn ? fmtClock(timeIn) : '—'}
              <ArrowRight size={13} aria-label="to" className="text-slate-500" />
              {timeOut ? `${fmtClock(timeOut)}${timeIn && !sameDay(timeIn, timeOut) ? ` (${fmtDay(timeOut)})` : ''}` : '—'}
              {duration && <span className="font-normal text-slate-400 admin-light:text-slate-500">({duration})</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 admin-light:text-slate-500">{isOverdue ? 'Overdue since' : 'Due by'}</dt>
            <dd className={`mt-0.5 flex items-center gap-1.5 text-sm font-medium tabular-nums ${isOverdue ? 'text-amber-300 admin-light:text-amber-700' : 'text-white admin-light:text-slate-900'}`}>
              <Clock size={13} aria-hidden="true" className="shrink-0" />
              {dueAt ? `${fmtClock(dueAt)}${timeOut && !sameDay(dueAt, timeOut) ? `, ${fmtDay(dueAt)}` : ''}` : '—'}
            </dd>
          </div>
        </dl>
      </header>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Expected beside counted: the comparison the admin is making. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#2A3A55] bg-[#131C2E] p-4 admin-light:border-[#E2E8F0] admin-light:bg-[#F8FAFC]">
            <p className={label}>Expected cash</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-white admin-light:text-slate-900">{fmtPHP(record.cashTotal)}</p>
            <p className="mt-1 text-xs text-slate-400 admin-light:text-slate-500">Cash fares the system tracked</p>
          </div>
          <div className="rounded-lg border border-[#62A0EA] bg-[#131C2E] p-4 admin-light:border-[#1A5FB4] admin-light:bg-white">
            <label htmlFor="cash-declared" className={label}>Cash counted</label>
            <div className="mt-2 flex items-center gap-1 rounded-md border border-[#2A3A55] bg-[#0E1628] px-3 focus-within:border-[#62A0EA] admin-light:border-[#CBD5E1] admin-light:bg-white admin-light:focus-within:border-[#1A5FB4]">
              <span aria-hidden="true" className="text-xl font-bold text-slate-400 admin-light:text-slate-500">₱</span>
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
                aria-describedby="cash-declared-help"
                className="h-11 w-full min-w-0 bg-transparent text-2xl font-bold tabular-nums text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:text-slate-500 admin-light:text-slate-900"
                placeholder="0.00"
              />
            </div>
            <p id="cash-declared-help" className="mt-1 text-xs text-slate-400 admin-light:text-slate-500">Physical cash handed over</p>
          </div>
        </div>

        <dl className="divide-y divide-[#2A3A55] rounded-lg border border-[#2A3A55] admin-light:divide-[#E2E8F0] admin-light:border-[#E2E8F0]">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className={`flex items-center gap-1.5 text-sm font-semibold ${differenceTone}`}>
              {shortage > 0 ? <AlertTriangle size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
              {shortage > 0 ? 'Shortage' : overage > 0 ? 'Overage' : 'Exact match'}
            </dt>
            <dd className={`text-base font-bold tabular-nums ${differenceTone}`}>{differenceValue}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="text-sm text-slate-400 admin-light:text-slate-500">GCash fares (not counted)</dt>
            <dd className="text-sm font-medium tabular-nums text-slate-200 admin-light:text-slate-700">{fmtPHP(record.gcashTotal)}</dd>
          </div>
        </dl>

        {error && <p role="alert" className="text-sm text-red-400 admin-light:text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-2 border-t border-[#2A3A55] pt-4 sm:flex-row sm:justify-end admin-light:border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 rounded-md border border-[#2A3A55] bg-[#131C2E] px-5 text-sm font-medium text-slate-200 transition-colors hover:bg-[#0E1628] disabled:cursor-not-allowed disabled:text-slate-500 admin-light:border-[#CBD5E1] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || hasInvalidAmount}
            className="min-h-11 rounded-md border border-[#62A0EA] bg-[#62A0EA] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4A8BD4] disabled:cursor-not-allowed disabled:border-[#2A3A55] disabled:bg-[#1E293B] disabled:text-slate-500 admin-light:border-[#1A5FB4] admin-light:bg-[#1A5FB4] admin-light:hover:bg-[#164A8F] admin-light:disabled:border-[#E2E8F0] admin-light:disabled:bg-[#F1F5F9] admin-light:disabled:text-slate-400"
          >
            Record declaration
          </button>
        </div>
      </form>

      {/* Confirmation: the declaration is only sent from here. Sits above the
          modal (z-60); Cancel is focused first so Enter never confirms. */}
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
            className="w-full max-w-sm rounded-xl border border-[#2A3A55] bg-[#1A2540] p-6 shadow-2xl admin-light:border-[#E2E8F0] admin-light:bg-white"
          >
            <h3 id={confirmTitleId} className="text-lg font-bold leading-snug text-white admin-light:text-slate-900">
              Record {fmtPHP(declaredAmount)} for {record.conductorName}?
            </h3>
            <p className="mt-1 text-sm text-slate-400 admin-light:text-slate-500">
              {timeIn ? fmtDay(timeIn) : record.date} · Unit {record.unitNumber}
            </p>
            <dl className="mt-4 space-y-2 rounded-md border border-[#2A3A55] bg-[#131C2E] p-3 text-sm admin-light:border-[#E2E8F0] admin-light:bg-[#F8FAFC]">
              <div className="flex justify-between gap-3"><dt className="text-slate-400 admin-light:text-slate-500">Expected</dt><dd className="font-medium tabular-nums text-white admin-light:text-slate-900">{fmtPHP(record.cashTotal)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400 admin-light:text-slate-500">Counted</dt><dd className="font-medium tabular-nums text-white admin-light:text-slate-900">{fmtPHP(declaredAmount)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-[#2A3A55] pt-2 admin-light:border-[#E2E8F0]"><dt className={`font-semibold ${differenceTone}`}>{outcome === 'Settled' ? 'Exact match' : outcome}</dt><dd className={`font-bold tabular-nums ${differenceTone}`}>{differenceValue}</dd></div>
            </dl>
            <p className="mt-3 text-sm text-slate-300 admin-light:text-slate-600">The remittance will be marked <span className="font-semibold text-white admin-light:text-slate-900">{outcome}</span>.</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmOpen(false)}
                disabled={isSubmitting}
                className="min-h-11 rounded-md border border-[#2A3A55] bg-[#131C2E] text-sm font-semibold text-slate-200 transition-colors hover:bg-[#0E1628] disabled:cursor-not-allowed disabled:text-slate-500 admin-light:border-[#CBD5E1] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(event) => { if (event.detail <= 1) void submit(); }}
                disabled={isSubmitting}
                className="min-h-11 rounded-md border border-[#62A0EA] bg-[#62A0EA] text-sm font-semibold text-white transition-colors hover:bg-[#4A8BD4] disabled:cursor-not-allowed disabled:border-[#2A3A55] disabled:bg-[#1E293B] disabled:text-slate-500 admin-light:border-[#1A5FB4] admin-light:bg-[#1A5FB4] admin-light:hover:bg-[#164A8F]"
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
