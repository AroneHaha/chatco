<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * Login with email or conductor generated_username.
     * Single optimized query with eager-loaded profiles.
     */
    public function login(string $login, string $password): array
    {
        $user = User::with([
            'adminProfile',
            'conductorProfile',
            'commuterProfile',
        ])
            ->where('email', $login)
            ->orWhereHas('conductorProfile', function ($q) use ($login) {
                $q->where('generated_username', $login);
            })
            ->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * Logout — revoke only the current token.
     */
    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }

    /**
     * Get authenticated user with preloaded profiles.
     */
    public function getAuthenticatedUser(User $user): User
    {
        return $user->load([
            'adminProfile',
            'conductorProfile',
            'commuterProfile',
        ]);
    }
}