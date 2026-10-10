<?php

namespace Tests\Feature;

use App\Enums\ShiftStatus;
use App\Enums\UserRole;
use App\Models\AdminProfile;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\FarePoint;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * S5-T6 — Admin analytics aggregation.
 *
 * The aggregation math had NO automated coverage before this suite. These
 * tests assert the totals reconcile with the seeded rows and that the
 * date-range filter actually narrows the window.
 */
class AdminAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;
    private string $shiftId;

    protected function setUp(): void
    {
        parent::setUp();
        // One real parent shift to satisfy the transactions.shift_id FK.
        $this->shiftId = $this->seedShift();
    }

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

    private function seedShift(): string
    {
        $conductor = User::create([
            'email' => 'cond@test.com', 'password' => Hash::make('x'), 'role' => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id' => $conductor->id, 'first_name' => 'C', 'last_name' => 'One',
            'birthday' => '1990-01-01', 'generated_username' => 'c_one', 'generated_password' => Hash::make('x'),
        ]);
        $route = Route::create(['name' => 'R1', 'status' => 'ACTIVE']);
        $driver = Driver::create([
            'first_name' => 'D', 'last_name' => 'One', 'birthday' => '1985-01-01',
            'contact' => '+639170000000', 'license_number' => 'LIC-A', 'hire_date' => now()->toDateString(), 'status' => 'ACTIVE',
        ]);
        $vehicle = Vehicle::create([
            'unit_number' => 'UNIT-1', 'plate_number' => 'PLT-1', 'route_id' => $route->id, 'status' => 'ACTIVE',
        ]);
        $shiftId = 'shift-analytics-' . uniqid();
        ShiftLog::create([
            'shift_id' => $shiftId, 'conductor_id' => $conductor->id, 'driver_id' => $driver->id,
            'vehicle_id' => $vehicle->id, 'conductor_name' => 'C One', 'driver_name' => 'D One',
            'unit_number' => 'UNIT-1', 'plate_number' => 'PLT-1', 'time_in' => now()->subHours(8),
            'status' => ShiftStatus::ENDED, 'is_active' => false,
        ]);

        return $shiftId;
    }

    /**
     * Create a transaction with an explicit status / method / amount and an
     * optional created_at (defaults to now). created_at is set via a raw
     * update because it is not mass-assignable.
     */
    private function makeTransaction(string $status, string $method, float $amount, ?\DateTimeInterface $createdAt = null, array $attributes = []): Transaction
    {
        $this->seq++;
        $tx = Transaction::create([
            'transaction_id' => 'TXN-' . $this->seq . '-' . uniqid(),
            'shift_id'       => $this->shiftId,
            'payment_method' => $method,
            'final_amount'   => $amount,
            'status'         => $status,
            'pickup_name'    => 'A',
            'dropoff_name'   => 'B',
            ...$attributes,
        ]);

        if ($createdAt !== null) {
            DB::table('transactions')->where('transaction_id', $tx->transaction_id)
                ->update(['created_at' => $createdAt]);
        }
        return $tx;
    }

    public function test_analytics_totals_reconcile_with_seeded_transactions(): void
    {
        $admin = $this->makeAdmin();

        // PAID (count toward revenue): cash 100 + 50, gcash 200.
        $this->makeTransaction('PAID', 'CASH', 100.00);
        $this->makeTransaction('PAID', 'CASH', 50.00);
        $this->makeTransaction('PAID', 'GCASH', 200.00);
        // PENDING (must NOT count toward revenue, but counts as pending).
        $this->makeTransaction('PENDING', 'GCASH', 999.00);

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/analytics');

        $response->assertStatus(200);
        $totals = $response->json('data.totals');

        $this->assertEquals(150.0, $totals['cash_total']);
        $this->assertEquals(200.0, $totals['gcash_total']);
        $this->assertEquals(350.0, $totals['total_fares']);
        $this->assertEquals(3, $totals['paid_count']);
        $this->assertEquals(1, $totals['pending_count']);

        // Invariant: cash_total + gcash_total == total_fares.
        $this->assertEquals(
            $totals['total_fares'],
            $totals['cash_total'] + $totals['gcash_total'],
        );

        // Payment split counts.
        $split = $response->json('data.payment_split');
        $this->assertEquals(2, $split['cash']['count']);
        $this->assertEquals(1, $split['gcash']['count']);
    }

    public function test_date_filter_excludes_out_of_range_transactions(): void
    {
        $admin = $this->makeAdmin();

        $this->makeTransaction('PAID', 'CASH', 100.00, now());                // recent
        $this->makeTransaction('PAID', 'CASH', 999.00, now()->subDays(60));   // old — should be excluded

        $response = $this->actingAs($admin)->getJson(
            '/api/v1/admin/analytics?date_from=' . now()->subDays(7)->toDateString()
            . '&date_to=' . now()->toDateString()
        );

        $response->assertStatus(200);
        // Only the recent 100 falls in the 7-day window.
        $this->assertEquals(100.0, $response->json('data.totals.cash_total'));
        $this->assertEquals(1, $response->json('data.totals.paid_count'));
    }

    public function test_today_daily_totals_exclude_other_days_and_unsettled_or_free_rides(): void
    {
        $this->travelTo(now()->startOfDay()->addMinutes(5));
        $admin = $this->makeAdmin();
        $today = now()->startOfDay();

        $this->makeTransaction('PAID', 'CASH', 100, $today);
        $this->makeTransaction('PAID', 'GCASH', 200, $today->copy()->endOfDay());
        $this->makeTransaction('PAID', 'VOUCHER', 0, $today);
        $this->makeTransaction('PENDING', 'GCASH', 999, $today);
        $this->makeTransaction('FAILED', 'GCASH', 999, $today);
        $this->makeTransaction('PAID', 'CASH', 700, $today->copy()->subSecond());
        $this->makeTransaction('PAID', 'CASH', 800, $today->copy()->addDay());

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/analytics')->assertOk();
        $this->assertSame($today->toDateString(), $response->json('data.date_range.to'));
        $day = collect($response->json('data.daily_series'))->firstWhere('date', $today->toDateString());

        $this->assertEquals(300, $day['cash'] + $day['gcash']);
        $this->assertSame(2, $day['paid_count']);
        $this->assertSame(3, $day['count']);
        // The other dashboard metrics keep their existing 30-day window.
        $this->assertEquals(1000, $response->json('data.totals.total_fares'));
        $this->assertSame(3, $response->json('data.totals.paid_count'));
    }

    public function test_today_daily_totals_are_zero_when_only_earlier_days_have_rides(): void
    {
        $this->travelTo(now()->startOfDay()->addMinutes(5));
        $admin = $this->makeAdmin();
        $this->makeTransaction('PAID', 'CASH', 500, now()->subDay());

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/analytics')->assertOk();
        $day = collect($response->json('data.daily_series'))->firstWhere('date', now()->toDateString());

        $this->assertEquals(0, $day['cash'] + $day['gcash']);
        $this->assertSame(0, $day['paid_count']);
        $this->assertSame(0, $day['count']);
        $this->assertEquals(500, $response->json('data.totals.total_fares'));
    }

    public function test_weekly_dashboard_pickups_combine_major_places_for_cash_and_gcash_only(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 14)->setTime(12, 0));
        $admin = $this->makeAdmin();
        $route = Route::firstOrFail();
        $major = FarePoint::create([
            'route_id' => $route->id, 'point_number' => 1, 'code' => 'WAWA',
            'name' => 'Wawa', 'regular_fare' => 15, 'discounted_fare' => 12,
        ]);
        $other = FarePoint::create([
            'route_id' => $route->id, 'point_number' => 2, 'code' => 'BAL',
            'name' => 'Balite', 'regular_fare' => 15, 'discounted_fare' => 12,
        ]);
        $monday = now()->startOfWeek(\Carbon\Carbon::MONDAY);
        $from = ['pickup_stop_id' => $major->id, 'dropoff_stop_id' => $other->id];
        $this->makeTransaction('PAID', 'CASH', 15, $monday, [...$from, 'pickup_name' => 'Wawa · Market']);
        $this->makeTransaction('PAID', 'GCASH', 15, now(), [...$from, 'pickup_name' => 'Wawa · Church']);
        $this->makeTransaction('PAID', 'CASH', 15, now(), [...$from, 'pickup_name' => 'Wawa']);
        $this->makeTransaction('PAID', 'GCASH', 15, now(), [
            'pickup_stop_id' => $other->id, 'pickup_name' => 'Balite',
            'dropoff_stop_id' => $major->id, 'dropoff_name' => 'Wawa',
        ]);
        $this->makeTransaction('PAID', 'CASH', 15, $monday->copy()->subSecond(), $from);
        $this->makeTransaction('PAID', 'GCASH', 15, now()->addDay(), $from);
        foreach (['PENDING', 'FAILED', 'CANCELLED', 'EXPIRED'] as $status) {
            $this->makeTransaction($status, 'GCASH', 15, now(), $from);
        }
        $this->makeTransaction('PAID', 'VOUCHER', 0, now(), $from);

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/analytics?pickup_period=week')->assertOk();
        $this->assertSame([
            ['name' => 'Wawa', 'count' => 3],
            ['name' => 'Balite', 'count' => 1],
        ], $response->json('data.pickup_points'));
        $this->assertSame(30, $response->json('data.date_range.days'));
        $this->assertEquals(75, $response->json('data.totals.total_fares'));

        // Analytics without the dashboard option still uses its selected range.
        $analytics = $this->actingAs($admin)->getJson('/api/v1/admin/analytics?date_from=2026-10-11&date_to=2026-10-11')->assertOk();
        $this->assertSame([['name' => 'A', 'count' => 1]], $analytics->json('data.pickup_points'));
    }

    public function test_weekly_dashboard_pickups_reset_on_monday_and_have_an_empty_state(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 12)->startOfDay());
        $admin = $this->makeAdmin();
        $point = FarePoint::create([
            'route_id' => Route::firstOrFail()->id, 'point_number' => 1, 'code' => 'WAWA',
            'name' => 'Wawa', 'regular_fare' => 15, 'discounted_fare' => 12,
        ]);
        $this->makeTransaction('PAID', 'CASH', 15, now()->subSecond(), ['pickup_stop_id' => $point->id]);

        $this->actingAs($admin)->getJson('/api/v1/admin/analytics?pickup_period=week')
            ->assertOk()->assertJsonPath('data.pickup_points', []);
        $this->makeTransaction('PAID', 'CASH', 15, now(), ['pickup_stop_id' => $point->id]);
        $this->actingAs($admin)->getJson('/api/v1/admin/analytics?pickup_period=week')
            ->assertOk()->assertJsonPath('data.pickup_points', [['name' => 'Wawa', 'count' => 1]]);
    }

    public function test_dashboard_pickup_period_rejects_unsupported_values(): void
    {
        $this->actingAs($this->makeAdmin())->getJson('/api/v1/admin/analytics?pickup_period=month')
            ->assertUnprocessable()->assertJsonValidationErrors('pickup_period');
    }

    public function test_analytics_response_shape_is_complete(): void
    {
        $admin = $this->makeAdmin();

        $this->actingAs($admin)->getJson('/api/v1/admin/analytics')
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'date_range'    => ['from', 'to', 'days'],
                    'totals'        => ['total_fares', 'cash_total', 'gcash_total', 'paid_count', 'pending_count'],
                    'payment_split' => ['cash' => ['count', 'total'], 'gcash' => ['count', 'total']],
                    'daily_series',
                    'remittances'   => ['total_remitted', 'total_collected', 'total_shortage', 'count'],
                    'fleet'         => ['active_vehicles', 'total_vehicles', 'active_conductors', 'total_conductors'],
                ],
            ]);
    }

    public function test_analytics_forbidden_for_non_admin(): void
    {
        $conductor = User::create([
            'email' => 'c2@test.com', 'password' => Hash::make('x'), 'role' => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id' => $conductor->id, 'first_name' => 'C', 'last_name' => 'Two',
            'birthday' => '1990-01-01', 'generated_username' => 'c_two', 'generated_password' => Hash::make('x'),
        ]);

        $this->actingAs($conductor)->getJson('/api/v1/admin/analytics')->assertStatus(403);
    }
}
