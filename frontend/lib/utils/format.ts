/**
 * Shared formatting utilities.
 *
 * This file is the SINGLE SOURCE OF TRUTH for all formatting functions.
 * Previously duplicated/inlined in:
 *   - lib/fare-calculator.ts (formatCurrency)
 *   - lib/conductor-shift-history.ts (formatLogTime, formatLogDate)
 *   - lib/static-conductor-data.ts (formatLogTime)
 *   - components/commuter/modals/payment-history-modal.tsx (formatDateTime)
 *   - components/commuter/modals/share-ride-modal.tsx (formatTime)
 *   - components/commuter/modals/sos-modal.tsx (formatTimer)
 *   - components/conductor/modals/sos-confirm-modal.tsx (formatTimer)
 *
 * All consumers should import from "@/lib/utils/format".
 */

// ─── Currency ────────────────────────────────────────────────────────

/** Format a number as Philippine peso string */
export function formatCurrency(amount: number): string {
  return `\u20B1${amount.toFixed(2)}`;
}

/** Safe format — handles NaN/null/undefined gracefully */
export function fmt(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return "0".padStart(decimals + 2, "0." + "0".repeat(decimals));
  return value.toFixed(decimals);
}

// ─── Date & Time ─────────────────────────────────────────────────────

/** Format an ISO string into a full date+time string (e.g., "May 14, 2026, 8:15 AM") */
export function formatDateTime(iso: string): {
  date: string;
  time: string;
  full: string;
} {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return { date, time, full: `${date}, ${time}` };
}

/** Format an ISO string for log display (same as the old formatLogTime) */
export function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format an ISO string as date only */
export function formatLogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format seconds into mm:ss (for timers) */
export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Format seconds into "Xh YYm" duration string */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}
