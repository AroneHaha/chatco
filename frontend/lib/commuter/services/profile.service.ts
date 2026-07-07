/**
 * Client-side commuter profile service.
 *
 * Calls Next.js proxy routes (which forward to Laravel with the httpOnly
 * `chatco_session` cookie) — never calls Laravel directly from the browser.
 * This keeps the Sanctum bearer token server-side only and avoids CORS.
 *
 *   GET  /api/commuter/profile          -> getProfile()
 *   PUT  /api/commuter/profile          -> updateProfile()
 *   POST /api/commuter/change-password  -> changePassword()
 *
 * Responsibilities:
 *   - Map snake_case Laravel envelopes → camelCase view-models the UI uses
 *   - Translate backend error codes into typed exceptions the UI can branch on
 *   - Keep the page component free of API/transport concerns
 *
 * Error handling pattern matches lib/commuter/services/hail.service.ts:
 *   - `ApiError` (from the shared API client) is re-thrown for non-validation
 *     cases (404, 502, etc.) so the hook can surface a generic message
 *   - For password change, 422 errors are converted to a typed
 *     `PasswordChangeError` carrying a stable `code` + `field` so the UI can
 *     highlight the offending input
 */

import { api, ApiError } from "@/lib/api/client";
import { COMMUTER_API } from "@/lib/commuter/endpoints";
import type { AccountStatus, CommuterProfile, CommuterType } from "@/types";

// ─── Raw backend shapes ──────────────────────────────────────────────

/**
 * Successful response envelope (matches App\Http\ApiResponse trait).
 *
 * Note: Laravel's ValidationException handler also wraps 422s in this shape
 * (see bootstrap/app.php), so `errors` is populated on validation failures
 * and `data` is null.
 */
interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  errors: Record<string, string[]> | null;
  meta: unknown;
}

/**
 * The `{ user, profile }` payload returned by CommuterService::present().
 * Mirrors the AuthController::user() shape for frontend consistency.
 */
interface ProfilePayload {
  user: {
    id: number;
    email: string;
    role: string;
    name: string;
  };
  profile: {
    first_name: string | null;
    middle_name: string | null;
    surname: string | null;
    birthdate: string | null;
    gender: string | null;
    contact_number: string | null;
    commuter_type: string | null;
    applied_type: string | null;
    username: string | null;
    language_preference: string | null;
    account_status: string | null;
    id_image_url: string | null;
    verified_at: string | null;
    rejection_reason: string | null;
    created_at: string | null;
  };
}

// ─── Mapper ──────────────────────────────────────────────────────────

/**
 * Convert the raw snake_case `{ user, profile }` payload into the camelCase
 * `CommuterProfile` the frontend expects.
 *
 * `email` lives on the User (not the profile) in the backend, so we pull it
 * from `raw.user.email` to keep the frontend type flat.
 *
 * Defensive null-coalescing is used throughout — the backend CAN return null
 * for legacy rows, and the UI should still render with sensible defaults
 * rather than crash.
 */
function mapProfile(raw: ProfilePayload): CommuterProfile {
  const p = raw.profile;
  return {
    id: String(raw.user.id),
    email: raw.user.email,
    firstName: p.first_name ?? "",
    middleName: p.middle_name,
    surname: p.surname ?? "",
    birthdate: p.birthdate ?? "",
    gender: p.gender ?? "",
    contactNumber: p.contact_number ?? "",
    commuterType: (p.commuter_type as CommuterType) ?? "REGULAR",
    appliedType: (p.applied_type as CommuterType | null) ?? undefined,
    username: p.username ?? "",
    languagePreference: p.language_preference ?? "English",
    accountStatus:
      (p.account_status as AccountStatus) ?? "PENDING_VERIFICATION",
    idImageUrl: p.id_image_url,
    verifiedAt: p.verified_at,
    createdAt: p.created_at ?? "",
  };
}

// ─── Public input types ──────────────────────────────────────────────

export interface UpdateProfileInput {
  /** Philippine phone format (09xxxxxxxxx or +63xxxxxxxxxx) */
  contactNumber?: string;
  /** Free-form language tag, e.g. "English" / "Filipino" */
  languagePreference?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

// ─── Typed errors ────────────────────────────────────────────────────

export type PasswordChangeErrorCode =
  /** The `current_password` didn't match the user's actual password (422) */
  | "wrong_current_password"
  /** The new password equals the current password (422) */
  | "password_reuse"
  /** The `password_confirmation` didn't match `password` (422) */
  | "confirmation_mismatch"
  /** New password failed the strength rules (min 8, letters + numbers) */
  | "weak_password"
  /** Any other 422 from the backend */
  | "validation"
  /** 401 — the session expired; caller should redirect to login */
  | "unauthenticated"
  /** 5xx / network failure / unexpected error */
  | "network";

/**
 * Thrown by `changePassword()` on any non-success response.
 *
 * Carries a stable `code` so the UI can branch without parsing strings, plus
 * an optional `field` pointing at the offending form input
 * (`currentPassword` / `newPassword` / `confirmNewPassword`) so the UI can
 * render the message next to that field.
 */
export class PasswordChangeError extends Error {
  constructor(
    public code: PasswordChangeErrorCode,
    message: string,
    public field?: "currentPassword" | "newPassword" | "confirmNewPassword"
  ) {
    super(message);
    this.name = "PasswordChangeError";
  }
}

// ─── Service ─────────────────────────────────────────────────────────

/**
 * Fetch the authenticated commuter's profile.
 *
 * @throws {ApiError} 401 (session expired) / 404 (profile row missing) /
 *                     502 (backend unreachable) — caller decides UI response
 */
export async function getProfile(): Promise<CommuterProfile> {
  const response = await api.get<ApiResponseEnvelope<ProfilePayload>>(
    COMMUTER_API.profile
  );
  return mapProfile(response.data);
}

/**
 * Update editable profile fields.
 *
 * Only `contact_number` and `language_preference` are mutable — identity
 * fields (name, birthdate, gender, commuter_type) are server-enforced
 * immutable via `UpdateProfileRequest`. The service never sends identity
 * fields even if the caller includes them.
 *
 * @returns The updated profile (fresh from the server, so the caller can
 *          re-render without an extra GET round-trip).
 * @throws {ApiError} 401 / 404 / 422 (validation) / 502
 */
export async function updateProfile(
  input: UpdateProfileInput
): Promise<CommuterProfile> {
  const body: Record<string, string> = {};
  if (input.contactNumber !== undefined) {
    body.contact_number = input.contactNumber;
  }
  if (input.languagePreference !== undefined) {
    body.language_preference = input.languagePreference;
  }

  const response = await api.put<ApiResponseEnvelope<ProfilePayload>>(
    COMMUTER_API.profile,
    body
  );
  return mapProfile(response.data);
}

/**
 * Change the commuter's password.
 *
 * Maps the camelCase frontend payload to Laravel's snake_case contract:
 *   - `currentPassword`     → `current_password`
 *   - `newPassword`         → `password`
 *   - `confirmNewPassword`  → `password_confirmation`
 *
 * On 422, inspects `errors.current_password` / `errors.password` /
 * `errors.password_confirmation` and throws a typed `PasswordChangeError`
 * with a stable `code` + `field` so the UI can highlight the right input.
 *
 * On success, Laravel revokes all OTHER access tokens server-side (the
 * current session stays valid). No return value.
 */
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  try {
    await api.post<ApiResponseEnvelope<null>>(COMMUTER_API.changePassword, {
      current_password: input.currentPassword,
      password: input.newPassword,
      password_confirmation: input.confirmNewPassword,
    });
  } catch (err) {
    throw translatePasswordError(err);
  }
}

// ─── Error translation ───────────────────────────────────────────────

function translatePasswordError(err: unknown): PasswordChangeError {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return new PasswordChangeError(
        "unauthenticated",
        "Your session has expired. Please log in again."
      );
    }

    if (err.status === 422) {
      const body = err.body as ApiResponseEnvelope<unknown> | undefined;
      const errors = body?.errors ?? {};
      const message = body?.message ?? "Password could not be updated.";

      // Field-level errors — pick the most specific one
      if (errors.current_password?.length) {
        return new PasswordChangeError(
          "wrong_current_password",
          errors.current_password[0],
          "currentPassword"
        );
      }
      if (errors.password?.length) {
        const msg = errors.password[0];
        // CommuterService tags the reuse case with this exact message
        const code: PasswordChangeErrorCode = /different/i.test(msg)
          ? "password_reuse"
          : /weak|characters|letters|numbers/i.test(msg)
            ? "weak_password"
            : "validation";
        return new PasswordChangeError(code, msg, "newPassword");
      }
      if (errors.password_confirmation?.length) {
        return new PasswordChangeError(
          "confirmation_mismatch",
          errors.password_confirmation[0],
          "confirmNewPassword"
        );
      }
      return new PasswordChangeError("validation", message);
    }

    // 404 / 429 / 5xx — surface a friendly generic message
    return new PasswordChangeError(
      "network",
      "We couldn't update your password right now. Please try again."
    );
  }

  // NetworkError or anything else thrown by the api client
  return new PasswordChangeError(
    "network",
    err instanceof Error ? err.message : "Network error. Please try again."
  );
}
