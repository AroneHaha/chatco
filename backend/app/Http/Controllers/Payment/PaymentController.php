<?php

namespace App\Http\Controllers\Payment;

use App\Events\PaymentStatusUpdated;
use App\Http\Controllers\Controller;
use App\Http\ApiResponse;
use App\Http\Requests\Commuter\ClaimGcashRequest;
use App\Models\Transaction;
use App\Services\PaymentService;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * PaymentController — thin controller for commuter payment actions +
 * the PayMongo webhook entry point.
 *
 * All business logic delegates to TransactionService. Controllers stay
 * thin per S4-T5 spec.
 *
 * Routes:
 *   POST /api/commuter/payments/claim   -> claim()       (role:COMMUTER)
 *   GET  /api/commuter/payments         -> history()     (role:COMMUTER)
 *   GET  /api/payments/{id}/status      -> status()      (auth:sanctum, any role)
 *   POST /api/payments/webhook          -> webhook()     (public, S4-T6)
 */
class PaymentController extends Controller
{
    use ApiResponse;

    public function __construct(
        private TransactionService $transactionService,
        private PaymentService $paymentService
    ) {}

    /**
     * POST /api/commuter/payments/claim
     *
     * Commuter scans the conductor's binding QR and claims the GCash
     * transaction. Delegates to TransactionService::claimGcash() which:
     *   - Finds the PENDING transaction by qr_token (404 if missing)
     *   - Checks expiry (410 if expired or non-PENDING)
     *   - Binds passenger_id (idempotent for same commuter, 409 for
     *     different commuter)
     *
     * Returns the spec-mandated payload for the commuter app to redirect
     * to the PayMongo hosted checkout page.
     */
    public function claim(ClaimGcashRequest $request): JsonResponse
    {
        $result = $this->transactionService->claimGcash(
            $request->user(),
            $request->validated()['qr_token'],
        );

        return $this->successResponse($result, 'GCash transaction claimed');
    }

    /**
     * GET /api/commuter/payments
     *
     * Returns the authenticated commuter's payment history (cash + GCash).
     * Only transactions where passenger_id matches the commuter's
     * commuter_profile are returned.
     *
     * Note: cash fares where the conductor didn't enter a passenger
     * (passenger_id is null) will NOT appear here -- they appear in the
     * conductor's shift transactions list instead.
     */
    public function history(Request $request): JsonResponse
    {
        $commuter = $request->user();
        $commuterProfileId = $commuter->commuterProfile?->id;

        if (! $commuterProfileId) {
            return $this->successResponse([], 'No commuter profile found');
        }

        $transactions = Transaction::where('passenger_id', $commuterProfileId)
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->successResponse($transactions, 'Payment history retrieved');
    }

    /**
     * GET /api/payments/{id}/status
     *
     * Returns the current status of a transaction. Authorized to:
     *   - The conductor who owns the transaction's shift
     *   - The commuter who claimed the transaction (passenger_id)
     *
     * Returns 403 if the authenticated user is neither.
     */
    public function status(Request $request, string $id): JsonResponse
    {
        $transaction = Transaction::where('transaction_id', $id)->first();

        if (! $transaction) {
            return $this->errorResponse('Transaction not found', 404);
        }

        $user = $request->user();

        // Authorization check: conductor who owns the shift OR bound commuter
        $authorized = false;

        // Check 1: is the user the conductor of this transaction's shift?
        $shift = $transaction->shiftLog;
        if ($shift && $user->conductorProfile && $shift->conductor_id === $user->conductorProfile->id) {
            $authorized = true;
        }

        // Check 2: is the user the commuter who claimed this transaction?
        if (! $authorized && $transaction->passenger_id && $user->commuterProfile && $transaction->passenger_id === $user->commuterProfile->id) {
            $authorized = true;
        }

        if (! $authorized) {
            return $this->errorResponse('Forbidden', 403);
        }

        return $this->successResponse([
            'status' => $transaction->status,
            'paid_at' => $transaction->paid_at?->toIso8601String(),
        ], 'Transaction status retrieved');
    }

    /**
     * POST /api/v1/payments/webhook
     *
     * PayMongo webhook entry point. Verifies the signature, then
     * processes the event by type:
     *   - payment.paid:   markPaid() + broadcast PaymentStatusUpdated("PAID")
     *   - payment.failed: markFailed() + broadcast PaymentStatusUpdated("FAILED")
     *
     * Idempotency:
     *   - markPaid() / markFailed() are idempotent (no-op if already in
     *     that status). This handles PayMongo's retry behavior (PayMongo
     *     retries non-2xx responses; if our broadcast fails after the
     *     state change, PayMongo retries and we re-broadcast, which is
     *     fine — Pusher deduplicates by event id).
     *
     * Always returns 200 quickly for accepted events. Returns 400 for
     * invalid signatures (no state change). Returns 200 for unknown
     * event types (acknowledge to prevent retries, but log for debugging).
     *
     * SECURITY: The webhook is PUBLIC (no auth:sanctum). Authentication
     * is via the PayMongo webhook signature. The signature MUST be
     * verified BEFORE any state change.
     */
    public function webhook(Request $request): JsonResponse
    {
        // ─── 1. Get the RAW body (do NOT re-encode JSON) ─────────────
        // The signature is computed over the exact bytes PayMongo sent.
        // Laravel's $request->getContent() returns the raw body.
        $rawBody = $request->getContent();
        $signatureHeader = $request->header('Paymongo-Signature');

        // ─── 2. Verify the signature BEFORE any processing ───────────
        if (! $signatureHeader) {
            Log::warning('PayMongo webhook: missing Paymongo-Signature header');
            return response()->json(['error' => 'Missing signature'], 400);
        }

        try {
            $valid = $this->paymentService->verifyWebhookSignature($rawBody, $signatureHeader);
        } catch (\RuntimeException $e) {
            // Webhook secret not configured
            Log::error('PayMongo webhook: ' . $e->getMessage());
            return response()->json(['error' => 'Webhook not configured'], 500);
        }

        if (! $valid) {
            Log::warning('PayMongo webhook: invalid signature');
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        // ─── 3. Parse the event body ────────────────────────────────
        // PayMongo webhook body shape:
        //   {
        //     "data": {
        //       "id": "evt_...",
        //       "type": "event",
        //       "attributes": {
        //         "type": "payment.paid",
        //         "data": {
        //           "id": "pay_...",
        //           "type": "payment",
        //           "attributes": {
        //             "payment_intent_id": "pi_...",
        //             "status": "paid",
        //             ...
        //           }
        //         }
        //       }
        //     }
        //   }
        $payload = json_decode($rawBody, true);
        $eventType = $payload['data']['attributes']['type'] ?? null;
        $eventData = $payload['data']['attributes']['data'] ?? null;

        if (! $eventType || ! $eventData) {
            Log::warning('PayMongo webhook: malformed event body', ['body' => $rawBody]);
            return response()->json(['error' => 'Malformed event'], 200);
        }

        // ─── 4. Process by event type ───────────────────────────────
        switch ($eventType) {
            case 'payment.paid':
                $transaction = $this->resolveTransactionFromEvent($eventData);

                if (! $transaction) {
                    Log::warning('PayMongo webhook: no transaction for payment.paid event', ['event_data' => $eventData]);
                    break;
                }

                // Idempotent: markPaid() is a no-op if already PAID
                $transaction = $this->transactionService->markPaid($transaction);

                // Broadcast so conductor + commuter flip to success modal
                broadcast(new PaymentStatusUpdated($transaction, 'PAID'));
                break;

            case 'payment.failed':
                $transaction = $this->resolveTransactionFromEvent($eventData);

                if (! $transaction) {
                    Log::warning('PayMongo webhook: no transaction for payment.failed event', ['event_data' => $eventData]);
                    break;
                }

                // Idempotent: markFailed() is a no-op if already FAILED
                $transaction = $this->transactionService->markFailed($transaction);

                // Broadcast so conductor + commuter show failure modal
                broadcast(new PaymentStatusUpdated($transaction, 'FAILED'));
                break;

            default:
                // Unknown event type — acknowledge to prevent retries,
                // but log for debugging.
                Log::info('PayMongo webhook: unhandled event type', ['type' => $eventType]);
                break;
        }

        // ─── 5. Always return 200 for accepted events ───────────────
        // PayMongo retries non-2xx responses. We return 200 even for
        // unknown event types to avoid retry storms.
        return response()->json(['received' => true], 200);
    }

    /**
     * Resolve the local Transaction for a PayMongo payment event.
     *
     * Primary: match on paymongo_intent_id (indexed). Fallback: the
     * transaction_id we set in the PaymentIntent metadata — a reliable
     * correlation handle that survives differences in how PayMongo nests
     * the payment_intent_id across event shapes.
     */
    private function resolveTransactionFromEvent(?array $eventData): ?Transaction
    {
        if (! $eventData) {
            return null;
        }

        $attributes = $eventData['attributes'] ?? [];

        $intentId = $attributes['payment_intent_id']
            ?? ($attributes['payment_intent']['id'] ?? null);

        if ($intentId) {
            $transaction = Transaction::where('paymongo_intent_id', $intentId)->first();
            if ($transaction) {
                return $transaction;
            }
        }

        // Fallback: correlate via the metadata we attached to the intent.
        $metaTransactionId = $attributes['metadata']['transaction_id']
            ?? ($attributes['payment_intent']['attributes']['metadata']['transaction_id'] ?? null);

        if ($metaTransactionId) {
            return Transaction::where('transaction_id', $metaTransactionId)->first();
        }

        return null;
    }
}
