<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RecoverShiftDeviceRequest;
use App\Services\ShiftDeviceService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class AdminShiftDeviceController extends Controller
{
    use ApiResponse;

    public function __construct(private ShiftDeviceService $shiftDeviceService) {}

    public function recover(RecoverShiftDeviceRequest $request, string $shift): JsonResponse
    {
        $result = $this->shiftDeviceService->recover(
            $request->user(),
            $shift,
            $request->validated('reason'),
        );

        return $this->successResponse(
            $result,
            'The lost operating device was released. A conductor device must explicitly claim the shift before collecting fares.',
        );
    }
}
