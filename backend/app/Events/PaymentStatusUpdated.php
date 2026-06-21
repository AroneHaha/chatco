<?php

namespace App\Events;

use App\Models\Transaction;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatched when a transaction's payment status changes via the
 * PayMongo webhook (S4-T6).
 *
 * Broadcasts on the transaction-scoped public channel so both the
 * conductor (S4-T10) and the commuter (S4-T12) receive the update
 * in real time and can flip to the success/failure modal without
 * polling. Polling GET /payments/{id}/status remains as a fallback.
 *
 * Channel: payments.{transactionId}  (public — matches existing
 * `vehicles` channel convention; minimal data leakage risk because
 * the payload contains no PII, only the transaction id + status)
 *
 * Triggered by:
 *   - PaymentController::webhook() on `payment.paid` events
 *     (calls TransactionService::markPaid() then broadcasts this)
 *   - PaymentController::webhook() on `payment.failed` events
 *     (calls TransactionService::markFailed() then broadcasts this)
 */
class PaymentStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Transaction $transaction;

    public string $status;

    public function __construct(Transaction $transaction, string $status)
    {
        $this->transaction = $transaction;
        $this->status = $status;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('payments.' . $this->transaction->transaction_id);
    }

    public function broadcastAs(): string
    {
        return 'PaymentStatusUpdated';
    }

    public function broadcastWith(): array
    {
        return [
            'transaction_id' => $this->transaction->transaction_id,
            'status'         => $this->status,
            'paid_at'        => $this->transaction->paid_at?->toIso8601String(),
        ];
    }
}
