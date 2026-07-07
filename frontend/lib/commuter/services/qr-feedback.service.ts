/**
 * Commuter Feedback-QR service (S6-T6 scan half).
 *
 * Calls the Next.js proxy routes (which forward to Laravel with the
 * httpOnly `chatco_session` cookie) — never calls Laravel directly.
 *
 *   POST /api/qr/validate  → validate(token)
 *   POST /api/qr/scan      → scan(token)
 *
 * Responsibilities:
 *   - Map snake_case Laravel envelopes → camelCase view-models the UI uses
 *   - Translate the backend's 422 messages ("Invalid signature", "Token
 *     expired", "Malformed token") into typed error codes so the scanner
 *     UI can branch without parsing strings
 *   - Translate the 404 "no active crew today" into a typed code so the
 *     UI can show a friendly message + offer a retry
 *   - Keep the scanner component free of API/transport concerns
 *
 * Mirrors the pattern established by lib/commuter/services/profile.service.ts.
 */

import { api, ApiError } from "@/lib/api/client";
import { COMMUTER_API } from "@/lib/commuter/endpoints";

// ─── Raw backend shapes ─────────────────────────────────────────────

/** `data` payload returned by POST /api/v1/qr/validate (QrController::verify). */
interface RawValidatedQr {
  valid: boolean;
  vehicle_id: string;
  issued_at: string;
  expires_at: string;
}

/**
 * `data` payload returned by POST /api/v1/qr/scan (QrController::scan).
 *
 * `shift_id` is the anchor the subsequent POST /commuter/feedback consumes.
 * Driver + conductor fields may be null if a shift exists for the vehicle
 * today but the crew wasn't fully assigned (defensive — backend currently
 * always returns names when a shift_log row exists, but we don't trust it).
 */
interface RawScannedCrew {
  shift_id: string;
  vehicle_id: string;
  unit_number: string | null;
  plate_number: string | null;
  driver_id: string | null;
  driver_name: string | null;
  conductor_id: string | null;
  conductor_name: string | null;
}

/** Laravel ApiResponse envelope. */
interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  errors: Record<string, string[]> | null;
  meta: unknown;
}

// ─── Frontend view-models ──────────────────────────────────────────

/**
 * Pre-check result from `validate()`. The commuter scanner uses this to
 * fail fast on tampered/expired tokens before calling the heavier `scan()`.
 */
export interface ValidatedQr {
  valid: true;
  vehicleId: string;
  issuedAt: string;
  expiresAt: string;
}

/**
 * Crew resolution result from `scan()`. The commuter feedback page uses
 * this to display the driver + conductor the commuter is about to rate,
 * and to obtain the `shiftId` needed for the subsequent feedback submission.
 */
export interface ScannedCrew {
  shiftId: string;
  vehicleId: string;
  unitNumber: string | null;
  plateNumber: string | null;
  driverId: string | null;
  driverName: string | null;
  conductorId: string | null;
  conductorName: string | null;
}

// ─── Typed errors ───────────────────────────────────────────────────

export type QrFeedbackErrorCode =
  /** 422 — token signature didn't match (HMAC mismatch / payload tampered) */
  | "invalid_signature"
  /** 422 — token's expires_at is in the past */
  | "expired"
  /** 422 — token wasn't in `base64url.signature` format / payload wasn't JSON */
  | "malformed"
  /** The scanned QR isn't a Chatco unit-QR (wrong format / wrong payload) */
  | "invalid_format"
  /** 422 — generic validation (e.g. token field missing entirely) */
  | "validation"
  /** 404 — token is valid but no shift_logs row exists for the vehicle today */
  | "no_crew_today"
  /** 403 — caller is not a commuter */
  | "forbidden"
  /** 401 — session expired; caller should redirect to login */
  | "unauthenticated"
  /** 5xx / network failure / unexpected error */
  | "network";

/**
 * Thrown by `validate()` and `scan()` on any non-success response.
 *
 * Carries a stable `code` so the scanner UI can branch:
 *   - "invalid_signature" / "expired" / "malformed" → "This QR is invalid
 *     or has been tampered with. Ask the admin for a new one."
 *   - "no_crew_today" → "This unit has no active crew today. Feedback is
 *     only available during/after a ride."
 *   - "unauthenticated" → redirect to /login
 *   - "network" → generic retry prompt
 */
export class QrFeedbackError extends Error {
  constructor(
    public code: QrFeedbackErrorCode,
    message: string
  ) {
    super(message);
    this.name = "QrFeedbackError";
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Map a Laravel 422 message string → typed error code.
 *
 * The backend (`QrTokenService::verify()`) throws `QrTokenException` with
 * one of these exact message strings:
 *   - "Malformed token"       (split failed / base64 decode failed)
 *   - "Malformed payload"     (base64 decoded but JSON parse failed)
 *   - "Invalid payload"       (JSON parsed but missing required fields)
 *   - "Invalid signature"     (HMAC mismatch — tampered)
 *   - "Token expired"         (expires_at is in the past)
 *
 * Anything else falls back to "validation" (e.g. the `token` field itself
 * was missing from the request body).
 */
function classifyValidationMessage(message: string): QrFeedbackErrorCode {
  const lower = message.toLowerCase();
  if (lower.includes("signature")) return "invalid_signature";
  if (lower.includes("expired")) return "expired";
  if (lower.includes("malformed")) return "malformed";
  return "validation";
}

// ─── Service ────────────────────────────────────────────────────────

/**
 * Pre-check a scanned token's signature + expiry WITHOUT resolving the crew.
 *
 * Use this before `scan()` to fail fast on tampered/expired tokens — the
 * validate path doesn't hit the shift_logs table, so it's cheaper and
 * avoids surfacing a 404 (no-crew-today) for a token that's also invalid.
 *
 * @throws {QrFeedbackError} 401/403/422/5xx — see `code` for the specific case.
 */
export async function validate(token: string): Promise<ValidatedQr> {
  try {
    const response = await api.post<ApiResponseEnvelope<RawValidatedQr>>(
      COMMUTER_API.feedbackQr.validate,
      { token }
    );
    return {
      valid: true,
      vehicleId: response.data.vehicle_id,
      issuedAt: response.data.issued_at,
      expiresAt: response.data.expires_at,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      const message =
        (err.body as { message?: string } | null)?.message ??
        "QR token is not valid.";

      switch (err.status) {
        case 422:
          throw new QrFeedbackError(classifyValidationMessage(message), message);
        case 403:
          throw new QrFeedbackError("forbidden", message);
        case 401:
          throw new QrFeedbackError("unauthenticated", message);
        default:
          throw new QrFeedbackError("network", message);
      }
    }
    throw new QrFeedbackError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Verify the token AND resolve today's driver + conductor from shift_logs.
 *
 * Returns the `shiftId` needed for the subsequent POST /commuter/feedback.
 *
 * Recommended flow: call `validate()` first; if it succeeds, call `scan()`
 * to get the crew. If `validate()` fails with `invalid_signature`/`expired`/
 * `malformed`, skip `scan()` — the token is unusable.
 *
 * @throws {QrFeedbackError}
 *   - 422 → `invalid_signature` | `expired` | `malformed` | `validation`
 *   - 404 → `no_crew_today` (token valid but no shift_logs row for vehicle today)
 *   - 403 → `forbidden` (non-commuter)
 *   - 401 → `unauthenticated`
 *   - 5xx → `network`
 */
export async function scan(token: string): Promise<ScannedCrew> {
  try {
    const response = await api.post<ApiResponseEnvelope<RawScannedCrew>>(
      COMMUTER_API.feedbackQr.scan,
      { token }
    );
    return {
      shiftId: response.data.shift_id,
      vehicleId: response.data.vehicle_id,
      unitNumber: response.data.unit_number,
      plateNumber: response.data.plate_number,
      driverId: response.data.driver_id,
      driverName: response.data.driver_name,
      conductorId: response.data.conductor_id,
      conductorName: response.data.conductor_name,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      const message =
        (err.body as { message?: string } | null)?.message ??
        "Unable to resolve crew from QR token.";

      switch (err.status) {
        case 422:
          throw new QrFeedbackError(classifyValidationMessage(message), message);
        case 404:
          throw new QrFeedbackError("no_crew_today", message);
        case 403:
          throw new QrFeedbackError("forbidden", message);
        case 401:
          throw new QrFeedbackError("unauthenticated", message);
        default:
          throw new QrFeedbackError("network", message);
      }
    }
    throw new QrFeedbackError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

// ─── Permanent unit-QR (no signature/expiry) ────────────────────────

/**
 * Shape of the JSON payload encoded in the PERMANENT unit-QR printed inside
 * each jeepney. Built by the admin Fleet Management modal from the vehicle's
 * immutable identifiers — it NEVER changes for a given unit, so the printed
 * QR is good for the life of the unit.
 */
interface UnitQrPayload {
  chatco: "unit-qr";
  v: number;
  vehicleId: string;
  unitNumber?: string;
  plateNumber?: string;
}

/**
 * Parse a raw scanned string and decide whether it's a Chatco permanent
 * unit-QR. Returns the extracted `vehicleId` on success.
 *
 * @throws {QrFeedbackError} `invalid_format` if the string isn't JSON, or
 *   isn't a `{chatco:"unit-qr", vehicleId}` payload. The commuter UI uses
 *   this to show "This isn't a Chatco unit QR" without hitting the network.
 */
export function parseUnitQr(raw: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new QrFeedbackError(
      "invalid_format",
      "This QR is not a Chatco unit QR."
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Record<string, unknown>).chatco !== "unit-qr" ||
    typeof (parsed as Record<string, unknown>).vehicleId !== "string" ||
    !(parsed as Record<string, unknown>).vehicleId
  ) {
    throw new QrFeedbackError(
      "invalid_format",
      "This QR is not a Chatco unit QR."
    );
  }

  return (parsed as UnitQrPayload).vehicleId;
}

/**
 * Resolve today's driver + conductor for a vehicle from its PERMANENT unit-QR.
 *
 * The commuter scans the printed QR → the frontend calls `parseUnitQr()` to
 * extract the `vehicleId` → calls this function with it. The backend looks up
 * TODAY's latest shift_log for that vehicle (the daily driver+conductor
 * assignment recorded when the conductor logged in for the day) and returns
 * the crew + the `shiftId` needed for POST /commuter/feedback.
 *
 * No signature/expiry check — the QR is permanent by design. The crew shown
 * depends entirely on who is assigned to the unit TODAY (the daily
 * assignment model), not on who was assigned when the QR was printed.
 *
 * @throws {QrFeedbackError}
 *   - 404 → `no_crew_today` (no shift_logs row for this vehicle today)
 *   - 422 → `validation` (vehicle_id missing / not a UUID / doesn't exist)
 *   - 403 → `forbidden` (non-commuter)
 *   - 401 → `unauthenticated`
 *   - 5xx → `network`
 */
export async function scanPublic(vehicleId: string): Promise<ScannedCrew> {
  try {
    const response = await api.post<ApiResponseEnvelope<RawScannedCrew>>(
      COMMUTER_API.feedbackQr.scanPublic,
      { vehicle_id: vehicleId }
    );
    return {
      shiftId: response.data.shift_id,
      vehicleId: response.data.vehicle_id,
      unitNumber: response.data.unit_number,
      plateNumber: response.data.plate_number,
      driverId: response.data.driver_id,
      driverName: response.data.driver_name,
      conductorId: response.data.conductor_id,
      conductorName: response.data.conductor_name,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      const message =
        (err.body as { message?: string } | null)?.message ??
        "Unable to resolve crew for this unit.";

      switch (err.status) {
        case 404:
          throw new QrFeedbackError("no_crew_today", message);
        case 422:
          throw new QrFeedbackError("validation", message);
        case 403:
          throw new QrFeedbackError("forbidden", message);
        case 401:
          throw new QrFeedbackError("unauthenticated", message);
        default:
          throw new QrFeedbackError("network", message);
      }
    }
    throw new QrFeedbackError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}
