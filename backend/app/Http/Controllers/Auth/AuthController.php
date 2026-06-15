<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $result = $this->authService->login(
            $request->login,
            $request->password
        );

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

        $profile = match ($user->role) {
            \App\Enums\UserRole::ADMIN     => $user->adminProfile,
            \App\Enums\UserRole::CONDUCTOR => $user->conductorProfile,
            \App\Enums\UserRole::COMMUTER  => $user->commuterProfile,
        };

        return $this->successResponse([
            'user'    => [
                'id'    => $user->id,
                'email' => $user->email,
                'role'  => $user->role->value,
                'name'  => $user->getDisplayName(),
            ],
            'profile' => $profile,
        ]);
    }
}