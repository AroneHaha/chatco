<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Enums\UserRole;
use App\Events\FaresUpdated;
use App\Http\Controllers\Controller;
use App\Models\FarePoint;
use App\Models\PersonalAccessToken;
use App\Models\Setting;
use App\Models\User;
use App\Services\ActivityLogService;
use App\Services\MaintenanceStatus;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
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
            self::MINIMUM_FARE_KEY => ['required', 'numeric', 'min:1', 'max:1000', 'decimal:0,2'],
            self::DISCOUNT_RATE_KEY => ['required', 'numeric', 'min:0', 'max:100', 'decimal:0,2'],
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
        $value = match (true) {
            in_array($key, $integerKeys, true) => (string) $validated['value'],
            // Fixed format so re-saving "17" over "17.00" is not logged as a change.
            in_array($key, [self::MINIMUM_FARE_KEY, self::DISCOUNT_RATE_KEY], true) => number_format((float) $validated['value'], 2, '.', ''),
            default => $validated['value'] ?? null,
        };
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
        } elseif (in_array($key, [self::MINIMUM_FARE_KEY, self::DISCOUNT_RATE_KEY], true)) {
            $setting = $this->saveFareRule($key, $value, $category, $request);
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

    private const MINIMUM_FARE_KEY = 'base_fare_regular';

    private const DISCOUNT_RATE_KEY = 'discount_rate';

    /** Used until an admin saves these; match the fares the migrations seeded. */
    private const DEFAULT_MINIMUM_FARE = 17.0;

    private const DEFAULT_DISCOUNT_RATE = 20.0;

    private const DEFAULT_SUCCEEDING_FARE = 2.25;

    /**
     * Saves the minimum fare or the shared discount rate and re-prices the
     * fare matrix in the same transaction:
     * - a minimum fare change shifts every stop's regular fare by the same
     *   amount, keeping the gaps between stops;
     * - every discounted fare (stops, minimum, succeeding) is then recomputed
     *   as the regular fare less the discount rate.
     * Transactions already started keep the amount they were priced at.
     * A real change also signs every conductor out (signOutConductors).
     */
    private function saveFareRule(string $key, string $value, string $category, Request $request): Setting
    {
        return DB::transaction(function () use ($key, $value, $category, $request): Setting {
            // Locking both rules serializes concurrent fare-rule saves, so one
            // never re-prices from a value the other is about to change.
            $rules = Setting::whereIn('key', [self::MINIMUM_FARE_KEY, self::DISCOUNT_RATE_KEY])
                ->lockForUpdate()->pluck('value', 'key');
            $minimum = (float) ($rules[self::MINIMUM_FARE_KEY] ?? self::DEFAULT_MINIMUM_FARE);
            $rate = (float) ($rules[self::DISCOUNT_RATE_KEY] ?? self::DEFAULT_DISCOUNT_RATE);

            if ($key === self::MINIMUM_FARE_KEY) {
                $shift = round((float) $value - $minimum, 2);
                $changed = $shift != 0.0;
                if ($changed) {
                    $lowest = FarePoint::min('regular_fare');
                    if ($lowest !== null && (float) $lowest + $shift < 0) {
                        throw ValidationException::withMessages([
                            'value' => 'This minimum fare would push some fare matrix stops below ₱0.',
                        ]);
                    }
                    FarePoint::query()->increment('regular_fare', $shift);
                }
                $minimum = (float) $value;
            } else {
                $changed = round((float) $value - $rate, 2) != 0.0;
                $rate = (float) $value;
            }

            if ($changed) {
                $this->signOutConductors();
            }

            $payable = (100 - $rate) / 100;
            FarePoint::query()->update([
                'discounted_fare' => DB::raw(sprintf('ROUND(regular_fare * %.4F, 2)', $payable)),
            ]);
            $succeeding = (float) (Setting::where('key', 'succeeding_fare_regular')->value('value') ?? self::DEFAULT_SUCCEEDING_FARE);
            foreach ([
                'base_fare_discounted' => $minimum * $payable,
                'succeeding_fare_discounted' => $succeeding * $payable,
            ] as $derivedKey => $amount) {
                Setting::updateOrCreate(['key' => $derivedKey], [
                    'value' => number_format(round($amount, 2), 2, '.', ''),
                    'category' => 'financial',
                    'updated_by' => $request->user()->id,
                ]);
            }

            return Setting::updateOrCreate(['key' => $key], [
                'value' => $value,
                'category' => $category,
                'updated_by' => $request->user()->id,
            ]);
        }, 3);
    }

    /** How long an open conductor app has to show its notice before its token stops working. */
    private const CONDUCTOR_SIGN_OUT_GRACE_SECONDS = 20;

    /**
     * Ends every conductor session (web and mobile) so each signs back in on
     * the new fares. Tokens expire after a short grace instead of being
     * deleted, so an open app first gets FaresUpdated and shows why it is
     * signing out rather than failing on a bare 401 mid-poll. Active shifts
     * are untouched; the conductor resumes on the next sign-in.
     * Runs inside the fare-rule transaction; the event is sent after commit.
     */
    private function signOutConductors(): void
    {
        $expiresAt = now()->addSeconds(self::CONDUCTOR_SIGN_OUT_GRACE_SECONDS);
        PersonalAccessToken::query()
            ->where('tokenable_type', (new User)->getMorphClass())
            ->whereIn('tokenable_id', User::where('role', UserRole::CONDUCTOR)->select('id'))
            // Never extend a token that already expires sooner.
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', $expiresAt))
            ->update(['expires_at' => $expiresAt]);

        DB::afterCommit(fn () => broadcast(new FaresUpdated(self::CONDUCTOR_SIGN_OUT_GRACE_SECONDS)));
    }

    /** Readable names for the activity log; other keys fall back to a headline of the key. */
    private const SETTING_LABELS = [
        Setting::RIDES_FOR_FREE_REWARD_KEY => 'Paid rides for 1 free ride',
        self::MINIMUM_FARE_KEY => 'Minimum fare (₱)',
        self::DISCOUNT_RATE_KEY => 'Discount rate (%)',
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
