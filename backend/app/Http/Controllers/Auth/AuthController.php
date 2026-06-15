<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Enums\UserRole;
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
            'login'    => 'required|string',
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
        }

        $user = $result['user'];

        return $this->successResponse([
            'id'    => $user->id,
            'email' => $user->email,
            'role'  => $user->role->value,
            'name'  => $user->getDisplayName(),
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
            'id'    => $user->id,
            'email' => $user->email,
            'role'  => $user->role->value,
            'name'  => $user->getDisplayName(),
        ];

        // Role-specific profile fields
        $profile = match ($user->role) {
            UserRole::ADMIN => [
                'first_name'   => $user->adminProfile->first_name,
                'middle_name'  => $user->adminProfile->middle_name,
                'last_name'    => $user->adminProfile->last_name,
            ],
            UserRole::CONDUCTOR => [
                'first_name'   => $user->conductorProfile->first_name,
                'middle_name'  => $user->conductorProfile->middle_name,
                'last_name'    => $user->conductorProfile->last_name,
                'username'     => $user->conductorProfile->generated_username,
            ],
            UserRole::COMMUTER => [
                'first_name'      => $user->commuterProfile->first_name,
                'surname'         => $user->commuterProfile->surname,
                'username'        => $user->commuterProfile->username,
                'commuter_type'   => $user->commuterProfile->commuter_type,
                'account_status'  => $user->commuterProfile->account_status,
            ],
        };

        return $this->successResponse([
            'user'    => $userData,
            'profile' => $profile,
        ]);
    }
}