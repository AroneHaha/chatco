<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Vehicle>
 *
 * Per Sprint 2 Handoff Brief:
 *   "VehicleFactory — must populate plate_number, status"
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
            'route_id' => null,
            'driver_id' => null,
            'conductor_id' => null,
            'status' => 'ACTIVE',
            'capacity_status' => 'AVAILABLE',
            'active_shift_id' => null,
        ];
    }
}
