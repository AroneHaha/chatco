// components/admin/vehicles/delete-personnel-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Trash2, Loader2 } from 'lucide-react';
import { ADMIN_BUTTON, ADMIN_FIELD, ADMIN_LABEL, DetailRows, ModalKickerHeader } from '@/components/admin/ui/modal-parts';
import { InlineError } from '@/components/admin/ui/inline-error';

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

  const needsReason = terminationType === 'Terminated';
  const canSubmit = !isSubmitting && confirmText === 'Confirm' && (!needsReason || (reason !== '' && (reason !== 'Other' || otherReason.trim() !== '')));

  return (
    <Modal adminThemed isOpen={isOpen} onClose={isSubmitting ? () => {} : onClose}>
      <ModalKickerHeader
        kicker="Permanent action"
        destructive
        title="Remove personnel"
        description="This deactivates the personnel account. Provide the details below."
      />

      <form onSubmit={handleSubmit} className="mt-4 space-y-5">
        {personnelData && <DetailRows rows={[{ label: 'Name', value: personnelData.name }, { label: 'Role', value: personnelData.role }]} />}

        <div>
          <label htmlFor="remove-personnel-type" className={ADMIN_LABEL}>Termination type</label>
          <select
            id="remove-personnel-type"
            value={terminationType}
            onChange={(e) => setTerminationType(e.target.value)}
            disabled={isSubmitting}
            className={`mt-2 ${ADMIN_FIELD}`}
          >
            <option value="Terminated">Terminated</option>
            <option value="Resigned">Resigned</option>
          </select>
        </div>

        {needsReason && (
          <div>
            <label htmlFor="remove-personnel-reason" className={ADMIN_LABEL}>Reason for removal</label>
            <select
              id="remove-personnel-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value !== 'Other') setOtherReason('');
              }}
              required
              disabled={isSubmitting}
              className={`mt-2 ${ADMIN_FIELD}`}
            >
              <option value="">Select a reason</option>
              {terminationReasons.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            {reason === 'Other' && (
              <textarea
                aria-label="Specific reason"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                required
                disabled={isSubmitting}
                rows={3}
                placeholder="Type the specific reason..."
                className={`mt-3 resize-y ${ADMIN_FIELD}`}
              />
            )}
            <p className="mt-2 text-xs text-slate-500">This will be recorded in the Records and History tab.</p>
          </div>
        )}

        {/* Confirmation guard */}
        <div>
          <label htmlFor="remove-personnel-confirm" className={ADMIN_LABEL}>
            Type <span className="text-white admin-light:text-slate-900">Confirm</span> to continue
          </label>
          <input
            id="remove-personnel-confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            required
            disabled={isSubmitting}
            autoComplete="off"
            placeholder="Confirm"
            className={`mt-2 ${ADMIN_FIELD}`}
          />
          <p className="mt-2 text-xs text-slate-500">This prevents accidental personnel removals.</p>
        </div>

        {/* Shown when the DELETE API call fails; the modal stays open to retry. */}
        {submitError && <InlineError>{submitError}</InlineError>}

        <div className="flex flex-col-reverse gap-2 min-[380px]:flex-row">
          <button type="button" onClick={onClose} disabled={isSubmitting} className={`flex-1 ${ADMIN_BUTTON.secondary}`}>
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit} className={`flex-1 ${ADMIN_BUTTON.danger}`}>
            {isSubmitting
              ? <><Loader2 size={16} aria-hidden="true" className="animate-spin" />Removing…</>
              : <><Trash2 size={16} aria-hidden="true" />Confirm removal</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
