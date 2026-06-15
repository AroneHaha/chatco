<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReceiptsController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/receipts
     */
    public function index(Request $request): JsonResponse
    {
        $receipts = Transaction::with(['commuter', 'vehicle', 'route'])
            ->where('payment_status', 'Completed')
            ->orderBy('trip_date', 'desc')
            ->paginate($request->per_page ?? 15);

        $mapped = $receipts->map(fn ($t) => [
            'id'            => $t->id,
            'commuterName'  => $t->commuter?->commuterProfile ? trim("{$t->commuter->commuterProfile->first_name} {$t->commuter->commuterProfile->surname}") : 'N/A',
            'commuterId'    => $t->commuter_id,
            'plateNumber'   => $t->vehicle?->plate_number ?? 'N/A',
            'route'         => $t->route?->name ?? 'N/A',
            'fare'          => (float) $t->fare_amount,
            'paymentMethod' => $t->payment_method,
            'status'        => $t->payment_status,
            'date'          => $t->trip_date?->format('Y-m-d'),
            'time'          => $t->trip_date?->format('h:i A'),
        ]);

        return $this->successResponseWithMeta(
            ['receipts' => $mapped],
            'Receipts list',
            [
                'current_page' => $receipts->currentPage(),
                'last_page'    => $receipts->lastPage(),
                'per_page'     => $receipts->perPage(),
                'total'        => $receipts->total(),
            ]
        );
    }
}