'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { AlertTriangle, Trash2 } from 'lucide-react';

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
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0 border-2 border-red-500/25">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Delete User</h2>
            <p className="text-sm text-slate-400 mt-1">
              This will soft-delete the account and lock the user out of the system.
              Their financial history (transactions, remittances) is preserved.
            </p>
          </div>
        </div>

        {user && (
          <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-4 space-y-1">
            <p className="text-white font-medium">{user.name}</p>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Confirmation guard — prevents a misclick from deleting the account */}
        <div>
          <label htmlFor="delete-user-confirm" className="block text-sm font-medium text-slate-300 mb-1.5">
            Type <span className="font-semibold text-white">Delete</span> to continue <span className="text-red-400">*</span>
          </label>
          <input
            id="delete-user-confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isDeleting}
            autoComplete="off"
            placeholder="Delete"
            className="block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-400 transition-colors disabled:opacity-50"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2D45]">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting || confirmText !== 'Delete'}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            {isDeleting ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
