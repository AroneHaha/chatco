<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Auth\AuthController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Mobile authentication contract; credential and session rules remain shared. */
class MobileAuthController extends AuthController
{
    /** Minimal bootstrap only: never exposes operational data before activation. */
    public function session(Request $request): JsonResponse
    {
        $user = $request->user();

        return $this->successResponse(['user' => [
            'id' => $user->id,
            'email' => $user->email,
            'name' => $user->getDisplayName(),
            'role' => $user->role->value,
            'must_change_password' => (bool) $user->must_change_password,
        ]], 'Session retrieved');
    }

    public function login(Request $request): JsonResponse
    {
        // Platform comes from the endpoint, never from editable client input.
        $request->merge(['device_type' => 'MOBILE']);

        return parent::login($request);
    }
}
