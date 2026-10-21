<?php

namespace Tests\Feature;

use App\Enums\ShiftStatus;
use App\Enums\UserRole;
use App\Models\AdminProfile;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\AdminService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * S5-T4 — Admin vehicle CRUD (behavioural coverage).
 *
 * RoleAccessMatrixTest covers access + the 409 active-shift delete guard;
 * this suite covers generated unit numbers, plate/unit uniqueness, updates,
 * and list filter/search/pagination.
 */
class AdminVehicleCrudTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    private function makeAdmin(): User
    {
        $admin = User::create([
            'email'    => 'admin@gmail.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::ADMIN,
        ]);
        AdminProfile::create(['id' => $admin->id, 'first_name' => 'System', 'last_name' => 'Admin']);

        return $admin;
    }

    private function makeCommuter(): User
    {
        return User::create([
            'email'    => 'commuter@test.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::COMMUTER,
        ]);
    }

    private function makeVehicle(array $overrides = []): Vehicle
    {
        $this->seq++;

        return Vehicle::create(array_merge([
            'unit_number'  => "UNIT-{$this->seq}",
            'plate_number' => "PLT-{$this->seq}",
            'vehicle_type' => 'Jeepney',
            'status'       => 'ACTIVE',
        ], $overrides));
    }

    // ── Create ───────────────────────────────────────────────────

    public function test_admin_can_create_vehicle(): void
    {
        $admin = $this->makeAdmin();

        $response = $this->actingAs($admin)->postJson('/api/v1/admin/vehicles', [
            'plate_number' => 'NEW-1234',
            'brand'        => 'Isuzu',
            'model'        => 'Elf NHR',
            'vehicle_type' => 'Bus',
        ]);

        $response->assertStatus(201)->assertJsonPath('success', true)
            ->assertJsonPath('data.unit_number', 'UNIT-1');
        $this->assertDatabaseHas('vehicles', [
            'unit_number'  => 'UNIT-1',
            'plate_number' => 'NEW-1234',
            'brand'        => 'Isuzu',
            'model'        => 'Elf NHR',
            'vehicle_type' => 'Bus',
        ]);
    }

    public function test_create_rejects_missing_brand_or_model(): void
    {
        $admin = $this->makeAdmin();

        $this->actingAs($admin)->postJson('/api/v1/admin/vehicles', [
            'plate_number' => 'NB-0001',
        ])->assertStatus(422)->assertJsonStructure(['errors' => ['brand', 'model']]);
    }

    public function test_create_rejects_manual_unit_numbers_and_duplicate_plates(): void
    {
        $admin = $this->makeAdmin();
        $this->makeVehicle(['unit_number' => 'UNIT-DUP', 'plate_number' => 'DUP-0001']);

        $this->actingAs($admin)->postJson('/api/v1/admin/vehicles', [
            'unit_number'  => 'UNIT-MANUAL',
            'plate_number' => 'OTHER-9999',
            'brand' => 'Isuzu',
            'model' => 'Elf NHR',
        ])->assertStatus(422)->assertJsonStructure(['errors' => ['unit_number']]);

        $this->actingAs($admin)->postJson('/api/v1/admin/vehicles', [
            'plate_number' => 'DUP-0001',     // duplicate
            'brand' => 'Isuzu',
            'model' => 'Elf NHR',
        ])->assertStatus(422)->assertJsonStructure(['errors' => ['plate_number']]);
    }

    public function test_create_rejects_invalid_vehicle_type(): void
    {
        $admin = $this->makeAdmin();

        $this->actingAs($admin)->postJson('/api/v1/admin/vehicles', [
            'plate_number' => 'X-0001',
            'vehicle_type' => 'Spaceship',
        ])->assertStatus(422)->assertJsonStructure(['errors' => ['vehicle_type']]);
    }

    // ── Read / list ──────────────────────────────────────────────

    public function test_unit_number_preview_is_read_only_for_an_empty_fleet(): void
    {
        $admin = $this->makeAdmin();

        for ($attempt = 0; $attempt < 2; $attempt++) {
            $response = $this->actingAs($admin)->getJson('/api/v1/admin/vehicles?next_unit_number=1')
                ->assertOk()->assertJsonPath('data.unit_number', 'UNIT-1');

            $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        }

        $this->assertDatabaseCount('vehicles', 0);
        $this->assertDatabaseCount('vehicle_unit_sequences', 0);
    }

    public function test_unit_number_preview_uses_existing_units_without_reserving_a_number(): void
    {
        $admin = $this->makeAdmin();
        $this->makeVehicle(['unit_number' => 'UNIT-010']);
        $this->makeVehicle(['unit_number' => 'UNIT-013'])->delete();

        $this->actingAs($admin)->getJson('/api/v1/admin/vehicles?next_unit_number=1')
            ->assertOk()->assertJsonPath('data.unit_number', 'UNIT-14');
        $this->assertDatabaseCount('vehicle_unit_sequences', 0);

        // Another addition can take the previewed number before this form saves.
        foreach ([14, 15] as $number) {
            $this->postJson('/api/v1/admin/vehicles', [
                'plate_number' => "PREVIEW-{$number}", 'brand' => 'Isuzu', 'model' => 'Elf NHR',
            ])->assertCreated()->assertJsonPath('data.unit_number', "UNIT-{$number}");
        }

        $this->getJson('/api/v1/admin/vehicles?next_unit_number=1')
            ->assertOk()->assertJsonPath('data.unit_number', 'UNIT-16');
        $this->assertDatabaseHas('vehicle_unit_sequences', ['id' => 1, 'last_number' => 15]);
    }

    public function test_generated_units_continue_after_the_highest_existing_number(): void
    {
        $admin = $this->makeAdmin();
        foreach (['UNIT-009', 'UNIT – 10', 'UNIT-2', 'UNIT-OLD', 'CUSTOM-999'] as $name) {
            $this->makeVehicle(['unit_number' => $name]);
        }

        foreach ([11, 12, 13] as $number) {
            $this->actingAs($admin)->postJson('/api/v1/admin/vehicles', [
                'plate_number' => "AUTO-{$number}",
                'brand' => 'Isuzu',
                'model' => 'Elf NHR',
            ])->assertCreated()->assertJsonPath('data.unit_number', "UNIT-{$number}");
        }
    }

    public function test_generated_units_include_deleted_units_and_never_reuse_a_number(): void
    {
        $admin = $this->makeAdmin();
        $this->makeVehicle(['unit_number' => 'UNIT-010'])->delete();

        $created = $this->actingAs($admin)->postJson('/api/v1/admin/vehicles', [
            'plate_number' => 'AUTO-11', 'brand' => 'Isuzu', 'model' => 'Elf NHR',
        ])->assertCreated()->assertJsonPath('data.unit_number', 'UNIT-11');

        Vehicle::findOrFail($created->json('data.id'))->forceDelete();

        $this->postJson('/api/v1/admin/vehicles', [
            'plate_number' => 'AUTO-12', 'brand' => 'Isuzu', 'model' => 'Elf NHR',
        ])->assertCreated()->assertJsonPath('data.unit_number', 'UNIT-12');
    }

    public function test_unit_sequence_advances_when_an_existing_unit_is_renamed(): void
    {
        $admin = $this->makeAdmin();
        $vehicle = $this->makeVehicle(['unit_number' => 'UNIT-10']);

        $this->actingAs($admin)->putJson("/api/v1/admin/vehicles/{$vehicle->id}", [
            'unit_number' => 'UNIT – 40',
        ])->assertOk();

        $this->postJson('/api/v1/admin/vehicles', [
            'plate_number' => 'AUTO-41', 'brand' => 'Isuzu', 'model' => 'Elf NHR',
        ])->assertCreated()->assertJsonPath('data.unit_number', 'UNIT-41');

        $this->putJson("/api/v1/admin/vehicles/{$vehicle->id}", [
            'unit_number' => 'LEGACY-UNIT',
        ])->assertOk();

        $this->postJson('/api/v1/admin/vehicles', [
            'plate_number' => 'AUTO-42', 'brand' => 'Isuzu', 'model' => 'Elf NHR',
        ])->assertCreated()->assertJsonPath('data.unit_number', 'UNIT-42');
    }

    public function test_failed_vehicle_insert_does_not_consume_a_unit_number(): void
    {
        $service = app(AdminService::class);
        $data = ['plate_number' => 'SAME-PLATE', 'brand' => 'Isuzu', 'model' => 'Elf NHR'];
        $this->assertSame('UNIT-1', $service->createVehicle($data)->unit_number);

        // Exercise the database uniqueness race after request validation:
        // another request has already inserted the same plate.
        try {
            $service->createVehicle($data);
            $this->fail('A duplicate plate must be rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('plate_number', $exception->errors());
        }

        $this->assertDatabaseHas('vehicle_unit_sequences', ['id' => 1, 'last_number' => 1]);
        $this->assertSame('UNIT-2', $service->createVehicle([
            'plate_number' => 'NEXT-PLATE', 'brand' => 'Isuzu', 'model' => 'Elf NHR',
        ])->unit_number);
    }

    public function test_database_rejects_duplicate_generated_unit_names(): void
    {
        $vehicle = app(AdminService::class)->createVehicle([
            'plate_number' => 'AUTO-1', 'brand' => 'Isuzu', 'model' => 'Elf NHR',
        ]);

        $this->expectException(UniqueConstraintViolationException::class);
        $this->makeVehicle(['unit_number' => $vehicle->unit_number]);
    }

    public function test_list_is_paginated_and_filterable(): void
    {
        $admin = $this->makeAdmin();
        $this->makeVehicle(['status' => 'ACTIVE', 'plate_number' => 'AAA-0001', 'unit_number' => 'UNIT-A']);
        $this->makeVehicle(['status' => 'MAINTENANCE', 'plate_number' => 'BBB-0002', 'unit_number' => 'UNIT-B']);

        // Unfiltered: both vehicles.
        $this->actingAs($admin)->getJson('/api/v1/admin/vehicles')
            ->assertStatus(200)
            ->assertJsonStructure(['data' => ['current_page', 'data', 'total']])
            ->assertJsonPath('data.total', 2);

        // Status filter.
        $this->actingAs($admin)->getJson('/api/v1/admin/vehicles?status=MAINTENANCE')
            ->assertStatus(200)
            ->assertJsonPath('data.total', 1);

        // Search by plate.
        $this->actingAs($admin)->getJson('/api/v1/admin/vehicles?search=AAA')
            ->assertStatus(200)
            ->assertJsonPath('data.total', 1);
    }

    // ── Update ───────────────────────────────────────────────────

    public function test_admin_can_update_vehicle(): void
    {
        $admin = $this->makeAdmin();
        $vehicle = $this->makeVehicle(['status' => 'ACTIVE']);

        $this->actingAs($admin)->putJson("/api/v1/admin/vehicles/{$vehicle->id}", [
            'status'       => 'MAINTENANCE',
            'vehicle_type' => 'Van',
        ])->assertStatus(200);

        $this->assertDatabaseHas('vehicles', [
            'id'           => $vehicle->id,
            'status'       => 'MAINTENANCE',
            'vehicle_type' => 'Van',
        ]);
    }

    /** TC-SYS-RELIABILITY-341: two admins save the same vehicle; last save wins. */
    public function test_two_admins_saving_the_same_vehicle_last_save_wins(): void
    {
        $adminA = $this->makeAdmin();
        $adminB = User::create([
            'email' => 'admin2@gmail.com', 'password' => Hash::make('password123'), 'role' => UserRole::ADMIN,
        ]);
        AdminProfile::create(['id' => $adminB->id, 'first_name' => 'Second', 'last_name' => 'Admin']);
        $vehicle = $this->makeVehicle(['status' => 'ACTIVE']);

        $this->actingAs($adminA)->putJson("/api/v1/admin/vehicles/{$vehicle->id}", [
            'plate_number' => 'AAA-1111', 'status' => 'MAINTENANCE',
        ])->assertOk();

        $this->actingAs($adminB)->putJson("/api/v1/admin/vehicles/{$vehicle->id}", [
            'plate_number' => 'BBB-2222', 'status' => 'INACTIVE',
        ])->assertOk();

        $this->assertDatabaseHas('vehicles', ['id' => $vehicle->id, 'plate_number' => 'BBB-2222', 'status' => 'INACTIVE']);
    }

    public function test_update_allows_keeping_own_plate_number(): void
    {
        $admin = $this->makeAdmin();
        $vehicle = $this->makeVehicle(['plate_number' => 'KEEP-0001', 'unit_number' => 'UNIT-KEEP']);

        // Re-sending the same plate must NOT trip the unique rule (ignore self).
        $this->actingAs($admin)->putJson("/api/v1/admin/vehicles/{$vehicle->id}", [
            'plate_number' => 'KEEP-0001',
            'status'       => 'INACTIVE',
        ])->assertStatus(200);
    }

    // ── Delete ───────────────────────────────────────────────────

    public function test_admin_can_soft_delete_vehicle(): void
    {
        $admin = $this->makeAdmin();
        $vehicle = $this->makeVehicle();

        $this->actingAs($admin)->deleteJson("/api/v1/admin/vehicles/{$vehicle->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('vehicles', ['id' => $vehicle->id]);
    }

    public function test_delete_blocked_with_409_when_on_active_shift(): void
    {
        $admin = $this->makeAdmin();

        $conductor = User::create([
            'email' => 'c@test.com', 'password' => Hash::make('password123'), 'role' => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id' => $conductor->id, 'first_name' => 'C', 'last_name' => 'One',
            'birthday' => '1990-01-01', 'generated_username' => 'c_one', 'generated_password' => Hash::make('x'),
        ]);
        $driver = Driver::create([
            'first_name' => 'D', 'last_name' => 'One', 'birthday' => '1985-01-01',
            'contact' => '+639170000000', 'license_number' => 'LIC-A', 'hire_date' => now()->toDateString(), 'status' => 'ACTIVE',
        ]);
        $vehicle = $this->makeVehicle();

        $shiftId = 'shift-active-' . uniqid();
        ShiftLog::create([
            'shift_id' => $shiftId, 'conductor_id' => $conductor->id, 'driver_id' => $driver->id,
            'vehicle_id' => $vehicle->id, 'conductor_name' => 'C One', 'driver_name' => 'D One',
            'unit_number' => $vehicle->unit_number, 'plate_number' => $vehicle->plate_number,
            'time_in' => now(), 'status' => ShiftStatus::ACTIVE, 'is_active' => true,
        ]);
        $vehicle->update(['active_shift_id' => $shiftId]);

        $this->actingAs($admin)->deleteJson("/api/v1/admin/vehicles/{$vehicle->id}")
            ->assertStatus(409);

        $this->assertDatabaseHas('vehicles', ['id' => $vehicle->id, 'deleted_at' => null]);
    }

    // ── Authorization ────────────────────────────────────────────

    public function test_vehicle_routes_forbidden_for_non_admin(): void
    {
        $commuter = $this->makeCommuter();
        $vehicle = $this->makeVehicle();

        $this->actingAs($commuter)->getJson('/api/v1/admin/vehicles')->assertStatus(403);
        $this->actingAs($commuter)->getJson('/api/v1/admin/vehicles?next_unit_number=1')->assertStatus(403);
        $this->actingAs($commuter)->postJson('/api/v1/admin/vehicles', [
            'unit_number' => 'U', 'plate_number' => 'P',
        ])->assertStatus(403);
        $this->actingAs($commuter)->deleteJson("/api/v1/admin/vehicles/{$vehicle->id}")->assertStatus(403);
    }
}
