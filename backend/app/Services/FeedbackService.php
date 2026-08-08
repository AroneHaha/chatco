<?php

namespace App\Services;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\Feedback;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\User;
use App\Support\Feedback\FeedbackException;
use App\Support\Qr\QrTokenException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
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
     * @throws FeedbackException If token is invalid/expired or no shift today.
     */
    public function resolveCrewFromToken(string $token): ShiftLog
    {
        try {
            $payload = $this->qrTokens->verify($token);
        } catch (QrTokenException $e) {
            throw new FeedbackException($e->getMessage());
        }

        return $this->resolveCrewForVehicle($payload['vehicle_id']);
    }

    /**
     * Look up today's latest shift for a vehicle (active or ended — the
     * commuter may submit feedback after the conductor ends the shift, as
     * long as the ride was today).
     *
     * @throws FeedbackException If no shift exists for this vehicle today.
     */
    public function resolveCrewForVehicle(string $vehicleId): ShiftLog
    {
        $today = today();

        $shift = ShiftLog::where('vehicle_id', $vehicleId)
            ->whereBetween('time_in', [
                $today->copy()->startOfDay(),
                $today->copy()->endOfDay(),
            ])
            ->latest('time_in')
            ->first();

        if (! $shift) {
            throw new FeedbackException('No active crew for this unit today');
        }

        return $shift;
    }

    /**
     * Persist feedback only after a locked PAID transaction proves that the
     * authenticated commuter rode on the shift. Crew and vehicle identities
     * are derived from that verified ride, never from client input.
     *
     * @param  User  $commuter  The authenticated commuter.
     * @param  array  $data  Validated: shift_id, rating, category?, comment?
     *
     * @throws FeedbackException If no eligible ride exists or feedback is duplicate.
     */
    public function submit(User $commuter, array $data): Feedback
    {
        $commuterProfile = $commuter->commuterProfile;
        if (! $commuterProfile) {
            throw new FeedbackException('A commuter profile is required to submit feedback');
        }

        try {
            return DB::transaction(function () use ($commuterProfile, $data): Feedback {
                $transaction = Transaction::query()
                    ->where('shift_id', $data['shift_id'])
                    ->where('passenger_id', $commuterProfile->id)
                    ->where('status', PaymentStatus::PAID->value)
                    ->whereIn('payment_method', [
                        PaymentMethod::CASH->value,
                        PaymentMethod::GCASH->value,
                        PaymentMethod::VOUCHER->value,
                    ])
                    ->whereNull('payment_reconciliation_status')
                    ->orderByDesc('paid_at')
                    ->orderByDesc('created_at')
                    ->lockForUpdate()
                    ->first();

                if (! $transaction) {
                    throw new FeedbackException('Feedback is only available after your completed ride on this shift');
                }

                $shift = ShiftLog::query()
                    ->where('shift_id', $transaction->shift_id)
                    ->first();
                if (! $shift) {
                    throw new FeedbackException('The verified ride no longer has an associated shift');
                }

                if (Feedback::query()
                    ->where('commuter_id', $commuterProfile->id)
                    ->where('shift_id', $shift->shift_id)
                    ->lockForUpdate()
                    ->exists()) {
                    throw new FeedbackException('You have already submitted feedback for this shift');
                }

                return Feedback::create([
                    'id' => (string) Str::uuid(),
                    'shift_id' => $shift->shift_id,
                    'vehicle_id' => $shift->vehicle_id,
                    'driver_id' => $shift->driver_id,
                    'conductor_id' => $shift->conductor_id,
                    'commuter_id' => $commuterProfile->id,
                    // Driver rating (the original columns).
                    'rating' => $data['rating'],
                    'category' => $data['category'] ?? null,
                    'comment' => $data['comment'] ?? null,
                    // Conductor rating — a separate, independent score.
                    'conductor_rating' => $data['conductor_rating'] ?? null,
                    'conductor_category' => $data['conductor_category'] ?? null,
                    'conductor_comment' => $data['conductor_comment'] ?? null,
                ]);
            });
        } catch (UniqueConstraintViolationException) {
            throw new FeedbackException('You have already submitted feedback for this shift');
        }
    }

    /**
     * List feedback for a conductor, paginated, with summary stats.
     *
     * Used by GET /admin/feedback?conductor_id=… — the admin "User Management"
     * double-click flow. Summary includes average_rating, total_count, and a
     * 5→1 rating distribution so the modal can render a breakdown chart.
     *
     * @throws FeedbackException If the conductor profile doesn't exist.
     */
    public function listForConductor(string $conductorId, int $perPage = 10): array
    {
        if (! ConductorProfile::where('id', $conductorId)->exists()) {
            throw new FeedbackException('Conductor not found');
        }

        // Only rows that carry a conductor rating (historical rows predating
        // the driver/conductor split have a null conductor_rating).
        $query = Feedback::where('conductor_id', $conductorId)
            ->whereNotNull('conductor_rating');

        return $this->buildListResponse($query, $perPage, 'CONDUCTOR', $conductorId, 'conductor');
    }

    /**
     * List feedback for a driver, paginated, with summary stats.
     *
     * Used by GET /admin/feedback?driver_id=… — same admin flow as above but
     * for the driver role. Drivers live in the `drivers` table (not users).
     *
     * @throws FeedbackException If the driver doesn't exist.
     */
    public function listForDriver(string $driverId, int $perPage = 10): array
    {
        if (! Driver::where('id', $driverId)->exists()) {
            throw new FeedbackException('Driver not found');
        }

        $query = Feedback::where('driver_id', $driverId);

        return $this->buildListResponse($query, $perPage, 'DRIVER', $driverId);
    }

    /**
     * List the authenticated commuter's OWN feedback, newest first.
     *
     * Used by GET /commuter/feedback when the commuter explicitly browses
     * feedback history. Payment rows receive page-scoped feedback state from
     * PaymentController instead of downloading this entire history.
     *
     * Lightweight: returns only the feedback columns (no eager-loaded staff
     * names — the ride row already carries conductor_name + unit_number from
     * the payment history, so the read-only modal has everything it needs).
     *
     * @param  User  $commuter  The authenticated commuter (auth()->id()).
     * @param  int  $perPage  Page size (clamped 1–100 by the controller).
     */
    public function listForCommuter(User $commuter, int $perPage = 20): array
    {
        $paginator = Feedback::where('commuter_id', $commuter->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        /** @var LengthAwarePaginator $paginator */
        return [
            'feedback' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ];
    }

    /**
     * List all feedback for a single shift, scoped to the authenticated
     * conductor (a conductor may only read feedback for shifts they crewed).
     *
     * Powers GET /conductor/ratings — the conductor metrics page. Each row
     * carries BOTH the driver rating (rating/comment) and the independent
     * conductor rating (conductor_rating/conductor_comment); the frontend
     * splits each into a DRIVER + CONDUCTOR entry.
     *
     * @param  User  $conductor  The authenticated conductor (auth()->user()).
     * @return array<int, array<string, mixed>>
     */
    public function listForShift(string $shiftId, User $conductor): array
    {
        return Feedback::where('shift_id', $shiftId)
            ->where('conductor_id', $conductor->id)
            ->with(['commuter:id,first_name,surname'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Feedback $f): array => [
                'id' => $f->id,
                'shift_id' => $f->shift_id,
                'vehicle_id' => $f->vehicle_id,
                'driver_id' => $f->driver_id,
                'conductor_id' => $f->conductor_id,
                'commuter_id' => $f->commuter_id,
                'commuter_name' => $f->commuter
                    ? trim(($f->commuter->first_name ?? '').' '.($f->commuter->surname ?? '')) ?: null
                    : null,
                'rating' => $f->rating,
                'category' => $f->category,
                'comment' => $f->comment,
                'conductor_rating' => $f->conductor_rating,
                'conductor_category' => $f->conductor_category,
                'conductor_comment' => $f->conductor_comment,
                'created_at' => optional($f->created_at)->toIso8601String(),
            ])
            ->all();
    }

    /**
     * Build the paginated + summary response shape shared by both
     * listForConductor() and listForDriver().
     *
     * The paginator is mapped to a plain array so the controller can hand it
     * straight to successResponse() without further shaping.
     */
    private function buildListResponse(Builder $query, int $perPage, string $role, string $staffId, string $ratee = 'driver'): array
    {
        // For the conductor listing, the relevant score lives in the
        // conductor_* columns. We aggregate over those and expose them under
        // the canonical rating/category/comment keys so the admin modal +
        // conductor metrics render the CONDUCTOR's own rating, not the driver's.
        $ratingColumn = $ratee === 'conductor' ? 'conductor_rating' : 'rating';

        // Aggregate in SQL without loading feedback rows or their relations.
        // The rating column is selected only from this private whitelist.
        $aggregate = (clone $query)
            ->toBase()
            ->selectRaw(implode(', ', [
                'COUNT(*) as total_count',
                "AVG({$ratingColumn}) as average_rating",
                ...array_map(
                    fn (int $star): string => "SUM(CASE WHEN {$ratingColumn} = {$star} THEN 1 ELSE 0 END) as rating_{$star}",
                    range(1, 5),
                ),
            ]))
            ->first();

        $total = (int) ($aggregate->total_count ?? 0);
        $summary = [
            'average_rating' => $total > 0 ? round((float) $aggregate->average_rating, 2) : 0.0,
            'total_count' => $total,
            'distribution' => collect(range(5, 1))->mapWithKeys(fn (int $star): array => [
                (string) $star => (int) ($aggregate->{"rating_{$star}"} ?? 0),
            ])->all(),
        ];

        $paginator = $query
            ->with(['vehicle:id,unit_number,plate_number', 'commuter:id,first_name,surname'])
            ->orderByDesc('created_at')
            ->paginate($perPage);

        // Remap the conductor columns onto rating/category/comment so the
        // response shape stays identical for both driver and conductor.
        $items = collect($paginator->items())->map(function (Feedback $f) use ($ratee) {
            if ($ratee === 'conductor') {
                $f->setAttribute('rating', $f->conductor_rating);
                $f->setAttribute('category', $f->conductor_category);
                $f->setAttribute('comment', $f->conductor_comment);
            }

            return $f;
        })->all();

        /** @var LengthAwarePaginator $paginator */
        return [
            'staff' => [
                'id' => $staffId,
                'role' => $role,
            ],
            'summary' => $summary,
            'feedback' => $items,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ];
    }

    /**
     * Compute aggregate stats from a collection of Feedback rows.
     *
     * Returns:
     *   - average_rating: float rounded to 2dp (0.0 when no feedback)
     *   - total_count:    int
     *   - distribution:   array keyed 5→1 with per-star counts
     */
}
