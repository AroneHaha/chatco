<?php

namespace App\Http\Middleware;

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
                'message' => 'Unauthenticated.',
                'data'    => null,
                'errors'  => null,
                'meta'    => null,
            ], 401);
        }

        $userRole = $request->user()->role;

        foreach ($roles as $role) {
            if ($userRole->value === $role) {
                return $next($request);
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Forbidden. Insufficient role.',
            'data'    => null,
            'errors'  => null,
            'meta'    => null,
        ], 403);
    }
}