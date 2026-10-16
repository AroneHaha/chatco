/**
 * Two-step change-password client, shared by every role that changes its
 * own password through the backend's PasswordChangeController (commuter
 * profile, admin Settings > Profile & Security).
 *
 * Phase 1 (`requestCode`) verifies the current/new password and has the
 * backend email a 6-digit code to the account's OWN registered address; the
 * password is NOT changed yet. Phase 2 (`confirm`) re-verifies everything
 * plus the code and only then rotates the password. Laravel then revokes the
 * account's other sessions; the current one stays valid.
 *
 * Each role binds its own Next.js route stubs via `createPasswordChangeClient`;
 * the payload contract, error translation and typed error are identical.
 * Moved out of lib/commuter/services/profile.service.ts unchanged when admins
 * got the same flow.
 */

import { api, ApiError } from "@/lib/api/client";

/** Laravel's response envelope (App\Http\ApiResponse); 422s carry `errors`. */
interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  errors: Record<string, string[]> | null;
  meta: unknown;
}

// ─── Public input types ──────────────────────────────────────────────

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ConfirmPasswordChangeInput extends ChangePasswordInput {
  /** The 6-digit code emailed to the account's registered address. */
  code: string;
}

/** Response from requestCode() — drives the code-entry step's UI. */
export interface PasswordChangeCodeRequested {
  expiresInMinutes: number;
  resendInSeconds: number;
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
  /** The emailed `code` was wrong, expired, or burned after too many tries (422) */
  | "wrong_code"
  /** Any other 422 from the backend */
  | "validation"
  /** 401 — the session expired; caller should redirect to login */
  | "unauthenticated"
  /** 429 — resend cooldown still active (requestCode only) */
  | "cooldown"
  /** 5xx / network failure / unexpected error */
  | "network";

/**
 * Thrown by both phases on any non-success response.
 *
 * Carries a stable `code` so the UI can branch without parsing strings, plus
 * an optional `field` pointing at the offending form input
 * (`currentPassword` / `newPassword` / `confirmNewPassword` / `code`) so the
 * UI can render the message next to that field.
 */
export class PasswordChangeError extends Error {
  constructor(
    public code: PasswordChangeErrorCode,
    message: string,
    public field?: "currentPassword" | "newPassword" | "confirmNewPassword" | "code"
  ) {
    super(message);
    this.name = "PasswordChangeError";
  }
}

// ─── Client ──────────────────────────────────────────────────────────

export interface PasswordChangeEndpoints {
  /** POST — phase 1: verify current/new password, email a 6-digit code. */
  requestCode: string;
  /** POST — phase 2: verify the emailed code and rotate the password. */
  confirm: string;
}

export function createPasswordChangeClient(endpoints: PasswordChangeEndpoints) {
  /**
   * Phase 1. Maps the camelCase payload to Laravel's snake_case contract.
   *
   * @throws {PasswordChangeError} `cooldown` if a code was just sent (the
   *         message names the wait time); `wrong_current_password` /
   *         `password_reuse` / `weak_password` / `confirmation_mismatch` on
   *         422; `network` if the email couldn't be sent (502) or otherwise.
   */
  async function requestCode(input: ChangePasswordInput): Promise<PasswordChangeCodeRequested> {
    try {
      const response = await api.post<
        ApiResponseEnvelope<{ expires_in_minutes: number; resend_in_seconds: number }>
      >(endpoints.requestCode, {
        current_password: input.currentPassword,
        password: input.newPassword,
        password_confirmation: input.confirmNewPassword,
      });
      return {
        expiresInMinutes: response.data.expires_in_minutes,
        resendInSeconds: response.data.resend_in_seconds,
      };
    } catch (err) {
      throw translatePasswordError(err);
    }
  }

  /**
   * Phase 2: re-verify the current/new password plus the emailed `code`, and
   * only then rotate the password. On 422 throws a typed
   * `PasswordChangeError` whose `field` names the input to highlight.
   */
  async function confirm(input: ConfirmPasswordChangeInput): Promise<void> {
    try {
      await api.post<ApiResponseEnvelope<null>>(endpoints.confirm, {
        current_password: input.currentPassword,
        password: input.newPassword,
        password_confirmation: input.confirmNewPassword,
        code: input.code,
      });
    } catch (err) {
      throw translatePasswordError(err);
    }
  }

  return { requestCode, confirm };
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
        // PasswordChangeService tags the reuse case with this exact message
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
      if (errors.code?.length) {
        return new PasswordChangeError("wrong_code", errors.code[0], "code");
      }
      return new PasswordChangeError("validation", message);
    }

    if (err.status === 429) {
      // requestCode's resend cooldown — the backend's message already names
      // the wait time ("Please wait N seconds…").
      const body = err.body as ApiResponseEnvelope<unknown> | undefined;
      return new PasswordChangeError(
        "cooldown",
        body?.message ?? "Please wait before requesting another code."
      );
    }

    if (err.status === 502) {
      // The code email couldn't be sent, or the backend was unreachable —
      // both 502s carry a message written for the user ("We could not send
      // the verification code right now…"), which is more accurate than the
      // generic "couldn't update your password" below.
      const body = err.body as ApiResponseEnvelope<unknown> | undefined;
      return new PasswordChangeError(
        "network",
        body?.message ?? "We couldn't update your password right now. Please try again."
      );
    }

    // 404 / other 5xx — surface a friendly generic message
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
