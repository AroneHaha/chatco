<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    /**
     * @param  Request  $request
     * @param  Closure(Request): Response  $next
     * @param  string  ...$roles  One or more UserRole values (e.g. "ADMIN", "CONDUCTOR")
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (! $request->user()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
                'data'    => null,
                'errors'  => null,
                'meta'    => null,
            ], 401);
        }

        $userRole = $request->user()->role;

        foreach ($roles as $role) {
            try {
                if ($userRole === UserRole::from($role)) {
                    return $next($request);
                }
            } catch (\ValueError $e) {
                // Invalid role string — safely ignore
                continue;
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Forbidden',
            'data'    => null,
            'errors'  => null,
            'meta'    => null,
        ], 403);
    }
}