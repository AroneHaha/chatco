<?php

namespace Tests\Feature;

use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use App\Services\LocationService;
use Illuminate\Broadcasting\Broadcasters\LogBroadcaster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Tests\TestCase;

class ConductorTripDirectionTest extends TestCase
{
    use RefreshDatabase;

    private function onDutyShift(): ShiftLog
    {
        $shift = ShiftLog::factory()->create();
        Vehicle::whereKey($shift->vehicle_id)->update(['active_shift_id' => $shift->shift_id]);
        VehicleLocation::factory()->create([
            'vehicle_id' => $shift->vehicle_id,
            'conductor_id' => $shift->conductor_id,
            'shift_id' => $shift->shift_id,
            'fix_recorded_at' => now(),
            'lat' => 14.8527,
            'lng' => 120.8160,
        ]);

        return $shift;
    }

    public function test_new_shift_starts_forward_and_conductor_can_switch_it(): void
    {
        $shift = $this->onDutyShift();
        $conductor = User::findOrFail($shift->conductor_id);
        $this->assertSame(ShiftLog::TRIP_FORWARD, $shift->fresh()->trip_direction);

        $this->actingAs($conductor)
            ->postJson('/api/v1/conductor/trip-direction', ['trip_direction' => 'REVERSE'])
            ->assertOk()
            ->assertJsonPath('data.trip_direction', 'REVERSE');
        $this->assertSame(ShiftLog::TRIP_REVERSE, $shift->fresh()->trip_direction);

        $this->getJson('/api/v1/conductor/shift')
            ->assertOk()
            ->assertJsonPath('data.trip_direction', 'REVERSE');
    }

    public function test_direction_reaches_commuter_list_and_admin_monitoring(): void
    {
        $shift = $this->onDutyShift();
        $conductor = User::findOrFail($shift->conductor_id);
        $locations = app(LocationService::class);

        $this->assertSame('FORWARD', $locations->getAllActiveLocations()->first()->trip_direction);

        $this->actingAs($conductor)->postJson('/api/v1/conductor/trip-direction', ['trip_direction' => 'REVERSE'])->assertOk();

        $this->assertSame('REVERSE', $locations->getAllActiveLocations()->first()->trip_direction);
        $this->assertSame('REVERSE', $locations->getMonitoringFleet()->firstWhere('id', $shift->vehicle_id)['trip_direction']);
    }

    public function test_change_is_broadcast_once_and_repeat_is_silent(): void
    {
        $shift = $this->onDutyShift();
        $conductor = User::findOrFail($shift->conductor_id);

        $broadcaster = \Mockery::mock(LogBroadcaster::class);
        Broadcast::extend('trip-test', fn () => $broadcaster);
        config(['broadcasting.default' => 'trip-test', 'broadcasting.connections.trip-test.driver' => 'trip-test']);
        $sent = [];
        $broadcaster->shouldReceive('broadcast')->once()->withArgs(function ($channels, $name, $payload) use (&$sent, $shift) {
            $sent[] = $payload['trip_direction'];

            return $name === 'VehicleLocationUpdated' && $payload['vehicle_id'] === $shift->vehicle_id;
        });

        $this->actingAs($conductor)->postJson('/api/v1/conductor/trip-direction', ['trip_direction' => 'REVERSE'])->assertOk();
        // Same value again: nothing changed, so no second broadcast.
        $this->postJson('/api/v1/conductor/trip-direction', ['trip_direction' => 'REVERSE'])->assertOk();

        $this->assertSame(['REVERSE'], $sent);
    }

    public function test_validation_and_access(): void
    {
        $this->postJson('/api/v1/conductor/trip-direction', ['trip_direction' => 'REVERSE'])->assertUnauthorized();

        $shift = $this->onDutyShift();
        $conductor = User::findOrFail($shift->conductor_id);
        $this->actingAs($conductor)
            ->postJson('/api/v1/conductor/trip-direction', ['trip_direction' => 'SIDEWAYS'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('trip_direction');
        $this->assertSame(ShiftLog::TRIP_FORWARD, $shift->fresh()->trip_direction);

        $noShift = User::factory()->conductor()->create();
        $this->actingAs($noShift)
            ->postJson('/api/v1/conductor/trip-direction', ['trip_direction' => 'REVERSE'])
            ->assertUnprocessable();

        $commuter = User::factory()->commuter()->create();
        $this->actingAs($commuter)
            ->postJson('/api/v1/conductor/trip-direction', ['trip_direction' => 'REVERSE'])
            ->assertForbidden();
    }
}
