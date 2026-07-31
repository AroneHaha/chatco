<?php

namespace Tests\Feature;

use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use App\Services\LocationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

    public function test_break_status_requires_a_conductor_with_an_active_shift(): void
    {
        $this->postJson('/api/v1/conductor/break-status', ['is_on_break' => true])
            ->assertUnauthorized();

        $conductor = User::factory()->conductor()->create();
        $this->actingAs($conductor)
            ->postJson('/api/v1/conductor/break-status', ['is_on_break' => true])
            ->assertUnprocessable();
    }
}
