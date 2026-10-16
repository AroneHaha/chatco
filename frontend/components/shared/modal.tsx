// components/shared/modal.tsx
// Extracted from admin/ui/modal.tsx — shared across admin & conductor.

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  rounded?: string;
  /** Optional fixed panel height (e.g. `h-[min(700px,85vh)]`) so a modal with
   * little content doesn't shrink-to-fit and look undersized; content past
   * that height scrolls in the existing `overflow-y-auto` body region. */
  height?: string;
  /** Follow the commuter light/dark theme (`light:` variant). Off by default:
   * commuter dialogs whose content is still dark-only would otherwise get a
   * white panel under white text. Inert outside the commuter app. */
  themed?: boolean;
  /** Follow the admin light/dark theme (`admin-light:` variant). Off by default
   * for the same reason as `themed`; only applies inside an element marked
   * `data-admin-theme="light"`. */
  adminThemed?: boolean;
}

export function Modal({ isOpen, onClose, children, maxWidth = 'max-w-md', rounded = 'rounded-xl', height, themed = false, adminThemed = false }: ModalProps) {
  if (!isOpen) return null;

  return (
    // Centred at every size. This was `items-end` below sm, which pinned the
    // panel to the bottom edge as a sheet — it read as "stuck at the bottom"
    // and put the body text in the least readable part of the screen.
    //
    // The overlay owns the insets now (p-4, plus pb-20 to clear the mobile
    // bottom nav) and the panel is `max-h-full`, so the panel can never be
    // taller than the space actually available. That combination is what
    // stops it overflowing off the top — an earlier attempt kept a 95vh cap
    // while shrinking the container, and the header got cut off.
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 md:pb-4 bg-black/50">
      <div
        className={`relative bg-[#1A2540] border border-[#2A3A55] ${rounded} shadow-2xl w-full ${maxWidth} ${height ?? ''} ${themed ? 'light:bg-white light:border-gray-200' : ''} ${adminThemed ? 'admin-light:bg-white admin-light:border-[#E2E8F0]' : ''} max-h-full flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/8 transition-colors z-20 ${themed ? 'light:text-gray-400 light:hover:text-gray-900 light:hover:bg-gray-100' : ''} ${adminThemed ? 'admin-light:text-slate-400 admin-light:hover:text-slate-900 admin-light:hover:bg-slate-100' : ''}`}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        {/* modal-scroll opts this one region out of the global
            `[role="dialog"] * { scrollbar-width: none }` hide — without a
            scrollbar, overflowing content just looks truncated. The nav
            clearance lives on the overlay now, so no extra bottom padding
            here. */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 modal-scroll">
          {children}
        </div>
      </div>
    </div>
  );
}
