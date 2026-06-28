<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Qr\GenerateQrRequest;
use App\Http\Requests\Qr\ValidateQrRequest;
use App\Services\FeedbackService;
use App\Services\QrTokenService;
use App\Support\Feedback\FeedbackException;
use App\Support\Qr\QrTokenException;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

/**
 * Sprint 6 — Feedback Unit-QR resolution layer.
 *
 * The 3 routes under /api/v1/qr are the feedback QR lifecycle (NOT the GCash
 * payment QR — that lives under /conductor/payments/gcash/initiate +
 * /commuter/payments/claim). They were S1 501 stubs, now repurposed:
 *
 *   POST /qr/generate  (ADMIN)   — issue HMAC-signed unit-QR for a vehicle
 *   POST /qr/validate  (COMMUTER)— verify signature + expiry (pre-check)
 *   POST /qr/scan      (COMMUTER)— verify + resolve today's driver+conductor
 *
 * Feedback PERSISTENCE is a separate route (POST /commuter/feedback) handled
 * by FeedbackController, keeping resolution and persistence decoupled —
 * matching the existing pattern (/conductor/payments/gcash/initiate is
 * separate from /commuter/payments/claim).
 */
class QrController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly QrTokenService $qrTokens,
        private readonly FeedbackService $feedbackService,
    ) {}

    /**
     * POST /api/v1/qr/generate  (ADMIN)
     * Issue a signed unit-QR token for a vehicle.
     */
    public function generate(GenerateQrRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $issued = $this->qrTokens->issue($validated['vehicle_id']);

        return $this->successResponse($issued, 'QR token issued', 201);
    }

    /**
     * POST /api/v1/qr/validate  (COMMUTER)
     * Verify a QR token's signature + expiry without resolving the crew.
     * Used by the commuter app as a pre-check before showing the feedback form.
     */
    public function verify(ValidateQrRequest $request): JsonResponse
    {
        try {
            $payload = $this->qrTokens->verify($request->validated()['token']);
        } catch (QrTokenException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }

        return $this->successResponse([
            'valid'      => true,
            'vehicle_id' => $payload['vehicle_id'],
            'issued_at'  => $payload['issued_at'],
            'expires_at' => $payload['expires_at'],
        ], 'QR token is valid');
    }

    /**
     * POST /api/v1/qr/scan  (COMMUTER)
     * Verify the token AND resolve today's driver + conductor from shift_logs.
     * Returns the shift_id needed for the subsequent POST /commuter/feedback.
     */
    public function scan(ValidateQrRequest $request): JsonResponse
    {
        try {
            $payload = $this->qrTokens->verify($request->validated()['token']);
        } catch (QrTokenException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }

        try {
            $shift = $this->feedbackService->resolveCrewForVehicle($payload['vehicle_id']);
        } catch (FeedbackException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }

        return $this->successResponse([
            'shift_id'       => $shift->shift_id,
            'vehicle_id'     => $shift->vehicle_id,
            'unit_number'    => $shift->unit_number,
            'plate_number'   => $shift->plate_number,
            'driver_id'      => $shift->driver_id,
            'driver_name'    => $shift->driver_name,
            'conductor_id'   => $shift->conductor_id,
            'conductor_name' => $shift->conductor_name,
        ], 'Crew resolved');
    }
}
