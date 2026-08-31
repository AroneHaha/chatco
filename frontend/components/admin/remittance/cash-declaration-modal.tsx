// components/admin/remittance/cash-declaration-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Banknote, AlertTriangle } from 'lucide-react';
import type { RemittanceRecord } from '@/app/(admin)/remittance/data/remittance-data';

const fmtPHP = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
 */
export function CashDeclarationModal({ isOpen, onClose, onDeclared, record }: CashDeclarationModalProps) {
  const [cashDeclared, setCashDeclared] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && record) {
      setCashDeclared(record.cashTotal.toFixed(2));
      setError(null);
    }
  }, [isOpen, record]);

  if (!record) return null;

  const declaredAmount = parseFloat(cashDeclared) || 0;
  const shortage = Math.max(0, record.cashTotal - declaredAmount);
  const overage = Math.max(0, declaredAmount - record.cashTotal);
  const hasInvalidAmount = declaredAmount < 0 || cashDeclared.trim() === '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasInvalidAmount) return;

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

      onDeclared();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record cash declaration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!isSubmitting) onClose(); }} maxWidth="max-w-sm">
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 rounded-full bg-[#62A0EA]/15 flex items-center justify-center">
          <Banknote size={26} className="text-[#62A0EA]" />
        </div>
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-white text-center">Cash Declaration</h2>
      <p className="text-xs text-slate-400 text-center mt-1 mb-5">
        {record.conductorName} · {record.unitNumber} · {record.date}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" />GCash (system-tracked)</span>
            <span className="text-blue-400 font-bold tabular-nums">{fmtPHP(record.gcashTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />Cash (system-tracked)</span>
            <span className="text-emerald-400 font-bold tabular-nums">{fmtPHP(record.cashTotal)}</span>
          </div>
        </div>

        <div>
          <label htmlFor="cash-declared" className="block text-xs font-medium text-slate-300 mb-1.5">
            Cash Declared (physical count) <span className="text-red-400">*</span>
          </label>
          <input
            id="cash-declared"
            type="number"
            step="0.01"
            min="0"
            value={cashDeclared}
            onChange={(e) => setCashDeclared(e.target.value)}
            disabled={isSubmitting}
            autoFocus
            required
            className="w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-lg font-bold tabular-nums placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors disabled:opacity-50"
            placeholder="0.00"
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            Enter the cash actually handed over. The system-tracked total is {fmtPHP(record.cashTotal)}.
          </p>
        </div>

        {shortage > 0 && (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-md px-3.5 py-2.5">
            <span className="text-xs font-semibold text-red-400 flex items-center gap-1.5"><AlertTriangle size={13} />Shortage</span>
            <span className="text-sm font-bold text-red-400 tabular-nums">-{fmtPHP(shortage)}</span>
          </div>
        )}
        {overage > 0 && (
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3.5 py-2.5">
            <span className="text-xs font-semibold text-emerald-400">Overage</span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums">+{fmtPHP(overage)}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || hasInvalidAmount}
            className="px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Confirm Cash Declaration'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
