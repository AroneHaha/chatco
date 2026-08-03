<?php

namespace Database\Factories;

use App\Enums\ShiftStatus;
use App\Models\Driver;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ShiftLog>
 *
 * Per Sprint 2 Handoff Brief:
 *   "ShiftLogFactory — must auto-generate shift_id (format SFT-YYYYMMDDHHMMSS),
 *    populate denormalized name fields"
 *
 * The shift_logs table has NOT NULL columns for conductor_name, driver_name,
 * plate_number, and unit_number (denormalized snapshot at shift-start time),
 * so the factory must populate all of them. When the caller does not override
 * conductor_id / driver_id / vehicle_id, the factory creates the minimum
 * related rows needed to satisfy FK constraints.
 */
class ShiftLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $vehicle = Vehicle::factory()->create();
        $driver = Driver::factory()->create(['vehicle_id' => $vehicle->id]);
        $conductor = User::factory()->conductor()->create();

        return [
            'shift_id' => 'SFT-' . now()->format('YmdHis'),
            'conductor_id' => $conductor->id,
            'driver_id' => $driver->id,
            'vehicle_id' => $vehicle->id,
            'route_id' => null,
            'conductor_name' => trim(
                ($conductor->conductorProfile->first_name ?? '') . ' ' .
                ($conductor->conductorProfile->last_name ?? '')
            ),
            'driver_name' => trim($driver->first_name . ' ' . $driver->last_name),
            'plate_number' => $vehicle->plate_number,
            'unit_number' => $vehicle->unit_number,
            'time_in' => now(),
            'time_out' => null,
            'status' => ShiftStatus::ACTIVE->value,
        ];
    }
}
