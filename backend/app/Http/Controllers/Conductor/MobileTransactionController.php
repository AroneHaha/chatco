<?php

namespace App\Http\Controllers\Conductor;

use App\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Conductor\RecordCashRequest;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileTransactionController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TransactionService $transactionService
    ) {}

    /**
     * GET /api/v1/mobile/conductor/transactions?shift_id={id}
     */
    public function index(Request $request): JsonResponse
    {
        $shiftId = $request->query('shift_id');

        if (! $shiftId) {
            return $this->errorResponse('shift_id query parameter is required', 422);
        }

        if ($request->hasAny(['page', 'per_page', 'payment_method', 'date_from', 'date_to'])) {
            $result = $this->transactionService->getShiftTransactionsPage(
                $request->user(),
                $shiftId,
                (int) $request->integer('per_page', 25),
                [
                    'payment_method' => $request->query('payment_method'),
                    'date_from' => $request->query('date_from'),
                    'date_to' => $request->query('date_to'),
                ],
            );

            $paginator = $result['paginator'];

            return $this->successResponse([
                'data' => $paginator->items(),
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'total_amount' => $result['total_amount'],
            ], 'Shift transactions retrieved');
        }

        $transactions = $this->transactionService->getShiftTransactions(
            $request->user(),
            $shiftId,
        );

        return $this->successResponse($transactions, 'Shift transactions retrieved');
    }

    /**
     * POST /api/v1/mobile/conductor/transactions
     * Dedicated mobile entry point supporting instant cash fares and offline sync queues.
     */
    public function store(RecordCashRequest $request): JsonResponse
    {
        if ($request->has('passengers')) {
            $transaction = $this->transactionService->recordMultiPassengerCashFare(
                $request->user(),
                $request->validated(),
            );

            return $this->successResponse($transaction, 'Multi-passenger cash fare recorded', 201);
        }

        if ($request->has('group_passengers')) {
            $group = $this->transactionService->recordGroupedCashFare(
                $request->user(),
                $request->validated(),
            );

            return $this->successResponse([
                'group_id' => $group->id,
                'multiple_payment_reference' => $group->reference_number,
                'payer_name' => $group->payer_name,
                'total_amount' => (float) $group->total_amount,
                'passenger_count' => $group->passenger_count,
                'transactions' => $group->transactions,
            ], 'Group cash fare recorded', 201);
        }

        $transaction = $this->transactionService->recordCashFare(
            $request->user(),
            $request->validated(),
        );

        return $this->successResponse(
            $transaction,
            'Cash fare recorded',
            201,
        );
    }

    /**
     * POST /api/v1/mobile/conductor/transactions/sync
     * Dedicated batch offline cash synchronization endpoint for mobile clients.
     * Processes queued offline tickets atomically per item and returns detailed
     * reconciliation results without dropping valid items if one fails.
     */
    public function syncBatch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'transactions' => ['required', 'array', 'min:1', 'max:50'],
            'transactions.*.shift_id' => ['required', 'string', 'max:20'],
            'transactions.*.payment_method' => ['required', 'string', 'in:CASH,VOUCHER'],
            'transactions.*.final_amount' => ['nullable', 'numeric', 'min:0'],
            'transactions.*.pickup_name' => ['required', 'string', 'max:100'],
            'transactions.*.dropoff_name' => ['required', 'string', 'max:100'],
            'transactions.*.idempotency_key' => ['required', 'string', 'max:100'],
            'transactions.*.device_id' => ['nullable', 'string', 'min:16', 'max:100'],
            'transactions.*.device_type' => ['nullable', 'string', 'in:WEB,MOBILE'],
            'transactions.*.offline_created_at' => ['required', 'date'],
            'transactions.*.passengers' => ['nullable', 'array'],
            'transactions.*.group_passengers' => ['nullable', 'array'],
        ]);

        $results = [];
        $syncedCount = 0;
        $failedCount = 0;

        foreach ($validated['transactions'] as $txnData) {
            $idempotencyKey = $txnData['idempotency_key'];
            try {
                if (! empty($txnData['passengers'])) {
                    $txn = $this->transactionService->recordMultiPassengerCashFare(
                        $request->user(),
                        $txnData,
                        true,
                    );
                    $txId = $txn->transaction_id ?? null;
                } elseif (! empty($txnData['group_passengers'])) {
                    $group = $this->transactionService->recordGroupedCashFare(
                        $request->user(),
                        $txnData,
                        true,
                    );
                    $txId = $group->reference_number ?? null;
                } else {
                    $txn = $this->transactionService->recordCashFare(
                        $request->user(),
                        $txnData,
                        true,
                    );
                    $txId = $txn->transaction_id ?? null;
                }

                $syncedCount++;
                $results[] = [
                    'idempotency_key' => $idempotencyKey,
                    'status' => 'synced',
                    'transaction_id' => $txId,
                ];
            } catch (\Throwable $e) {
                $failedCount++;
                $results[] = [
                    'idempotency_key' => $idempotencyKey,
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ];
                \Illuminate\Support\Facades\Log::warning('Mobile batch transaction sync item failed', [
                    'conductor_id' => $request->user()->id,
                    'idempotency_key' => $idempotencyKey,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $this->successResponse([
            'synced_count' => $syncedCount,
            'failed_count' => $failedCount,
            'items' => $results,
        ], 'Batch offline cash synchronization processed');
    }
}
