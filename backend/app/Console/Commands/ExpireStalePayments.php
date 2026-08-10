<?php

namespace App\Console\Commands;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Transaction;
use App\Services\PaymentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ExpireStalePayments extends Command
{
    protected $signature = 'payments:expire-stale';

    protected $description = 'Expire abandoned pending GCash simulation/sandbox transactions';

    public function __construct(private PaymentService $payments)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $ttl = max(1, (int) config('payments.gcash_claim_ttl_minutes', 10));
        $expired = 0;
        $failed = 0;

        Transaction::query()
            ->where('payment_method', PaymentMethod::GCASH->value)
            ->where('status', PaymentStatus::PENDING->value)
            ->where('created_at', '<=', now()->subMinutes($ttl))
            ->orderBy('transaction_id')
            ->chunkById(100, function ($transactions) use (&$expired, &$failed): void {
                foreach ($transactions as $transaction) {
                    try {
                        $result = $this->payments->expireIfStale($transaction);
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

        $this->info("Payment expiration summary: expired={$expired}, failed={$failed}.");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
