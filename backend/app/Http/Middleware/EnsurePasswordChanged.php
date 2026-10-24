<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks every API call from a signed-in account that still has to replace
 * its system-generated default password (users.must_change_password).
 *
 * Fail-closed: applied to the whole api group, so a future authenticated route
 * is blocked unless it is named below. Only the password setup itself and
 * sign-out stay reachable.
 */
class EnsurePasswordChanged
{
    /** Route names a flagged account may still call. */
    private const ALLOWED_ROUTES = [
        'auth.set-new-password',
        'auth.logout',
        'mobile.auth.session',
        'mobile.auth.set-new-password',
        'mobile.auth.logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Resolved through the sanctum guard directly: this runs before the
        // route's auth:sanctum middleware, and the guard caches the user, so
        // the token is not looked up a second time.
        $user = Auth::guard('sanctum')->user();

        if (! $user instanceof User || ! $user->must_change_password) {
            return $next($request);
        }

        if ($request->routeIs(...self::ALLOWED_ROUTES)) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'data' => null,
            'code' => 'PASSWORD_CHANGE_REQUIRED',
            'message' => 'You must set a new password before you can continue.',
            'errors' => null,
            'meta' => null,
        ], 403);
    }
}
