<?php

namespace App\Http\Controllers\Conductor;

use App\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Services\ShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/v1/conductor/break-status — toggle the conductor's break state.
 *
 * Consumed by the conductor mobile app's dashboard break toggle. Extra
 * fields sent by the client (device_id, device_type) are intentionally
 * ignored: session ownership follows the "latest login wins" policy enforced
 * at login, so no device bookkeeping happens here.
 */
class BreakStatusController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly ShiftService $shiftService)
    {
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'is_on_break' => ['required', 'boolean'],
        ]);

        $shift = $this->shiftService->getActiveShift($request->user());

        if (! $shift) {
            return $this->errorResponse('No active shift. Start a shift before toggling break status.', 422);
        }

        $isOnBreak = $request->boolean('is_on_break');

        $shift->update([
            'is_on_break'      => $isOnBreak,
            'break_started_at' => $isOnBreak ? now() : null,
        ]);

        return $this->successResponse(
            $shift->fresh(['vehicle', 'driver', 'route']),
            $isOnBreak ? 'Break started' : 'Break ended',
        );
    }
}
