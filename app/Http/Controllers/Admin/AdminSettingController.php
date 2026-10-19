<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\ActivityLogService;
use App\Services\MaintenanceStatus;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

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

    public function __construct(private ActivityLogService $activityLogService) {}

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
        $valueRules = match ($key) {
            'maintenance_mode' => ['required', 'string', 'in:true,false'],
            'maintenance_message' => ['nullable', 'string', 'max:500'],
            'maintenance_roles' => ['required', 'string', function ($attribute, $value, $fail) {
                $roles = json_decode($value, true);
                if (! is_array($roles) || ! array_is_list($roles) || count($roles) === 0
                    || count($roles) > count(MaintenanceStatus::ROLES)
                    || count(array_filter($roles, fn ($role) => in_array($role, MaintenanceStatus::ROLES, true))) !== count($roles)
                    || count(array_unique($roles)) !== count($roles)) {
                    $fail('Select commuters, conductors, or both for maintenance.');
                }
            }],
            Setting::RIDES_FOR_FREE_REWARD_KEY => ['required', 'integer', 'min:1', 'max:'.Setting::MAX_RIDES_FOR_FREE_REWARD],
            'speed_limit_kmh' => ['required', 'integer', 'min:10', 'max:120'],
            'max_shift_hours' => ['required', 'integer', 'min:1', 'max:48'],
            'remittance_grace_minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'remittance_reminder_interval_minutes' => ['required', 'integer', 'min:5', 'max:10080'],
            default => ['nullable', 'string'],
        };

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
        $integerKeys = [
            Setting::RIDES_FOR_FREE_REWARD_KEY,
            'speed_limit_kmh',
            'max_shift_hours',
            'remittance_grace_minutes',
            'remittance_reminder_interval_minutes',
        ];
        $value = in_array($key, $integerKeys, true)
            ? (string) $validated['value']
            : ($validated['value'] ?? null);
        // For the activity log: the settings pages save every key on each
        // Save, so only a key whose value actually changes gets an entry.
        $previous = Setting::where('key', $key)->value('value');

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

        if ($key === 'speed_limit_kmh') {
            Cache::forget('overspeed.limit_kmh');
        }

        $label = self::SETTING_LABELS[$key] ?? Str::ucfirst(Str::lower(Str::headline($key)));
        $changes = ActivityLogService::diff(
            ['value' => $this->displaySetting($key, $previous)],
            ['value' => $this->displaySetting($key, $value)],
            ['value' => $label],
        );
        if ($changes !== []) {
            [$change] = $changes;
            // Short values read well inline; templates and messages stay in
            // the entry's details.
            $inline = mb_strlen((string) $change['from']) <= 40 && mb_strlen((string) $change['to']) <= 40;
            $this->activityLogService->record(
                ActivityLogCategory::SETTINGS,
                $inline
                    ? "Changed {$label} from ".($change['from'] ?? 'none').' to '.($change['to'] ?? 'none')
                    : "Changed {$label}",
                $request->user(),
                $changes,
            );
        }

        return $this->successResponse(
            ['key' => $setting->key, 'value' => $setting->value, 'category' => $setting->category],
            'Setting updated successfully'
        );
    }

    /** Readable names for the activity log; other keys fall back to a headline of the key. */
    private const SETTING_LABELS = [
        Setting::RIDES_FOR_FREE_REWARD_KEY => 'Paid rides for 1 free ride',
        'regular_discount' => 'Regular discount (%)',
        'student_discount' => 'Student discount (%)',
        'senior_discount' => 'Senior citizen discount (%)',
        'pwd_discount' => 'PWD discount (%)',
        'speed_limit_kmh' => 'Overspeeding limit (km/h)',
        'max_shift_hours' => 'Maximum shift duration (hours)',
        'remittance_grace_minutes' => 'Remittance grace period (minutes)',
        'remittance_reminder_interval_minutes' => 'Remittance reminder interval (minutes)',
        'emergency_hotline' => 'Emergency hotline',
        'admin_sos_email' => 'Admin SOS email',
        'sender_gmail' => 'Registration email sender',
        'sos_admin_template' => 'SOS alert template',
        'ride_receipt_template' => 'Ride receipt template',
        'account_approved_template' => 'Account approved email',
        'account_rejected_template' => 'Account rejected email',
        'maintenance_mode' => 'Maintenance mode',
        'maintenance_roles' => 'Maintenance applies to',
        'maintenance_message' => 'Maintenance message',
        'require_id_upload' => 'Require valid ID at signup',
        'receipt_business_name' => 'Receipt business name',
        'receipt_address_line' => 'Receipt address or contact',
        'receipt_footer_note' => 'Receipt footer message',
        'receipt_paper_width' => 'Receipt paper width (mm)',
        'receipt_auto_print' => 'Auto-print receipts',
        'receipt_show_datetime' => 'Receipt shows date & time',
        'receipt_show_transaction_id' => 'Receipt shows reference no.',
        'receipt_show_route' => 'Receipt shows route',
        'receipt_show_unit' => 'Receipt shows unit',
        'receipt_show_conductor' => 'Receipt shows conductor',
        'receipt_show_passenger' => 'Receipt shows passenger',
        'receipt_show_fare_breakdown' => 'Receipt shows fare breakdown',
        'receipt_show_qr_code' => 'Receipt shows reward QR',
        'receipt_show_manual_code' => 'Receipt shows manual claim code',
    ];

    /** A stored setting as admins read it: "true" → On, role lists → names. */
    private function displaySetting(string $key, ?string $value): ?string
    {
        if ($value === 'true' || $value === 'false') {
            return $value === 'true' ? 'On' : 'Off';
        }
        if ($key === 'maintenance_roles' && $value !== null) {
            $roles = json_decode($value, true);
            if (is_array($roles)) {
                return implode(', ', array_map(fn ($role) => Str::ucfirst(Str::lower((string) $role)).'s', $roles));
            }
        }

        return $value;
    }
}
