import { useState, useCallback } from "react";
import {
  validate as validateQr,
  scan as scanQr,
  QrFeedbackError,
  type ScannedCrew,
  type QrFeedbackErrorCode,
} from "@/lib/commuter/services/qr-feedback.service";

// ─── View-model ────────────────────────────────────────────────────

/**
 * The crew + shift info the feedback form needs, in the camelCase shape
 * the existing feedback page consumes (kept compatible with the legacy
 * `DriverData` interface so we don't have to rewrite the form UI).
 */
export interface FeedbackCrewData {
  /** The shift_log row ID — REQUIRED for POST /commuter/feedback (S6-T2). */
  shiftId: string;
  /** Driver UUID (may be null if backend couldn't resolve). */
  driverId: string | null;
  /** Driver display name (may be "Unknown" defensively). */
  driverName: string;
  /** Conductor UUID (may be null). */
  conductorId: string | null;
  /** Conductor display name (may be "Unknown" defensively). */
  conductorName: string;
  /** Jeepney plate (e.g. "ABC 1234"). */
  plateNumber: string;
  /** Jeepney unit number (e.g. "12"). */
  unitNumber: string | null;
}

export type ScanStatus =
  | "scanning" // camera/manual entry in progress
  | "verifying" // validate() in flight
  | "resolving" // scan() in flight
  | "resolved" // crew info ready — show feedback form
  | "error"; // validate/scan failed — show error + retry

/**
 * Stable error codes the page can branch on without parsing strings.
 * Mirrors `QrFeedbackErrorCode` from the service layer.
 */
export type ScanErrorCode = QrFeedbackErrorCode;

export interface ScanError {
  code: ScanErrorCode;
  message: string;
}

// ─── Tag presets (kept from the previous mock hook) ────────────────
const POSITIVE_TAGS = [
  "Safe Driving",
  "Polite",
  "Clean Vehicle",
  "Smooth Ride",
  "Helpful",
  "Alert",
  "Quick to Respond",
];

const NEGATIVE_TAGS = [
  "Reckless Driving",
  "Rude Behavior",
  "Dirty Vehicle",
  "Loud Music",
  "Overspeeding",
  "Rough Driving",
  "Distracted",
  "Overloading",
];

// ─── Hook ──────────────────────────────────────────────────────────

/**
 * Sprint 6 — Commuter feedback flow hook (S6-T6 scan half wired; S6-T7
 * will wire the actual submitFeedback to the real backend).
 *
 * State machine:
 *   scanning → verifying → resolving → resolved
 *                  ↓           ↓
 *                error ← ← ← ← ←  (any failure)
 *
 * The hook owns: scan status, crew data, scan error, rating/tags/comment
 * form state, and the (still-mock) submit flow. T6 wires the scan half;
 * T7 will replace `submitFeedback` with a real POST /commuter/feedback.
 */
export function useFeedback() {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("scanning");
  const [scanError, setScanError] = useState<ScanError | null>(null);
  const [crew, setCrew] = useState<FeedbackCrewData | null>(null);

  // Form state (rating + tags + comment) — kept from the original hook
  // so the existing form UI continues to work. T7 will use `crew.shiftId`
  // to submit feedback to the real backend.
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const activeTags = rating >= 4 ? POSITIVE_TAGS : NEGATIVE_TAGS;

  // ─── Scan flow ──────────────────────────────────────────────
  /**
   * Called by the QrScanner when a token is decoded (camera or manual).
   * Runs validate() → scan() and surfaces typed errors.
   */
  const handleToken = useCallback(async (token: string) => {
    setScanError(null);
    setScanStatus("verifying");
    try {
      // 1. Pre-check: signature + expiry. Cheap (no DB hit).
      await validateQr(token);
    } catch (err) {
      const code: ScanErrorCode =
        err instanceof QrFeedbackError ? err.code : "network";
      const message =
        err instanceof Error ? err.message : "QR token is not valid.";
      setScanError({ code, message });
      setScanStatus("error");
      return;
    }

    setScanStatus("resolving");
    try {
      // 2. Resolve today's driver + conductor from shift_logs.
      const scanned: ScannedCrew = await scanQr(token);
      setCrew({
        shiftId: scanned.shiftId,
        driverId: scanned.driverId,
        driverName: scanned.driverName ?? "Unknown Driver",
        conductorId: scanned.conductorId,
        conductorName: scanned.conductorName ?? "Unknown Conductor",
        plateNumber: scanned.plateNumber ?? "—",
        unitNumber: scanned.unitNumber,
      });
      // Reset form state for the new ride
      setRating(0);
      setHoverRating(0);
      setSelectedTags([]);
      setComment("");
      setIsSubmitted(false);
      setScanStatus("resolved");
    } catch (err) {
      const code: ScanErrorCode =
        err instanceof QrFeedbackError ? err.code : "network";
      const message =
        err instanceof Error
          ? err.message
          : "Unable to resolve crew from QR token.";
      setScanError({ code, message });
      setScanStatus("error");
    }
  }, []);

  /** Reset back to the scanning state — called by "Try another unit" buttons. */
  const resetForNewScan = useCallback(() => {
    setScanStatus("scanning");
    setScanError(null);
    setCrew(null);
    setRating(0);
    setHoverRating(0);
    setSelectedTags([]);
    setComment("");
    setIsSubmitted(false);
  }, []);

  // ─── Form handlers (kept from the original hook) ────────────
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSetRating = (val: number) => {
    setRating(val);
    setSelectedTags([]); // Reset tags when rating changes
  };

  // ⚠️ MOCK SUBMIT — T7 will replace this with a real POST /commuter/feedback
  // using `crew.shiftId` + `rating` + `comment`. Kept as a placeholder so
  // the existing form UI continues to function end-to-end.
  const submitFeedback = async () => {
    if (!crew || rating === 0) return;
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return {
    // scan state
    scanStatus,
    scanError,
    crew,
    handleToken,
    resetForNewScan,
    // form state
    rating,
    hoverRating,
    setHoverRating,
    handleSetRating,
    activeTags,
    selectedTags,
    toggleTag,
    comment,
    setComment,
    // submit state
    isSubmitting,
    isSubmitted,
    submitFeedback,
  };
}
