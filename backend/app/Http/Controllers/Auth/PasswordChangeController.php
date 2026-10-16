<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\ConfirmPasswordChangeRequest;
use App\Services\EmailVerificationService;
use App\Services\PasswordChangeService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Two-step change-password for the signed-in account, shared by every role
 * that can change its own password (commuter web + mobile, admin). The role
 * check lives on the route group, so these actions only ever act on
 * $request->user(). Moved out of CommuterController unchanged when admins
 * got the same flow.
 */
class PasswordChangeController extends Controller
{
    use ApiResponse;

    public function __construct(
        private PasswordChangeService $passwordChange,
        private EmailVerificationService $emailVerification
    ) {}

    /**
     * POST /api/v1/{commuter|admin/account}/change-password/request-code
     *
     * Phase 1 of change-password: verifies the current password and new
     * password policy, then emails a 6-digit code to the account's OWN
     * registered address (never trusted from the request). The password is
     * NOT changed yet — that only happens after POST .../confirm succeeds, so
     * a hijacked session alone can never complete a password change.
     */
    public function requestCode(ChangePasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        // Cooldown + send, mirroring AuthController::sendRegistrationCode's
        // pattern for this same EmailVerificationService.
        $wait = $this->emailVerification->secondsUntilResend(
            $user->email,
            EmailVerificationService::PURPOSE_CHANGE_PASSWORD
        );

        if ($wait > 0) {
            return $this->errorResponse(
                "You just requested a code. Please wait {$wait} seconds before asking for another.",
                429
            );
        }

        try {
            $this->passwordChange->requestCode(
                $user,
                $validated['current_password'],
                $validated['password'],
            );
        } catch (ValidationException $e) {
            // A bad current/new password — propagate as-is (422), not the
            // mail-failure 502 below. Caught explicitly since it's also a
            // \Throwable and would otherwise be swallowed by that catch.
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Password-change verification code failed to send', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse(
                'We could not send the verification code right now. Please try again in a few minutes.',
                502
            );
        }

        return $this->successResponse(
            [
                'expires_in_minutes' => EmailVerificationService::CODE_TTL_MINUTES,
                'resend_in_seconds' => EmailVerificationService::RESEND_COOLDOWN_SECONDS,
            ],
            'We sent a 6-digit code to your registered email. It expires in ' . EmailVerificationService::CODE_TTL_MINUTES . ' minutes.'
        );
    }

    /**
     * POST /api/v1/{commuter|admin/account}/change-password/confirm
     *
     * Phase 2: re-verifies current/new password plus the emailed code, and
     * only then rotates the password. A wrong current password, a reused
     * password, or a wrong/expired/locked code are all surfaced as a 422 by
     * the service (on current_password / password / code respectively).
     */
    public function confirm(ConfirmPasswordChangeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->passwordChange->confirm(
            $request->user(),
            $validated['current_password'],
            $validated['password'],
            $validated['code'],
        );

        return $this->successResponse(null, 'Password updated successfully');
    }
}
