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
    public const VOUCHER_VALIDITY_DAYS = 3;

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

            // A rule version is assigned in the same transaction as voucher
            // issuance. Its presence makes webhook/claim retries a no-op and
            // prevents an old ride from moving into a newer threshold version.
            if ($ride->reward_rule_version !== null) {
                return new Collection;
            }

            $commuterId = $ride->passenger_id;
            if (! CommuterProfile::query()->whereKey($commuterId)->exists()) {
                return new Collection;
            }

            $rule = Setting::rewardRule(lockForUpdate: true);
            $threshold = $rule['threshold'];
            $ruleVersion = $rule['version'];

            $ride->update([
                'reward_rule_version' => $ruleVersion,
                'reward_earned_at' => $earnedAt,
            ]);

            $rewardableRides = $this->rewardableRides($commuterId, $ruleVersion);
            $earnedCycles = intdiv((clone $rewardableRides)->count(), $threshold);
            $issuedCyclesInRule = Voucher::query()
                ->where('commuter_id', $commuterId)
                ->where('type', 'REWARD')
                ->whereNotNull('reward_cycle_number')
                ->where('reward_rule_version', $ruleVersion)
                ->count();

            // Most rides do not complete a cycle. Avoid serializing every paid
            // ride on the commuter profile when no voucher can be generated.
            if ($earnedCycles < 1 || $issuedCyclesInRule >= $earnedCycles) {
                return new Collection;
            }

            $commuter = CommuterProfile::query()
                ->whereKey($commuterId)
                ->lockForUpdate()
                ->first();
            if (! $commuter) {
                return new Collection;
            }

            // Soft deletion does not release the database unique key. Lock and
            // restore the original earned vouchers so their identity remains
            // the idempotency record for those completed cycles.
            $deletedRewardVouchers = Voucher::onlyTrashed()
                ->where('commuter_id', $commuterId)
                ->where('type', 'REWARD')
                ->whereNotNull('reward_cycle_number')
                ->lockForUpdate()
                ->get();
            foreach ($deletedRewardVouchers as $deletedRewardVoucher) {
                $deletedRewardVoucher->restore();
            }

            // Recheck after obtaining the profile lock: another qualifying
            // request may have issued the cycle while this request waited.
            $rewardableRides = $this->rewardableRides($commuterId, $ruleVersion);
            $earnedCycles = intdiv((clone $rewardableRides)->count(), $threshold);

            if ($earnedCycles < 1) {
                return new Collection;
            }

            $issuedCyclesInRule = Voucher::query()
                ->where('commuter_id', $commuterId)
                ->where('type', 'REWARD')
                ->whereNotNull('reward_cycle_number')
                ->where('reward_rule_version', $ruleVersion)
                ->count();

            if ($issuedCyclesInRule >= $earnedCycles) {
                return new Collection;
            }

            $nextGlobalCycle = ((int) Voucher::query()
                ->where('commuter_id', $commuterId)
                ->where('type', 'REWARD')
                ->whereNotNull('reward_cycle_number')
                ->max('reward_cycle_number')) + 1;

            $created = new Collection;
            for ($ruleCycle = $issuedCyclesInRule + 1; $ruleCycle <= $earnedCycles; $ruleCycle++) {
                $completionRide = (clone $rewardableRides)
                    ->orderBy('reward_earned_at')
                    ->orderBy('created_at')
                    ->orderBy('transaction_id')
                    ->offset(($ruleCycle * $threshold) - 1)
                    ->first(['transaction_id', 'reward_earned_at']);

                $cycleEarnedAt = $completionRide?->reward_earned_at ?? $earnedAt;
                $globalCycle = $nextGlobalCycle + ($ruleCycle - $issuedCyclesInRule - 1);

                $voucher = Voucher::withTrashed()
                    ->where('commuter_id', $commuterId)
                    ->where('type', 'REWARD')
                    ->where('reward_cycle_number', $globalCycle)
                    ->lockForUpdate()
                    ->first();

                if ($voucher) {
                    if ($voucher->trashed()) {
                        $voucher->restore();
                    }
                } else {
                    $voucher = Voucher::create([
                        'commuter_id' => $commuterId,
                        'type' => 'REWARD',
                        'reward_cycle_number' => $globalCycle,
                        'code' => 'REWARD-'.strtoupper(Str::random(8)),
                        'status' => Voucher::STATUS_AVAILABLE,
                        'amount' => 0,
                        'reward_rule_version' => $ruleVersion,
                        'reward_earned_at' => $cycleEarnedAt,
                        'expires_at' => $cycleEarnedAt->copy()->addDays(self::VOUCHER_VALIDITY_DAYS),
                        'ride_origin' => "{$globalCycle}th Ride Reward",
                    ]);
                }

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

    private function rewardableRides(string $commuterId, int $ruleVersion): Builder
    {
        return Transaction::query()
            ->where('passenger_id', $commuterId)
            ->where('status', PaymentStatus::PAID->value)
            ->where('payment_method', '!=', PaymentMethod::VOUCHER->value)
            ->where('reward_eligible', true)
            ->whereNull('payment_reconciliation_status')
            ->where('reward_rule_version', $ruleVersion)
            ->whereNotNull('reward_earned_at');
    }
}
