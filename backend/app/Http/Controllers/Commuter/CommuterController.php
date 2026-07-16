<?php

namespace App\Http\Controllers\Commuter;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commuter\ChangePasswordRequest;
use App\Http\Requests\Commuter\UpdateProfileRequest;
use App\Enums\PaymentMethod;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\Voucher;
use App\Services\CommuterService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

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

    public function trips(): JsonResponse
    {
        return $this->notImplementedResponse();
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
     *   - Vouchers are auto-generated on fetch when the commuter has earned
     *     a new one (idempotent — checks existing count first).
     *   - Each voucher expires 30 days after generation.
     */
    public function rewards(): JsonResponse
    {
        $user = request()->user();
        $profile = $user->commuterProfile;

        if (! $profile) {
            return $this->errorResponse('Commuter profile required.', 422);
        }

        // Configurable threshold (default 10 rides = 1 free ride).
        $ridesForFreeReward = (int) (Setting::where('key', 'rides_for_free_reward')->value('value') ?? 10);

        // Count PAID non-voucher rides (CASH + GCASH only — voucher rides
        // are free and don't count toward the next reward).
        $totalRides = Transaction::where('passenger_id', $profile->id)
            ->where('status', 'PAID')
            ->where('payment_method', '!=', PaymentMethod::VOUCHER->value)
            ->count();

        // Current cycle progress (rides since last voucher earned).
        $currentCycleRides = $totalRides % $ridesForFreeReward;

        // Auto-generate missing reward vouchers.
        // earned = how many vouchers the commuter should have based on ride count.
        // existing = how many REWARD-type vouchers already exist in the DB.
        $earned = intdiv($totalRides, $ridesForFreeReward);
        $existingVoucherCount = Voucher::where('commuter_id', $profile->id)
            ->where('type', 'REWARD')
            ->count();

        if ($earned > $existingVoucherCount) {
            $toGenerate = $earned - $existingVoucherCount;
            for ($i = 0; $i < $toGenerate; $i++) {
                $cycleNumber = $existingVoucherCount + $i + 1;
                Voucher::create([
                    'commuter_id'  => $profile->id,
                    'code'         => 'REWARD-' . strtoupper(\Str::random(8)),
                    'type'         => 'REWARD',
                    'status'       => 'AVAILABLE',
                    'amount'       => 0, // Free ride — no monetary value
                    'expires_at'   => now()->addDays(30),
                    'ride_origin'  => "{$cycleNumber}th Ride Reward",
                ]);
            }
        }

        // Fetch all the commuter's vouchers (reward + admin-assigned).
        $vouchers = Voucher::where('commuter_id', $profile->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($v) {
                return [
                    'id'          => $v->id,
                    'code'        => $v->code,
                    'status'      => $v->status,
                    'expiresAt'   => $v->expires_at?->toIso8601String(),
                    'rideOrigin'  => $v->ride_origin ?? 'Reward',
                ];
            });

        return $this->successResponse([
            'totalRides'       => $totalRides,
            // The cycle threshold (e.g. 10) — the frontend derives progress and
            // "rides remaining" from currentCycleRides against this total.
            'ridesNeeded'      => $ridesForFreeReward,
            'currentCycleRides'=> $currentCycleRides,
            'vouchers'         => $vouchers,
        ], 'Rewards retrieved');
    }
}
