<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use App\Models\Vehicle;
use App\Models\User;
use App\Models\LostItem;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/dashboard
     */
    public function index(Request $request): JsonResponse
    {
        $recentVehicles = Vehicle::with(['driver', 'conductor', 'route'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn ($v) => [
                'id'           => $v->id,
                'plateNumber'  => $v->plate_number,
                'route'        => $v->route?->name,
                'driver'       => $v->driver ? "{$v->driver->first_name} {$v->driver->surname}" : null,
                'status'       => $v->status,
                'speed'        => $v->speed,
            ]);

        $recentLostFound = LostItem::orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn ($item) => [
                'id'         => $item->id,
                'itemName'   => $item->item_name,
                'status'     => $item->status,
                'datePosted' => $item->date_posted?->toIso8601String(),
            ]);

        $recentUsers = User::with('commuterProfile')
            ->where('role', 'COMMUTER')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn ($u) => [
                'id'        => $u->id,
                'name'      => $u->commuterProfile ? "{$u->commuterProfile->first_name} {$u->commuterProfile->surname}" : $u->email,
                'email'     => $u->email,
                'role'      => $u->role->value,
                'createdAt' => $u->created_at->toIso8601String(),
            ]);

        $totalCommuters  = User::where('role', 'COMMUTER')->count();
        $totalVehicles   = Vehicle::count();
        $activeVehicles  = Vehicle::where('status', 'Operating')->count();
        $totalRevenue    = Transaction::sum('fare_amount');

        $quickStats = [
            ['label' => 'Total Commuters',  'value' => $totalCommuters],
            ['label' => 'Total Vehicles',   'value' => $totalVehicles],
            ['label' => 'Active Vehicles',  'value' => $activeVehicles],
            ['label' => 'Total Revenue',    'value' => number_format($totalRevenue, 2)],
        ];

        $topPickupPoints = [];
        $paymentTendencies = [];

        return $this->successResponse([
            'recentVehicles'     => $recentVehicles,
            'recentLostFound'    => $recentLostFound,
            'recentUsers'        => $recentUsers,
            'quickStats'         => $quickStats,
            'topPickupPoints'    => $topPickupPoints,
            'paymentTendencies'  => $paymentTendencies,
        ], 'Dashboard data');
    }
}