"use client";

import { Modal } from "@/components/admin/ui/modal";

interface SosConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SosConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: SosConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center text-center pt-2">
        <div className="w-16 h-16 rounded-full bg-red-500/15 border-2 border-red-500/25 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h3 className="text-white font-bold text-lg mb-2">Send SOS Alert?</h3>
        <p className="text-white/40 text-sm leading-relaxed mb-6">
          This will immediately notify dispatch of an emergency.
          <br />
          Only use this in actual emergencies.
        </p>
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 border border-white/10 text-white/70 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
          >
            Send Alert
          </button>
        </div>
      </div>
    </Modal>
  );
}