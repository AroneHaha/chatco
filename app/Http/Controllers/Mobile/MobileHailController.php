<?php

namespace App\Http\Controllers\Mobile;

use App\Enums\HailStatus;
use App\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Hail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Read adapter only; HailService and the scheduler own state transitions. */
class MobileHailController extends Controller
{
    use ApiResponse;

    public function show(Request $request, string $id): JsonResponse
    {
        $hail = Hail::query()->where('commuter_id', $request->user()->id)
            ->with('vehicle')->findOrFail($id);

        return $this->successResponse($this->payload($hail), 'Hail retrieved');
    }

    public function active(Request $request): JsonResponse
    {
        $hail = Hail::query()->where('commuter_id', $request->user()->id)
            ->where(function ($query) {
                $query->where('status', HailStatus::ACCEPTED->value)
                    ->orWhere(function ($pending) {
                        $pending->where('status', HailStatus::PENDING->value)
                            ->where('expires_at', '>', now());
                    });
            })->with('vehicle')->latest()->first();

        return $this->successResponse($hail ? $this->payload($hail) : null, 'Active hail retrieved');
    }

    private function payload(Hail $hail): array
    {
        $status = $hail->status === HailStatus::PENDING && $hail->expires_at?->isPast()
            ? HailStatus::EXPIRED->value : $hail->status->value;

        return [
            'id' => $hail->id,
            'vehicle_id' => $hail->vehicle_id,
            'status' => $status,
            'created_at' => $hail->created_at?->toIso8601String(),
            'expires_at' => $hail->expires_at?->toIso8601String(),
            'vehicle' => $hail->vehicle ? [
                'unit_number' => $hail->vehicle->unit_number,
                'plate_number' => $hail->vehicle->plate_number,
            ] : null,
        ];
    }
}
