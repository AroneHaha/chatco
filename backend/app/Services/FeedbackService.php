<?php

namespace App\Services;

use App\Models\Feedback;
use App\Models\ShiftLog;
use App\Models\User;
use App\Support\Feedback\FeedbackException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Sprint 6 — Feedback submission + crew resolution.
 *
 * resolveCrewFromToken():
 *   1. Verifies the QR token (HMAC + expiry) via QrTokenService.
 *   2. Looks up TODAY's latest shift_log for the token's vehicle_id.
 *   3. Returns the shift (driver + conductor snapshot) or throws if none.
 *
 * submit():
 *   Persists a Feedback row anchored to shift_id. The (commuter_id, shift_id)
 *   unique constraint prevents duplicates → mapped to FeedbackException for
 *   HTTP 409.
 */
class FeedbackService
{
    public function __construct(
        private readonly QrTokenService $qrTokens,
    ) {}

    /**
     * Resolve today's crew for the vehicle encoded in a verified QR token.
     *
     * @throws FeedbackException  If token is invalid/expired or no shift today.
     */
    public function resolveCrewFromToken(string $token): ShiftLog
    {
        try {
            $payload = $this->qrTokens->verify($token);
        } catch (\App\Support\Qr\QrTokenException $e) {
            throw new FeedbackException($e->getMessage());
        }

        return $this->resolveCrewForVehicle($payload['vehicle_id']);
    }

    /**
     * Look up today's latest shift for a vehicle (active or ended — the
     * commuter may submit feedback after the conductor ends the shift, as
     * long as the ride was today).
     *
     * @throws FeedbackException  If no shift exists for this vehicle today.
     */
    public function resolveCrewForVehicle(string $vehicleId): ShiftLog
    {
        $shift = ShiftLog::where('vehicle_id', $vehicleId)
            ->whereDate('time_in', today())
            ->latest('time_in')
            ->first();

        if (! $shift) {
            throw new FeedbackException('No active crew for this unit today');
        }

        return $shift;
    }

    /**
     * Persist a feedback record. The commuter_id, vehicle_id, driver_id, and
     * conductor_id are all derived from the auth user + the shift_log row —
     * NEVER from client input — so a commuter cannot submit feedback for a
     * shift they didn't scan, or impersonate another commuter.
     *
     * @param  User              $commuter  The authenticated commuter.
     * @param  array             $data      Validated: shift_id, rating, category?, comment?
     * @return Feedback
     * @throws FeedbackException  If shift not found or duplicate feedback.
     */
    public function submit(User $commuter, array $data): Feedback
    {
        try {
            $shift = ShiftLog::where('shift_id', $data['shift_id'])->firstOrFail();
        } catch (ModelNotFoundException) {
            throw new FeedbackException('Shift not found');
        }

        try {
            return DB::transaction(function () use ($commuter, $shift, $data): Feedback {
                return Feedback::create([
                    'id' => (string) Str::uuid(),
                    'shift_id' => $shift->shift_id,
                    'vehicle_id' => $shift->vehicle_id,
                    'driver_id' => $shift->driver_id,
                    'conductor_id' => $shift->conductor_id,
                    'commuter_id' => $commuter->id,
                    'rating' => $data['rating'],
                    'category' => $data['category'] ?? null,
                    'comment' => $data['comment'] ?? null,
                ]);
            });
        } catch (UniqueConstraintViolationException) {
            throw new FeedbackException('You have already submitted feedback for this shift');
        }
    }
}
