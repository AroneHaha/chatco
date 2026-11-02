<?php

namespace App\Http\Controllers\Commuter;

use App\Exceptions\OutsideRadiusException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Commuter\SosRequest;
use App\Models\Setting;
use App\Services\SosService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sprint 6 (T5) — Commuter SOS trigger.
 *
 *   POST /api/v1/commuter/sos       (COMMUTER) — trigger a new alert
 *   GET  /api/v1/commuter/sos/{id}  (COMMUTER) — poll own alert status
 *
 * Rate-limited at 1 created alert per minute per commuter (throttle:sos) for
 * the trigger to prevent abuse; refused attempts have a separate 10/min cap. The poll endpoint uses conductor-read
 * (60/min) so the commuter modal can poll every 3s without hitting the
 * limit. The commuter can stop their own SOS while retaining its history.
 */
class SosController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly SosService $sosService,
    ) {}

    public function trigger(SosRequest $request): JsonResponse
    {
        try {
            $alert = $this->sosService->trigger(
                $request->user(),
                $request->validated(),
            );
        } catch (OutsideRadiusException) {
            // Discriminator shape shared with hail so the client can branch on `error`.
            // distance_m is left out on purpose: the SOS screen does not use it.
            // The admin-configured hotline gives the refused commuter another way to get help.
            $hotline = Setting::where('key', 'emergency_hotline')->value('value');

            return response()->json([
                'error'             => 'outside_radius',
                'message'           => 'SOS is only available near an on-duty CHATCO jeepney.',
                'emergency_hotline' => is_string($hotline) && trim($hotline) !== '' ? trim($hotline) : null,
            ], 422);
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }

        // 200 = the commuter's already-open alert was returned; only a new
        // alert is 201, which is also what spends the throttle:sos slot.
        return $alert->wasRecentlyCreated
            ? $this->successResponse($alert, 'SOS alert triggered', 201)
            : $this->successResponse($alert, 'SOS alert already active');
    }

    /**
     * PATCH /commuter/sos/{id}/stop — close the sender's own alert.
     *
     * Retains the history record and notifies dispatch.
     */
    public function stop(Request $request, string $id): JsonResponse
    {
        try {
            $alert = $this->sosService->stopForSender($request->user(), $id);
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), str_contains($e->getMessage(), 'not found') ? 404 : 422);
        }

        return $this->successResponse($alert, 'SOS alert stopped');
    }

    /** Return the authenticated sender's own alert for status polling. */
    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $alert = $this->sosService->findForCommuter($request->user(), $id);
        } catch (\RuntimeException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;
            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($alert, 'SOS alert');
    }
}
