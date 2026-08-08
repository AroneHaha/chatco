<?php

namespace App\Http\Controllers\Commuter;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Commuter\ChangePasswordRequest;
use App\Http\Requests\Commuter\UpdateLocationRequest;
use App\Http\Requests\Commuter\UpdateProfileRequest;
use App\Models\CommuterLocation;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\Voucher;
use App\Services\CommuterService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommuterController extends Controller
{
    use ApiResponse;

    public function __construct(
        private CommuterService $commuterService
    ) {}

    /**
     * GET /api/v1/commuter/profile
     *
     * Returns the authenticated commuter's User + CommuterProfile.
     * Never exposes password/token fields. 404 if the profile row is missing.
     */
    public function profile(Request $request): JsonResponse
    {
        $payload = $this->commuterService->getProfile($request->user());

        if ($payload === null) {
            return $this->errorResponse('Commuter profile not found', 404);
        }

        return $this->successResponse($payload, 'Profile retrieved');
    }

    /**
     * PUT /api/v1/commuter/profile
     *
     * Updates only the editable fields (contact_number, language_preference).
     * Email/role/identity fields are immutable and stripped by the FormRequest.
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $payload = $this->commuterService->updateProfile(
            $request->user(),
            $request->validated(),
        );

        if ($payload === null) {
            return $this->errorResponse('Commuter profile not found', 404);
        }

        return $this->successResponse($payload, 'Profile updated');
    }

    /**
     * POST /api/v1/commuter/change-password
     *
     * Verifies the current password before rotating. A wrong current password
     * (or reusing the same password) is surfaced as a 422 by the service.
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->commuterService->changePassword(
            $request->user(),
            $validated['current_password'],
            $validated['password'],
        );

        return $this->successResponse(null, 'Password updated successfully');
    }

    public function trips(Request $request): JsonResponse
    {
        $profileId = $request->user()->commuterProfile?->id;

        if (! $profileId) {
            return $this->successResponse([], 'No commuter profile found');
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);

        $trips = Transaction::query()
            ->where('passenger_id', $profileId)
            ->where('status', 'PAID')
            ->with('paymentGroup:id,reference_number')
            ->orderByDesc('paid_at')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->through(fn (Transaction $trip) => [
                'id' => $trip->transaction_id,
                'pickup' => $trip->pickup_name,
                'dropoff' => $trip->dropoff_name,
                'paymentMethod' => $trip->payment_method->value,
                'amount' => (float) $trip->final_amount,
                'passengerRole' => $trip->passenger_role,
                'conductorName' => $trip->conductor_name,
                'driverName' => $trip->driver_name,
                'unitNumber' => $trip->unit_number,
                'paidAt' => $trip->paid_at?->toIso8601String(),
                'createdAt' => $trip->created_at?->toIso8601String(),
                'multiplePaymentReference' => $trip->paymentGroup?->reference_number,
            ]);

        return $this->successResponse($trips, 'Trip history retrieved');
    }

    public function updateLocation(UpdateLocationRequest $request): JsonResponse
    {
        $profileId = $request->user()->commuterProfile?->id;

        if (! $profileId) {
            return $this->errorResponse('Commuter profile required.', 422);
        }

        $location = CommuterLocation::updateOrCreate(
            ['commuter_id' => $profileId],
            $request->validated(),
        );

        return $this->successResponse([
            'updatedAt' => $location->updated_at?->toIso8601String(),
        ], 'Location updated');
    }

    /**
     * GET /api/v1/commuter/rewards
     *
     * Returns the commuter's reward progress + earned vouchers.
     *
     * Reward logic:
     *   - Every N paid rides (configurable via `rides_for_free_reward` setting,
     *     default 10) = 1 free ride voucher.
     *   - Only CASH + GCASH PAID rides count toward the reward cycle.
     *     VOUCHER rides (free rides) do NOT count.
     *   - Qualifying payment/receipt events issue vouchers idempotently.
     *   - Each voucher expires 30 days after its cycle-completing event.
     *   - This endpoint only reads progress and issued voucher state.
     */
    public function rewards(): JsonResponse
    {
        $user = request()->user();
        $profile = $user->commuterProfile;

        if (! $profile) {
            return $this->errorResponse('Commuter profile required.', 422);
        }

        // Configurable threshold (default 10 rides = 1 free ride). The model
        // validates legacy/manual values too, guaranteeing a non-zero divisor.
        $ridesForFreeReward = Setting::ridesForFreeReward();

        // Count PAID non-voucher rides (CASH + GCASH only — voucher rides
        // are free and don't count toward the next reward).
        $totalRides = Transaction::where('passenger_id', $profile->id)
            ->where('status', 'PAID')
            ->where('payment_method', '!=', PaymentMethod::VOUCHER->value)
            ->where('reward_eligible', true)
            ->whereNull('payment_reconciliation_status')
            ->count();

        // Current cycle progress (rides since last voucher earned).
        $currentCycleRides = $totalRides % $ridesForFreeReward;

        // Expiry normalization remains a targeted status maintenance step;
        // unlike the former flow, this read endpoint never creates rewards.
        Voucher::expireAvailableForCommuter($profile->id);

        // Fetch all the commuter's vouchers (reward + admin-assigned).
        $vouchers = Voucher::where('commuter_id', $profile->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($v) {
                return [
                    'id' => $v->id,
                    'code' => $v->code,
                    'status' => $v->status,
                    'expiresAt' => $v->expires_at?->toIso8601String(),
                    'rideOrigin' => $v->ride_origin ?? 'Reward',
                ];
            });

        $availableVoucherCount = $vouchers
            ->where('status', Voucher::STATUS_AVAILABLE)
            ->count();

        return $this->successResponse([
            'totalRides' => $totalRides,
            // The cycle threshold (e.g. 10) — the frontend derives progress and
            // "rides remaining" from currentCycleRides against this total.
            'ridesNeeded' => $ridesForFreeReward,
            'currentCycleRides' => $currentCycleRides,
            'availableVoucherCount' => $availableVoucherCount,
            'vouchers' => $vouchers,
        ], 'Rewards retrieved');
    }
}
