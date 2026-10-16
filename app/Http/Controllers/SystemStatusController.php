<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Services\MaintenanceStatus;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

/** Public maintenance state, affected roles, and signup requirements. */
class SystemStatusController extends Controller
{
    use ApiResponse;

    public function index(MaintenanceStatus $maintenance): JsonResponse
    {
        return $this->successResponse([
            ...$maintenance->current(),
            'require_id_upload' => Setting::requiresIdUpload(),
        ], 'System status retrieved');
    }
}
