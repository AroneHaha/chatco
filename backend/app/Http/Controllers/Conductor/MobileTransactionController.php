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
}
