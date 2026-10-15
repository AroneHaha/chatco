<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use App\Services\MaintenanceStatus;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects a request while Maintenance Mode is on for the caller's role.
 *
 * The commuter/conductor apps already show a maintenance screen (client-side
 * MaintenanceGate), but that's UI-only — an open session or a direct API call
 * could still read or change account data. This is the server-side
 * enforcement: it is applied to every commuter/conductor route group, so a
 * signed-in user of an affected role can't operate their account at all.
 * Logout, GET /user and /system-status stay outside it so the app can still
 * resolve the session, sign out, and render the maintenance screen.
 *
 * Guest routes have no user to read a role from, so they name the role they
 * act for (e.g. 'maintenance:COMMUTER' on commuter self-registration).
 *
 * Admins are never blocked — they need access to turn maintenance back off.
 */
class BlockDuringMaintenance
{
    public function handle(Request $request, Closure $next, ?string $guestRole = null): Response
    {
        $role = $request->user()?->role ?? ($guestRole !== null ? UserRole::tryFrom($guestRole) : null);
        $message = app(MaintenanceStatus::class)->messageFor($role);

        if ($message !== null) {
            return response()->json([
                'success' => false,
                'data'    => null,
                'code' => 'MAINTENANCE',
                'message' => $message,
                'errors'  => null,
                'meta'    => null,
            ], 503);
        }

        return $next($request);
    }
}
