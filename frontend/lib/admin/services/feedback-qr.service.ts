/**
 * Admin Feedback-QR service (S6-T6).
 *
 * Calls the Next.js proxy route (which forwards to Laravel with the
 * httpOnly `chatco_session` cookie) — never calls Laravel directly.
 *
 *   POST /api/qr/generate  → generate(vehicleId)
 *
 * Responsibilities:
 *   - Map snake_case Laravel envelopes → camelCase view-models the UI uses
 *   - Translate backend 422 validation errors into typed exceptions the
 *     UI can branch on (field-level errors for the vehicle picker)
 *   - Translate 403 (non-admin) + 401 (session expired) into typed codes
 *   - Keep the page component free of API/transport concerns
 *
 * Mirrors the pattern established by lib/admin/services/vehicle.service.ts.
 */

import { api, ApiError } from "@/lib/api/client";
import { ADMIN_API } from "@/lib/admin/endpoints";

// ─── Raw backend shapes ─────────────────────────────────────────────

/**
 * The `data` payload returned by POST /api/v1/qr/generate (QrTokenService::issue()).
 *
 *   token       — the full signed token string (`base64url(payload) + '.' + hex(HMAC)`)
 *   payload     — the decoded payload object (v, vehicle_id, issued_at, expires_at)
 *   signature   — the hex HMAC-SHA256 signature (separate from the token for inspection)
 *   expires_at  — ISO-8601 timestamp when the token expires (issued_at + TTL)
 */
interface RawGeneratedQr {
  token: string;
  payload: {
    v: number;
    vehicle_id: string;
    issued_at: string;
    expires_at: string;
  };
  signature: string;
  expires_at: string;
}

/** Laravel ApiResponse envelope. */
interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  errors: Record<string, string[]> | null;
  meta: unknown;
}

// ─── Frontend view-model ───────────────────────────────────────────

/**
 * The generated QR token + metadata, in the camelCase shape the admin
 * page consumes.
 *
 * `token` is the only field the QR renderer needs — it encodes everything
 * else. `expiresAt` is surfaced separately so the page can show a countdown
 * + disable download/print past expiry. `issuedAt` is included for the
 * "Issued: ..." label. `vehicleId` is included for display + regen flow.
 */
export interface GeneratedQr {
  /** The full signed token string — this is what gets rendered as a QR. */
  token: string;
  vehicleId: string;
  /** ISO-8601 timestamp the token was issued. */
  issuedAt: string;
  /** ISO-8601 timestamp the token expires. */
  expiresAt: string;
}

// ─── Typed errors ───────────────────────────────────────────────────

export type QrGenerateErrorCode =
  /** 422 — vehicle_id missing, not a string, or doesn't exist in the DB */
  | "validation"
  /** 403 — caller is not an admin */
  | "forbidden"
  /** 401 — session expired; caller should redirect to login */
  | "unauthenticated"
  /** 5xx / network failure / unexpected error */
  | "network";

/**
 * Thrown by `generate()` on any non-success response.
 *
 * Carries a stable `code` so the UI can branch without parsing strings,
 * plus an optional `errors` map for 422 field-specific messages
 * (`{ vehicle_id: ["The selected vehicle does not exist."] }`).
 */
export class QrGenerateError extends Error {
  constructor(
    public code: QrGenerateErrorCode,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "QrGenerateError";
  }
}

// ─── Mapper ─────────────────────────────────────────────────────────

function mapGeneratedQr(raw: RawGeneratedQr): GeneratedQr {
  return {
    token: raw.token,
    vehicleId: raw.payload.vehicle_id,
    issuedAt: raw.payload.issued_at,
    expiresAt: raw.expires_at,
  };
}

// ─── Service ────────────────────────────────────────────────────────

/**
 * Issue a signed unit-QR for a vehicle.
 *
 * @param vehicleId  The UUID of the vehicle (jeepney unit) to issue a QR for.
 * @returns          The generated token + metadata, ready for QR rendering.
 *
 * @throws {QrGenerateError} 401/403/422/5xx — see `code` for the specific case.
 */
export async function generate(vehicleId: string): Promise<GeneratedQr> {
  try {
    const response = await api.post<ApiResponseEnvelope<RawGeneratedQr>>(
      ADMIN_API.feedbackQr.generate,
      { vehicle_id: vehicleId }
    );
    return mapGeneratedQr(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      const message =
        (err.body as { message?: string } | null)?.message ??
        "Failed to generate QR token.";
      const errors = (err.body as { errors?: Record<string, string[]> } | null)
        ?.errors ?? undefined;

      switch (err.status) {
        case 422:
          throw new QrGenerateError("validation", message, errors);
        case 403:
          throw new QrGenerateError("forbidden", message);
        case 401:
          throw new QrGenerateError("unauthenticated", message);
        default:
          throw new QrGenerateError("network", message);
      }
    }
    // NetworkError or anything else unexpected
    throw new QrGenerateError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}
