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
    <Modal isOpen={isOpen} onClose={isPending ? () => {} : onClose} adminThemed>
      <div className="flex items-start gap-3 pr-8">
        <LogOut size={30} aria-hidden="true" className="shrink-0 text-[#62A0EA] admin-light:text-[#1A5FB4]" />
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-white admin-light:text-slate-900">Sign out</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-400 admin-light:text-slate-500">
            You&apos;ll need to sign in again to use the admin dashboard.
          </p>
        </div>
      </div>

      {/* Signing out isn't destructive, so it's the normal primary action. */}
      <div className="mt-6 flex flex-col-reverse gap-2 min-[380px]:flex-row min-[380px]:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="min-h-11 rounded-md border border-[#2A3A55] bg-[#131C2E] px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-[#0E1628] disabled:cursor-not-allowed disabled:opacity-50 admin-light:border-[#CBD5E1] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#62A0EA] bg-[#62A0EA] px-4 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#85B6F0] disabled:cursor-not-allowed disabled:opacity-60 admin-light:border-[#1A5FB4] admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F]"
        >
          {isPending ? (
            <>
              <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              Signing out…
            </>
          ) : (
            <>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
