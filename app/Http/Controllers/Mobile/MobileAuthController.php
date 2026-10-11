<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Auth\AuthController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Mobile authentication contract; credential and session rules remain shared. */
class MobileAuthController extends AuthController
{
    public function login(Request $request): JsonResponse
    {
        // Platform comes from the endpoint, never from editable client input.
        $request->merge(['device_type' => 'MOBILE']);

        return parent::login($request);
    }
}
