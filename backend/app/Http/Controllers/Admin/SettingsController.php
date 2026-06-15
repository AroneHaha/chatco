<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use App\Models\Route as RouteModel;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/settings
     */
    public function index(Request $request): JsonResponse
    {
        $routes = RouteModel::orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($r) => [
                'id'        => $r->id,
                'name'      => $r->name,
                'status'    => $r->status,
                'waypoints' => $r->waypoints,
            ]);

        return $this->successResponse([
            'faqs'                     => [],
            'notificationTemplates'    => [],
            'accountApprovedTemplate'  => '',
            'accountRejectedTemplate'  => '',
            'routes'                   => $routes,
            'remittanceOptions'        => [],
            'expenseCategories'        => [],
            'vouchers'                 => [],
            'financialRules'           => null,
            'operationsRules'          => null,
            'appConfiguration'         => null,
            'safetyConfig'             => null,
        ], 'Settings data');
    }
}