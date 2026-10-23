/**
 * Client-side commuter profile service.
 *
 * Calls Next.js proxy routes (which forward to Laravel with the httpOnly
 * `chatco_session` cookie) — never calls Laravel directly from the browser.
 * This keeps the Sanctum bearer token server-side only and avoids CORS.
 *
 *   GET  /api/commuter/profile                       -> getProfile()
 *   PUT  /api/commuter/profile                       -> updateProfile()
 *   POST /api/commuter/change-password/request-code  -> requestPasswordChangeCode()
 *   POST /api/commuter/change-password/confirm       -> confirmPasswordChange()
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

import { api } from "@/lib/api/client";
import { createPasswordChangeClient } from "@/lib/shared/services/password-change.service";
import { COMMUTER_API } from "@/lib/commuter/endpoints";
import { compressImage, IMAGE_COMPRESSION } from "@/lib/utils/compress-image";
import { toCommuterType, type AccountStatus, type CommuterProfile } from "@/types";

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
    profile_image_url?: string | null;
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
    commuterType: toCommuterType(p.commuter_type) ?? "REGULAR",
    appliedType: toCommuterType(p.applied_type),
    username: p.username ?? "",
    languagePreference: p.language_preference ?? "English",
    accountStatus:
      (p.account_status as AccountStatus) ?? "PENDING_VERIFICATION",
    idImageUrl: p.id_image_url,
    profileImageUrl: p.profile_image_url ?? null,
    verifiedAt: p.verified_at,
    createdAt: p.created_at ?? "",
  };
}

// ─── Public input types ──────────────────────────────────────────────

export interface UpdateProfileInput {
  /** Canonical PH mobile format only: 11 digits starting with 09 (e.g. "09171234567"). */
  contactNumber?: string;
  /** Free-form language tag, e.g. "English" / "Filipino" */
  languagePreference?: string;
}

// Change-password types and its typed error live in the shared client so the
// admin account flow uses the same code; re-exported for existing imports.
export type {
  ChangePasswordInput,
  ConfirmPasswordChangeInput,
  PasswordChangeCodeRequested,
  PasswordChangeErrorCode,
} from "@/lib/shared/services/password-change.service";
export { PasswordChangeError } from "@/lib/shared/services/password-change.service";

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

export async function uploadProfilePhoto(photo: File): Promise<CommuterProfile> {
  const body = new FormData();
  body.set("photo", await compressImage(photo, IMAGE_COMPRESSION.avatar));
  const response = await api.postForm<ApiResponseEnvelope<ProfilePayload>>(
    `${COMMUTER_API.profile}/photo`, body
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

// Change-password: the shared two-step client bound to the commuter routes
// (see lib/shared/services/password-change.service.ts for the contract and
// the typed errors each phase throws).
const commuterPasswordChange = createPasswordChangeClient(COMMUTER_API.changePassword);

/** Phase 1: verify current/new password, email a 6-digit code to the commuter. */
export const requestPasswordChangeCode = commuterPasswordChange.requestCode;

/** Phase 2: verify the emailed code, then rotate the password. */
export const confirmPasswordChange = commuterPasswordChange.confirm;
