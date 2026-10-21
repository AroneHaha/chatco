import type { QrFeedbackErrorCode } from "@/lib/commuter/services/qr-feedback.service";

// Title + message for a failed feedback-QR scan, switched on the stable
// error codes. Shared by the /feedback page and the nav-bar scan modal.

export function errorTitleForCode(code: QrFeedbackErrorCode): string {
  switch (code) {
    case "invalid_format":
      return "Not a Unit QR";
    case "invalid_signature":
      return "Invalid QR";
    case "expired":
      return "QR Expired";
    case "malformed":
      return "Unreadable QR";
    case "no_crew_today":
      return "No Active Crew";
    case "forbidden":
      return "Not Allowed";
    case "unauthenticated":
      return "Session Expired";
    case "validation":
      return "Invalid Token";
    case "network":
    default:
      return "Connection Error";
  }
}

export function errorMessageForCode(code: QrFeedbackErrorCode, fallback: string): string {
  switch (code) {
    case "invalid_format":
      return "This QR is not a Chatco unit QR. Scan the feedback QR posted inside the jeepney.";
    case "invalid_signature":
      return "This QR is invalid or has been tampered with. Ask the operator to issue a new one.";
    case "expired":
      return "This QR has expired. Ask the operator to issue a fresh one for this unit.";
    case "malformed":
      return "The QR couldn't be read. Hold the camera steady over the QR and scan again.";
    case "no_crew_today":
      return "This unit has no active crew today. Feedback is only available during or after a ride.";
    case "forbidden":
      return "Only commuter accounts can submit ride feedback.";
    case "unauthenticated":
      return "Your session has expired. Please log in again.";
    case "validation":
      return fallback || "The QR token didn't pass validation.";
    case "network":
    default:
      return "We couldn't reach the backend. Check your connection and try again.";
  }
}
