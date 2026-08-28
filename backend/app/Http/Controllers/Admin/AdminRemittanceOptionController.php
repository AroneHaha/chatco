<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Http\Controllers\Controller;
use App\Models\RemittanceOption;
use App\Services\ActivityLogService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminRemittanceOptionController extends Controller
{
    use ApiResponse;

    public function __construct(private ActivityLogService $activityLogService) {}

    public function index(): JsonResponse
    {
        $options = RemittanceOption::orderBy('option_name', 'asc')->get();
        return $this->successResponse($options, 'Remittance options retrieved');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'option_name' => ['required', 'string', 'max:100'],
        ]);

        $option = RemittanceOption::create($validated);

        $this->activityLogService->record(
            ActivityLogCategory::REMITTANCE_OPTION,
            "Added remittance option {$option->option_name}",
            $request->user(),
        );

        return $this->successResponse($option, 'Remittance option created', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $option = RemittanceOption::findOrFail($id);
        $validated = $request->validate([
            'option_name' => ['sometimes', 'string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $option->update($validated);

        $this->activityLogService->record(
            ActivityLogCategory::REMITTANCE_OPTION,
            "Updated remittance option {$option->option_name}",
            $request->user(),
        );

        return $this->successResponse($option, 'Remittance option updated');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $option = RemittanceOption::findOrFail($id);
        $optionName = $option->option_name;
        $option->delete();

        $this->activityLogService->record(
            ActivityLogCategory::REMITTANCE_OPTION,
            "Deleted remittance option {$optionName}",
            $request->user(),
        );

        return $this->successResponse(null, 'Remittance option deleted');
    }
}
