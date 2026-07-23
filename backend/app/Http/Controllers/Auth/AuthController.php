<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Exceptions\AccountSuspendedException;
use App\Exceptions\RegistrationPendingException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        private AuthService $authService
    ) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'login' => 'required|string',
            'password' => 'required|string|min:6',
        ]);

        try {
            $result = $this->authService->login(
                $request->login,
                $request->password
            );
        } catch (ValidationException $e) {
            // Credentials incorrect → 401, not 422
            return $this->errorResponse('Invalid credentials', 401);
        } catch (AccountSuspendedException $e) {
            // Credentials were valid, but the account is suspended → 403
            return $this->errorResponse($e->getMessage(), 403);
        } catch (RegistrationPendingException $e) {
            // Credentials were valid, but the account is PENDING approval or
            // REJECTED → 403 (kept distinct from SUSPENDED for the frontend)
            return $this->errorResponse($e->getMessage(), 403);
        }

        $user = $result['user'];

        return $this->successResponse([
            'id' => $user->id,
            'email' => $user->email,
            'role' => $user->role->value,
            'name' => $user->getDisplayName(),
            'token' => $result['token'],
        ], 'Login successful');
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return $this->successResponse(null, 'Logged out successfully');
    }

    public function user(Request $request): JsonResponse
    {
        $user = $this->authService->getAuthenticatedUser($request->user());

        $userData = [
            'id' => $user->id,
            'email' => $user->email,
            'role' => $user->role->value,
            'name' => $user->getDisplayName(),
        ];

        // Role-specific profile fields
        $profile = match ($user->role) {
            UserRole::ADMIN => [
                'first_name' => $user->adminProfile->first_name,
                'middle_name' => $user->adminProfile->middle_name,
                'last_name' => $user->adminProfile->last_name,
            ],
            UserRole::CONDUCTOR => [
                'first_name' => $user->conductorProfile->first_name,
                'middle_name' => $user->conductorProfile->middle_name,
                'last_name' => $user->conductorProfile->last_name,
                'username' => $user->conductorProfile->generated_username,
            ],
            UserRole::COMMUTER => [
                'first_name' => $user->commuterProfile->first_name,
                'surname' => $user->commuterProfile->surname,
                'username' => $user->commuterProfile->username,
                'commuter_type' => $user->commuterProfile->commuter_type,
                'account_status' => $user->commuterProfile->account_status,
            ],
        };

        return $this->successResponse([
            'user' => $userData,
            'profile' => $profile,
        ]);
    }

    /**
     * POST /api/v1/auth/register — public commuter self-sign-up.
     *
     * Creates a PENDING commuter account (no token issued). The commuter
     * cannot log in until an admin approves the registration via
     * PATCH /admin/registrations/{id}/approve.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return $this->successResponse(
            [
                'id' => $result['user']->id,
                'email' => $result['user']->email,
                'role' => $result['user']->role->value,
                'account_status' => $result['profile']->account_status,
                'applied_type' => $result['profile']->applied_type,
            ],
            'Registration submitted. An admin will review your account shortly.',
            201
        );
    }

    /**
     * POST /api/v1/auth/forgot-password — public.
     *
     * Sends a password reset link to the given email. Always returns 200
     * with a generic "we sent a link if the email exists" message — this
     * prevents user-enumeration attacks (attackers can't probe which emails
     * are registered).
     *
     * Uses Laravel's built-in Password::sendResetLink() which dispatches
     * the ResetPassword notification (customized in AppServiceProvider to
     * point at {frontend_url}/password-reset/{token}?email=...).
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // We send the reset link regardless of whether the user exists, but
        // Password::sendResetLink() only actually sends for valid users.
        // The status code tells us what happened (but we return the same
        // response either way to avoid email enumeration).
        $status = Password::sendResetLink(
            $request->only('email')
        );

        // Log the actual status for debugging — useful when emails don't arrive.
        if ($status === Password::RESET_LINK_SENT) {
            \Illuminate\Support\Facades\Log::info('Password reset link sent', [
                'email' => $request->email,
            ]);
        } else {
            \Illuminate\Support\Facades\Log::warning('Password reset link NOT sent', [
                'email' => $request->email,
                'status' => $status,
            ]);
        }

        // Always return the same message — prevents email enumeration.
        return $this->successResponse(
            null,
            'If an account with that email exists, we have sent a password reset link.',
            200
        );
    }

    /**
     * POST /api/v1/auth/reset-password — public.
     *
     * Resets the user's password using the token from the email link.
     * The frontend collects token + email + new password from the URL
     * + form, then POSTs here.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => 'required|string',
            'email'    => 'required|email',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password'       => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return $this->successResponse(null, 'Password reset successfully. You can now log in.');
        }

        // Invalid token, expired token, or user not found.
        $message = match ($status) {
            Password::INVALID_TOKEN     => 'This reset link has expired or is invalid. Please request a new one.',
            Password::INVALID_USER      => 'We could not find an account with that email.',
            default                      => 'Unable to reset password. Please try again.',
        };

        return $this->errorResponse($message, 400);
    }
}
