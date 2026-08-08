<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Admin Settings Controller (S6 Settings Batch 4).
 *
 * Generic key-value settings store for:
 * - Financial Rules (category=financial)
 * - Operations Rules (category=operations)
 * - Safety Notifications (category=safety)
 * - App Configuration (category=app)
 *
 * Routes (all behind auth:sanctum + role:ADMIN):
 *   GET /api/v1/admin/settings?category=financial    index
 *   PUT /api/v1/admin/settings/{key}                  update
 */
class AdminSettingController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/v1/admin/settings?category={category}
     * Returns all settings in a category as a key-value object.
     */
    public function index(Request $request): JsonResponse
    {
        $category = $request->query('category', 'general');

        $settings = Setting::where('category', $category)
            ->pluck('value', 'key');

        return $this->successResponse($settings, 'Settings retrieved');
    }

    /**
     * PUT /api/v1/admin/settings/{key}
     * Creates or updates a single setting by key.
     * Body: { "value": "some_value", "category": "financial" }
     */
    public function update(Request $request, string $key): JsonResponse
    {
        $valueRules = $key === Setting::RIDES_FOR_FREE_REWARD_KEY
            ? ['required', 'integer', 'min:1', 'max:'.Setting::MAX_RIDES_FOR_FREE_REWARD]
            : ['nullable', 'string'];

        $validator = Validator::make($request->all(), [
            'value' => $valueRules,
            'category' => ['nullable', 'string', 'max:50'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
                'meta' => null,
            ], 422);
        }

        $validated = $validator->validated();
        $category = $validated['category'] ?? 'general';
        $value = $key === Setting::RIDES_FOR_FREE_REWARD_KEY
            ? (string) $validated['value']
            : ($validated['value'] ?? null);

        if ($key === Setting::RIDES_FOR_FREE_REWARD_KEY) {
            $setting = DB::transaction(function () use ($key, $value, $category, $request): Setting {
                $setting = Setting::where('key', $key)->lockForUpdate()->first();
                $currentThreshold = $setting
                    ? Setting::validatedRewardThreshold($setting->value)
                    : Setting::DEFAULT_RIDES_FOR_FREE_REWARD;
                $currentVersion = max(1, (int) ($setting?->reward_rule_version ?? 1));

                // Non-retroactive rule: only a real value change starts a new
                // reward-progress version. Issued vouchers and rides assigned
                // to earlier versions are never recalculated or rewritten.
                if ($currentThreshold !== (int) $value) {
                    $currentVersion++;
                }

                if (! $setting) {
                    $setting = new Setting(['key' => $key]);
                }

                $setting->fill([
                    'value' => $value,
                    'reward_rule_version' => $currentVersion,
                    'category' => $category,
                    'updated_by' => $request->user()->id,
                ])->save();

                return $setting;
            }, 3);
        } else {
            $setting = Setting::updateOrCreate(
                ['key' => $key],
                [
                    'value' => $value,
                    'category' => $category,
                    'updated_by' => $request->user()->id,
                ]
            );
        }

        return $this->successResponse(
            ['key' => $setting->key, 'value' => $setting->value, 'category' => $setting->category],
            'Setting updated successfully'
        );
    }
}
