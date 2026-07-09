<?php

namespace App\Http\Controllers\Payment;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Commuter\ClaimGcashRequest;
use App\Models\Transaction;
use App\Services\PaymentService;
use App\Services\TransactionService;
use App\Support\Payments\PaymentGatewayException;
use App\Support\Payments\WebhookEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Thin controller for commuter payment actions, status polling, the
 * provider-agnostic webhook entry point, and a dev-only simulation hook.
 *
 * All business/payment logic lives in TransactionService / PaymentService.
 *
 * Routes (api/v1):
 *   POST /commuter/payments/claim        -> claim()    (role:COMMUTER)
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

        return $this->successResponse([
            'status' => $transaction->status->value,
            'paid_at' => $transaction->paid_at?->toIso8601String(),
        ], 'Transaction status retrieved');
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
