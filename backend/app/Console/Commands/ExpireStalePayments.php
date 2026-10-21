<?php

namespace App\Console\Commands;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Transaction;
use App\Services\PaymentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Background safety net for unresolved GCash payments. Webhooks and the
 * read-path reconciliation (status polling, the conductor's pending lookup)
 * remain the primary mechanisms; this only covers rows nobody is looking at.
 *
 *   - stale PENDING rows: reconciled with the provider first (the commuter
 *     may already have authorized), then expired if still PENDING;
 *   - PROCESSING rows: reconciled only — they are never expired, because
 *     PayMongo can still settle them.
 */
class ExpireStalePayments extends Command
{
    protected $signature = 'payments:expire-stale';

    protected $description = 'Reconcile unresolved GCash payments with the provider and expire abandoned pending ones';

    public function __construct(private PaymentService $payments)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $ttl = max(1, (int) config('payments.gcash_claim_ttl_minutes', 10));
        $expired = 0;
        $reconciled = 0;
        $failed = 0;

        Transaction::query()
            ->where('payment_method', PaymentMethod::GCASH->value)
            ->where(function ($query) use ($ttl): void {
                $query->where('status', PaymentStatus::PROCESSING->value)
                    ->orWhere(function ($query) use ($ttl): void {
                        $query->where('status', PaymentStatus::PENDING->value)
                            ->where('created_at', '<=', now()->subMinutes($ttl));
                    });
            })
            ->orderBy('transaction_id')
            ->chunkById(100, function ($transactions) use (&$expired, &$reconciled, &$failed): void {
                foreach ($transactions as $transaction) {
                    try {
                        $before = $transaction->status;
                        $result = $this->payments->reconcileIfDue($transaction);
                        if ($result->status !== $before) {
                            $reconciled++;
                        }

                        $result = $this->payments->expireIfStale($result);
                        if ($result->status === PaymentStatus::EXPIRED) {
                            $expired++;
                        }
                    } catch (\Throwable $error) {
                        $failed++;
                        Log::error('Stale payment expiration failed', [
                            'transaction_id' => $transaction->transaction_id,
                            'exception' => $error::class,
                            'message' => $error->getMessage(),
                        ]);
                    }
                }
            }, 'transaction_id', 'transaction_id');

        $this->info("Payment expiration summary: reconciled={$reconciled}, expired={$expired}, failed={$failed}.");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
