<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use App\Models\Transaction;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/analytics
     */
    public function index(Request $request): JsonResponse
    {
        
        return $this->successResponse([
            'heatmapZones'   => [],
            'paymentUsage'   => [],
            'pickupPoints'   => [],
            'remittanceData' => [],
            'gcashDaily'     => [],
            'gcashMonthly'   => [],
        ], 'Analytics data');
    }
}