// components/admin/vehicles/delete-personnel-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface DeletePersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the admin confirms. Can be async — the modal stays open
   *  (with a spinner on the submit button) until the Promise resolves.
   *  If it rejects, the error message is shown inline inside the modal. */
  onConfirm: (data: { id: string; reason: string; terminationType: string }) => Promise<void> | void;
  personnelData: { id: string; name: string; role: string } | null;
}

export function DeletePersonnelModal({ isOpen, onClose, onConfirm, personnelData }: DeletePersonnelModalProps) {
  const [terminationType, setTerminationType] = useState('Terminated');
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const terminationReasons = [
    'Repeated policy violations',
    'Gross negligence',
    'Misconduct',
    'Attendance issues',
    'Failed to meet operational standards',
    'Other',
  ];

  // Reset the form whenever the modal transitions to open or the target
  // personnel changes. Uses the React-recommended "adjust state during
  // render" pattern (conditional setState during render) instead of a
  // useEffect — this avoids the react-hooks/set-state-in-effect lint
  // error and is the documented way to reset state on prop change.
  // See: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  const openKey = isOpen ? `${personnelData?.id ?? 'none'}` : null;
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (isOpen) {
      setTerminationType('Terminated');
      setReason('');
      setOtherReason('');
      setConfirmText('');
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = terminationType === 'Resigned'
      ? 'Resigned'
      : reason === 'Other'
        ? otherReason.trim()
        : reason;
    if (!personnelData || !finalReason.trim() || confirmText !== 'Confirm' || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onConfirm({
        id: personnelData.id,
        reason: finalReason.trim(),
        terminationType,
      });
      // onConfirm resolved — close the modal. The parent will refetch.
      onClose();
    } catch (err) {
      // Keep the modal open so the admin can read the error and retry/abort.
      setSubmitError(err instanceof Error ? err.message : 'Failed to remove personnel.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={isSubmitting ? () => {} : onClose}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-400/20 rounded-lg">
          <AlertTriangle className="text-red-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Remove Personnel</h2>
          <p className="text-sm text-slate-400">This action will deactivate the personnel account.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Warning Box */}
        <div className="p-4 bg-red-400/5 border border-red-400/20 rounded-md">
          <p className="text-sm text-slate-300">
            You are about to terminate <span className="font-bold text-white">{personnelData?.name}</span>
            ({personnelData?.role}). Please provide the necessary details below.
          </p>
        </div>

        {/* Inline error banner — shown when the DELETE API call fails */}
        {submitError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{submitError}</p>
          </div>
        )}

        {/* Termination Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Termination Type <span className="text-red-400">*</span></label>
          <select
            value={terminationType}
            onChange={(e) => setTerminationType(e.target.value)}
            disabled={isSubmitting}
            className="block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-red-400 transition-colors [color-scheme:dark] disabled:opacity-50"
          >
            <option value="Terminated" className="bg-gray-800">Terminated</option>
            <option value="Resigned" className="bg-gray-800">Resigned</option>
          </select>
        </div>

        {terminationType === 'Terminated' && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Reason for Removal <span className="text-red-400">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value !== 'Other') setOtherReason('');
              }}
              required
              disabled={isSubmitting}
              className="block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-red-400 transition-colors [color-scheme:dark] disabled:opacity-50"
            >
              <option value="" className="bg-gray-800">Select a reason</option>
              {terminationReasons.map((item) => (
                <option key={item} value={item} className="bg-gray-800">{item}</option>
              ))}
            </select>
            {reason === 'Other' && (
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                required
                disabled={isSubmitting}
                rows={3}
                placeholder="Type the specific reason..."
                className="mt-3 block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-400 transition-colors resize-none leading-relaxed disabled:opacity-50"
              />
            )}
            <p className="text-xs text-slate-600 mt-1">This will be recorded in the Records & History tab.</p>
          </div>
        )}

        {/* Confirmation guard */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Type <span className="font-semibold text-white">Confirm</span> to continue <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            required
            disabled={isSubmitting}
            autoComplete="off"
            placeholder="Confirm"
            className="block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-400 transition-colors disabled:opacity-50"
          />
          <p className="text-xs text-slate-600 mt-1">This prevents accidental personnel removals.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[#1E2D45]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              confirmText !== 'Confirm' ||
              (terminationType === 'Terminated' && (!reason || (reason === 'Other' && !otherReason.trim())))
            }
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Removing…
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Confirm Removal
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
