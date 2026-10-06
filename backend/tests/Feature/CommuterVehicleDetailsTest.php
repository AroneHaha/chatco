<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\Feedback;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommuterVehicleDetailsTest extends TestCase
{
    use RefreshDatabase;

    private User $commuter;
    private User $conductor;
    private Driver $driver;
    private Vehicle $vehicle;
    private ShiftLog $shift;

    protected function setUp(): void
    {
        parent::setUp();
        $this->commuter = User::factory()->commuter()->create();
        $this->conductor = User::factory()->conductor()->create();
        $this->conductor->conductorProfile->update([
            'first_name' => 'Juan', 'middle_name' => 'Dela', 'last_name' => 'Cruz',
            'profile_picture_url' => 'https://example.com/conductor.jpg',
        ]);
        $this->driver = Driver::factory()->create([
            'first_name' => 'Pedro', 'middle_name' => null, 'last_name' => 'Santos',
            'profile_picture_url' => 'https://example.com/driver.jpg',
        ]);
        // Permanent assignments can differ from the crew working the live shift.
        $this->vehicle = Vehicle::factory()->create(['driver_id' => Driver::factory()->create()->id]);
        $route = Route::factory()->create(['name' => 'City Loop']);
        $this->shift = ShiftLog::create([
            'shift_id' => 'SFT-UNIT-DETAILS',
            'conductor_id' => $this->conductor->id,
            'driver_id' => $this->driver->id,
            'vehicle_id' => $this->vehicle->id,
            'route_id' => $route->id,
            'conductor_name' => 'Juan Dela Cruz',
            'driver_name' => 'Pedro Santos',
            'plate_number' => $this->vehicle->plate_number,
            'unit_number' => $this->vehicle->unit_number,
            'time_in' => now(),
            'status' => 'ACTIVE',
        ]);
        $this->vehicle->update(['active_shift_id' => $this->shift->shift_id]);
        VehicleLocation::create([
            'vehicle_id' => $this->vehicle->id,
            'shift_id' => $this->shift->shift_id,
            'conductor_id' => $this->conductor->id,
            'lat' => 14.5995, 'lng' => 120.9842,
            'capacity_status' => 'STANDING',
        ]);
    }

    public function test_returns_active_crew_with_separate_ratings_and_only_public_details(): void
    {
        foreach ([[5, 1], [3, 5], [4, null]] as [$driverRating, $conductorRating]) {
            $this->feedback($driverRating, $conductorRating);
        }
        // A review for another driver must not contribute to this driver's score.
        $this->feedback(1, null, $this->vehicle->driver_id);

        $response = $this->actingAs($this->commuter)->getJson($this->endpoint());
        $response->assertOk()
            ->assertJsonPath('data.unit_number', $this->vehicle->unit_number)
            ->assertJsonPath('data.plate_number', $this->vehicle->plate_number)
            ->assertJsonPath('data.route_name', 'City Loop')
            ->assertJsonPath('data.driver.name', 'Pedro Santos')
            ->assertJsonPath('data.driver.photo_url', 'https://example.com/driver.jpg')
            ->assertJsonPath('data.driver.average_rating', 4)
            ->assertJsonPath('data.driver.rating_count', 3)
            ->assertJsonPath('data.conductor.name', 'Juan Dela Cruz')
            ->assertJsonPath('data.conductor.photo_url', 'https://example.com/conductor.jpg')
            ->assertJsonPath('data.conductor.average_rating', 3)
            ->assertJsonPath('data.conductor.rating_count', 2);

        $this->assertArrayNotHasKey('is_on_break', $response->json('data'));

        foreach (['driver', 'conductor'] as $role) {
            $this->assertSame(['name', 'photo_url', 'average_rating', 'rating_count'], array_keys($response->json("data.$role")));
        }
        $this->assertNotNull($response->json('data.location_updated_at'));
    }

    public function test_missing_ratings_are_null_and_old_shift_location_is_not_reported_as_live(): void
    {
        $this->vehicle->currentLocation->update(['shift_id' => null]);
        $this->actingAs($this->commuter)->getJson($this->endpoint())->assertOk()
            ->assertJsonPath('data.driver.average_rating', null)
            ->assertJsonPath('data.driver.rating_count', 0)
            ->assertJsonPath('data.conductor.average_rating', null)
            ->assertJsonPath('data.conductor.rating_count', 0)
            ->assertJsonPath('data.location_updated_at', null);
    }

    public function test_hides_units_on_break_and_rejects_ended_shifts(): void
    {
        $this->shift->update(['is_on_break' => true]);
        $this->actingAs($this->commuter)->getJson($this->endpoint())->assertNotFound()->assertJsonPath('data', null);
        $this->shift->update(['is_on_break' => false]);
        $this->getJson($this->endpoint())->assertOk();
        $this->shift->update(['status' => 'ENDED', 'time_out' => now()]);
        $this->getJson($this->endpoint())->assertNotFound()->assertJsonPath('data', null);
    }

    public function test_requires_a_commuter_session(): void
    {
        $this->getJson($this->endpoint())->assertUnauthorized();
        $this->actingAs($this->conductor)->getJson($this->endpoint())->assertForbidden();
    }

    private function endpoint(): string
    {
        return '/api/v1/commuter/vehicles/'.$this->vehicle->id.'/details';
    }

    private function feedback(int $rating, ?int $conductorRating, ?string $driverId = null): void
    {
        Feedback::create([
            'shift_id' => $this->shift->shift_id,
            'vehicle_id' => $this->vehicle->id,
            'driver_id' => $driverId ?? $this->driver->id,
            'conductor_id' => $this->conductor->id,
            'commuter_id' => User::factory()->commuter()->create()->id,
            'rating' => $rating,
            'conductor_rating' => $conductorRating,
        ]);
    }
}
