import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ConductorDriver, ConductorUnit } from "@/lib/conductor/types";

interface Props {
  show: boolean;
  unit: ConductorUnit | null;
  driver: ConductorDriver | null;
  conductorName: string;
  isProcessing: boolean;
  /** Why the backend refused to start the shift (e.g. "Vehicle is assigned
   *  to another driver."). Shown here because the page behind is covered. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function StartShiftModal({
  show,
  unit,
  driver,
  conductorName,
  isProcessing,
  error = null,
  onConfirm,
  onCancel,
}: Props) {
  if (!show || !unit || !driver) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isProcessing ? onCancel : undefined}
      />
      <div className="relative w-full max-w-sm bg-[#0B1E33] light:bg-white border border-[#1C3350] light:border-gray-200 rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-6 space-y-5">
          <div className="flex justify-center">
            <CheckCircle2 size={44} strokeWidth={1.8} className="text-[#62A0EA] light:text-[#1A5FB4]" aria-hidden="true" />
          </div>

          <div className="text-center">
            <h2 className="text-white light:text-gray-900 font-bold text-lg">Confirm Shift Setup</h2>
            <p className="text-xs text-slate-400 light:text-gray-600 mt-1">
              Proceeding means your duty has officially begun.
            </p>
          </div>

          <div className="bg-[#071A2E] light:bg-gray-50 border border-[#1C3350] light:border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 light:text-gray-600">Conductor</span>
              <span className="text-white light:text-gray-900 font-semibold">{conductorName}</span>
            </div>
            <div className="h-px bg-[#1C3350] light:bg-gray-200" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 light:text-gray-600">Driver</span>
              <span className="text-white light:text-gray-900 font-semibold">{driver.name}</span>
            </div>
            <div className="h-px bg-[#1C3350] light:bg-gray-200" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 light:text-gray-600">Unit</span>
              <span className="text-white light:text-gray-900 font-semibold">{unit.unitNumber}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#071A2E] light:bg-gray-50 border border-[#1C3350] light:border-gray-200 rounded-xl px-3.5 py-2.5">
            <AlertTriangle size={16} className="shrink-0 text-slate-300 light:text-gray-700" aria-hidden="true" />
            <p className="text-[11px] text-slate-300 light:text-gray-700 font-medium">
              Action cannot be undone without admin assistance.
            </p>
          </div>

          {error && (
            <p role="alert" className="mb-3 rounded-xl border border-[#5C1F27] light:border-red-200 bg-[#2B1116] light:bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-300 light:text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 py-3 rounded-xl bg-[#10273F] light:bg-gray-100 border border-[#1C3350] light:border-gray-200 text-slate-200 light:text-gray-800 text-sm font-semibold hover:bg-[#15314F] light:hover:bg-gray-200 transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 py-3 rounded-xl bg-[#1A5FB4] text-white text-sm font-bold hover:bg-[#164A8F] transition-colors active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Starting…
                </>
              ) : (
                "Start Shift"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
