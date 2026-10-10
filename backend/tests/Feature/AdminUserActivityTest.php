<?php

namespace Tests\Feature;

use App\Enums\ShiftStatus;
use App\Enums\UserRole;
use App\Models\AdminProfile;
use App\Models\ActivityLog;
use App\Models\CommuterProfile;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * GET /admin/users/{id}/activity — AdminService::getUserActivity() references
 * `Transaction::where(...)` in the commuter branch without a `use
 * App\Models\Transaction;` import in AdminService.php. In PHP, an unqualified
 * class name resolves against the CURRENT namespace (App\Services) unless
 * imported, so — before that import was added — this call fatally errored
 * ("Class App\Services\Transaction not found") for any commuter who has at
 * least one transaction. This test exercises exactly that path.
 */
class AdminUserActivityTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        $admin = User::create([
            'email' => 'admin-activity@test.com',
            'password' => Hash::make('password123'),
            'role' => UserRole::ADMIN,
        ]);
        AdminProfile::create(['id' => $admin->id, 'first_name' => 'System', 'last_name' => 'Admin']);

        return $admin;
    }

    private function makeCommuter(): User
    {
        $commuter = User::create([
            'email' => 'commuter-activity@test.com',
            'password' => Hash::make('password123'),
            'role' => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id' => $commuter->id,
            'first_name' => 'Jose',
            'surname' => 'Mendoza',
            'birthdate' => '1998-05-12',
            'gender' => 'Male',
            'email' => $commuter->email,
            'contact_number' => '09171234567',
            'commuter_type' => 'REGULAR',
            'username' => 'commuter-activity',
            'language_preference' => 'English',
            'account_status' => 'ACTIVE',
            'verified_at' => now(),
        ]);

        return $commuter;
    }

    /** One real parent shift to satisfy the transactions.shift_id FK. */
    private function seedShift(): string
    {
        $conductor = User::create([
            'email' => 'conductor-activity@test.com', 'password' => Hash::make('password123'), 'role' => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id' => $conductor->id, 'first_name' => 'C', 'last_name' => 'One',
            'birthday' => '1990-01-01', 'generated_username' => 'c_activity', 'generated_password' => Hash::make('password123'),
        ]);
        $route = Route::create(['name' => 'Activity Route', 'status' => 'ACTIVE']);
        $driver = Driver::create([
            'first_name' => 'D', 'last_name' => 'One', 'birthday' => '1985-01-01',
            'contact' => '+639170000001', 'license_number' => 'LIC-ACT', 'hire_date' => now()->toDateString(), 'status' => 'ACTIVE',
        ]);
        $vehicle = Vehicle::create([
            'unit_number' => 'UNIT-ACT', 'plate_number' => 'PLT-ACT', 'route_id' => $route->id, 'status' => 'ACTIVE',
        ]);
        $shiftId = 'shift-activity-'.uniqid();
        ShiftLog::create([
            'shift_id' => $shiftId, 'conductor_id' => $conductor->id, 'driver_id' => $driver->id,
            'vehicle_id' => $vehicle->id, 'conductor_name' => 'C One', 'driver_name' => 'D One',
            'unit_number' => 'UNIT-ACT', 'plate_number' => 'PLT-ACT', 'time_in' => now()->subHours(2),
            'status' => ShiftStatus::ENDED, 'is_active' => false,
        ]);

        return $shiftId;
    }

    public function test_activity_endpoint_includes_commuter_transactions_without_fataling(): void
    {
        $admin = $this->makeAdmin();
        $commuter = $this->makeCommuter();
        $shiftId = $this->seedShift();

        Transaction::create([
            'transaction_id' => 'TXN-ACT-'.uniqid(),
            'shift_id' => $shiftId,
            'passenger_id' => $commuter->id,
            'payment_method' => 'CASH',
            'final_amount' => 25.00,
            'status' => 'PAID',
            'pickup_name' => 'Terminal A',
            'dropoff_name' => 'Terminal B',
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/admin/users/{$commuter->id}/activity");

        $response->assertOk();

        $events = $response->json('data');
        $this->assertIsArray($events);
        $paymentEvent = collect($events)->firstWhere('action', 'Payment');
        $this->assertNotNull($paymentEvent, 'Expected a Payment event built from the seeded transaction.');
        $this->assertStringContainsString('Terminal A', $paymentEvent['details']);
    }

    public function test_activity_endpoint_works_for_commuter_with_no_transactions(): void
    {
        $admin = $this->makeAdmin();
        $commuter = $this->makeCommuter();

        $this->actingAs($admin)
            ->getJson("/api/v1/admin/users/{$commuter->id}/activity")
            ->assertOk();
    }

    public function test_today_audit_feed_paginates_without_repeating_equal_timestamp_entries(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 11)->startOfDay()->addHours(12));
        $admin = $this->makeAdmin();
        $create = fn ($time) => ActivityLog::forceCreate([
            'category' => 'GENERAL', 'description' => 'Activity entry',
            'actor_id' => $admin->id, 'actor_name' => 'System Admin',
            'created_at' => $time, 'updated_at' => $time,
        ])->id;

        $middle = [];
        for ($i = 0; $i < 23; $i++) {
            $middle[] = $create(now()->startOfDay()->addHours(10));
        }
        rsort($middle, SORT_STRING);
        $start = $create(now()->startOfDay());
        $end = $create(now()->endOfDay());
        $create(now()->subDay()->endOfDay());
        $create(now()->addDay()->startOfDay());

        $ids = [];
        for ($page = 1; $page <= 3; $page++) {
            $response = $this->actingAs($admin)
                ->getJson("/api/v1/admin/activity-logs?date_range=today&per_page=10&page={$page}")
                ->assertOk()->assertJsonPath('data.total', 25)
                ->assertJsonPath('data.current_page', $page)
                ->assertJsonPath('data.last_page', 3);
            $rows = $response->json('data.data');
            $this->assertCount($page < 3 ? 10 : 5, $rows);
            $ids = array_merge($ids, array_column($rows, 'id'));
        }
        $this->assertSame([$end, ...$middle, $start], $ids);
        $this->assertCount(25, array_unique($ids));
    }

    public function test_today_audit_feed_is_empty_when_only_other_days_have_activity(): void
    {
        $admin = $this->makeAdmin();
        foreach ([now()->subDay()->endOfDay(), now()->addDay()->startOfDay()] as $time) {
            ActivityLog::forceCreate([
                'category' => 'GENERAL', 'description' => 'Outside today',
                'created_at' => $time, 'updated_at' => $time,
            ]);
        }
        $this->actingAs($admin)
            ->getJson('/api/v1/admin/activity-logs?date_range=today&per_page=10&page=1')
            ->assertOk()->assertJsonPath('data.total', 0)
            ->assertJsonPath('data.last_page', 1)
            ->assertJsonCount(0, 'data.data');
    }
}
