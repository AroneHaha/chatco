// components/admin/ui/sign-out-modal.tsx
'use client';

import { Modal } from '@/components/admin/ui/modal';
import { LogOut, Loader2 } from 'lucide-react';

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** True while the logout request is in flight — locks both buttons. */
  isPending?: boolean;
}

export function SignOutModal({ isOpen, onClose, onConfirm, isPending = false }: SignOutModalProps) {
  return (
    // Closing mid-request would leave the session half-torn-down, so the
    // backdrop/escape close is suppressed while signing out.
    <Modal isOpen={isOpen} onClose={isPending ? () => {} : onClose}>
      <div className="text-center space-y-4">
        {/* Warning Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <LogOut className="text-red-400" size={32} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">Sign Out</h2>
          <p className="text-sm text-gray-400 mt-2">
            Are you sure you want to sign out of your admin account? 
            You will need to log in again to access the dashboard.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Signing Out…
              </>
            ) : (
              <>
                <LogOut size={18} />
                Yes, Sign Out
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}