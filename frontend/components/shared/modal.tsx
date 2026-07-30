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
}

export function Modal({ isOpen, onClose, children, maxWidth = 'max-w-md', rounded = 'rounded-xl', height }: ModalProps) {
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
        className={`relative bg-[#1A2540] border border-[#2A3A55] ${rounded} shadow-2xl w-full ${maxWidth} ${height ?? ''} max-h-full flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/8 transition-colors z-20"
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
