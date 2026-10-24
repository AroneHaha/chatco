<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ShiftStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DeclareCashRequest;
use App\Models\CommuterLocation;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\Remittance;
use App\Models\ShiftLog;
use App\Models\TerminatedPersonnel;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Vehicle;
use App\Rules\PhilippineMobileNumber;
use App\Services\ActivityLogService;
use App\Services\AdminService;
use App\Services\LocationService;
use App\Services\MediaStorageService;
use App\Services\ShiftCloseoutService;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    use ApiResponse;

    /** Predefined emergency-contact relationship choices — kept in sync with the admin UI's dropdown. */
    private const RELATIONSHIP_OPTIONS = ['Spouse', 'Parent', 'Sibling', 'Relative', 'Guardian', 'Friend', 'Other'];

    /** Editable personnel fields and how the activity log names them. */
    private const CONDUCTOR_LOG_FIELDS = [
        'first_name' => 'First name',
        'middle_name' => 'Middle name',
        'last_name' => 'Last name',
        'birthday' => 'Birthday',
        'contact' => 'Contact number',
    ];

    private const DRIVER_LOG_FIELDS = self::CONDUCTOR_LOG_FIELDS + [
        'license_number' => 'License number',
        'address' => 'Address',
        'emergency_contact_name' => 'Emergency contact',
        'emergency_contact_number' => 'Emergency contact number',
        'emergency_contact_relationship' => 'Emergency contact relationship',
    ];

    public function __construct(
        private AdminService $adminService,
        private LocationService $locationService,
        private ActivityLogService $activityLogService,
        private MediaStorageService $mediaStorage,
        private ShiftCloseoutService $shiftCloseoutService,
    ) {}

    public function dashboard(): JsonResponse
    {
        // Returns the same analytics summary as /admin/analytics (default
        // 30-day window) — the frontend dashboard page fetches /analytics
        // directly, but this endpoint exists for completeness and any future
        // dashboard-specific aggregations.
        $data = $this->adminService->analytics([]);

        return $this->successResponse($data, 'Dashboard data retrieved');
    }

    /**
     * GET /api/v1/admin/analytics?date_from=&date_to=
     * Aggregated business metrics from real DB tables (transactions,
     * remittances, vehicles, shift_logs). Supports optional date range
     * filtering; defaults to last 30 days.
     */
    public function analytics(Request $request): JsonResponse
    {
        // Malformed dates used to reach Carbon::parse and fail as a 500; a
        // reversed range produced a negative window and a nonsense comparison.
        $request->validate([
            'pickup_period' => 'sometimes|in:week',
            'date_from' => 'sometimes|nullable|date_format:Y-m-d',
            'date_to' => ['sometimes', 'nullable', 'date_format:Y-m-d', Rule::when($request->filled('date_from'), 'after_or_equal:date_from')],
        ]);
        $filters = [
            'date_from' => $request->string('date_from')->toString() ?: null,
            'date_to' => $request->string('date_to')->toString() ?: null,
            'pickup_period' => $request->string('pickup_period')->toString() ?: null,
        ];

        $data = $this->adminService->analytics($filters);

        return $this->successResponse($data, 'Analytics retrieved');
    }

    /**
     * GET /api/v1/admin/monitoring
     * Returns the live fleet monitoring view: all vehicles with an ACTIVE
     * shift, their latest GPS position, capacity status, speed, driver +
     * conductor names, active break status and elapsed break minutes,
     * and a `is_stale` flag for GPS gaps outside a scheduled break.
     *
     * Designed for 5-second polling from the admin monitoring dashboard.
     */
    public function monitoring(): JsonResponse
    {
        $fleet = $this->locationService->getMonitoringFleet();

        return $this->successResponse($fleet, 'Live fleet retrieved');
    }

    /**
     * GET /api/v1/admin/monitoring/overspeed
     * Returns the persisted overspeeding history (one row per overspeeding
     * episode, recorded live as vehicles exceed the speed limit).
     */
    public function overspeed(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'shift_id' => ['sometimes', 'string', 'max:20', 'exists:shift_logs,shift_id'],
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'sort' => ['sometimes', 'in:recent,oldest'],
        ]);
        $history = $this->locationService->getOverspeedHistory(
            (int) ($validated['per_page'] ?? 25),
            $validated['shift_id'] ?? null,
            $validated['date'] ?? null,
            $validated['sort'] ?? 'recent',
        );

        return $this->successResponse($history, 'Overspeeding history retrieved');
    }

    public function demandZones(): JsonResponse
    {
        $cellSize = 0.005;
        $locations = CommuterLocation::query()
            ->where('updated_at', '>=', now()->subMinutes(5))
            ->get(['latitude', 'longitude']);

        $cells = [];
        foreach ($locations as $location) {
            $latBucket = (int) floor(($location->latitude + 90) / $cellSize);
            $lngBucket = (int) floor(($location->longitude + 180) / $cellSize);
            $key = "{$latBucket}:{$lngBucket}";

            if (! isset($cells[$key])) {
                $cells[$key] = [
                    'id' => "demand-{$latBucket}-{$lngBucket}",
                    'lat' => ($latBucket * $cellSize) - 90 + ($cellSize / 2),
                    'lng' => ($lngBucket * $cellSize) - 180 + ($cellSize / 2),
                    'commuter_count' => 0,
                ];
            }

            $cells[$key]['commuter_count']++;
        }

        $zones = collect($cells)
            ->map(function (array $cell) {
                $count = $cell['commuter_count'];
                $intensity = $count >= 10 ? 'HIGH' : ($count >= 4 ? 'MEDIUM' : 'LOW');

                return $cell + [
                    'intensity' => $intensity,
                    'radius_meters' => match ($intensity) {
                        'HIGH' => 500,
                        'MEDIUM' => 350,
                        default => 250,
                    },
                ];
            })
            ->sortByDesc('commuter_count')
            ->values();

        return $this->successResponse($zones, 'Demand zones retrieved');
    }

    /**
     * GET /api/v1/admin/drivers
     *
     * Two modes, distinguished by the presence of `page`:
     *  - No `page` (legacy/default): the full, unfiltered driver list —
     *    what Fleet Management, Lost & Found, and the personnel/vehicle
     *    pickers call today to populate dropdowns. They need every driver
     *    at once, not one page, so this path is untouched.
     *  - `page` present: a server-side paginated + filterable + searchable
     *    list (same Laravel-paginator envelope as GET /admin/users), used by
     *    User Management's "Drivers" role filter so it no longer downloads
     *    the whole table to filter/sort/paginate in the browser.
     */
    public function drivers(Request $request): JsonResponse
    {
        if (! $request->filled('page')) {
            $drivers = Driver::with('vehicle')->get();

            return $this->successResponse($drivers, 'Drivers retrieved');
        }

        $drivers = $this->adminService->listDrivers([
            'search' => $request->string('search')->toString() ?: null,
            'status' => $request->string('status')->toString() ?: null,
            'sort' => $request->string('sort')->toString() ?: 'recent',
            'per_page' => $request->integer('per_page', 20),
        ]);

        return $this->successResponse($drivers, 'Drivers retrieved');
    }

    /**
     * GET /api/v1/admin/personnel
     *
     * Paginated Fleet Management personnel view. Combines drivers and
     * conductors without loading either full table into the browser.
     */
    public function personnel(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', Rule::in(['all', 'ACTIVE', 'TERMINATED', 'RESIGNED'])]]);
        $perPage = max(1, min((int) $request->integer('per_page', 25), 100));
        $page = max(1, (int) $request->integer('page', 1));
        $search = $request->string('search')->toString() ?: null;
        $role = $request->string('role')->toString() ?: null;
        $status = $request->string('status')->toString() ?: null;

        if ($request->boolean('count_only')) {
            return $this->successResponse([
                'total' => $this->adminService->countFleetPersonnel($search, $role, $status),
            ], 'Personnel count retrieved');
        }

        $personnel = $this->adminService->listFleetPersonnel($perPage, $page, $search, $role, $status);

        return $this->successResponse($personnel, 'Personnel retrieved');
    }

    /**
     * POST /api/v1/admin/drivers
     * Creates a new driver.
     *
     * Required fields: first_name, last_name, birthday, contact, license_number.
     * Optional: middle_name, profile_picture_url.
     * hire_date defaults to today (admin can edit later if backdating).
     */
    public function storeDriver(Request $request): JsonResponse
    {
        $request->merge([
            'license_number' => strtoupper(trim((string) $request->input('license_number'))),
        ]);

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'birthday' => 'required|date|before:today',
            'contact' => ['required', 'string', new PhilippineMobileNumber],
            'address' => ['required', 'string', 'max:255'],
            'emergency_contact_name' => ['required', 'string', 'max:100'],
            'emergency_contact_number' => ['required', 'string', new PhilippineMobileNumber],
            'emergency_contact_relationship' => ['required', 'string', Rule::in(self::RELATIONSHIP_OPTIONS)],
            'license_number' => ['required', 'string', 'regex:/^[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}$/', 'unique:drivers,license_number'],
            'profile_picture_url' => 'nullable|string|max:500',
            'profile_picture' => 'nullable|image|mimes:jpeg,jpg,png,webp|max:5120',
        ], [
            'emergency_contact_relationship.in' => 'The relationship must be one of: '.implode(', ', self::RELATIONSHIP_OPTIONS).'.',
            'license_number.regex' => 'Use the Philippine LTO format N01-23-045678 (one letter, four digits, then six digits).',
        ]);

        $driverId = (string) Str::uuid();
        $newPictureUrl = $request->hasFile('profile_picture')
            ? $this->mediaStorage->storeProfileImage($request->file('profile_picture'), 'driver', $driverId)
            : ($validated['profile_picture_url'] ?? null);

        try {
            $driver = DB::transaction(function () use ($validated, $driverId, $newPictureUrl): Driver {
                $driver = new Driver([
                    'first_name' => $validated['first_name'],
                    'middle_name' => $validated['middle_name'] ?? null,
                    'last_name' => $validated['last_name'],
                    'birthday' => $validated['birthday'],
                    'contact' => $validated['contact'],
                    'address' => $validated['address'],
                    'emergency_contact_name' => $validated['emergency_contact_name'],
                    'emergency_contact_number' => $validated['emergency_contact_number'],
                    'emergency_contact_relationship' => $validated['emergency_contact_relationship'],
                    'license_number' => $validated['license_number'],
                    'hire_date' => now()->toDateString(),
                    'profile_picture_url' => $newPictureUrl,
                    'status' => 'ACTIVE',
                ]);
                $driver->id = $driverId;
                $driver->save();

                return $driver;
            });
        } catch (\Throwable $e) {
            if ($request->hasFile('profile_picture')) {
                $this->mediaStorage->deletePublicUrl($newPictureUrl);
            }
            throw $e;
        }

        $driver->load(['vehicle']);

        $this->activityLogService->record(
            ActivityLogCategory::PERSONNEL,
            "Added driver {$driver->first_name} {$driver->last_name}",
            $request->user(),
        );

        return $this->successResponse($driver, 'Driver created successfully', 201);
    }

    /**
     * PUT/PATCH /api/v1/admin/drivers/{id}
     * Updates an existing driver.
     *
     * Required fields: first_name, last_name, birthday, contact, license_number.
     * Optional: middle_name, profile_picture_url.
     */
    public function updateDriver(Request $request, string $id): JsonResponse
    {
        $driver = Driver::findOrFail($id);
        $request->merge([
            'license_number' => strtoupper(trim((string) $request->input('license_number'))),
        ]);

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'birthday' => 'required|date|before:today',
            'contact' => ['required', 'string', new PhilippineMobileNumber],
            'license_number' => ['required', 'string', 'regex:/^[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}$/', 'unique:drivers,license_number,'.$id],
            'address' => ['sometimes', 'required', 'string', 'max:255'],
            'emergency_contact_name' => ['sometimes', 'required', 'string', 'max:100'],
            'emergency_contact_number' => ['sometimes', 'required', 'string', new PhilippineMobileNumber],
            'emergency_contact_relationship' => ['sometimes', 'required', 'string', Rule::in(self::RELATIONSHIP_OPTIONS)],
            'profile_picture_url' => 'nullable|string|max:500',
            'profile_picture' => 'nullable|image|mimes:jpeg,jpg,png,webp|max:5120',
        ], [
            'license_number.regex' => 'Use the Philippine LTO format N01-23-045678 (one letter, four digits, then six digits).',
        ]);

        $oldPictureUrl = $driver->profile_picture_url;
        $before = $driver->only(array_keys(self::DRIVER_LOG_FIELDS));
        $newPictureUrl = $oldPictureUrl;
        $hasNewUpload = $request->hasFile('profile_picture');
        if ($hasNewUpload) {
            $newPictureUrl = $this->mediaStorage->storeProfileImage($request->file('profile_picture'), 'driver', $driver->id);
        } elseif ($request->has('profile_picture_url')) {
            $newPictureUrl = $validated['profile_picture_url'] ?? null;
        }

        try {
            DB::transaction(function () use ($driver, $validated, $newPictureUrl): void {
                $driver->update([
                    'first_name' => $validated['first_name'],
                    'middle_name' => $validated['middle_name'] ?? null,
                    'last_name' => $validated['last_name'],
                    'birthday' => $validated['birthday'],
                    'contact' => $validated['contact'],
                    'license_number' => $validated['license_number'],
                    ...array_intersect_key($validated, array_flip([
                        'address', 'emergency_contact_name', 'emergency_contact_number', 'emergency_contact_relationship',
                    ])),
                    'profile_picture_url' => $newPictureUrl,
                ]);
            });
        } catch (\Throwable $e) {
            if ($hasNewUpload) {
                $this->mediaStorage->deletePublicUrl($newPictureUrl);
            }
            throw $e;
        }

        if ($hasNewUpload || ($request->has('profile_picture_url') && $newPictureUrl !== $oldPictureUrl)) {
            $this->mediaStorage->deletePublicUrl($oldPictureUrl);
        }

        $driver->load(['vehicle']);

        $changes = $this->personnelChanges($before, $driver, self::DRIVER_LOG_FIELDS, $oldPictureUrl, $newPictureUrl);
        if ($changes !== []) {
            $this->activityLogService->record(
                ActivityLogCategory::PERSONNEL,
                "Updated driver {$driver->first_name} {$driver->last_name}: ".ActivityLogService::changedFields($changes),
                $request->user(),
                $changes,
            );
        }

        return $this->successResponse($driver, 'Driver updated successfully');
    }

    /**
     * GET /api/v1/admin/drivers/{id}
     * Returns a single driver with full details for the profile modal.
     * Includes: vehicle assignment. Shift-log history is fetched separately
     * and paginated — see driverShiftLogs() below.
     */
    public function showDriver(string $id): JsonResponse
    {
        $driver = Driver::with(['vehicle.route', 'vehicle.conductor'])
            ->findOrFail($id);

        $data = [
            'id' => $driver->id,
            'first_name' => $driver->first_name,
            'middle_name' => $driver->middle_name,
            'last_name' => $driver->last_name,
            'birthday' => $driver->birthday?->toDateString(),
            'contact' => $driver->contact,
            'address' => $driver->address,
            'emergency_contact_name' => $driver->emergency_contact_name,
            'emergency_contact_number' => $driver->emergency_contact_number,
            'emergency_contact_relationship' => $driver->emergency_contact_relationship,
            'license_number' => $driver->license_number,
            'license_front_image_url' => $driver->license_front_image_url,
            'license_back_image_url' => $driver->license_back_image_url,
            'hire_date' => $driver->hire_date?->toDateString(),
            'profile_picture_url' => $driver->profile_picture_url,
            'status' => $driver->status,
            'vehicle' => $driver->vehicle ? [
                'id' => $driver->vehicle->id,
                'unit_number' => $driver->vehicle->unit_number,
                'plate_number' => $driver->vehicle->plate_number,
                'route' => $driver->vehicle->route?->name,
            ] : null,
            'conductor_partner' => $driver->vehicle?->conductor ? [
                'id' => $driver->vehicle->conductor->id,
                'name' => trim(($driver->vehicle->conductor->first_name ?? '').' '.($driver->vehicle->conductor->last_name ?? '')),
            ] : null,
            'assigned_route' => $driver->vehicle?->route?->name ?? 'Malolos - Meycauayan - Calumpit',
        ];

        return $this->successResponse($data, 'Driver details retrieved');
    }

    /**
     * POST /api/v1/admin/drivers/{id}/license-images
     *
     * Stores one or both sides of a driver's license on the configured
     * private ID disk. The image itself is only served through the
     * authenticated showDriverLicenseImage endpoint below.
     */
    public function uploadDriverLicenseImages(Request $request, string $id): JsonResponse
    {
        $driver = Driver::findOrFail($id);

        $validated = $request->validate([
            'front' => ['sometimes', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'back' => ['sometimes', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ]);

        if (! isset($validated['front']) && ! isset($validated['back'])) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'At least one license image is required.',
                'errors' => ['license_images' => ['Upload a front or back license image.']],
                'meta' => null,
            ], 422);
        }

        $diskName = config('filesystems.uploads.private_id_disk', 'r2_private');
        $disk = Storage::disk($diskName);
        $oldPaths = [];
        $newPaths = [];

        // Upload BEFORE opening the transaction — same reasoning as
        // AdminRegistrationController::store(): storeAs() is a network call
        // to R2, so it must not run inside DB::transaction(). Any failure in
        // the DB update below deletes the just-uploaded files so a failed
        // save never orphans a license image in R2.
        $uploads = [];
        foreach (['front', 'back'] as $side) {
            if (! isset($validated[$side])) {
                continue;
            }

            $file = $validated[$side];
            $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
            $uploads[$side] = $file->storeAs(
                "driver-licenses/{$driver->id}",
                "{$side}-".Str::uuid().".{$extension}",
                $diskName
            );
        }

        try {
            DB::transaction(function () use ($driver, $uploads, &$oldPaths, &$newPaths): void {
                foreach ($uploads as $side => $path) {
                    $column = "license_{$side}_image_url";
                    $oldPaths[] = $driver->{$column};
                    $newPaths[] = $path;
                    $driver->update([$column => $path]);
                }
            });
        } catch (\Throwable $e) {
            foreach ($uploads as $path) {
                $disk->delete($path);
            }

            throw $e;
        }

        foreach ($oldPaths as $oldPath) {
            if ($oldPath && ! in_array($oldPath, $newPaths, true)) {
                $disk->delete($oldPath);
            }
        }

        $driver = $driver->fresh();

        // A license is an identity document, so who replaced it is recorded.
        $sides = implode(' and ', array_keys($uploads));
        $this->activityLogService->record(
            ActivityLogCategory::PERSONNEL,
            "Uploaded the {$sides} license image for driver {$driver->first_name} {$driver->last_name}",
            $request->user(),
        );

        return $this->successResponse([
            'id' => $driver->id,
            'license_front_image_url' => $driver->license_front_image_url,
            'license_back_image_url' => $driver->license_back_image_url,
        ], 'License image(s) uploaded successfully');
    }

    /**
     * DELETE /api/v1/admin/drivers/{id}/license-images/{side}
     * Removes one side of a driver's license document.
     */
    public function destroyDriverLicenseImage(Request $request, string $id, string $side): JsonResponse
    {
        abort_unless(in_array($side, ['front', 'back'], true), 404);

        $driver = Driver::findOrFail($id);
        $column = "license_{$side}_image_url";
        $path = $driver->{$column};

        if ($path) {
            // Clear the DB reference first, then delete the file. If the file
            // delete fails afterwards it only leaves an orphaned (harmless)
            // file in storage, rather than a DB reference pointing at a file
            // that no longer exists.
            $driver->update([$column => null]);
            Storage::disk(config('filesystems.uploads.private_id_disk', 'r2_private'))->delete($path);

            $this->activityLogService->record(
                ActivityLogCategory::PERSONNEL,
                "Removed the {$side} license image for driver {$driver->first_name} {$driver->last_name}",
                $request->user(),
            );
        }

        return $this->successResponse(null, 'License image removed successfully');
    }

    /**
     * GET /api/v1/admin/drivers/{id}/license-images/{side}
     * Streams a license image to an authenticated admin only.
     */
    public function showDriverLicenseImage(string $id, string $side)
    {
        abort_unless(in_array($side, ['front', 'back'], true), 404);

        $driver = Driver::findOrFail($id);
        $path = $driver->{"license_{$side}_image_url"};
        abort_if(! $path, 404);

        $disk = Storage::disk(config('filesystems.uploads.private_id_disk', 'r2_private'));
        abort_unless($disk->exists($path), 404);

        $stream = $disk->readStream($path);
        abort_unless(is_resource($stream), 404);

        return response()->stream(function () use ($stream): void {
            fpassthru($stream);
            fclose($stream);
        }, 200, [
            'Content-Type' => $disk->mimeType($path) ?: 'application/octet-stream',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * GET /api/v1/admin/drivers/{id}/shift-logs
     * Paginated assignment history for a driver (newest first), powering
     * the driver detail modal's infinite-scroll "Assignment History" tab.
     * 10 per page by default. Uses the shift_logs_driver_id_time_in_index
     * (see 2026_08_12_000001_add_fleet_detail_history_indexes) so the
     * ORDER BY stays index-backed as a driver's shift history grows.
     *
     * Optional ?date=YYYY-MM-DD filters to that single calendar day (the
     * date picker on the Assignment History tab). The range check is on
     * time_in itself (not a whereDate() wrapper) so the same composite
     * index still covers the equality + range + order-by in one lookup.
     */
    public function driverShiftLogs(Request $request, string $id): JsonResponse
    {
        Driver::findOrFail($id);

        $validated = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $perPage = max(1, min((int) $request->integer('per_page', 10), 50));

        $query = ShiftLog::with(['vehicle', 'route'])
            ->where('driver_id', $id);

        if (! empty($validated['date'])) {
            $day = Carbon::parse($validated['date'])->startOfDay();
            $query->whereBetween('time_in', [$day, $day->copy()->endOfDay()]);
        }

        $shiftLogs = $query
            ->orderBy('time_in', 'desc')
            ->paginate($perPage)
            ->through(fn ($log) => [
                'shift_id' => $log->shift_id,
                'unit_number' => $log->unit_number,
                'plate_number' => $log->plate_number,
                'route' => $log->route?->name,
                'time_in' => $log->time_in?->toDateTimeString(),
                'time_out' => $log->time_out?->toDateTimeString(),
                'status' => $log->status,
            ]);

        return $this->successResponse($shiftLogs, 'Driver shift history retrieved');
    }

    /**
     * DELETE /api/v1/admin/drivers/{id}
     * Soft-deletes a driver AND records the termination in terminated_personnel.
     *
     * Request body (JSON):
     *   - reason (required, string) — why the driver is being removed
     *   - termination_type (required, 'TERMINATED' | 'RESIGNED')
     *
     * If the driver currently has an active_shift_id, we reject with 409 so
     * the conductor's active shift is never orphaned — same pattern as
     * vehicle deletion.
     *
     * We capture the driver's name, contact, and last assigned vehicle
     * BEFORE soft-deleting, so the terminated_personnel record is immutable
     * even if the underlying driver row is later purged.
     */
    public function destroyDriver(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
            'termination_type' => ['required', Rule::in(['TERMINATED', 'RESIGNED'])],
        ]);

        $driver = Driver::with('vehicle')->findOrFail($id);

        if ($driver->active_shift_id) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Conflict',
                'errors' => [
                    'driver' => [
                        'Cannot remove a driver who is currently on an active shift. '.
                        'End the shift (via conductor remittance) before removing this driver.',
                    ],
                ],
                'meta' => null,
            ], 409);
        }

        $fullName = trim(($driver->first_name ?? '').' '.($driver->last_name ?? ''));
        $lastVehicle = $driver->vehicle
            ? ($driver->vehicle->unit_number ?: $driver->vehicle->plate_number)
            : null;

        // Record the termination BEFORE the soft-delete so we capture the
        // driver's current state (name/contact/last vehicle). Wrap in a
        // transaction so we never end up with a terminated_personnel row
        // pointing at a driver that wasn't actually deleted (or vice versa).
        DB::transaction(function () use ($driver, $fullName, $lastVehicle, $validated) {
            TerminatedPersonnel::create([
                'personnel_id' => $driver->id,
                'personnel_type' => 'DRIVER',
                'name' => $fullName ?: 'Unknown Driver',
                'role' => 'Driver',
                'contact' => $driver->contact,
                'reason' => $validated['reason'],
                'termination_type' => $validated['termination_type'],
                'terminated_date' => now()->toDateString(),
                'last_vehicle' => $lastVehicle,
                'date_joined' => $driver->hire_date?->toDateString(),
            ]);
            $driver->delete();
        });

        $this->activityLogService->record(
            ActivityLogCategory::PERSONNEL,
            'Terminated driver '.($fullName ?: 'Unknown Driver'),
            $request->user(),
        );

        return $this->successResponse(null, 'Driver removed successfully');
    }

    /**
     * DELETE /api/v1/admin/conductors/{id}
     * Soft-deletes a conductor's user account AND records the termination.
     *
     * This is SEPARATE from the generic DELETE /admin/users/{id} because the
     * Fleet Management "Remove Personnel" flow captures a reason +
     * termination_type that needs to be persisted. The generic user delete
     * (AdminUserController::destroy → AdminService::deleteUser) is for
     * admin/commuter account management and doesn't track termination context.
     *
     * conductor_profile.id is the shared PK with users.id, so soft-deleting
     * the user cascades to the conductor profile (same PK).
     */
    public function destroyConductor(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
            'termination_type' => ['required', Rule::in(['TERMINATED', 'RESIGNED'])],
        ]);

        $conductor = ConductorProfile::with('vehicle')->findOrFail($id);
        $user = User::find($id);

        if (! $user) {
            return $this->errorResponse('Conductor user account not found.', 404);
        }

        // Prevent self-deletion (same guard as AdminService::deleteUser).
        if ($request->user() && $request->user()->id === $user->id) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Validation failed',
                'errors' => ['user' => ['You cannot remove your own account.']],
                'meta' => null,
            ], 422);
        }

        // If the conductor is currently on an active shift, reject — the
        // active_shift_id lives on the vehicle, so we check the conductor's
        // assigned vehicle.
        if ($conductor->vehicle && $conductor->vehicle->active_shift_id) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Conflict',
                'errors' => [
                    'conductor' => [
                        'Cannot remove a conductor who is currently on an active shift. '.
                        'End the shift (via conductor remittance) before removing this conductor.',
                    ],
                ],
                'meta' => null,
            ], 409);
        }

        $fullName = trim(($conductor->first_name ?? '').' '.($conductor->last_name ?? ''));
        $lastVehicle = $conductor->vehicle
            ? ($conductor->vehicle->unit_number ?: $conductor->vehicle->plate_number)
            : null;

        DB::transaction(function () use ($user, $conductor, $fullName, $lastVehicle, $validated) {
            TerminatedPersonnel::create([
                'personnel_id' => $conductor->id,
                'personnel_type' => 'CONDUCTOR',
                'name' => $fullName ?: 'Unknown Conductor',
                'role' => 'Conductor',
                'contact' => null,
                'reason' => $validated['reason'],
                'termination_type' => $validated['termination_type'],
                'terminated_date' => now()->toDateString(),
                'last_vehicle' => $lastVehicle,
                'date_joined' => $conductor->created_at?->toDateString(),
            ]);
            // Revoke ALL tokens BEFORE soft-deleting — so the conductor is
            // instantly logged out everywhere and can't use the account.
            $user->tokens()->delete();
            // Soft-deletes the user only. Soft deletes don't trigger the FK
            // cascade, so the conductor_profiles row stays; anything counting
            // current conductors must also check users.deleted_at.
            $user->delete();
        });

        $this->activityLogService->record(
            ActivityLogCategory::PERSONNEL,
            'Terminated conductor '.($fullName ?: 'Unknown Conductor'),
            $request->user(),
        );

        return $this->successResponse(null, 'Conductor removed successfully');
    }

    /**
     * POST /api/v1/admin/conductors/{id}/disable
     *
     * Manually disables a conductor's account WITHOUT terminating them.
     * Revokes all Sanctum tokens (instant logout — can't log in again until
     * re-enabled). Does NOT soft-delete the user or create a terminated_personnel
     * record. Useful for temporary suspensions (e.g. investigation).
     *
     * To re-enable, the admin uses PUT /admin/users/{id} to set account_status
     * back to ACTIVE (or simply generates new credentials via reset-credentials).
     *
     * Requires the calling admin's own current_password (re-verified here,
     * same Hash::check pattern as CommuterService::changePassword) so a
     * stray click can't instantly disable a conductor's account.
     */
    public function disableConductor(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
        ]);

        if (! Hash::check($validated['current_password'], $request->user()->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The password you entered is incorrect.'],
            ]);
        }

        $conductor = ConductorProfile::with('user')->findOrFail($id);
        $user = $conductor->user;

        if (! $user) {
            return $this->errorResponse('Conductor user account not found.', 404);
        }

        // Reject if the conductor is currently on an active shift.
        if ($conductor->vehicle && $conductor->vehicle->active_shift_id) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Conflict',
                'errors' => [
                    'conductor' => [
                        'Cannot disable a conductor who is currently on an active shift. '.
                        'End the shift first.',
                    ],
                ],
                'meta' => null,
            ], 409);
        }

        // Revoke ALL tokens — the conductor is instantly logged out everywhere.
        $user->tokens()->delete();

        // Persist the disabled state so it survives past this request — read
        // back by AdminService::listFleetPersonnel for the Personnel tab's
        // Status column, and cleared by resetConductorCredentials below.
        $conductor->update(['status' => 'DISABLED']);

        $this->activityLogService->record(
            ActivityLogCategory::PERSONNEL,
            "Disabled conductor {$conductor->first_name} {$conductor->last_name}",
            $request->user(),
        );

        return $this->successResponse(null, 'Conductor account disabled. All sessions revoked.');
    }

    /**
     * POST /api/v1/admin/conductors/{id}/reset-credentials
     *
     * Regenerates the conductor's username + password. The new credentials
     * are returned ONCE in the response (same as storeConductor) so the admin
     * can hand them to the conductor. All existing Sanctum tokens for the
     * user are revoked (the conductor must log in with the new credentials).
     *
     * Requires the calling admin's own current_password (re-verified here,
     * same Hash::check pattern as CommuterService::changePassword) so a
     * stray click can't instantly rotate a conductor's login credentials.
     */
    public function resetConductorCredentials(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
        ]);

        if (! Hash::check($validated['current_password'], $request->user()->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The password you entered is incorrect.'],
            ]);
        }

        $conductor = ConductorProfile::with('user')->findOrFail($id);
        $user = $conductor->user;

        if (! $user) {
            return $this->errorResponse('Conductor user account not found.', 404);
        }

        // Regenerate credentials using the same deterministic algorithm as storeConductor.
        $firstName = $conductor->first_name ?? '';
        $lastName = $conductor->last_name ?? '';
        $birthday = $conductor->birthday?->toDateString() ?? '2000-01-01';

        $firstNameTrimmed = trim($firstName);
        $generatedUsername = strtolower(
            substr($firstNameTrimmed, 0, 1).'.'.preg_replace('/\s+/', '', $lastName)
        );

        $birthdayFormatted = Carbon::parse($birthday)->format('mdY');
        $firstNameParts = preg_split('/\s+/', $firstNameTrimmed);
        $firstPart = strtolower($firstNameParts[0]);
        $restParts = implode('', array_map('strtolower', array_slice($firstNameParts, 1)));
        $basePassword = $firstPart.'.'.$restParts.$birthdayFormatted;

        // The base is derived only from name + birthday, so on its own it
        // reproduces the password being replaced and the "reset" would not
        // lock the old one out. A random 4-digit suffix makes it new; the
        // loop guards the 1-in-10,000 chance of drawing the current one.
        do {
            $generatedPassword = $basePassword.'-'.str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        } while (Hash::check($generatedPassword, $user->password));

        // Ensure username uniqueness — append a number if taken.
        $originalUsername = $generatedUsername;
        $counter = 1;
        while (User::where('email', $generatedUsername.'@chatco.local')
            ->where('id', '!=', $user->id)
            ->exists()) {
            $generatedUsername = $originalUsername.$counter;
            $counter++;
        }

        // Update the user's password + email (derived from username).
        $user->update([
            'email' => $generatedUsername.'@chatco.local',
            'password' => $generatedPassword,
        ]);

        // Update the conductor profile with the new credentials. Also
        // clears a prior DISABLED status — handing out fresh credentials
        // is how a disabled conductor gets re-enabled (see disableConductor).
        $conductor->update([
            'generated_username' => $generatedUsername,
            'generated_password' => $generatedPassword,
            'status' => 'ACTIVE',
        ]);

        // Revoke ALL tokens — the conductor must re-login with the new credentials.
        $user->tokens()->delete();

        $this->activityLogService->record(
            ActivityLogCategory::PERSONNEL,
            "Reset login credentials for conductor {$conductor->first_name} {$conductor->last_name}",
            $request->user(),
        );

        return $this->successResponse([
            'id' => $conductor->id,
            'first_name' => $conductor->first_name,
            'last_name' => $conductor->last_name,
            'generated_username' => $generatedUsername,
            'generated_password' => $generatedPassword,
        ], 'Credentials reset successfully. The conductor must log in with the new credentials.');
    }

    /**
     * GET /api/v1/admin/terminated-personnel
     * Lists all terminated personnel records, newest first. Powers the
     * "Separated Personnel" section of the Fleet Management Records & History tab.
     */
    public function terminatedPersonnel(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 50), 100));

        $query = TerminatedPersonnel::query()
            ->when($request->string('search')->toString(), function ($query, string $search): void {
                $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], trim($search)).'%';
                $query->where(function ($subQuery) use ($term): void {
                    $subQuery->where('name', 'like', $term)
                        ->orWhere('role', 'like', $term)
                        ->orWhere('contact', 'like', $term)
                        ->orWhere('reason', 'like', $term)
                        ->orWhere('last_vehicle', 'like', $term)
                        ->orWhere('termination_type', 'like', $term);
                });
            });

        if ($request->boolean('count_only')) {
            return $this->successResponse([
                'total' => (int) $query->count(),
            ], 'Terminated personnel count retrieved');
        }

        $records = $query
            ->orderBy('terminated_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        return $this->successResponse($records, 'Terminated personnel retrieved');
    }

    /**
     * GET /api/v1/admin/users/{id}/activity
     * Returns a chronological activity timeline for a user. Reuses existing
     * data sources (transactions, shift_logs, verification dates) instead of
     * a separate audit_logs table. Powers the User History modal.
     */
    public function userActivity(string $id): JsonResponse
    {
        $events = $this->adminService->getUserActivity($id);

        return $this->successResponse($events, 'User activity retrieved');
    }

    /**
     * PUT/PATCH /api/v1/admin/conductors/{id}
     * Updates a conductor's editable profile fields.
     *
     * Editable: first_name, middle_name, last_name, birthday, contact, profile_picture_url.
     * NOT editable here: generated_username, generated_password (regenerate-
     * credentials is a separate flow — see G7 in the admin audit).
     *
     * Mirrors the updateDriver validation rules + transactional pattern.
     */
    public function updateConductor(Request $request, string $id): JsonResponse
    {
        $conductor = ConductorProfile::findOrFail($id);

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'birthday' => 'required|date|before:today',
            'contact' => ['required', 'string', new PhilippineMobileNumber],
            'profile_picture_url' => 'nullable|string|max:500',
            'profile_picture' => 'nullable|image|mimes:jpeg,jpg,png,webp|max:5120',
        ]);

        $oldPictureUrl = $conductor->profile_picture_url;
        $before = $conductor->only(array_keys(self::CONDUCTOR_LOG_FIELDS));
        $newPictureUrl = $oldPictureUrl;
        $hasNewUpload = $request->hasFile('profile_picture');
        if ($hasNewUpload) {
            $newPictureUrl = $this->mediaStorage->storeProfileImage($request->file('profile_picture'), 'conductor', $conductor->id);
        } elseif ($request->has('profile_picture_url')) {
            $newPictureUrl = $validated['profile_picture_url'] ?? null;
        }

        try {
            DB::transaction(function () use ($conductor, $validated, $newPictureUrl): void {
                $conductor->update([
                    'first_name' => $validated['first_name'],
                    'middle_name' => $validated['middle_name'] ?? null,
                    'last_name' => $validated['last_name'],
                    'birthday' => $validated['birthday'],
                    'contact' => $validated['contact'],
                    'profile_picture_url' => $newPictureUrl,
                ]);
            });
        } catch (\Throwable $e) {
            if ($hasNewUpload) {
                $this->mediaStorage->deletePublicUrl($newPictureUrl);
            }
            throw $e;
        }

        if ($hasNewUpload || ($request->has('profile_picture_url') && $newPictureUrl !== $oldPictureUrl)) {
            $this->mediaStorage->deletePublicUrl($oldPictureUrl);
        }

        $conductor->load(['vehicle.route', 'vehicle.driver']);

        $changes = $this->personnelChanges($before, $conductor, self::CONDUCTOR_LOG_FIELDS, $oldPictureUrl, $newPictureUrl);
        if ($changes !== []) {
            $this->activityLogService->record(
                ActivityLogCategory::PERSONNEL,
                "Updated conductor {$conductor->first_name} {$conductor->last_name}: ".ActivityLogService::changedFields($changes),
                $request->user(),
                $changes,
            );
        }

        return $this->successResponse($conductor, 'Conductor updated successfully');
    }

    /**
     * GET /api/v1/admin/conductors/{id}
     * Returns a single conductor with full details for the profile modal.
     * Includes: vehicle assignment. Shift-log history is fetched separately
     * and paginated — see conductorShiftLogs() below.
     */
    public function showConductor(string $id): JsonResponse
    {
        $conductor = ConductorProfile::with(['vehicle.route', 'vehicle.driver'])
            ->findOrFail($id);

        $data = [
            'id' => $conductor->id,
            'first_name' => $conductor->first_name,
            'middle_name' => $conductor->middle_name,
            'last_name' => $conductor->last_name,
            'birthday' => $conductor->birthday?->toDateString(),
            'contact' => $conductor->contact,
            'address' => $conductor->address,
            'emergency_contact_name' => $conductor->emergency_contact_name,
            'emergency_contact_number' => $conductor->emergency_contact_number,
            'emergency_contact_relationship' => $conductor->emergency_contact_relationship,
            'profile_picture_url' => $conductor->profile_picture_url,
            'generated_username' => $conductor->generated_username,
            'status' => $conductor->status ?? 'ACTIVE',
            'vehicle' => $conductor->vehicle ? [
                'id' => $conductor->vehicle->id,
                'unit_number' => $conductor->vehicle->unit_number,
                'plate_number' => $conductor->vehicle->plate_number,
                'route' => $conductor->vehicle->route?->name,
            ] : null,
            'driver_partner' => $conductor->vehicle?->driver ? [
                'id' => $conductor->vehicle->driver->id,
                'name' => trim(($conductor->vehicle->driver->first_name ?? '').' '.($conductor->vehicle->driver->last_name ?? '')),
            ] : null,
            'assigned_route' => $conductor->vehicle?->route?->name ?? 'Malolos - Meycauayan - Calumpit',
        ];

        return $this->successResponse($data, 'Conductor details retrieved');
    }

    /**
     * GET /api/v1/admin/conductors/{id}/shift-logs
     * Paginated assignment history for a conductor (newest first), powering
     * the conductor detail modal's infinite-scroll "Assignment History" tab.
     * 10 per page by default. Uses the shift_logs_conductor_id_time_in_index
     * (see 2026_08_12_000001_add_fleet_detail_history_indexes) so the
     * ORDER BY stays index-backed as a conductor's shift history grows.
     *
     * Optional ?date=YYYY-MM-DD filters to that single calendar day (the
     * date picker on the Assignment History tab). The range check is on
     * time_in itself (not a whereDate() wrapper) so the same composite
     * index still covers the equality + range + order-by in one lookup.
     */
    public function conductorShiftLogs(Request $request, string $id): JsonResponse
    {
        ConductorProfile::findOrFail($id);

        $validated = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $perPage = max(1, min((int) $request->integer('per_page', 10), 50));

        $query = ShiftLog::with(['vehicle', 'route', 'driver'])
            ->where('conductor_id', $id);

        if (! empty($validated['date'])) {
            $day = Carbon::parse($validated['date'])->startOfDay();
            $query->whereBetween('time_in', [$day, $day->copy()->endOfDay()]);
        }

        $shiftLogs = $query
            ->orderBy('time_in', 'desc')
            ->paginate($perPage)
            ->through(fn ($log) => [
                'shift_id' => $log->shift_id,
                'unit_number' => $log->unit_number,
                'plate_number' => $log->plate_number,
                'route' => $log->route?->name,
                'driver_name' => $log->driver_name,
                'time_in' => $log->time_in?->toDateTimeString(),
                'time_out' => $log->time_out?->toDateTimeString(),
                'status' => $log->status,
            ]);

        return $this->successResponse($shiftLogs, 'Conductor shift history retrieved');
    }

    /**
     * GET /api/v1/admin/conductors
     * Lists all conductor profiles (for the Personnel tab).
     */
    public function conductors(): JsonResponse
    {
        $conductors = ConductorProfile::with(['vehicle.route', 'vehicle.driver'])
            ->orderBy('last_name', 'asc')
            ->get();

        return $this->successResponse($conductors, 'Conductors retrieved');
    }

    /**
     * POST /api/v1/admin/conductors
     * Creates a new conductor account: a User (with CONDUCTOR role) + a
     * ConductorProfile. The username/password are generated server-side
     * (deterministic from name + birthday) and returned in the response so
     * the admin can hand them to the conductor.
     */
    public function storeConductor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'birthday' => 'required|date|before:today',
            'contact' => ['required', 'string', new PhilippineMobileNumber],
            'address' => ['required', 'string', 'max:255'],
            'emergency_contact_name' => ['required', 'string', 'max:100'],
            'emergency_contact_number' => ['required', 'string', new PhilippineMobileNumber],
            'emergency_contact_relationship' => ['required', 'string', Rule::in(self::RELATIONSHIP_OPTIONS)],
            'profile_picture_url' => 'nullable|string|max:500',
        ], [
            'emergency_contact_relationship.in' => 'The relationship must be one of: '.implode(', ', self::RELATIONSHIP_OPTIONS).'.',
        ]);

        $firstName = $validated['first_name'];
        $lastName = $validated['last_name'];
        $birthday = $validated['birthday'];

        // Generate username: firstinitial.lastname (e.g., j.delacruz)
        // Uses the first character of the first name (after trimming) so a
        // compound first name like "Mhaku Jose" still produces "m.delacruz".
        $firstNameTrimmed = trim($firstName);
        $generatedUsername = strtolower(
            substr($firstNameTrimmed, 0, 1).'.'.preg_replace('/\s+/', '', $lastName)
        );

        // Generate password: firstword.restwordsMMDDYYYY
        // For a single-word first name "Juan" → "juan.05142000"
        // For a compound first name "Mhaku Jose" → "mhaku.jose05142000"
        // (no spaces in the password — the dot separates the first word from
        // any remaining words, and the birthday is appended directly)
        $birthdayFormatted = Carbon::parse($birthday)->format('mdY');
        $firstNameParts = preg_split('/\s+/', $firstNameTrimmed);
        $firstPart = strtolower($firstNameParts[0]);
        $restParts = implode('', array_map('strtolower', array_slice($firstNameParts, 1)));
        $generatedPassword = $firstPart.'.'.$restParts.$birthdayFormatted;

        // Email is derived from username (conductor accounts don't have a real
        // email — they log in with the generated username via a custom field).
        // We store it as username@chatco.local to satisfy the NOT NULL email
        // constraint on the users table.
        $email = $generatedUsername.'@chatco.local';

        // Ensure username/email uniqueness — append a number if taken.
        $originalUsername = $generatedUsername;
        $counter = 1;
        while (User::where('email', $email)->exists()) {
            $generatedUsername = $originalUsername.$counter;
            $email = $generatedUsername.'@chatco.local';
            $counter++;
        }

        $userId = (string) Str::uuid();
        $newPictureUrl = $request->hasFile('profile_picture')
            ? $this->mediaStorage->storeProfileImage($request->file('profile_picture'), 'conductor', $userId)
            : ($validated['profile_picture_url'] ?? null);

        try {
            $conductor = DB::transaction(function () use ($email, $generatedPassword, $userId, $firstName, $validated, $lastName, $birthday, $generatedUsername, $newPictureUrl): ConductorProfile {
                $user = new User([
                    'email' => $email,
                    'password' => $generatedPassword,
                    'role' => UserRole::CONDUCTOR,
                ]);
                $user->id = $userId;
                $user->save();

                return ConductorProfile::create([
                    'id' => $user->id,
                    'first_name' => $firstName,
                    'middle_name' => $validated['middle_name'] ?? null,
                    'last_name' => $lastName,
                    'birthday' => $birthday,
                    'contact' => $validated['contact'],
                    'address' => $validated['address'],
                    'emergency_contact_name' => $validated['emergency_contact_name'],
                    'emergency_contact_number' => $validated['emergency_contact_number'],
                    'emergency_contact_relationship' => $validated['emergency_contact_relationship'],
                    'profile_picture_url' => $newPictureUrl,
                    'generated_username' => $generatedUsername,
                    'generated_password' => $generatedPassword,
                ]);
            });
        } catch (\Throwable $e) {
            if ($request->hasFile('profile_picture')) {
                $this->mediaStorage->deletePublicUrl($newPictureUrl);
            }
            throw $e;
        }

        $this->activityLogService->record(
            ActivityLogCategory::PERSONNEL,
            "Added conductor {$conductor->first_name} {$conductor->last_name}",
            $request->user(),
        );

        return $this->successResponse([
            'id' => $conductor->id,
            'first_name' => $conductor->first_name,
            'last_name' => $conductor->last_name,
            'generated_username' => $generatedUsername,
            'generated_password' => $generatedPassword,
        ], 'Conductor account created successfully', 201);
    }

    // Vehicle CRUD moved to AdminVehicleController — this method removed.

    public function transactions(Request $request): JsonResponse
    {
        $perPage = (int) $request->integer('per_page', 100);

        // The voucher a ride used, so Receipts can show it alongside the real
        // payment method: a discount voucher leaves the row CASH/GCASH, and
        // only voucher_id records that one was applied. withTrashed() keeps the
        // code visible after an admin soft-deletes a voucher that was used.
        $query = Transaction::with([
            'shiftLog', 'passenger', 'payer', 'passengerBreakdown', 'paymentGroup:id,reference_number',
            'voucher' => fn ($voucher) => $voucher->withTrashed()->select('id', 'code', 'type', 'amount'),
        ])
            ->orderBy('created_at', 'desc');

        if ($request->has('shift_id')) {
            // Comma-separated shift_id batches multiple shifts into one request
            // (e.g. the admin remittance conductor modal's Transactions tab)
            // instead of one round trip per shift.
            $shiftIds = array_filter(array_map('trim', explode(',', (string) $request->input('shift_id'))));
            if (count($shiftIds) > 1) {
                $query->whereIn('shift_id', $shiftIds);
            } else {
                $query->where('shift_id', $request->input('shift_id'));
            }
        }
        // Plain range comparisons on created_at (not whereDate(), which wraps
        // the column in a function and blocks index use) so this resolves as
        // an index range scan against transactions_created_at_index as the
        // table grows, instead of a full scan.
        if ($request->filled('date')) {
            $day = Carbon::parse($request->input('date'))->startOfDay();
            $query->where('created_at', '>=', $day)
                ->where('created_at', '<', $day->copy()->addDay());
        }
        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', Carbon::parse($request->input('date_from'))->startOfDay());
        }
        if ($request->filled('date_to')) {
            $query->where('created_at', '<', Carbon::parse($request->input('date_to'))->addDay()->startOfDay());
        }

        $transactions = $query->paginate($perPage);

        return $this->successResponse($transactions, 'Transactions retrieved');
    }

    /**
     * GET /api/v1/admin/remittances
     *
     * Returns a unified list of remittances:
     * 1. Active shifts WITH transactions -> mapped as "Pending"
     * 2. Completed remittances -> mapped as "Remitted"
     *
     * This allows admin to see a shift appear as "Pending" the moment
     * the conductor records their first cash fare, before they click
     * "Remit to Admin".
     */
    public function remittances(Request $request): JsonResponse
    {
        // Cap raised from 100 to 500: the Analytics Overview/Reports tabs and
        // the CSV/PDF/Excel exports (frontend/app/(admin)/analytics/page.tsx)
        // request per_page=500 to get the full scoped range in one page. The
        // old 100 cap silently truncated `data` for any range with more than
        // 100 remittances while `total` still reported the real count.
        $perPage = max(1, min((int) $request->integer('per_page', 100), 500));
        $page = max(1, (int) $request->integer('page', 1));
        $statusFilter = $request->filled('status')
            ? strtoupper((string) $request->input('status'))
            : null;

        $completedQuery = Remittance::query()
            ->with(['shift:shift_id,status,time_in,time_out', 'vehicle:id,unit_number,plate_number', 'driver:id,first_name,last_name']);
        // Plain comparisons, not whereDate() — `date` is already a native DATE
        // column, so wrapping it in whereDate()'s CAST(...) still blocks the
        // remittances_date_index range scan and forces a full table scan.
        if ($request->filled('date_from')) {
            $dateFrom = $request->input('date_from');
            $completedQuery->where(function ($query) use ($dateFrom): void {
                $query->where('date', '>=', $dateFrom)
                    ->orWhere(function ($q): void {
                        $q->where('remittance_status', Remittance::STATUS_PENDING)
                            ->where('date', '>=', now('Asia/Manila')->subDays(7)->toDateString());
                    });
            });
        }
        if ($request->filled('date_to')) {
            $completedQuery->where('date', '<=', $request->input('date_to'));
        }
        if ($request->filled('date')) {
            $completedQuery->where('date', $request->input('date'));
        }
        if ($statusFilter) {
            if ($statusFilter === 'REMITTED' || $statusFilter === 'SETTLED') {
                $completedQuery->whereIn('remittance_status', [
                    Remittance::STATUS_COMPLETE,
                    Remittance::STATUS_SHORTAGE,
                    Remittance::STATUS_OVERAGE,
                    'Remitted',
                ]);
            } elseif ($statusFilter === 'OVERDUE') {
                $completedQuery->where('remittance_status', Remittance::STATUS_PENDING)
                    ->where('remittance_due_at', '<', now());
            } elseif ($statusFilter === 'FOR CASH DECLARATION') {
                $completedQuery->where('remittance_status', Remittance::STATUS_PENDING)
                    ->where(function ($query): void {
                        $query->whereNull('remittance_due_at')
                            ->orWhere('remittance_due_at', '>=', now());
                    });
            } elseif ($statusFilter === 'PENDING') {
                $completedQuery->whereRaw('1 = 0');
            } else {
                $completedQuery->where('remittance_status', $statusFilter);
            }
        }
        if ($request->filled('search')) {
            $search = '%'.str_replace(['%', '_'], ['\\%', '\\_'], (string) $request->input('search')).'%';
            $completedQuery->where(function ($query) use ($search): void {
                $query->where('conductor_name', 'like', $search)
                    ->orWhere('driver_name', 'like', $search)
                    ->orWhere('shift_id', 'like', $search);
            });
        }
        // Exact-name filters from the admin's Conductor/Driver dropdowns. Applied
        // server-side (not just to the current page in memory) so switching to a
        // specific conductor/driver returns every matching shift, not only
        // whichever ones happened to land on the currently loaded page.
        if ($request->filled('conductor')) {
            $completedQuery->where('conductor_name', $request->input('conductor'));
        }
        if ($request->filled('driver')) {
            $completedQuery->where('driver_name', $request->input('driver'));
        }

        $completedRows = $completedQuery
            ->get()
            ->map(function (Remittance $remittance): array {
                $remittance->setAttribute(
                    'is_overdue',
                    $remittance->remittance_status === Remittance::STATUS_PENDING
                        && $remittance->remittance_due_at?->isPast(),
                );
                // Distinguishes a real, ended remittance awaiting the admin's cash
                // declaration from a still-active shift (both are STATUS_PENDING) —
                // the frontend needs this to know which PENDING rows can take the
                // "Declare Cash" action.
                $remittance->setAttribute('is_active_shift', false);

                return $remittance->toArray();
            });

        $activeRows = collect();
        if ($statusFilter === null || $statusFilter === Remittance::STATUS_PENDING) {
            $activeQuery = ShiftLog::query()
                ->where('status', ShiftStatus::ACTIVE->value)
                ->whereDoesntHave('remittance');

            if ($request->filled('date_from')) {
                $dateFrom = Carbon::parse($request->input('date_from'))->startOfDay();
                $activeQuery->where(function ($q) use ($dateFrom): void {
                    $q->where('time_in', '>=', $dateFrom)
                        ->orWhere('time_in', '>=', now('Asia/Manila')->subHours(24));
                });
            }
            if ($request->filled('date_to')) {
                $activeQuery->where('time_in', '<=', Carbon::parse($request->input('date_to'))->endOfDay());
            }
            if ($request->filled('date')) {
                $activeQuery
                    ->where('time_in', '>=', Carbon::parse($request->input('date'))->startOfDay())
                    ->where('time_in', '<=', Carbon::parse($request->input('date'))->endOfDay());
            }
            if ($request->filled('search')) {
                $search = '%'.str_replace(['%', '_'], ['\\%', '\\_'], (string) $request->input('search')).'%';
                $activeQuery->where(function ($query) use ($search): void {
                    $query->where('conductor_name', 'like', $search)
                        ->orWhere('driver_name', 'like', $search)
                        ->orWhere('shift_id', 'like', $search);
                });
            }
            if ($request->filled('conductor')) {
                $activeQuery->where('conductor_name', $request->input('conductor'));
            }
            if ($request->filled('driver')) {
                $activeQuery->where('driver_name', $request->input('driver'));
            }

            $activeShifts = $activeQuery
                ->get(['shift_id', 'conductor_id', 'driver_id', 'vehicle_id', 'conductor_name', 'driver_name', 'unit_number', 'time_in', 'time_out']);
            $shiftIds = $activeShifts->pluck('shift_id');
            $totalsByShift = $shiftIds->isEmpty()
                ? collect()
                : Transaction::query()
                    ->whereIn('shift_id', $shiftIds)
                    ->where('status', PaymentStatus::PAID->value)
                    ->select('shift_id')
                    ->selectRaw('COALESCE(SUM(CASE WHEN payment_method = ? THEN final_amount ELSE 0 END), 0) AS cash_total', [PaymentMethod::CASH->value])
                    ->selectRaw('COALESCE(SUM(CASE WHEN payment_method = ? THEN final_amount ELSE 0 END), 0) AS gcash_total', [PaymentMethod::GCASH->value])
                    // Group payments are one row per seat, each repeating the
                    // group size, so a grouped row counts as one passenger
                    // (same rule as ShiftCloseoutService's remittance totals).
                    ->selectRaw('COALESCE(SUM(CASE WHEN group_id IS NOT NULL THEN 1 WHEN total_passengers IS NULL OR total_passengers < 1 THEN 1 ELSE total_passengers END), 0) AS total_passengers')
                    ->groupBy('shift_id')
                    ->get()
                    ->keyBy('shift_id');

            $activeRows = $activeShifts->map(function (ShiftLog $shift) use ($totalsByShift): array {
                $totals = $totalsByShift->get($shift->shift_id);
                $cashTotal = (float) ($totals->cash_total ?? 0);
                $gcashTotal = (float) ($totals->gcash_total ?? 0);

                return [
                    'shift_id' => $shift->shift_id,
                    'conductor_id' => $shift->conductor_id,
                    'driver_id' => $shift->driver_id,
                    'vehicle_id' => $shift->vehicle_id,
                    'date' => $shift->time_in?->toDateString(),
                    'conductor_name' => $shift->conductor_name,
                    'driver_name' => $shift->driver_name,
                    'unit_number' => $shift->unit_number,
                    'total_passengers' => (int) ($totals->total_passengers ?? 0),
                    'time_in' => $shift->time_in,
                    'time_out' => $shift->time_out,
                    'total_collected' => $cashTotal,
                    'remitted_amount' => 0,
                    'shortage' => 0,
                    'overage' => 0,
                    'cash_total' => $cashTotal,
                    'gcash_total' => $gcashTotal,
                    'remittance_status' => Remittance::STATUS_PENDING,
                    'remittance_due_at' => null,
                    'remitted_at' => null,
                    'reminder_count' => 0,
                    'is_overdue' => false,
                    'is_active_shift' => true,
                ];
            });
        }

        $rows = $completedRows
            ->concat($activeRows)
            ->sort(function (array $a, array $b): int {
                $dateCompare = strcmp((string) ($b['date'] ?? ''), (string) ($a['date'] ?? ''));
                if ($dateCompare !== 0) {
                    return $dateCompare;
                }

                return strcmp((string) ($b['time_in'] ?? ''), (string) ($a['time_in'] ?? ''));
            })
            ->values();

        $total = $rows->count();
        $items = $rows->forPage($page, $perPage)->values();

        $payload = [
            'current_page' => $page,
            'data' => $items,
            'from' => $items->isEmpty() ? null : (($page - 1) * $perPage) + 1,
            'last_page' => max(1, (int) ceil($total / $perPage)),
            'per_page' => $perPage,
            'to' => $items->isEmpty() ? null : (($page - 1) * $perPage) + $items->count(),
            'total' => $total,
        ];
        // Opt-in so the table's and Analytics' existing requests are unchanged.
        // Aggregated over every filtered row, not just the returned page, so the
        // admin summary cards stay correct past the first page of results.
        if ($request->boolean('summary')) {
            $trendBy = in_array($request->input('trend_by'), ['day', 'week', 'month'], true)
                ? $request->input('trend_by')
                : 'day';
            // The trend ends on the exact date being viewed, otherwise today.
            $trendEnd = $request->filled('date')
                ? Carbon::parse($request->input('date'), 'Asia/Manila')->startOfDay()
                : now('Asia/Manila')->startOfDay();
            $payload['summary'] = $this->remittanceSummary($rows, $request->input('date_from'), $trendBy, $trendEnd);
        }

        return $this->successResponse($payload, 'Remittances retrieved');
    }

    /**
     * Reconciliation totals for the Remittance Tracker's summary cards.
     *
     * Amounts only count shifts whose cash an admin has already declared, and
     * only inside the requested period — `date_from` also pulls in recent
     * PENDING carry-overs and last-24h active shifts, which are excluded here.
     * The declaration counts keep those carry-overs on purpose: they mirror
     * the table, which keeps a previous day's ended shift visible until its
     * cash is declared. Still-active shifts never count as awaiting declaration.
     *
     * `trend` is the same set of figures per bucket, ending on `$trendEnd`
     * (it feeds the cards' sparklines) — fleet-wide, ignoring the other
     * filters. Declaration counts there are grouped by the shift's date, i.e.
     * which days the still-undeclared shifts came from.
     *
     * @param  Collection<int, array<string, mixed>>  $rows
     * @param  'day'|'week'|'month'  $trendBy
     * @return array<string, mixed>
     */
    private function remittanceSummary(Collection $rows, ?string $dateFrom, string $trendBy, Carbon $trendEnd): array
    {
        $declaredStatuses = [
            Remittance::STATUS_COMPLETE,
            Remittance::STATUS_SHORTAGE,
            Remittance::STATUS_OVERAGE,
            'Remitted',
        ];
        $declared = $rows->filter(fn (array $row): bool => in_array($row['remittance_status'] ?? null, $declaredStatuses, true)
            && (! $dateFrom || (string) ($row['date'] ?? '') >= $dateFrom));
        $awaitingDeclaration = $rows->filter(fn (array $row): bool => ($row['remittance_status'] ?? null) === Remittance::STATUS_PENDING
            && empty($row['is_active_shift']));
        $overdueCount = $awaitingDeclaration->filter(fn (array $row): bool => ! empty($row['is_overdue']))->count();
        $sum = fn (string $key): float => round((float) $declared->sum(fn (array $row): float => (float) ($row[$key] ?? 0)), 2);

        return [
            'total_passengers' => (int) $declared->sum(fn (array $row): int => (int) ($row['total_passengers'] ?? 0)),
            'cash_total' => round((float) $declared->sum(fn (array $row): float => (float) ($row['cash_total'] ?? $row['total_collected'] ?? 0)), 2),
            'gcash_total' => $sum('gcash_total'),
            'shortage_total' => $sum('shortage'),
            'overage_total' => $sum('overage'),
            'for_cash_declaration_count' => $awaitingDeclaration->count() - $overdueCount,
            'overdue_count' => $overdueCount,
            'trend' => $this->remittanceTrend($declaredStatuses, $trendBy, $trendEnd),
        ];
    }

    /**
     * Sparkline buckets, oldest first, the last one ending on `$end`:
     *   day   — 7 single days.
     *   week  — 6 rolling 7-day windows, so the last one matches "Last 7 Days".
     *   month — 6 calendar months, the last one running to `$end`.
     *
     * One grouped-by-date query over the whole span (at most ~6 months of
     * rows, a range scan on remittances_date_index), then bucketed in PHP —
     * portable across MySQL and SQLite, unlike DB-specific week/month
     * functions. Active shifts have no Remittance row yet, so never appear.
     *
     * @param  list<string>  $declaredStatuses
     * @param  'day'|'week'|'month'  $by
     * @return list<array<string, mixed>>
     */
    private function remittanceTrend(array $declaredStatuses, string $by, Carbon $end): array
    {
        /** @var list<array{0: Carbon, 1: Carbon}> $buckets */
        $buckets = match ($by) {
            'week' => array_map(fn (int $n): array => [
                $end->copy()->subDays(7 * $n + 6),
                $end->copy()->subDays(7 * $n),
            ], range(5, 0)),
            'month' => array_map(fn (int $n): array => [
                $end->copy()->startOfMonth()->subMonthsNoOverflow($n),
                $n === 0 ? $end->copy() : $end->copy()->startOfMonth()->subMonthsNoOverflow($n)->endOfMonth()->startOfDay(),
            ], range(5, 0)),
            default => array_map(fn (int $n): array => [
                $end->copy()->subDays($n),
                $end->copy()->subDays($n),
            ], range(6, 0)),
        };

        $now = now();
        $declaredIn = implode(', ', array_fill(0, count($declaredStatuses), '?'));
        $whenDeclared = fn (string $column): string => "COALESCE(SUM(CASE WHEN remittance_status IN ({$declaredIn}) THEN {$column} ELSE 0 END), 0)";

        $days = Remittance::query()
            ->where('date', '>=', $buckets[0][0]->toDateString())
            ->where('date', '<=', $end->toDateString())
            ->select('date')
            ->selectRaw($whenDeclared('total_passengers').' AS passengers', $declaredStatuses)
            ->selectRaw($whenDeclared('COALESCE(cash_total, total_collected)').' AS cash', $declaredStatuses)
            ->selectRaw($whenDeclared('gcash_total').' AS gcash', $declaredStatuses)
            ->selectRaw($whenDeclared('shortage').' AS shortage', $declaredStatuses)
            ->selectRaw($whenDeclared('overage').' AS overage', $declaredStatuses)
            ->selectRaw('COALESCE(SUM(CASE WHEN remittance_status = ? AND remittance_due_at < ? THEN 1 ELSE 0 END), 0) AS overdue', [Remittance::STATUS_PENDING, $now])
            ->selectRaw('COALESCE(SUM(CASE WHEN remittance_status = ? AND (remittance_due_at IS NULL OR remittance_due_at >= ?) THEN 1 ELSE 0 END), 0) AS for_cash_declaration', [Remittance::STATUS_PENDING, $now])
            ->groupBy('date')
            ->get();

        return array_map(function (array $bucket) use ($days): array {
            [$start, $finish] = [$bucket[0]->toDateString(), $bucket[1]->toDateString()];
            $inBucket = $days->filter(fn (Remittance $day): bool => (string) $day->date >= $start && (string) $day->date <= $finish);
            $total = fn (string $key): float => round((float) $inBucket->sum(fn (Remittance $day): float => (float) $day->{$key}), 2);

            return [
                'start' => $start,
                'end' => $finish,
                'passengers' => (int) $total('passengers'),
                'cash' => $total('cash'),
                'gcash' => $total('gcash'),
                'shortage' => $total('shortage'),
                'overage' => $total('overage'),
                'for_cash_declaration' => (int) $total('for_cash_declaration'),
                'overdue' => (int) $total('overdue'),
            ];
        }, $buckets);
    }

    /**
     * POST /api/admin/remittances/{shiftId}/cash-declaration
     *
     * The admin's physical cash count for a conductor's ended, still-PENDING
     * remittance. Resolves it to COMPLETE/SHORTAGE/OVERAGE — see
     * ShiftCloseoutService::recordCashDeclaration(). 409s if this remittance's
     * cash was already declared (not PENDING), 404 if the shift_id doesn't
     * correspond to a real Remittance row (e.g. a still-active shift).
     */
    public function declareCash(DeclareCashRequest $request, string $shiftId): JsonResponse
    {
        $remittance = $this->shiftCloseoutService->recordCashDeclaration(
            $shiftId,
            (float) $request->validated('cash_declared'),
        );

        // The admin's count settles the remittance, so who counted what is
        // part of the audit trail.
        $peso = fn ($amount) => '₱'.number_format((float) $amount, 2);
        $result = match ($remittance->remittance_status) {
            Remittance::STATUS_SHORTAGE => 'short by '.$peso($remittance->shortage),
            Remittance::STATUS_OVERAGE => 'over by '.$peso($remittance->overage),
            default => 'matches the expected cash',
        };
        $this->activityLogService->record(
            ActivityLogCategory::REMITTANCE,
            "Declared {$peso($remittance->remitted_amount)} cash for unit {$remittance->unit_number} ({$remittance->conductor_name}): {$result}",
            $request->user(),
            [
                ['field' => 'Status', 'from' => 'Pending', 'to' => ucfirst(strtolower($remittance->remittance_status))],
                ['field' => 'Expected cash', 'from' => null, 'to' => $peso($remittance->cash_total)],
                ['field' => 'Cash declared', 'from' => null, 'to' => $peso($remittance->remitted_amount)],
            ],
        );

        return $this->successResponse($remittance->load(['shift', 'vehicle', 'driver']), 'Cash declaration recorded');
    }

    public function shiftLogs(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 100), 100));
        $page = max(1, (int) $request->integer('page', 1));

        if ($request->query('entry_view') === 'personnel') {
            $shiftRange = $request->string('shift_range')->toString() ?: null;

            if ($request->boolean('count_only')) {
                return $this->successResponse([
                    'total' => $this->adminService->countFleetShiftHistoryEntries(
                        $request->string('search')->toString() ?: null,
                        $shiftRange,
                    ),
                ], 'Shift history count retrieved');
            }

            $entries = $this->adminService->listFleetShiftHistoryEntries(
                $perPage,
                $page,
                $request->string('search')->toString() ?: null,
                $shiftRange,
            );

            return $this->successResponse($entries, 'Shift history entries retrieved');
        }

        $query = ShiftLog::query();

        if ($request->has('vehicle_id')) {
            $query->where('vehicle_id', $request->input('vehicle_id'));
        }

        if ($request->has('conductor_id')) {
            $query->where('conductor_id', $request->input('conductor_id'));
        }

        if ($request->has('driver_id')) {
            $query->where('driver_id', $request->input('driver_id'));
        }

        if ($request->filled('search')) {
            $search = '%'.str_replace(['%', '_'], ['\\%', '\\_'], (string) $request->input('search')).'%';
            $query->where(function ($searchQuery) use ($search): void {
                $searchQuery->where('driver_name', 'like', $search)
                    ->orWhere('conductor_name', 'like', $search)
                    ->orWhere('unit_number', 'like', $search)
                    ->orWhere('plate_number', 'like', $search)
                    ->orWhere('status', 'like', $search)
                    ->orWhere('notes', 'like', $search);
            });
        }

        if ($request->boolean('count_only')) {
            return $this->successResponse([
                'total' => (int) $query->count(),
            ], 'Shift log count retrieved');
        }

        $shiftLogs = $query
            ->with(['vehicle', 'driver', 'route', 'latestDeviceRecovery'])
            ->withCount([
                'transactions as synced_offline_cash_count' => function ($transactions): void {
                    $transactions
                        ->where('payment_method', PaymentMethod::CASH)
                        ->whereNotNull('offline_created_at')
                        ->whereNotNull('synced_at');
                },
            ])
            ->orderBy('time_in', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        return $this->successResponse($shiftLogs, 'Shift logs retrieved');
    }

    /**
     * Before/after values for a personnel edit, plus the photo, which is
     * logged as replaced/removed rather than as storage URLs.
     *
     * @param  array<string, string>  $fields
     * @return list<array{field: string, from: ?string, to: ?string}>
     */
    private function personnelChanges(array $before, Driver|ConductorProfile $after, array $fields, ?string $oldPhoto, ?string $newPhoto): array
    {
        $changes = ActivityLogService::diff($before, $after->only(array_keys($fields)), $fields);
        if ($oldPhoto !== $newPhoto) {
            $changes[] = ['field' => 'Photo', 'from' => $oldPhoto ? 'Previous photo' : null, 'to' => $newPhoto ? 'New photo' : null];
        }

        return $changes;
    }
}
