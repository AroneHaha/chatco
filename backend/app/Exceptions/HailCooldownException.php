<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

/**
 * Thrown by HailService::createHail while a unit that accepted the
 * commuter's last hail can still pick them up (the post-accept cooldown).
 *
 * Renders a 409 with the accepting unit and when the cooldown ends, so a
 * client that missed the realtime accept event (a reload, a dropped socket,
 * another device) can still show the countdown:
 *   { "error": "hail_cooldown", "message": ..., "unit_number": ...,
 *     "vehicle_id": ..., "cooldown_ends_at": <ISO-8601> }
 */
class HailCooldownException extends \Exception
{
    public function __construct(
        public readonly ?string $unitNumber,
        public readonly string $vehicleId,
        public readonly Carbon $endsAt,
    ) {
        parent::__construct(($unitNumber ?? 'A unit').' already accepted your hail.');
    }

    /** An expected refusal, not an error: keep it out of the logs. */
    public function report(): void {}

    public function render(): JsonResponse
    {
        return response()->json([
            'error' => 'hail_cooldown',
            'message' => $this->getMessage(),
            'unit_number' => $this->unitNumber,
            'vehicle_id' => $this->vehicleId,
            'cooldown_ends_at' => $this->endsAt->toIso8601String(),
        ], 409);
    }
}
