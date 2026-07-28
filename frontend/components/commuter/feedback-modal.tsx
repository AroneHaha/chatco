"use client";

import { useState, useEffect } from "react";
import type { CommuterPayment } from "@/lib/commuter/services/payment.service";
import { formatPeso } from "@/lib/utils/display";
import {
  submit,
  FeedbackOperationError,
  type Feedback,
  type FeedbackErrorCode,
} from "@/lib/commuter/services/feedback.service";

// ─── Props ───────────────────────────────────────────────────────────

interface FeedbackModalProps {
  /** The ride row that opened the modal — supplies shiftId + display context. */
  ride: CommuterPayment;
  /**
   * Existing feedback for this ride's shift, if any. When present, the modal
   * opens in READ-ONLY mode (shows the rating + comment the commuter already
   * submitted). When absent, the modal opens in SUBMIT mode.
   */
  existingFeedback?: Feedback | null;
  /** Called when the modal should close (backdrop click, X, or after submit). */
  onClose: () => void;
  /**
   * Called after a successful submit (HTTP 201). The parent uses the returned
   * Feedback to mark the ride row as "Feedback submitted" and refresh its
   * {shiftId → feedback} map.
   */
  onSubmitted: (feedback: Feedback) => void;
  /**
   * Called when the backend returns 409 "already submitted" (e.g. feedback
   * was created in another tab/session since the map was built). The parent
   * should refetch its feedback map and re-open this ride in read-only mode.
   */
  onAlreadySubmitted: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────

/**
 * Comment character cap. Matches the backend's StoreFeedbackRequest rule
 * (`comment → nullable|string|max:2000`) so the client never sends a payload
 * the server would reject as 422. (The S6-T7 spec mentioned 1000; the actual
 * backend contract is 2000 — we conform to the real backend to avoid 422s.)
 */
const COMMENT_MAX = 2000;

type Mode = "submit" | "view";

interface InlineError {
  code: FeedbackErrorCode;
  message: string;
}

// ─── Star picker ─────────────────────────────────────────────────────

interface StarPickerProps {
  value: number;
  hover: number;
  interactive: boolean;
  onChange?: (v: number) => void;
  onHover?: (v: number) => void;
}

function StarPicker({ value, hover, interactive, onChange, onHover }: StarPickerProps) {
  const display = hover || value;
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= display;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => interactive && onHover?.(star)}
            onMouseLeave={() => interactive && onHover?.(0)}
            onFocus={() => interactive && onHover?.(star)}
            onBlur={() => interactive && onHover?.(0)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            aria-pressed={value === star}
            className={`${
              interactive ? "cursor-pointer hover:scale-110" : "cursor-default"
            } transition-transform p-0.5`}
          >
            <svg
              className={`w-8 h-8 sm:w-9 sm:h-9 ${
                filled ? "text-amber-400" : "text-gray-200"
              }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────

export default function FeedbackModal({
  ride,
  existingFeedback,
  onClose,
  onSubmitted,
  onAlreadySubmitted,
}: FeedbackModalProps) {
  const mode: Mode = existingFeedback ? "view" : "submit";

  const [rating, setRating] = useState(existingFeedback?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingFeedback?.comment ?? "");
  // Conductor rating — a separate score from the driver's (required to submit).
  const [conductorRating, setConductorRating] = useState(existingFeedback?.conductorRating ?? 0);
  const [conductorHoverRating, setConductorHoverRating] = useState(0);
  const [conductorComment, setConductorComment] = useState(existingFeedback?.conductorComment ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<InlineError | null>(null);

  // If the parent swaps the ride/existingFeedback (e.g. after a refetch turns
  // a submit modal into a read-only one), reset local state to match.
  useEffect(() => {
    setRating(existingFeedback?.rating ?? 0);
    setHoverRating(0);
    setComment(existingFeedback?.comment ?? "");
    setConductorRating(existingFeedback?.conductorRating ?? 0);
    setConductorHoverRating(0);
    setConductorComment(existingFeedback?.conductorComment ?? "");
    setError(null);
  }, [existingFeedback, ride.id]);

  const canSubmit =
    mode === "submit" &&
    rating >= 1 && rating <= 5 &&
    conductorRating >= 1 && conductorRating <= 5 &&
    comment.length <= COMMENT_MAX && conductorComment.length <= COMMENT_MAX &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !ride.shiftId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const feedback = await submit({
        shiftId: ride.shiftId,
        rating,
        comment: comment.trim() || undefined,
        conductorRating,
        conductorComment: conductorComment.trim() || undefined,
      });
      onSubmitted(feedback);
    } catch (err) {
      if (err instanceof FeedbackOperationError) {
        setError({ code: err.code, message: err.message });
        // 409 → the parent should refetch its feedback map (the row may have
        // been submitted in another session) and flip this modal to read-only.
        if (err.code === "already_submitted") {
          onAlreadySubmitted();
        }
      } else {
        setError({
          code: "network",
          message: err instanceof Error ? err.message : "Unable to submit feedback.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col pb-safe" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#071A2E]">
              {mode === "view" ? "Your Feedback" : "Leave Feedback"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {ride.pickupName} → {ride.dropoffName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Ride context card */}
          <div className="bg-[#F0F7FF] rounded-xl p-3 space-y-1.5 text-xs">
            {ride.conductorName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Conductor</span>
                <span className="font-medium text-[#071A2E]">{ride.conductorName}</span>
              </div>
            )}
            {ride.unitNumber && (
              <div className="flex justify-between">
                <span className="text-gray-500">Unit</span>
                <span className="font-medium text-[#071A2E]">{ride.unitNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Fare</span>
              <span className="font-bold text-[#071A2E]">{formatPeso(ride.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ride date</span>
              <span className="font-medium text-[#071A2E]">{formatDateTime(ride.createdAt)}</span>
            </div>
          </div>

          {/* Read-only view: existing feedback metadata */}
          {mode === "view" && existingFeedback && (
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span>Submitted on {formatDateTime(existingFeedback.createdAt)}</span>
            </div>
          )}

          {/* Star rating */}
          <div>
            <label className="block text-xs font-semibold text-[#071A2E] mb-2">
              Rating <span className="text-red-500">*</span>
            </label>
            <StarPicker
              value={rating}
              hover={hoverRating}
              interactive={mode === "submit"}
              onChange={setRating}
              onHover={setHoverRating}
            />
            {mode === "submit" && rating === 0 && (
              <p className="text-[11px] text-gray-400 mt-1.5">Tap a star to rate your ride (1–5).</p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-semibold text-[#071A2E] mb-2">
              Comment <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={COMMENT_MAX}
              readOnly={mode === "view"}
              disabled={mode === "view"}
              rows={4}
              placeholder={
                mode === "view"
                  ? "No comment was left."
                  : "Tell us about your ride…"
              }
              className={`w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#071A2E] placeholder:text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-[#1A5FB4]/30 focus:border-[#1A5FB4] ${
                mode === "view" ? "bg-gray-50 cursor-default" : "bg-white"
              }`}
            />
            <div className="flex justify-end mt-1">
              <span className={`text-[11px] ${comment.length > COMMENT_MAX ? "text-red-500" : "text-gray-400"}`}>
                {comment.length} / {COMMENT_MAX}
              </span>
            </div>
          </div>

          {/* Conductor star rating — a separate score from the driver's */}
          <div>
            <label className="block text-xs font-semibold text-[#071A2E] mb-2">
              Conductor Rating <span className="text-red-500">*</span>
            </label>
            <StarPicker
              value={conductorRating}
              hover={conductorHoverRating}
              interactive={mode === "submit"}
              onChange={setConductorRating}
              onHover={setConductorHoverRating}
            />
            {mode === "submit" && conductorRating === 0 && (
              <p className="text-[11px] text-gray-400 mt-1.5">Tap a star to rate the conductor (1–5).</p>
            )}
          </div>

          {/* Conductor comment */}
          <div>
            <label className="block text-xs font-semibold text-[#071A2E] mb-2">
              Conductor Comment <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={conductorComment}
              onChange={(e) => setConductorComment(e.target.value)}
              maxLength={COMMENT_MAX}
              readOnly={mode === "view"}
              disabled={mode === "view"}
              rows={4}
              placeholder={
                mode === "view"
                  ? "No comment was left."
                  : "Tell us about the conductor…"
              }
              className={`w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#071A2E] placeholder:text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-[#1A5FB4]/30 focus:border-[#1A5FB4] ${
                mode === "view" ? "bg-gray-50 cursor-default" : "bg-white"
              }`}
            />
            <div className="flex justify-end mt-1">
              <span className={`text-[11px] ${conductorComment.length > COMMENT_MAX ? "text-red-500" : "text-gray-400"}`}>
                {conductorComment.length} / {COMMENT_MAX}
              </span>
            </div>
          </div>

          {/* Inline error */}
          {error && (
            <div
              className={`rounded-xl p-3 text-xs font-medium flex items-start gap-2 ${
                error.code === "already_submitted"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-600"
              }`}
              role="alert"
            >
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span>{error.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {mode === "view" ? "Close" : "Cancel"}
          </button>
          {mode === "submit" && (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#155a9c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Feedback"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
