<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Exceptions\AccountSuspendedException;
use App\Exceptions\RegistrationPendingException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
}
