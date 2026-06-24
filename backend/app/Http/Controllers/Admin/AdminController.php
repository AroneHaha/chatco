<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Remittance;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    use ApiResponse;

    public function dashboard(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function users(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function drivers(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function vehicles(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function routes(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function transactions(): JsonResponse
    {
        $transactions = Transaction::with(['shiftLog', 'passenger'])
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->successResponse($transactions, 'Transactions retrieved');
    }

    /**
     * GET /api/v1/admin/remittances
     *
     * Returns all remittances across all shifts, ordered by date desc.
     * Each remittance includes the cash total, GCash total, shortage,
     * and denormalized conductor/driver/vehicle info.
     */
    public function remittances(): JsonResponse
    {
        $remittances = Remittance::query()
            ->orderBy('date', 'desc')
            ->orderBy('time_in', 'desc')
            ->get();

        return $this->successResponse($remittances, 'Remittances retrieved');
    }

    public function announcements(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function lostItems(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function shiftLogs(): JsonResponse
    {
        $shiftLogs = ShiftLog::with(['vehicle', 'driver', 'route'])
            ->orderBy('time_in', 'desc')
            ->get();

        return $this->successResponse($shiftLogs, 'Shift logs retrieved');
    }
}