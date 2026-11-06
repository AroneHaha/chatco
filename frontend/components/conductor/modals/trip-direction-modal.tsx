"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import SlideCommit from "@/components/ui/slide-commit";
import { useCommuterTheme } from "@/contexts/commuter-theme-context";
import { tripTerminals, type TripDirection } from "@/lib/shared/map/trip-direction";

const opposite = (direction: TripDirection): TripDirection => (direction === "FORWARD" ? "REVERSE" : "FORWARD");

/**
 * The same SlideCommit as Take a Break and SOS. Each completed slide flips
 * the direction. Calumpit → Meycauayan slides left to right; Meycauayan →
 * Calumpit is mirrored and slides right to left. The flip happens while the
 * full-width "Switched" fill is showing, so the handle then settles on the
 * side it just slid to.
 */
function DirectionSlider({ value, onChange }: { value: TripDirection; onChange: (next: TripDirection) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(280);
  // Inline slider colours can't use `light:` classes.
  const isLight = useCommuterTheme() === "light";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      <SlideCommit
        label="Slide to switch direction"
        doneLabel="Switched"
        errorLabel="Slide to try again"
        onConfirm={() => onChange(opposite(value))}
        holdMs={900}
        width={width}
        height={56}
        commitRatio={0.9}
        reverse={value === "REVERSE"}
        trackColor={isLight ? "#EEF2F7" : "#1A2540"}
        handleColor={isLight ? "#1A5FB4" : "#62A0EA"}
        successColor={isLight ? "#1A5FB4" : "#62A0EA"}
        className="conductor-duty-slider"
      />
    </div>
  );
}

interface TripDirectionModalProps {
  direction: TripDirection;
  onClose: () => void;
  /** Saves on the server; rejects with a message to show. */
  onSave: (direction: TripDirection) => Promise<void>;
}

export default function TripDirectionModal({ direction, onClose, onSave }: TripDirectionModalProps) {
  const [draft, setDraft] = useState(direction);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const changed = draft !== direction;
  const [from, to] = tripTerminals(draft);
  const close = () => {
    if (!saving) onClose();
  };

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to update trip direction.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-direction-title"
        className="relative w-full overflow-hidden rounded-t-2xl border border-white/10 bg-[#071A2E] pb-safe shadow-2xl animate-fade-in sm:max-w-sm sm:rounded-2xl light:border-gray-200 light:bg-white light:shadow-black/10"
      >
        <button
          type="button"
          onClick={close}
          disabled={saving}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#131C2E] text-white/70 transition-colors hover:bg-[#1A2540] hover:text-white light:border-gray-200 light:bg-white light:text-gray-500 light:hover:bg-gray-100 light:hover:text-gray-900"
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>

        <div className="p-6 pt-5">
          <p className="pr-10 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40 light:text-gray-500">Trip direction</p>
          <h3 id="trip-direction-title" className="mt-1.5 text-lg font-bold text-white light:text-gray-900">
            {from} → {to}
          </h3>
          <p className="mb-5 mt-1 text-sm leading-relaxed text-white/55 light:text-gray-500">
            Slide to switch the direction, then save.
          </p>

          <DirectionSlider value={draft} onChange={setDraft} />

          {changed && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-4 min-h-11 w-full rounded-xl bg-[#1A5FB4] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#164A8F] active:scale-[0.98]"
            >
              Save
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !saving && setConfirming(false)} />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="trip-direction-confirm-title"
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#071A2E] p-6 shadow-2xl animate-fade-in light:border-gray-200 light:bg-white light:shadow-black/10"
          >
            <h3 id="trip-direction-confirm-title" className="text-lg font-bold text-white light:text-gray-900">Change trip direction?</h3>
            <p className="mt-1 text-sm leading-relaxed text-white/55 light:text-gray-500">
              The unit will be set to {from} → {to}.
            </p>
            {saveError && (
              <p role="alert" className="mt-3 rounded-lg bg-red-950/90 px-3 py-2 text-xs text-red-300 light:bg-red-50 light:text-red-700">
                {saveError}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={saving}
                className="min-h-11 rounded-xl border border-white/10 bg-[#131C2E] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1A2540] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 light:border-gray-200 light:bg-white light:text-gray-900 light:hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={saving}
                className="min-h-11 rounded-xl bg-[#1A5FB4] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#164A8F] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
