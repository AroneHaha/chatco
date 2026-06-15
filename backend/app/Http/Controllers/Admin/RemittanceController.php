<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use App\Models\Remittance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RemittanceController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/remittances
     */
    public function index(Request $request): JsonResponse
    {
        $query = Remittance::with(['conductor', 'shiftLog.vehicle']);

        if ($request->has('status')) {
            $query->where('remittance_status', $request->status);
        }

        $remittances = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        $mapped = $remittances->map(fn ($r) => [
            'shiftId'          => $r->shift_log_id,
            'date'             => $r->created_at->format('Y-m-d'),
            'conductorName'    => $r->conductor ? trim("{$r->conductor->first_name} {$r->conductor->surname}") : 'N/A',
            'driverName'       => $r->shiftLog?->vehicle?->driver ? trim("{$r->shiftLog->vehicle->driver->first_name} {$r->shiftLog->vehicle->driver->surname}") : 'N/A',
            'unitNumber'       => $r->shiftLog?->vehicle?->plate_number ?? 'N/A',
            'totalPassengers'  => $r->total_passengers,
            'totalCashless'    => (float) $r->total_cashless,
            'cashDeclared'     => (float) $r->cash_declared,
            'remittanceStatus' => $r->remittance_status,
            'timeIn'           => $r->shiftLog?->shift_start?->toIso8601String(),
            'timeOut'          => $r->shiftLog?->shift_end?->toIso8601String(),
            'cashTotal'        => (float) $r->cash_total,
            'gcashTotal'       => (float) $r->gcash_total,
        ]);

        return $this->successResponseWithMeta(
            ['remittances' => $mapped],
            'Remittances list',
            [
                'current_page' => $remittances->currentPage(),
                'last_page'    => $remittances->lastPage(),
                'per_page'     => $remittances->perPage(),
                'total'        => $remittances->total(),
            ]
        );
    }
}