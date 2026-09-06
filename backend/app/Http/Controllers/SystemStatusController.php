<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

/**
 * GET /api/v1/system-status — public liveness probe.
 *
 * The conductor mobile app (chatco-mobile) calls this every 20 seconds to
 * distinguish "server reachable" from "network down" before flushing the
 * offline cash queue. Any non-network response counts as "online" on the
 * client, so the payload is intentionally minimal.
 */
class SystemStatusController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->successResponse([
            'status' => 'ok',
            'time'   => now()->toIso8601String(),
        ], 'System operational');
    }
}
