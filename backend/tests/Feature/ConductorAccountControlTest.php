<?php

namespace Tests\Feature;

use App\Enums\ShiftStatus;
use App\Enums\UserRole;
use App\Models\AdminProfile;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Admin "Disable Account" and "Reset Credentials" on a conductor
 * (TC-ADMIN-COND-098 to 102).
 */
class ConductorAccountControlTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN_PASSWORD = 'AdminPass@123';

    private const CONDUCTOR_PASSWORD = 'juan.03151990';

    private function makeAdmin(): User
    {
        $admin = User::create([
            'email' => 'admin@gmail.com',
            'password' => Hash::make(self::ADMIN_PASSWORD),
            'role' => UserRole::ADMIN,
        ]);
        AdminProfile::create(['id' => $admin->id, 'first_name' => 'System', 'last_name' => 'Admin']);

        return $admin;
    }

    private function makeConductor(): User
    {
        $conductor = User::create([
            'email' => 'j.delacruz@chatco.local',
            'password' => self::CONDUCTOR_PASSWORD,
            'role' => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id' => $conductor->id,
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'birthday' => '1990-03-15',
            'generated_username' => 'j.delacruz',
            'generated_password' => self::CONDUCTOR_PASSWORD,
            'status' => 'ACTIVE',
        ]);

        return $conductor;
    }

    private function login(string $login, string $password)
    {
        return $this->postJson('/api/v1/auth/login', ['login' => $login, 'password' => $password]);
    }

    public function test_disable_with_wrong_admin_password_is_refused(): void
    {
        $admin = $this->makeAdmin();
        $conductor = $this->makeConductor();

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/conductors/{$conductor->id}/disable", ['current_password' => 'wrong-password'])
            ->assertStatus(422)
            ->assertJsonPath('errors.current_password.0', 'The password you entered is incorrect.');

        $this->assertDatabaseHas('conductor_profiles', ['id' => $conductor->id, 'status' => 'ACTIVE']);
    }

    public function test_disabled_conductor_cannot_log_in_again(): void
    {
        $admin = $this->makeAdmin();
        $conductor = $this->makeConductor();

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/conductors/{$conductor->id}/disable", ['current_password' => self::ADMIN_PASSWORD])
            ->assertOk()
            ->assertJsonPath('message', 'Conductor account disabled. All sessions revoked.');

        $this->assertDatabaseHas('conductor_profiles', ['id' => $conductor->id, 'status' => 'DISABLED']);

        $this->app['auth']->forgetGuards();

        $this->login('j.delacruz', self::CONDUCTOR_PASSWORD)
            ->assertStatus(403)
            ->assertJsonPath('message', 'This conductor account has been disabled. Ask an administrator to reset your credentials.');
    }

    public function test_detail_reports_disabled_status(): void
    {
        $admin = $this->makeAdmin();
        $conductor = $this->makeConductor();
        $conductor->conductorProfile->update(['status' => 'DISABLED']);

        $this->actingAs($admin)
            ->getJson("/api/v1/admin/conductors/{$conductor->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'DISABLED');
    }

    public function test_disable_is_refused_while_conductor_is_on_an_active_shift(): void
    {
        $admin = $this->makeAdmin();
        $conductor = $this->makeConductor();
        $driver = Driver::create([
            'first_name' => 'D', 'last_name' => 'One', 'birthday' => '1985-01-01',
            'contact' => '09170000000', 'license_number' => 'N01-23-045678',
            'hire_date' => now()->toDateString(), 'status' => 'ACTIVE',
        ]);
        $vehicle = Vehicle::create([
            'unit_number' => 'UNIT-1', 'plate_number' => 'PLT-1', 'vehicle_type' => 'Jeepney',
            'status' => 'ACTIVE', 'conductor_id' => $conductor->id,
        ]);
        $shiftId = 'shift-'.uniqid();
        ShiftLog::create([
            'shift_id' => $shiftId, 'conductor_id' => $conductor->id, 'driver_id' => $driver->id,
            'vehicle_id' => $vehicle->id, 'conductor_name' => 'Juan Dela Cruz', 'driver_name' => 'D One',
            'unit_number' => 'UNIT-1', 'plate_number' => 'PLT-1',
            'time_in' => now(), 'status' => ShiftStatus::ACTIVE, 'is_active' => true,
        ]);
        $vehicle->update(['active_shift_id' => $shiftId]);

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/conductors/{$conductor->id}/disable", ['current_password' => self::ADMIN_PASSWORD])
            ->assertStatus(409)
            ->assertJsonPath('errors.conductor.0', 'Cannot disable a conductor who is currently on an active shift. End the shift first.');

        $this->assertDatabaseHas('conductor_profiles', ['id' => $conductor->id, 'status' => 'ACTIVE']);
    }

    public function test_reset_credentials_issues_a_new_password_and_re_enables(): void
    {
        $admin = $this->makeAdmin();
        $conductor = $this->makeConductor();
        $conductor->conductorProfile->update(['status' => 'DISABLED']);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/admin/conductors/{$conductor->id}/reset-credentials", ['current_password' => self::ADMIN_PASSWORD])
            ->assertOk()
            ->assertJsonPath('message', 'Credentials reset successfully. The conductor must log in with the new credentials.');

        $username = $response->json('data.generated_username');
        $newPassword = $response->json('data.generated_password');

        $this->assertNotSame(self::CONDUCTOR_PASSWORD, $newPassword);
        $this->assertDatabaseHas('conductor_profiles', ['id' => $conductor->id, 'status' => 'ACTIVE']);

        $this->app['auth']->forgetGuards();

        $this->login($username, self::CONDUCTOR_PASSWORD)->assertStatus(401);
        $this->login($username, $newPassword)->assertOk();
    }
}
