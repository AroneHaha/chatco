<?php

namespace App\Http\Controllers\Payment;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Commuter\ClaimGcashRequest;
use App\Http\Requests\Commuter\ClaimReceiptRequest;
use App\Models\Transaction;
use App\Services\PaymentService;
use App\Services\TransactionService;
use App\Support\Payments\PaymentGatewayException;
use App\Support\Payments\WebhookEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Thin controller for commuter payment actions, status polling, the
 * provider-agnostic webhook entry point, and a dev-only simulation hook.
 *
 * All business/payment logic lives in TransactionService / PaymentService.
 *
 * Routes (api/v1):
 *   POST /commuter/payments/claim        -> claim()        (role:COMMUTER)
 *   POST /commuter/receipts/claim        -> claimReceipt() (role:COMMUTER)
 *   GET  /commuter/payments              -> history()  (role:COMMUTER, paginated)
 *   GET  /payments/{id}/status           -> status()   (auth, owner only)
 *   POST /payments/{id}/simulate         -> simulate() (auth, DEV only)
 *   POST /payments/webhook               -> webhook()  (public, signature-verified)
 */
class PaymentController extends Controller
{
    use ApiResponse;

    public function __construct(
        private TransactionService $transactionService,
        private PaymentService $paymentService,
    ) {}

    public function claim(ClaimGcashRequest $request): JsonResponse
    {
        $result = $this->transactionService->claimGcash(
            $request->user(),
            $request->validated()['qr_token'],
        );

        return $this->successResponse($result, 'GCash transaction claimed');
    }

    /**
     * POST /commuter/receipts/claim — bind a paper cash receipt to the
     * authed commuter so the ride counts toward their reward cycle.
     */
    public function claimReceipt(ClaimReceiptRequest $request): JsonResponse
    {
        $result = $this->transactionService->claimCashReceipt(
            $request->user(),
            $request->validated()['qr_token'],
        );

        return $this->successResponse(
            $result,
            $result['already_claimed'] ? 'Receipt already claimed' : 'Receipt claimed',
        );
    }

    /**
     * GET /commuter/payments — the authed commuter's payment history,
     * paginated and newest-first. Only rows bound to this commuter
     * (passenger_id) are returned.
     */
    public function history(Request $request): JsonResponse
    {
        $commuterProfileId = $request->user()->commuterProfile?->id;

        if (! $commuterProfileId) {
            return $this->successResponse([], 'No commuter profile found');
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);

        $payments = Transaction::query()
            ->where('passenger_id', $commuterProfileId)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->successResponse($payments, 'Payment history retrieved');
    }

    /**
     * GET /payments/{id}/status — fast DB read of current status (the webhook
     * keeps it fresh). Authorized to the conductor who owns the shift or the
     * bound commuter.
     *
     * PROVIDER RECONCILIATION (fallback when the webhook is delayed/missing):
     * If the row is still resolvable (PENDING GCash, or EXPIRED inside the
     * late-settlement grace window) AND has a real payment_reference, we
     * periodically poll PayMongo directly and apply any state transition the
     * webhook would have applied. This is rate-limited per-transaction via a
     * cache key so a 3s-poll client doesn't hammer the provider API.
     */
    public function status(Request $request, string $id): JsonResponse
    {
        $transaction = Transaction::with('shiftLog:shift_id,conductor_id')
            ->where('transaction_id', $id)
            ->first();

        if (! $transaction) {
            return $this->errorResponse('Transaction not found', 404);
        }

        if (! $this->userOwnsTransaction($request->user(), $transaction)) {
            return $this->errorResponse('Forbidden', 403);
        }

        // Lazily expire a stale PENDING GCash row so pollers see EXPIRED
        // instead of a PENDING that can never complete (no cron needed).
        $transaction = $this->paymentService->expireIfStale($transaction);

        // Reconcile with the provider when the row could still resolve.
        // Skipped when:
        //   - the gateway isn't configured (FakeGateway never has new info),
        //   - the row has no payment_reference (FakeGateway or pre-init),
        //   - the row is already hard-terminal (PAID/FAILED/CANCELLED/REFUNDED),
        //   - the cache throttle window hasn't elapsed since the last sync.
        $transaction = $this->maybeReconcileWithProvider($transaction);

        return $this->successResponse([
            'status' => $transaction->status->value,
            'paid_at' => $transaction->paid_at?->toIso8601String(),
        ], 'Transaction status retrieved');
    }

    /**
     * Reconcile the local status with the provider, rate-limited per
     * transaction via a cache key. Catches the case where PayMongo's webhook
     * is delayed or never arrives (e.g. local dev without ngrok, network
     * blip) — the commuter authorized on PayMongo but the DB still says
     * PENDING. Without this, polling would echo PENDING forever.
     *
     * Triggers for:
     *   - PENDING GCash rows (the common case — commuter is mid-checkout),
     *   - EXPIRED GCash rows inside the late-settlement grace window (the
     *     commuter may have authorized just before the local TTL lapsed).
     *
     * Safe no-op for: hard-terminal rows, non-GCASH rows, FakeGateway rows,
     * rows without a payment_reference, or when the throttle window is active.
     */
    private function maybeReconcileWithProvider(Transaction $transaction): Transaction
    {
        $throttleSeconds = (int) config('payments.reconcile_throttle_seconds', 30);
        if ($throttleSeconds <= 0) {
            return $transaction; // reconciliation disabled by config
        }

        // Only GCash rows can have a provider to reconcile with.
        if ($transaction->payment_method !== PaymentMethod::GCASH) {
            return $transaction;
        }

        // Only resolvable rows are worth reconciling.
        $isPending = $transaction->status === PaymentStatus::PENDING;
        $isLateSettleable = $transaction->status === PaymentStatus::EXPIRED
            && $this->withinLateSettlementWindow($transaction);
        if (! $isPending && ! $isLateSettleable) {
            return $transaction;
        }

        // Need a real provider reference (FakeGateway rows have fake_ refs but
        // we don't want to call PayMongo for those either — skip if the
        // gateway itself isn't configured).
        if (! $transaction->payment_reference) {
            return $transaction;
        }
        if (! $this->paymentService->isGatewayConfigured()) {
            return $transaction;
        }

        // Rate-limit: one provider round-trip per transaction per window.
        // Concurrent polls share the same cache key, so only one wins the
        // race — the rest read the freshly-updated row.
        $cacheKey = "payment.sync.{$transaction->transaction_id}";
        if (! Cache::add($cacheKey, now()->timestamp, $throttleSeconds)) {
            return $transaction; // another poller is already syncing (or recently did)
        }

        try {
            $transaction = $this->paymentService->syncStatus($transaction);
        } catch (PaymentGatewayException $e) {
            // Provider call failed (network, 5xx, etc.). Log + move on — the
            // cached row is still authoritative for the response, and the
            // next throttle window will retry.
            Log::warning('Payment provider reconciliation failed', [
                'transaction_id' => $transaction->transaction_id,
                'reference' => $transaction->payment_reference,
                'error' => $e->getMessage(),
            ]);

            // Release the throttle so the next poll can retry sooner.
            Cache::forget($cacheKey);
        }

        return $transaction;
    }

    /**
     * Whether an EXPIRED GCash transaction is still inside the late-settlement
     * grace window — the window during which a delayed PayMongo webhook could
     * still flip it to PAID. Past this window, reconciliation is futile.
     */
    private function withinLateSettlementWindow(Transaction $transaction): bool
    {
        $graceSeconds = (int) config('payments.late_settlement_grace_seconds', 60);
        if ($graceSeconds <= 0) {
            return false;
        }

        $updated = $transaction->updated_at;
        if (! $updated) {
            return true; // unknown — give the benefit of the doubt
        }

        return $updated->gt(now()->subSeconds($graceSeconds));
    }

    /**
     * POST /payments/{id}/simulate — DEV ONLY (config payments.allow_simulation).
     *
     * Drives a PENDING GCash payment to a terminal status THROUGH THE REAL
     * webhook/state-machine path, so GCash can be demonstrated before real
     * provider keys exist. Disabled in production.
     */
    public function simulate(Request $request, string $id): JsonResponse
    {
        if (! config('payments.allow_simulation')) {
            return $this->errorResponse('Payment simulation is disabled.', 403);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:PAID,FAILED',
        ]);

        $transaction = Transaction::with('shiftLog:shift_id,conductor_id')
            ->where('transaction_id', $id)
            ->first();

        if (! $transaction) {
            return $this->errorResponse('Transaction not found', 404);
        }
        if (! $this->userOwnsTransaction($request->user(), $transaction)) {
            return $this->errorResponse('Forbidden', 403);
        }
        if ($transaction->payment_method !== PaymentMethod::GCASH) {
            return $this->errorResponse('Only GCash transactions can be simulated.', 422);
        }

        $event = new WebhookEvent(
            id: 'sim_'.Str::uuid()->toString(),
            type: 'simulated.'.strtolower($validated['status']),
            reference: $transaction->payment_reference ?? $transaction->transaction_id,
            status: PaymentStatus::from($validated['status']),
            metadata: ['transaction_id' => $transaction->transaction_id],
        );

        $transaction = $this->paymentService->applyWebhookEvent($event) ?? $transaction->fresh();

        return $this->successResponse([
            'status' => $transaction->status->value,
        ], 'Payment simulated');
    }

    /**
     * POST /payments/{id}/cancel
     *
     * Cancels a PENDING GCash payment. Only the conductor of the shift that
     * owns the transaction can cancel it. The state machine guards the
     * transition (PENDING → CANCELLED is allowed; PAID/FAILED/etc. are
     * terminal and will be rejected).
     *
     * Use case: the commuter didn't scan the QR in time, or changed their
     * mind. The conductor cancels instead of waiting for the 5-minute TTL.
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $transaction = Transaction::with('shiftLog:shift_id,conductor_id')
            ->where('transaction_id', $id)
            ->first();

        if (! $transaction) {
            return $this->errorResponse('Transaction not found', 404);
        }

        if (! $this->userOwnsTransaction($request->user(), $transaction)) {
            return $this->errorResponse('Forbidden', 403);
        }

        if ($transaction->payment_method !== PaymentMethod::GCASH) {
            return $this->errorResponse('Only GCash transactions can be cancelled.', 422);
        }

        if ($transaction->status !== PaymentStatus::PENDING) {
            return $this->errorResponse(
                "Cannot cancel a {$transaction->status->value} payment. Only PENDING payments can be cancelled.",
                422
            );
        }

        // Transition through the state machine (PENDING → CANCELLED).
        // This respects the canTransitionTo guard + broadcasts PaymentStatusUpdated.
        $updated = $this->paymentService->transitionTo($transaction, PaymentStatus::CANCELLED);

        return $this->successResponse([
            'status' => $updated->status->value,
        ], 'Payment cancelled');
    }

    /**
     * POST /payments/webhook — public, server-to-server.
     *
     * Provider-agnostic: the bound gateway supplies its signature header,
     * verifies the body, and parses it into a canonical WebhookEvent.
     * PaymentService then applies it exactly once (payment_events idempotency)
     * through the guarded state machine. Always 200 for accepted/ignored
     * events; 400 only for a bad signature (no state change).
     */
    public function webhook(Request $request): JsonResponse
    {
        $rawBody = $request->getContent();
        $signature = $request->header($this->paymentService->webhookSignatureHeader());

        try {
            $valid = $this->paymentService->verifyWebhookSignature($rawBody, $signature);
        } catch (PaymentGatewayException $e) {
            Log::error('Payment webhook not configured: '.$e->getMessage());

            return response()->json(['error' => 'Webhook not configured'], 500);
        }

        if (! $valid) {
            Log::warning('Payment webhook: invalid signature');

            return response()->json(['error' => 'Invalid signature'], 400);
        }

        $event = $this->paymentService->parseWebhookEvent($rawBody);
        if (! $event) {
            // Unhandled / malformed event type — acknowledge so the provider
            // stops retrying, but record nothing.
            return response()->json(['received' => true, 'handled' => false], 200);
        }

        $transaction = $this->paymentService->applyWebhookEvent($event);
        if (! $transaction) {
            Log::warning('Payment webhook: no matching transaction', [
                'reference' => $event->reference,
            ]);
        }

        return response()->json(['received' => true], 200);
    }

    /**
     * Whether the user is the conductor who owns the transaction's shift or
     * the commuter bound to it.
     */
    private function userOwnsTransaction($user, Transaction $transaction): bool
    {
        $shift = $transaction->shiftLog;
        if ($shift && $user->conductorProfile && $shift->conductor_id === $user->conductorProfile->id) {
            return true;
        }

        return $transaction->passenger_id
            && $user->commuterProfile
            && $transaction->passenger_id === $user->commuterProfile->id;
    }
}
