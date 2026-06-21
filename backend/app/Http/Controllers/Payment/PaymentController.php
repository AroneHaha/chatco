<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\ApiResponse;
use App\Http\Requests\Commuter\ClaimGcashRequest;
use App\Models\Transaction;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        private TransactionService $transactionService
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
     * POST /api/payments/webhook
     *
     * PayMongo webhook entry point. S4-T6 will implement the full
     * webhook handler (signature verification + event dispatch +
     * markPaid/markFailed calls). For now, returns 200 OK so PayMongo
     * does not retry the event.
     *
     * The webhook is PUBLIC (no auth:sanctum) — PayMongo calls it
     * server-to-server with no session. Authentication is via the
     * PayMongo webhook signature (verified in S4-T6).
     */
    public function webhook(Request $request): JsonResponse
    {
        // S4-T6 TODO:
        // 1. Verify the PayMongo webhook signature using
        //    config('services.paymongo.webhook_secret')
        // 2. Parse the event body (data.attributes.type + data.attributes.data)
        // 3. Find the transaction by paymongo_intent_id
        // 4. Call TransactionService::markPaid() or markFailed() based
        //    on the event type
        // 5. Return 200 OK (PayMongo retries on non-2xx)

        // For now, acknowledge receipt so PayMongo doesn't retry
        return response()->json(['received' => true], 200);
    }
}
