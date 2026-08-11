<?php

namespace Tests\Feature;

use App\Enums\ShiftStatus;
use App\Enums\UserRole;
use App\Models\AdminProfile;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\TerminatedPersonnel;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminFleetPaginationTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        $admin = User::create([
            'email' => 'admin-fleet@test.com',
            'password' => Hash::make('password123'),
            'role' => UserRole::ADMIN,
        ]);
        AdminProfile::create(['id' => $admin->id, 'first_name' => 'Fleet', 'last_name' => 'Admin']);

        return $admin;
    }

    private function makeDriver(int $index): Driver
    {
        return Driver::create([
            'first_name' => 'Driver',
            'last_name' => str_pad((string) $index, 3, '0', STR_PAD_LEFT),
            'birthday' => '1985-01-01',
            'contact' => '+63917'.str_pad((string) $index, 7, '0', STR_PAD_LEFT),
            'license_number' => 'LIC-'.$index,
            'hire_date' => now()->toDateString(),
            'status' => 'ACTIVE',
        ]);
    }

    private function makeConductor(int $index): ConductorProfile
    {
        $user = User::create([
            'email' => "conductor{$index}@test.com",
            'password' => Hash::make('password123'),
            'role' => UserRole::CONDUCTOR,
        ]);

        return ConductorProfile::create([
            'id' => $user->id,
            'first_name' => 'Conductor',
            'last_name' => str_pad((string) $index, 3, '0', STR_PAD_LEFT),
            'birthday' => '1990-01-01',
            'generated_username' => "conductor{$index}",
            'generated_password' => Hash::make('password123'),
        ]);
    }

    public function test_personnel_endpoint_is_server_paginated(): void
    {
        $admin = $this->makeAdmin();

        for ($i = 1; $i <= 30; $i++) {
            $this->makeDriver($i);
        }
        for ($i = 1; $i <= 5; $i++) {
            $this->makeConductor($i);
        }

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/personnel?per_page=25&page=1');

        $response->assertOk()
            ->assertJsonPath('data.current_page', 1)
            ->assertJsonPath('data.per_page', 25)
            ->assertJsonPath('data.total', 35);

        $this->assertCount(25, $response->json('data.data'));
    }

    public function test_terminated_personnel_endpoint_is_server_paginated(): void
    {
        $admin = $this->makeAdmin();

        for ($i = 1; $i <= 30; $i++) {
            TerminatedPersonnel::create([
                'personnel_id' => (string) $i,
                'personnel_type' => 'DRIVER',
                'name' => "Archived Driver {$i}",
                'role' => 'Driver',
                'contact' => '+639170000000',
                'reason' => 'Separated from service',
                'termination_type' => 'TERMINATED',
                'terminated_date' => now()->subDays($i)->toDateString(),
                'last_vehicle' => "UNIT-{$i}",
            ]);
        }

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/terminated-personnel?per_page=25&page=1');

        $response->assertOk()
            ->assertJsonPath('data.current_page', 1)
            ->assertJsonPath('data.per_page', 25)
            ->assertJsonPath('data.total', 30);

        $this->assertCount(25, $response->json('data.data'));
    }

    public function test_shift_history_personnel_entries_are_server_paginated(): void
    {
        $admin = $this->makeAdmin();
        $driver = $this->makeDriver(1);
        $conductor = $this->makeConductor(1);
        $route = Route::create(['name' => 'Fleet Route', 'status' => 'ACTIVE']);
        $vehicle = Vehicle::create([
            'unit_number' => 'UNIT-FLEET',
            'plate_number' => 'FLT-001',
            'route_id' => $route->id,
            'status' => 'ACTIVE',
        ]);

        for ($i = 1; $i <= 13; $i++) {
            ShiftLog::create([
                'shift_id' => 'fleet-page-'.$i,
                'conductor_id' => $conductor->id,
                'driver_id' => $driver->id,
                'vehicle_id' => $vehicle->id,
                'route_id' => $route->id,
                'conductor_name' => 'Conductor 001',
                'driver_name' => 'Driver 001',
                'unit_number' => 'UNIT-FLEET',
                'plate_number' => 'FLT-001',
                'time_in' => now()->subHours($i),
                'status' => ShiftStatus::ENDED,
                'is_active' => false,
            ]);
        }

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/shift-logs?entry_view=personnel&per_page=25&page=1');

        $response->assertOk()
            ->assertJsonPath('data.current_page', 1)
            ->assertJsonPath('data.per_page', 25)
            ->assertJsonPath('data.total', 26);

        $this->assertCount(25, $response->json('data.data'));
    }
}
