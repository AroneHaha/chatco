<?php

namespace App\Http\Controllers\Commuter;

use App\Http\Controllers\Controller;
use App\Models\SharedRideLink;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Commuter Share Ride Controller.
 *
 *   POST /api/v1/commuter/share-ride    → create a tracking link
 *   GET  /api/v1/share/{token}          → public: get the latest position
 *   DELETE /api/v1/commuter/share-ride  → deactivate the active link
 *
 * The commuter generates a tracking token → shares the URL → anyone with
 * the URL can see the commuter's live GPS position on a map for 30 minutes.
 */
class ShareRideController extends Controller
{
    use ApiResponse;

    /** Default link TTL in minutes. */
    private const TTL_MINUTES = 30;

    /**
     * POST /api/v1/commuter/share-ride
     *
     * Creates (or refreshes) a tracking link for the authenticated commuter.
     * If an active non-expired link already exists, returns it instead of
     * creating a duplicate. Optionally accepts lat/lng to set the initial
     * position.
     */
    public function store(Request $request): JsonResponse
    {
        $profile = $request->user()->commuterProfile;

        if (! $profile) {
            return $this->errorResponse('Commuter profile required.', 422);
        }

        $validated = $request->validate([
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'rotate' => 'nullable|boolean',
        ]);

        // A "start sharing" action (rotate=true) mints a brand-new token every
        // time: deactivate any existing active link so the new URL is unique
        // and every previously shared link immediately reads as expired.
        // Live position pushes (rotate=false) instead REUSE the current link so
        // the token stays stable while the map updates.
        if ($request->boolean('rotate')) {
            SharedRideLink::where('commuter_id', $profile->id)
                ->where('is_active', true)
                ->update(['is_active' => false]);
        } else {
            $existing = SharedRideLink::where('commuter_id', $profile->id)
                ->where('is_active', true)
                ->where('expires_at', '>', now())
                ->latest()
                ->first();

            if ($existing) {
                // Update position if provided.
                if (isset($validated['lat']) && isset($validated['lng'])) {
                    $existing->update([
                        'lat' => $validated['lat'],
                        'lng' => $validated['lng'],
                        'last_updated_at' => now(),
                    ]);
                }

                return $this->successResponse([
                    'token' => $existing->token,
                    'expires_at' => $existing->expires_at->toIso8601String(),
                    'share_url' => url("/share/{$existing->token}"),
                ], 'Share link retrieved');
            }
        }

        // Create a new link.
        $link = SharedRideLink::create([
            'commuter_id' => $profile->id,
            'lat' => $validated['lat'] ?? null,
            'lng' => $validated['lng'] ?? null,
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
            'last_updated_at' => now(),
            'is_active' => true,
        ]);

        return $this->successResponse([
            'token' => $link->token,
            'expires_at' => $link->expires_at->toIso8601String(),
            'share_url' => url("/share/{$link->token}"),
        ], 'Share link created', 201);
    }

    /**
     * DELETE /api/v1/commuter/share-ride
     *
     * Deactivates the commuter's active share link (manual stop).
     */
    public function destroy(Request $request): JsonResponse
    {
        $profile = $request->user()->commuterProfile;

        if (! $profile) {
            return $this->errorResponse('Commuter profile required.', 422);
        }

        SharedRideLink::where('commuter_id', $profile->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        return $this->successResponse(null, 'Share link deactivated');
    }

    /**
     * GET /api/v1/share/{token}
     *
     * PUBLIC endpoint — no auth required. Returns the commuter's latest
     * position if the link is active + not expired. Used by the public
     * /share/{token} tracking page.
     */
    public function show(string $token): JsonResponse
    {
        $link = SharedRideLink::where('token', $token)->first();

        if (! $link) {
            return $this->errorResponse('Tracking link not found.', 404);
        }

        if (! $link->is_active || $link->isExpired()) {
            return $this->successResponse([
                'active' => false,
                'expired' => true,
                'commuter_name' => trim($link->commuter?->first_name . ' ' . $link->commuter?->surname) ?: 'Commuter',
            ], 'Tracking link expired');
        }

        return $this->successResponse([
            'active' => true,
            'expired' => false,
            'commuter_name' => trim($link->commuter?->first_name . ' ' . $link->commuter?->surname) ?: 'Commuter',
            'lat' => $link->lat ? (float) $link->lat : null,
            'lng' => $link->lng ? (float) $link->lng : null,
            'last_updated' => $link->last_updated_at?->toIso8601String(),
            'expires_at' => $link->expires_at->toIso8601String(),
        ], 'Tracking data retrieved');
    }
}
