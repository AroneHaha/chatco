import { useState, useCallback } from "react";
import {
  parseUnitQr,
  scanPublic,
  QrFeedbackError,
  type ScannedCrew,
  type QrFeedbackErrorCode,
} from "@/lib/commuter/services/qr-feedback.service";
import {
  submit as submitFeedbackApi,
  FeedbackOperationError,
  type FeedbackErrorCode,
} from "@/lib/commuter/services/feedback.service";

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

/**
 * Inline error from the feedback SUBMIT call (POST /commuter/feedback).
 *
 * Mirrors the scan error shape so the page can render both with the same
 * helper. `already_submitted` (409) is the common case — the commuter
 * already rated this shift today — and the page surfaces a friendly message
 * + offers "Scan another unit".
 */
export interface SubmitError {
  code: FeedbackErrorCode;
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

// Conductor-specific presets — the conductor handles fares/change + courtesy,
// so the tags differ from the driver's (which are about driving).
const POSITIVE_TAGS_CONDUCTOR = [
  "Polite",
  "Honest Change",
  "Helpful",
  "Accurate Fare",
  "Respectful",
  "Efficient",
];

const NEGATIVE_TAGS_CONDUCTOR = [
  "Rude Behavior",
  "Wrong Change",
  "Overcharging",
  "Unhelpful",
  "Ignored Me",
  "Slow Service",
];

// ─── Hook ──────────────────────────────────────────────────────────

/**
 * Sprint 6 — Commuter feedback flow hook (S6-T6 scan + S6-T7 submit, both
 * wired to the real backend).
 *
 * State machine:
 *   scanning → resolving → resolved → (submit) → submitted
 *        ↓         ↓                      ↓
 *      error ← ← ←  (any failure)      submitError (inline)
 *
 * The hook owns: scan status, crew data, scan error, rating/tags/comment
 * form state, and the submit flow. The scan half parses the permanent
 * unit-QR JSON (printed inside the jeepney) and resolves today's crew via
 * POST /qr/scan-public. The submit half POSTs { shift_id, rating, comment?,
 * category? } to /commuter/feedback — the backend derives driver_id +
 * conductor_id + vehicle_id from the shift_log, so feedback lands on BOTH
 * the driver's and conductor's profiles for today's ride on that unit.
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
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);

  // Conductor rating — a SEPARATE score from the driver's, mirroring the
  // driver form state (star + preset tags + optional comment).
  const [conductorRating, setConductorRating] = useState(0);
  const [conductorHoverRating, setConductorHoverRating] = useState(0);
  const [conductorSelectedTags, setConductorSelectedTags] = useState<string[]>([]);
  const [conductorComment, setConductorComment] = useState("");

  const activeTags = rating >= 4 ? POSITIVE_TAGS : NEGATIVE_TAGS;
  const activeConductorTags = conductorRating >= 4 ? POSITIVE_TAGS_CONDUCTOR : NEGATIVE_TAGS_CONDUCTOR;

  // ─── Scan flow ──────────────────────────────────────────────
  /**
   * Called by the QrScanner when the permanent unit-QR is decoded (camera
   * or manual). Parses the QR's JSON payload to extract the vehicleId, then
   * resolves today's driver + conductor via POST /qr/scan-public.
   *
   * No signature/expiry check — the QR is permanent by design. The crew
   * shown depends on who is assigned to the unit TODAY (the daily
   * assignment recorded when the conductor logged in for the day).
   */
  const handleToken = useCallback(async (raw: string) => {
    setScanError(null);

    // 1. Parse the permanent unit-QR JSON → extract vehicleId.
    //    Fail fast (no network) if it isn't a Chatco unit-QR.
    let vehicleId: string;
    try {
      vehicleId = parseUnitQr(raw);
    } catch (err) {
      const code: ScanErrorCode =
        err instanceof QrFeedbackError ? err.code : "invalid_format";
      const message =
        err instanceof Error ? err.message : "This QR is not a Chatco unit QR.";
      setScanError({ code, message });
      setScanStatus("error");
      return;
    }

    // 2. Resolve today's driver + conductor from shift_logs.
    setScanStatus("resolving");
    try {
      const scanned: ScannedCrew = await scanPublic(vehicleId);
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
      setConductorRating(0);
      setConductorHoverRating(0);
      setConductorSelectedTags([]);
      setConductorComment("");
      setIsSubmitted(false);
      setScanStatus("resolved");
    } catch (err) {
      const code: ScanErrorCode =
        err instanceof QrFeedbackError ? err.code : "network";
      const message =
        err instanceof Error
          ? err.message
          : "Unable to resolve crew for this unit.";
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
    setConductorRating(0);
    setConductorHoverRating(0);
    setConductorSelectedTags([]);
    setConductorComment("");
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

  // Conductor handlers — mirror the driver handlers exactly.
  const toggleConductorTag = (tag: string) => {
    setConductorSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSetConductorRating = (val: number) => {
    setConductorRating(val);
    setConductorSelectedTags([]); // Reset tags when rating changes
  };

  /**
   * Submit the commuter's feedback to POST /api/v1/commuter/feedback.
   *
   * Sends { shift_id, rating, comment?, category? }. The backend derives
   * driver_id + conductor_id + vehicle_id from the shift_log row (never
   * trusts client input for those), so the feedback is stamped to BOTH the
   * driver's and conductor's profiles — the daily crew registered on the
   * unit for today.
   *
   * `category` carries the selected tag labels (comma-joined, truncated to
   * the backend's max:50) so the tag selection isn't lost.
   *
   * On 201 → flip to the success state (countdown back to /dashboard).
   * On 409 (already_submitted) → inline error; the commuter can scan
   * another unit. On 422 → inline validation message. On 401 → inline
   * "session expired" (the page's scan-error helper already handles
   * redirect-worthy codes for the scan half; submit errors surface inline).
   */
  const submitFeedback = async () => {
    // Both the driver AND the conductor must be rated (required).
    if (!crew || rating === 0 || conductorRating === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitFeedbackApi({
        shiftId: crew.shiftId,
        rating,
        comment: comment.trim() || undefined,
        category:
          selectedTags.length > 0
            ? selectedTags.join(", ").slice(0, 50)
            : undefined,
        conductorRating,
        conductorComment: conductorComment.trim() || undefined,
        conductorCategory:
          conductorSelectedTags.length > 0
            ? conductorSelectedTags.join(", ").slice(0, 50)
            : undefined,
      });
      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof FeedbackOperationError) {
        setSubmitError({ code: err.code, message: err.message });
      } else {
        setSubmitError({
          code: "network",
          message: err instanceof Error ? err.message : "Unable to submit feedback.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
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
    // conductor form state (mirrors the driver form)
    conductorRating,
    conductorHoverRating,
    setConductorHoverRating,
    handleSetConductorRating,
    activeConductorTags,
    conductorSelectedTags,
    toggleConductorTag,
    conductorComment,
    setConductorComment,
    // submit state
    isSubmitting,
    isSubmitted,
    submitError,
    submitFeedback,
  };
}
