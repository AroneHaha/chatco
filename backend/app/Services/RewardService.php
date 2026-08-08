<?php

namespace App\Services;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\CommuterProfile;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\Voucher;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Issues free-ride vouchers when a paid, account-bound ride completes a cycle.
 *
 * Callers invoke this from the qualifying payment/claim transaction. Locking
 * the commuter profile serializes competing rides for one commuter, while the
 * database's reward-cycle unique key remains the final idempotency guarantee.
 */
class RewardService
{
    public const VOUCHER_VALIDITY_DAYS = 30;

    /**
     * @return Collection<int, Voucher> Vouchers created by this invocation.
     */
    public function issueForRewardableRide(
        Transaction $transaction,
        CarbonInterface $earnedAt,
    ): Collection {
        return DB::transaction(function () use ($transaction, $earnedAt): Collection {
            $ride = Transaction::query()
                ->lockForUpdate()
                ->find($transaction->transaction_id);

            if (! $ride || ! $this->isRewardable($ride)) {
                return new Collection;
            }

            $commuter = CommuterProfile::query()
                ->whereKey($ride->passenger_id)
                ->lockForUpdate()
                ->first();

            if (! $commuter) {
                return new Collection;
            }

            $threshold = Setting::ridesForFreeReward();
            $rewardableRides = $this->rewardableRides($commuter->id);
            $earnedCycles = intdiv((clone $rewardableRides)->count(), $threshold);

            if ($earnedCycles < 1) {
                return new Collection;
            }

            $existingCycles = Voucher::query()
                ->where('commuter_id', $commuter->id)
                ->where('type', 'REWARD')
                ->whereNotNull('reward_cycle_number')
                ->whereBetween('reward_cycle_number', [1, $earnedCycles])
                ->pluck('reward_cycle_number')
                ->mapWithKeys(fn ($cycle): array => [(int) $cycle => true]);

            $created = new Collection;
            for ($cycle = 1; $cycle <= $earnedCycles; $cycle++) {
                if ($existingCycles->has($cycle)) {
                    continue;
                }

                $completionRide = (clone $rewardableRides)
                    ->orderBy('paid_at')
                    ->orderBy('created_at')
                    ->orderBy('transaction_id')
                    ->offset(($cycle * $threshold) - 1)
                    ->first(['transaction_id', 'paid_at', 'created_at']);

                $cycleEarnedAt = $completionRide?->transaction_id === $ride->transaction_id
                    ? $earnedAt
                    : ($completionRide?->paid_at ?? $completionRide?->created_at ?? $earnedAt);

                $voucher = Voucher::firstOrCreate(
                    [
                        'commuter_id' => $commuter->id,
                        'type' => 'REWARD',
                        'reward_cycle_number' => $cycle,
                    ],
                    [
                        'code' => 'REWARD-'.strtoupper(Str::random(8)),
                        'status' => Voucher::STATUS_AVAILABLE,
                        'amount' => 0,
                        'expires_at' => $cycleEarnedAt->copy()->addDays(self::VOUCHER_VALIDITY_DAYS),
                        'ride_origin' => "{$cycle}th Ride Reward",
                    ],
                );

                if ($voucher->wasRecentlyCreated) {
                    $created->push($voucher);
                }
            }

            return $created;
        }, 3);
    }

    private function isRewardable(Transaction $transaction): bool
    {
        return $transaction->passenger_id !== null
            && $transaction->status === PaymentStatus::PAID
            && $transaction->payment_method !== PaymentMethod::VOUCHER
            && $transaction->reward_eligible
            && $transaction->payment_reconciliation_status === null;
    }

    private function rewardableRides(string $commuterId): Builder
    {
        return Transaction::query()
            ->where('passenger_id', $commuterId)
            ->where('status', PaymentStatus::PAID->value)
            ->where('payment_method', '!=', PaymentMethod::VOUCHER->value)
            ->where('reward_eligible', true)
            ->whereNull('payment_reconciliation_status');
    }
}
