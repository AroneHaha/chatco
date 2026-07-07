<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Driver>
 */
class DriverFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'middle_name' => null,
            'last_name' => fake()->lastName(),
            'birthday' => fake()->date('Y-m-d', '1990-01-01'),
            'contact' => '+63' . fake()->numerify('9#########'),
            'license_number' => 'LIC-' . fake()->unique()->numerify('######'),
            'hire_date' => fake()->date('Y-m-d', '2020-01-01'),
            'profile_picture_url' => null,
            'status' => 'ACTIVE',
            'vehicle_id' => null,
            'active_shift_id' => null,
        ];
    }
}
