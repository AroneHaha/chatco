<?php

namespace Database\Factories;

use App\Enums\CapacityStatus;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\VehicleLocation>
 *
 * Per Sprint 2 Handoff Brief:
 *   "VehicleLocation factory — must use vehicle_id as string PK (no auto-increment)"
 *   "VehicleLocation factory — vehicle_id (string PK), conductor_id, lat, lng, capacity_status"
 *
 * The vehicle_locations table uses upsert-by-vehicle_id (always one row per
 * vehicle), so the factory's primary key IS the vehicle_id — there is no
 * auto-incrementing id column.
 */
class VehicleLocationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $vehicle = Vehicle::factory()->create();
        $conductor = User::factory()->conductor()->create();

        return [
            'vehicle_id' => $vehicle->id,
            'conductor_id' => $conductor->id,
            'lat' => fake()->latitude(14.0, 15.0),
            'lng' => fake()->longitude(120.0, 121.0),
            'speed' => fake()->optional()->randomFloat(2, 0, 60),
            'heading' => fake()->optional()->randomFloat(2, 0, 360),
            'capacity_status' => fake()->randomElement(CapacityStatus::cases())->value,
        ];
    }
}
