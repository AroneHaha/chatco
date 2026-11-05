// components/admin/ui/success-modal.tsx
'use client';

import { CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/admin/ui/modal';
import { ADMIN_BUTTON } from '@/components/admin/ui/modal-parts';

/**
 * Confirms a completed admin action. Solid surface, icon straight on the
 * panel, CHATCO Blue only for the icon and the OK button (UI rules: no tinted
 * banners, no boxed icons). Open while `message` is set; closes on OK, Escape
 * or the backdrop.
 */
export function SuccessModal({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;

  return (
    <Modal adminThemed isOpen onClose={onClose}>
      <div className="flex items-start gap-3 pr-8">
        <CheckCircle2 size={32} aria-hidden="true" className="shrink-0 text-[#62A0EA] admin-light:text-[#1A5FB4]" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-white admin-light:text-slate-900">Done</h2>
          <p role="status" className="mt-1 text-sm leading-relaxed break-words text-slate-300 admin-light:text-slate-600">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end border-t border-[#2A3A55] pt-4 admin-light:border-[#E2E8F0]">
        <button type="button" onClick={onClose} autoFocus className={`${ADMIN_BUTTON.primary} min-w-24`}>OK</button>
      </div>
    </Modal>
  );
}
