// components/admin/lost-found/approve-claim-modal.tsx
'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import { Modal } from '@/components/admin/ui/modal';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import type { PickupSchedule } from '@/lib/shared/services/lost-found.service';

/** Same text the backend falls back to (LostItemService::DEFAULT_PICKUP_REMINDER). */
const DEFAULT_REMINDER = 'Bring a valid ID and the proof of ownership you submitted.';
/** Pickups usually happen at the same office, so the last one is offered again. */
const LAST_LOCATION_KEY = 'chatco:lost-found:last-pickup-location';

function readLastLocation(): string {
  try {
    return window.localStorage.getItem(LAST_LOCATION_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberLocation(location: string) {
  try {
    window.localStorage.setItem(LAST_LOCATION_KEY, location);
  } catch {
    // Storage blocked (private mode etc.) — the field just starts empty next time.
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

interface ApproveClaimModalProps {
  isOpen: boolean;
  claimantName: string;
  onClose: () => void;
  /** Rejects with an Error whose message is shown inline (e.g. backend 422). */
  onConfirm: (pickup: PickupSchedule) => Promise<void>;
}

/**
 * Approval step for an account claimant: the admin sets where and when the
 * commuter collects the item, plus a reminder. Those details go straight to
 * the commuter's Claims tab and their approval notification.
 */
export function ApproveClaimModal({ isOpen, claimantName, onClose, onConfirm }: ApproveClaimModalProps) {
  const [location, setLocation] = useState(readLastLocation);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reminder, setReminder] = useState(DEFAULT_REMINDER);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedLocation = location.trim();
    if (!trimmedLocation || !date || !time) {
      setError('Set the pickup location, date and time.');
      return;
    }
    if (new Date(`${date}T${time}`).getTime() < Date.now()) {
      setError('The pickup time has already passed. Pick a later date or time.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm({ location: trimmedLocation, pickupAt: `${date}T${time}`, reminder: reminder.trim() });
      rememberLocation(trimmedLocation);
      setDate('');
      setTime('');
      setReminder(DEFAULT_REMINDER);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to approve this claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="pr-8">
          <h2 className="text-lg font-bold text-white">Approve claim</h2>
          <p className="mt-1 text-xs text-slate-400">
            Tell <span className="font-semibold text-slate-200">{claimantName}</span> where and when to collect the item. They&apos;ll see this in their Claims tab and notification.
          </p>
        </div>

        <div>
          <label htmlFor="pickup-location" className="mb-1.5 block text-xs font-semibold text-slate-300">
            Pickup location <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="pickup-location"
              required
              maxLength={255}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Calumpit Terminal Office, ground floor"
              className="h-10 w-full rounded-lg border border-white/10 bg-[#0E1628] pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#62A0EA]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-300">
              Date <span className="text-red-400">*</span>
            </span>
            <AdminDatePicker
              accent="blue"
              ariaLabel="Pickup date"
              value={date}
              onChange={(next) => setDate(next && next < todayISO() ? '' : next)}
              triggerClassName="h-10 w-full"
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="pickup-time" className="mb-1.5 block text-xs font-semibold text-slate-300">
              Time <span className="text-red-400">*</span>
            </label>
            <input
              id="pickup-time"
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-10 w-full rounded-lg border border-white/10 bg-[#0E1628] px-3 text-sm text-white outline-none transition-colors [color-scheme:dark] focus:border-[#62A0EA]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pickup-reminder" className="mb-1.5 block text-xs font-semibold text-slate-300">Reminder for the claimant</label>
          <textarea
            id="pickup-reminder"
            rows={3}
            maxLength={500}
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            className="w-full resize-none rounded-lg border border-white/10 bg-[#0E1628] px-3 py-2 text-sm leading-6 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#62A0EA]"
          />
          <p className="mt-1 text-[10px] text-slate-500">Leave blank to use the standard ID reminder.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
            <p className="text-xs leading-5 text-red-300">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
          <button type="button" onClick={handleClose} disabled={isSubmitting} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50">
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve and notify
          </button>
        </div>
      </form>
    </Modal>
  );
}
