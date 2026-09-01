<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreVoucherRequest;
use App\Models\Voucher;
use App\Services\ActivityLogService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Admin Voucher CRUD (S6 Settings Batch 3).
 *
 * Routes (all behind auth:sanctum + role:ADMIN):
 *   GET    /api/v1/admin/vouchers           index
 *   POST   /api/v1/admin/vouchers           store (generates N voucher codes)
 *   DELETE /api/v1/admin/vouchers/{id}      destroy
 */
class AdminVoucherController extends Controller
{
    use ApiResponse;

    public function __construct(private ActivityLogService $activityLogService) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 20), 1), 100);
        $vouchers = Voucher::orderByDesc('created_at')->paginate($perPage);

        return $this->successResponse($vouchers, 'Vouchers retrieved');
    }

    public function store(StoreVoucherRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $quantity = $validated['quantity'] ?? 1;
        $type = $validated['type'];
        $amount = $validated['amount'] ?? null;
        $expiresAt = $validated['expires_at'] ?? null;
        $rideOrigin = $validated['ride_origin'] ?? 'Any';

        $created = [];
        for ($i = 0; $i < $quantity; $i++) {
            $code = 'CHATCO-'.Str::upper(Str::random(3)).'-'.Str::upper(Str::random(6));
            $voucher = Voucher::create([
                'code' => $code,
                'type' => $type,
                'status' => 'Active',
                'amount' => $amount,
                'expires_at' => $expiresAt,
                'ride_origin' => $rideOrigin,
            ]);
            $created[] = $voucher;
        }

        $this->activityLogService->record(
            ActivityLogCategory::VOUCHER,
            "Generated {$quantity} voucher(s) ({$type})",
            $request->user(),
        );

        return $this->successResponse($created, "{$quantity} voucher(s) generated", 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $voucher = Voucher::findOrFail($id);
        $code = $voucher->code;
        $voucher->delete();

        $this->activityLogService->record(
            ActivityLogCategory::VOUCHER,
            "Deleted voucher {$code}",
            $request->user(),
        );

        return $this->successResponse(null, 'Voucher deleted successfully');
    }
}
