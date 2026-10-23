'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Trash2 } from 'lucide-react';
import { ADMIN_BUTTON, ADMIN_FIELD, ADMIN_LABEL, DetailRows, ModalKickerHeader } from '@/components/admin/ui/modal-parts';
import { InlineError } from '@/components/admin/ui/inline-error';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: { name: string; email: string } | null;
}

/**
 * Delete-confirm modal for admin user management (S5-T10).
 *
 * Shows a clear warning + the user's name/email so the admin can
 * double-check before the irreversible soft-delete. Surfaces API
 * errors (e.g. "You cannot delete your own account.") inline.
 *
 * Requires typing "Delete" to enable the confirm button — guards against
 * a misclick deleting the wrong account.
 */
export function DeleteUserModal({ isOpen, onClose, onConfirm, user }: DeleteUserModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  // Reset the typed confirmation whenever the modal (re)opens, so a stale
  // "Delete" left over from a previous target can't carry over.
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (confirmText !== 'Delete' || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user.';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return; // prevent closing mid-request
    setError(null);
    onClose();
  };

  return (
    <Modal adminThemed isOpen={isOpen} onClose={handleClose}>
      <ModalKickerHeader
        kicker="Permanent action"
        destructive
        title="Delete user"
        description="This soft-deletes the account and locks the user out of the system. Their transactions and remittances are kept."
      />

      {user && <DetailRows className="mt-4" rows={[{ label: 'Name', value: user.name }, { label: 'Email', value: user.email }]} />}

      {/* Confirmation guard: prevents a misclick from deleting the account */}
      <div className="mt-5">
        <label htmlFor="delete-user-confirm" className={ADMIN_LABEL}>
          Type <span className="text-white admin-light:text-slate-900">Delete</span> to continue
        </label>
        <input
          id="delete-user-confirm"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={isDeleting}
          autoComplete="off"
          placeholder="Delete"
          className={`mt-2 ${ADMIN_FIELD}`}
        />
      </div>

      {error && <InlineError className="mt-3">{error}</InlineError>}

      <div className="mt-5 flex flex-col-reverse gap-2 min-[380px]:flex-row">
        <button type="button" onClick={handleClose} disabled={isDeleting} className={`flex-1 ${ADMIN_BUTTON.secondary}`}>
          Cancel
        </button>
        <button type="button" onClick={handleConfirm} disabled={isDeleting || confirmText !== 'Delete'} className={`flex-1 ${ADMIN_BUTTON.danger}`}>
          <Trash2 size={16} aria-hidden="true" />
          {isDeleting ? 'Deleting…' : 'Delete user'}
        </button>
      </div>
    </Modal>
  );
}
