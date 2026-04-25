"use client";

import { Modal } from "@/components/admin/ui/modal";

interface ClearCacheModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ClearCacheModal({
  isOpen,
  onClose,
  onConfirm,
}: ClearCacheModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center text-center pt-2">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h3 className="text-white font-bold text-base mb-2">
          Clear App Cache?
        </h3>
        <p className="text-white/40 text-sm leading-relaxed mb-6">
          This will remove temporary cached data to free up space.
          <br />
          Your transactions, ratings, and shift history will <span className="text-white/60 font-semibold">not</span> be affected.
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
            className="flex-1 bg-red-500/90 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-500 transition-colors"
          >
            Clear Cache
          </button>
        </div>
      </div>
    </Modal>
  );
}