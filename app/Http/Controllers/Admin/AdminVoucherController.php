<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreVoucherRequest;
use App\Models\Voucher;
use App\Services\ActivityLogService;
use App\Services\VoucherDistributionService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\Cursor;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

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

    public function __construct(private ActivityLogService $activityLogService, private VoucherDistributionService $voucherDistributionService) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'type' => ['nullable', 'in:FREE_RIDE,DISCOUNT'],
            'date_range' => ['sometimes', 'in:last_7_days,this_month,all'],
            'pagination' => ['sometimes', 'in:page,cursor'],
            'cursor' => ['nullable', 'string', 'max:2048'],
        ]);
        $perPage = min(max($request->integer('per_page', 10), 1), 100);
        $now = now();
        // Use the same calendar-day ranges as the other admin history filters.
        $start = ($filters['date_range'] ?? 'last_7_days') === 'this_month'
            ? $now->copy()->startOfMonth() : $now->copy()->subDays(6)->startOfDay();
        $end = ($filters['date_range'] ?? 'last_7_days') === 'this_month'
            ? $now->copy()->endOfMonth() : $now->copy()->endOfDay();
        // Both joins use primary keys: history stays paginated without
        // additional lookups for each voucher's generating administrator.
        $query = Voucher::with(['commuter' => fn ($query) => $query->withTrashed()->select('id', 'first_name', 'surname')])
            ->leftJoin('voucher_generation_batches as batch', 'batch.id', '=', 'vouchers.generation_batch_id')
            ->leftJoin('admin_profiles as generator', 'generator.id', '=', 'batch.admin_id')
            ->select('vouchers.*', 'batch.admin_id as generated_by_id', 'generator.first_name as generated_by_first_name', 'generator.last_name as generated_by_last_name')
            ->when(($filters['date_range'] ?? 'last_7_days') !== 'all', fn ($query) => $query->whereBetween('vouchers.created_at', [$start, $end]))
            ->when($filters['type'] ?? null, fn ($query, $type) => $query->where('vouchers.type', $type))
            ->orderByDesc('vouchers.created_at')->orderByDesc('vouchers.id');

        if (($filters['pagination'] ?? 'page') === 'cursor') {
            $cursor = null;
            if (! empty($filters['cursor'])) {
                $parameters = json_decode(base64_decode(strtr($filters['cursor'], '-_', '+/'), true) ?: '', true);
                $values = is_array($parameters) ? [
                    'created_at' => $parameters['vouchers.created_at'] ?? null,
                    'id' => $parameters['vouchers.id'] ?? null,
                    'next' => $parameters['_pointsToNextItems'] ?? null,
                ] : [];
                if (Validator::make($values, ['created_at' => ['required', 'string', 'date'], 'id' => ['required', 'uuid'], 'next' => ['required', 'boolean']])->fails()) {
                    throw ValidationException::withMessages(['cursor' => 'Invalid voucher history cursor.']);
                }
                $cursor = new Cursor(['vouchers.created_at' => $values['created_at'], 'vouchers.id' => $values['id']], (bool) $values['next']);
            }
            // Cursor pagination avoids growing offsets and count queries while
            // preserving stable ordering when vouchers are inserted or removed.
            $vouchers = $query->cursorPaginate($perPage, ['*'], 'cursor', $cursor);
        } else {
            $vouchers = $query->paginate($perPage);
        }

        return $this->successResponse($vouchers, 'Vouchers retrieved');
    }

    public function store(StoreVoucherRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $quantity = $validated['quantity'] ?? 1;
        $result = $this->voucherDistributionService->generate($request->user(), $validated);
        if (! $result['replayed']) {
            $this->activityLogService->record(
                ActivityLogCategory::VOUCHER,
                "Generated and distributed {$quantity} voucher(s) ({$validated['type']})",
                $request->user(),
            );
        }

        return $this->successResponse($result['vouchers'], "{$quantity} voucher(s) distributed", $result['replayed'] ? 200 : 201);
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
