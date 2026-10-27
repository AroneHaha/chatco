<?php

namespace Tests\Feature;

use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use App\Services\LocationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ConductorBreakModeTest extends TestCase
{
    use RefreshDatabase;

    public function test_conductor_break_hides_unit_from_commuters_but_not_admin_monitoring(): void
    {
        $shift = ShiftLog::factory()->create();
        $conductor = User::findOrFail($shift->conductor_id);

        Vehicle::whereKey($shift->vehicle_id)->update(['active_shift_id' => $shift->shift_id]);
        VehicleLocation::factory()->create([
            'vehicle_id' => $shift->vehicle_id,
            'conductor_id' => $shift->conductor_id,
            'shift_id' => $shift->shift_id,
            'fix_recorded_at' => now(),
            'lat' => 14.8527,
            'lng' => 120.8160,
        ]);

        $this->actingAs($conductor)
            ->postJson('/api/v1/conductor/break-status', ['is_on_break' => true])
            ->assertOk()
            ->assertJsonPath('data.is_on_break', true);

        $this->assertTrue($shift->fresh()->is_on_break);
        $this->assertNotNull($shift->fresh()->break_started_at);

        $locations = app(LocationService::class);
        $this->assertCount(0, $locations->getAllActiveLocations());

        $adminRow = $locations->getMonitoringFleet()->firstWhere('id', $shift->vehicle_id);
        $this->assertNotNull($adminRow);
        $this->assertTrue($adminRow['is_on_break']);
        $this->assertNotNull($adminRow['break_started_at']);

        $this->actingAs($conductor)
            ->postJson('/api/v1/conductor/break-status', ['is_on_break' => false])
            ->assertOk()
            ->assertJsonPath('data.is_on_break', false);

        $this->assertCount(1, $locations->getAllActiveLocations());
        $this->assertNull($shift->fresh()->break_started_at);
    }

    public function test_parked_unit_stays_on_commuter_map_however_old_its_last_fix(): void
    {
        $shift = ShiftLog::factory()->create(['time_in' => now()->subHours(2)]);
        Vehicle::whereKey($shift->vehicle_id)->update(['active_shift_id' => $shift->shift_id]);
        VehicleLocation::factory()->create([
            'vehicle_id' => $shift->vehicle_id,
            'conductor_id' => $shift->conductor_id,
            'shift_id' => $shift->shift_id,
            'fix_recorded_at' => now()->subMinutes(45),
            'lat' => 14.8527,
            'lng' => 120.8160,
        ]);
        DB::table('vehicle_locations')->where('vehicle_id', $shift->vehicle_id)
            ->update(['updated_at' => now()->subMinutes(45)]);

        $locations = app(LocationService::class);
        $this->assertCount(1, $locations->getAllActiveLocations());

        // Remittance clears the active shift — only then does it leave the map.
        Vehicle::whereKey($shift->vehicle_id)->update(['active_shift_id' => null]);
        $this->assertCount(0, $locations->getAllActiveLocations());
    }

    public function test_break_toggle_pushes_break_status_to_commuter_maps(): void
    {
        $shift = ShiftLog::factory()->create();
        $conductor = User::findOrFail($shift->conductor_id);
        Vehicle::whereKey($shift->vehicle_id)->update(['active_shift_id' => $shift->shift_id]);
        VehicleLocation::factory()->create([
            'vehicle_id' => $shift->vehicle_id,
            'conductor_id' => $shift->conductor_id,
            'shift_id' => $shift->shift_id,
            'fix_recorded_at' => now(),
            'lat' => 14.8527,
            'lng' => 120.8160,
        ]);

        $broadcaster = \Mockery::mock(\Illuminate\Broadcasting\Broadcasters\LogBroadcaster::class);
        \Illuminate\Support\Facades\Broadcast::extend('break-test', fn () => $broadcaster);
        config(['broadcasting.default' => 'break-test', 'broadcasting.connections.break-test.driver' => 'break-test']);
        $sent = [];
        $broadcaster->shouldReceive('broadcast')->times(2)->withArgs(function ($channels, $name, $payload) use (&$sent, $shift) {
            $sent[] = $payload['is_on_break'];

            return $name === 'VehicleLocationUpdated' && $payload['vehicle_id'] === $shift->vehicle_id;
        });

        $this->actingAs($conductor)->postJson('/api/v1/conductor/break-status', ['is_on_break' => true])->assertOk();
        $this->postJson('/api/v1/conductor/break-status', ['is_on_break' => false])->assertOk();

        $this->assertSame([true, false], $sent);
    }

    public function test_conductor_on_break_is_not_flagged_stale_despite_a_gps_gap(): void
    {
        $shift = ShiftLog::factory()->create(['is_on_break' => true, 'break_started_at' => now()]);
        Vehicle::whereKey($shift->vehicle_id)->update(['active_shift_id' => $shift->shift_id]);
        VehicleLocation::factory()->create([
            'vehicle_id' => $shift->vehicle_id,
            'conductor_id' => $shift->conductor_id,
            'shift_id' => $shift->shift_id,
            'fix_recorded_at' => now()->subMinutes(15),
            'lat' => 14.8527,
            'lng' => 120.8160,
        ]);
        // The last GPS ping is 15 minutes old — past the 10-minute stale
        // threshold — but the conductor deliberately stopped broadcasting
        // for a break, so this must not be flagged.
        DB::table('vehicle_locations')
            ->where('vehicle_id', $shift->vehicle_id)
            ->update(['updated_at' => now()->subMinutes(15)]);

        $locations = app(LocationService::class);
        $adminRow = $locations->getMonitoringFleet()->firstWhere('id', $shift->vehicle_id);
        $this->assertNotNull($adminRow);
        $this->assertTrue($adminRow['is_on_break']);
        $this->assertGreaterThan(10, $adminRow['minutes_since_update']);
        $this->assertFalse($adminRow['is_stale']);

        // Control: the same stale GPS gap without an active break IS flagged.
        ShiftLog::whereKey($shift->shift_id)->update(['is_on_break' => false, 'break_started_at' => null]);
        $offBreakRow = $locations->getMonitoringFleet()->firstWhere('id', $shift->vehicle_id);
        $this->assertTrue($offBreakRow['is_stale']);
    }

    public function test_break_status_requires_a_conductor_with_an_active_shift(): void
    {
        $this->postJson('/api/v1/conductor/break-status', ['is_on_break' => true])
            ->assertUnauthorized();

        $conductor = User::factory()->conductor()->create();
        $this->actingAs($conductor)
            ->postJson('/api/v1/conductor/break-status', ['is_on_break' => true])
            ->assertUnprocessable();
    }

    public function test_admin_monitoring_tracks_elapsed_break_time_without_gps_and_clears_it_on_resume(): void
    {
        $this->travelTo(now()->startOfMinute());
        $shift = ShiftLog::factory()->create();
        Vehicle::whereKey($shift->vehicle_id)->update(['active_shift_id' => $shift->shift_id]);
        $conductor = User::findOrFail($shift->conductor_id);
        $admin = User::factory()->admin()->create();

        $this->actingAs($conductor)->postJson('/api/v1/conductor/break-status', ['is_on_break' => true])->assertOk();
        $startedAt = $shift->fresh()->break_started_at->toISOString();
        $this->travel(12)->minutes();
        // Repeated requests must preserve the original break start time.
        $this->postJson('/api/v1/conductor/break-status', ['is_on_break' => true])->assertOk();
        $this->assertSame($startedAt, $shift->fresh()->break_started_at->toISOString());

        $this->actingAs($admin)->getJson('/api/v1/admin/monitoring')
            ->assertOk()
            ->assertJsonPath('data.0.id', $shift->vehicle_id)
            ->assertJsonPath('data.0.conductor_name', $shift->conductor_name)
            ->assertJsonPath('data.0.is_on_break', true)
            ->assertJsonPath('data.0.break_duration_minutes', 12)
            ->assertJsonPath('data.0.has_gps', false)
            ->assertJsonPath('data.0.is_stale', false);

        $this->actingAs($conductor)->postJson('/api/v1/conductor/break-status', ['is_on_break' => false])->assertOk();
        $this->actingAs($admin)->getJson('/api/v1/admin/monitoring')
            ->assertOk()
            ->assertJsonPath('data.0.is_on_break', false)
            ->assertJsonPath('data.0.break_started_at', null)
            ->assertJsonPath('data.0.break_duration_minutes', null);
    }

    public function test_monitoring_reads_breaks_in_one_query_and_excludes_ended_shifts(): void
    {
        foreach ([['SFT-BREAK-01', 'ACTIVE', true], ['SFT-ACTIVE-02', 'ACTIVE', false], ['SFT-ENDED-03', 'ENDED', true]] as [$id, $status, $onBreak]) {
            $shift = ShiftLog::factory()->create([
                'shift_id' => $id,
                'status' => $status,
                'is_on_break' => $onBreak,
                'break_started_at' => $onBreak ? now()->subMinutes(5) : null,
            ]);
            Vehicle::whereKey($shift->vehicle_id)->update(['active_shift_id' => $shift->shift_id]);
        }

        $connection = DB::connection();
        $connection->flushQueryLog();
        $connection->enableQueryLog();
        try {
            $fleet = app(LocationService::class)->getMonitoringFleet();
            $this->assertCount(1, $connection->getQueryLog());
        } finally {
            $connection->disableQueryLog();
        }
        $this->assertCount(2, $fleet);
        $this->assertCount(1, $fleet->where('is_on_break', true));
        $this->assertSame(5, $fleet->firstWhere('is_on_break', true)['break_duration_minutes']);
        $this->assertNull($fleet->firstWhere('is_on_break', false)['break_duration_minutes']);
    }

    public function test_monitoring_break_duration_never_goes_negative(): void
    {
        $shift = ShiftLog::factory()->create(['is_on_break' => true, 'break_started_at' => now()->addMinute()]);
        Vehicle::whereKey($shift->vehicle_id)->update(['active_shift_id' => $shift->shift_id]);
        $row = app(LocationService::class)->getMonitoringFleet()->firstWhere('id', $shift->vehicle_id);
        $this->assertSame(0, $row['break_duration_minutes']);
    }
}
