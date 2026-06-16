<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Vehicle>
 *
 * Per Sprint 2 Handoff Brief:
 *   "VehicleFactory — must populate plate_number, vehicle_type, status"
 */
class VehicleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'unit_number' => 'UNIT-' . fake()->unique()->numberBetween(1000, 9999),
            'plate_number' => strtoupper(fake()->bothify('???####')),
            'vehicle_type' => fake()->randomElement(['Jeepney', 'Bus', 'Van', 'UV Express']),
            'route_id' => null,
            'driver_id' => null,
            'conductor_id' => null,
            'status' => 'ACTIVE',
            'speed' => null,
            'capacity_status' => 'AVAILABLE',
            'latitude' => null,
            'longitude' => null,
            'last_location_update' => null,
            'active_shift_id' => null,
        ];
    }
}
