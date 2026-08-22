<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Exceptions\AccountSuspendedException;
use App\Exceptions\RegistrationPendingException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Mail\PasswordResetCodeMail;
use App\Models\User;
use App\Rules\StrongPassword;
use App\Services\AuthService;
use App\Services\EmailVerificationService;
use App\Services\RegistrationGuard;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponse;

    /** How long a reset code stays valid, in minutes. */
    private const CODE_TTL_MINUTES = 15;

    /** Failed verification attempts allowed before a code is burned. */
    private const MAX_CODE_ATTEMPTS = 5;

    public function __construct(
        private AuthService $authService,
        private EmailVerificationService $emailVerification,
        private RegistrationGuard $registrationGuard,
    ) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'login' => 'required|string',
            'password' => 'required|string|min:6',
            'device_id' => 'nullable|string|min:16|max:100|regex:/^[A-Za-z0-9._:-]+$/',
            'device_type' => 'nullable|required_with:device_id|string|in:WEB,MOBILE',
        ]);

        try {
            $result = $this->authService->login(
                $request->login,
                $request->password,
                $request->input('device_id'),
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
     * POST /api/v1/auth/register/send-code — public.
     *
     * Step 1 of sign-up email verification. Mails a 6-digit code to the
     * address the applicant typed on the contact step, so a typo or someone
     * else's inbox can't reach the admin approval queue.
     *
     * The blockers that would fail the eventual registration are checked FIRST
     * — rejection cooldown, address already in use — so the applicant learns
     * about them here rather than after filling in the rest of the form.
     */
    public function sendRegistrationCode(Request $request): JsonResponse
    {
        $request->validate([
            'email'          => ['required', 'string', 'email:rfc', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:20'],
        ]);

        $email = $this->normalizeEmail($request->email);

        // Same cooldown that guards registration — throws a 422 naming the
        // date sign-ups reopen.
        $this->registrationGuard->assertNotBlocked($email, $request->contact_number);

        // Live accounts only: a rejected applicant's email was rewritten to a
        // placeholder, so their original address is free to use again.
        $taken = User::whereNull('users.deleted_at')->where('email', $email)->exists();

        if ($taken) {
            throw ValidationException::withMessages([
                'email' => ['That email already has a CHATCO account. Sign in instead, or use "Forgot password" if you can\'t get in.'],
            ]);
        }

        $wait = $this->emailVerification->secondsUntilResend($email);

        if ($wait > 0) {
            return $this->errorResponse(
                "You just requested a code. Please wait {$wait} seconds before asking for another.",
                429
            );
        }

        try {
            $this->emailVerification->sendCode($email);
        } catch (\Throwable $e) {
            Log::error('Sign-up verification code failed to send', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse(
                'We could not send the verification code right now. Please check the address and try again in a few minutes.',
                502
            );
        }

        return $this->successResponse(
            [
                'expires_in_minutes' => EmailVerificationService::CODE_TTL_MINUTES,
                'resend_in_seconds'  => EmailVerificationService::RESEND_COOLDOWN_SECONDS,
            ],
            'We sent a 6-digit code to ' . $email . '. It expires in ' . EmailVerificationService::CODE_TTL_MINUTES . ' minutes.'
        );
    }

    /**
     * POST /api/v1/auth/register/verify-code — public.
     *
     * Step 2 of sign-up email verification. A correct code stamps the address
     * verified for EmailVerificationService::VERIFIED_TTL_MINUTES, which is
     * what POST /auth/register later requires.
     */
    public function verifyRegistrationCode(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'code'  => ['required', 'string'],
        ]);

        [$status, $message] = $this->emailVerification->verifyCode(
            $this->normalizeEmail($request->email),
            trim($request->code)
        );

        if ($status !== 'valid') {
            // 429 on 'locked' so the client can tell "wrong code, try again"
            // apart from "that code is gone, request a new one".
            return $this->errorResponse($message, $status === 'locked' ? 429 : 400);
        }

        return $this->successResponse(
            ['verified_for_minutes' => EmailVerificationService::VERIFIED_TTL_MINUTES],
            'Email verified. You can finish creating your account.'
        );
    }

    /**
     * POST /api/v1/auth/forgot-password — public.
     *
     * Step 1 of the reset flow. If the email belongs to a real account we
     * generate a random 6-digit code, store it (hashed) in
     * password_reset_tokens, and email it to that address.
     *
     * An unregistered email gets an explicit 404 rather than a generic 200.
     * This is a deliberate trade: it does let someone probe which emails have
     * accounts, but POST /auth/register already leaks the same fact (it
     * rejects an email held by a live user), so the silence bought little
     * while regularly stranding real users on the code screen waiting for a
     * mail that was never sent. The route's `throttle:commuter-hail` limiter
     * (10/min per IP) keeps the endpoint from being scripted for bulk
     * harvesting.
     *
     * Note the SoftDeletes scope means a REJECTED applicant — whose email is
     * rewritten to rejected+{uuid}@chatco.local on rejection — is not found
     * here, hence the message covering pending/rejected registrations.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $email = $this->normalizeEmail($request->email);

        // Targeted lookup — pull only the columns we need, and let the
        // SoftDeletes global scope exclude deleted accounts automatically.
        // (No "SELECT *"; no scanning unrelated columns.)
        $user = User::query()
            ->where('email', $email)
            ->first(['id', 'email']);

        if (! $user) {
            Log::info('Password reset requested for unknown email', ['email' => $email]);

            return $this->errorResponse(
                'No account is registered with that email. If your registration is '
                . 'still awaiting admin approval, or was rejected, you cannot reset '
                . 'a password yet.',
                404
            );
        }

        $code = $this->generateResetCode();

        // Upsert by email so requesting a new code overwrites any pending
        // one and resets the failed-attempt counter.
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            [
                'token'      => Hash::make($code),
                'attempts'   => 0,
                'created_at' => now(),
            ]
        );

        try {
            Mail::to($user->email)->send(
                new PasswordResetCodeMail($code, self::CODE_TTL_MINUTES)
            );
        } catch (\Throwable $e) {
            // Surface delivery failures instead of reporting success — the
            // user would otherwise sit on the code screen with no code and no
            // explanation. The detail stays in the log; the client gets a
            // generic "try again" so SMTP internals aren't exposed.
            Log::error('Password reset code email failed to send', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse(
                'We could not send the reset code right now. Please try again in a few minutes.',
                502
            );
        }

        return $this->successResponse(
            null,
            'We have sent a 6-digit reset code to your email.',
            200
        );
    }

    /**
     * POST /api/v1/auth/verify-reset-code — public.
     *
     * Step 2 of the reset flow. Checks that the submitted code matches the
     * one we emailed, is unexpired, and hasn't been guessed too many times.
     * On success the code is left in place so the final step can consume it.
     */
    public function verifyResetCode(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'code'  => 'required|string',
        ]);

        [$status, $message] = $this->checkResetCode(
            $this->normalizeEmail($request->email),
            $request->code
        );

        if ($status !== 'valid') {
            return $this->errorResponse($message, 400);
        }

        return $this->successResponse(null, 'Code verified. You can now set a new password.');
    }

    /**
     * POST /api/v1/auth/reset-password — public.
     *
     * Step 3 of the reset flow. Re-verifies the code (so this endpoint is
     * safe even if the verify step was skipped), sets the new password, and
     * burns the code so it can't be reused.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'code'     => ['required', 'string'],
            // Same policy as sign-up — a reset shouldn't be a way to end up
            // with a weaker password than the account could be created with.
            'password' => ['required', 'string', 'confirmed', new StrongPassword],
        ]);

        $email = $this->normalizeEmail($request->email);

        [$status, $message] = $this->checkResetCode($email, $request->code);

        if ($status !== 'valid') {
            return $this->errorResponse($message, 400);
        }

        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            // Extremely unlikely (code existed a moment ago) but be defensive.
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            return $this->errorResponse('We could not find an account with that email.', 400);
        }

        $user->forceFill([
            'password'       => Hash::make($request->password),
            'remember_token' => Str::random(60),
        ])->save();

        // Consume the code — one successful reset per code.
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return $this->successResponse(null, 'Password reset successfully. You can now log in.');
    }

    /**
     * Verify a submitted reset code against the stored record.
     *
     * Returns a [status, message] pair where status is one of:
     *   'valid'   — code matches, unexpired, within attempt budget
     *   'invalid' — no pending code, or the code is wrong (attempt counted)
     *   'expired' — the code passed its TTL
     *   'locked'  — too many wrong guesses; the code has been invalidated
     *
     * On a wrong guess the attempt counter is incremented; hitting the cap
     * deletes the code so an attacker can't keep brute-forcing 6 digits.
     */
    private function checkResetCode(string $email, string $code): array
    {
        $record = DB::table('password_reset_tokens')->where('email', $email)->first();

        // Generic message throughout so a wrong code and a never-requested
        // code look identical to the caller.
        $invalid = 'That code is incorrect or has expired. Please request a new one.';

        if (! $record) {
            return ['invalid', $invalid];
        }

        // Expired → clean up and treat as invalid.
        if (Carbon::parse($record->created_at)->addMinutes(self::CODE_TTL_MINUTES)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            return ['expired', $invalid];
        }

        if (! Hash::check($code, $record->token)) {
            $attempts = (int) $record->attempts + 1;

            if ($attempts >= self::MAX_CODE_ATTEMPTS) {
                DB::table('password_reset_tokens')->where('email', $email)->delete();
                return ['locked', 'Too many incorrect attempts. Please request a new code.'];
            }

            DB::table('password_reset_tokens')->where('email', $email)->update([
                'attempts' => $attempts,
            ]);

            return ['invalid', $invalid];
        }

        return ['valid', 'OK'];
    }

    /**
     * A cryptographically-random, zero-padded 6-digit code (000000–999999).
     */
    private function generateResetCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Normalize an email for consistent lookups (trim + lowercase).
     */
    private function normalizeEmail(string $email): string
    {
        return Str::lower(trim($email));
    }
}
