"use client";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm mb-16 sm:mb-0">
      <div className="relative w-full max-w-md bg-[#0F2135] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all z-10"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="p-6 overflow-y-auto flex-1">
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
        </div>
      </div>
    </div>
  );
}