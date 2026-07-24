<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects a request while Maintenance Mode is on.
 *
 * The commuter/conductor apps already show a maintenance screen (client-side
 * MaintenanceGate), but that's UI-only — an in-flight session, a race before
 * the gate resolves, or a direct API call could still hit a mutation. This is
 * the server-side safety net so no state (e.g. a conductor self-assigning to a
 * vehicle / starting a shift) is created during maintenance, which would cause
 * conflicts once the system comes back.
 *
 * Admins are never blocked — they need access to turn maintenance back off.
 */
class BlockDuringMaintenance
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->role === UserRole::ADMIN) {
            return $next($request);
        }

        $isOn = Setting::query()->where('key', 'maintenance_mode')->value('value') === 'true';

        if ($isOn) {
            return response()->json([
                'success' => false,
                'data'    => null,
                'message' => "CHATCO is under maintenance right now. You can't start a shift until maintenance is complete.",
                'errors'  => null,
                'meta'    => null,
            ], 503);
        }

        return $next($request);
    }
}
