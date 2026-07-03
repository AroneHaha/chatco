<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\AdminProfile;
use App\Models\CommuterProfile;
use App\Models\ConductorProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 *
 * Per Sprint 2 Handoff Brief:
 *   "UserFactory — must support role attribute (check if conductor/CONDUCTOR accepted)"
 *
 * The role column is cast to the UserRole enum, so factory state methods
 * MUST use the uppercase enum value (UserRole::CONDUCTOR->value) — not
 * lowercase strings — otherwise UserRole::from() throws a ValueError.
 *
 * Each role state also auto-creates the matching profile row via
 * afterCreating, so FK constraints from shift_logs.conductor_id →
 * conductor_profiles.id (and similar) are satisfied in tests.
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => UserRole::COMMUTER->value,
        ];
    }

    /**
     * Indicate that the user is an admin (also creates an AdminProfile).
     *
     * NOTE: We query the DB directly (AdminProfile::find) instead of accessing
     * the $user->adminProfile relation. Accessing the relation in afterCreating
     * would cache null on the model (the profile doesn't exist yet), and since
     * Sanctum::actingAs() reuses the same object, later service-layer accesses
     * to $user->adminProfile would get the stale null instead of re-querying.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::ADMIN->value,
        ])->afterCreating(function (User $user) {
            if (! AdminProfile::find($user->id)) {
                AdminProfile::create([
                    'id' => $user->id,
                    'first_name' => fake()->firstName(),
                    'last_name' => fake()->lastName(),
                ]);
            }
        });
    }

    /**
     * Indicate that the user is a conductor (also creates a ConductorProfile).
     *
     * Same DB-direct query rationale as admin() above — avoids caching a
     * stale null relation on the User instance.
     */
    public function conductor(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::CONDUCTOR->value,
        ])->afterCreating(function (User $user) {
            if (! ConductorProfile::find($user->id)) {
                ConductorProfile::create([
                    'id' => $user->id,
                    'first_name' => fake()->firstName(),
                    'last_name' => fake()->lastName(),
                    'birthday' => '1990-01-01',
                    'generated_username' => 'conductor_' . Str::random(8),
                    'generated_password' => Hash::make('password'),
                ]);
            }
        });
    }

    /**
     * Indicate that the user is a commuter (also creates a CommuterProfile).
     *
     * Same DB-direct query rationale as admin() above — avoids caching a
     * stale null relation on the User instance. This is critical for S6
     * Lost & Found tests where Sanctum::actingAs() reuses the factory-built
     * User object and the service layer reads $commuter->commuterProfile.
     */
    public function commuter(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::COMMUTER->value,
        ])->afterCreating(function (User $user) {
            if (! CommuterProfile::find($user->id)) {
                CommuterProfile::create([
                    'id' => $user->id,
                    'first_name' => fake()->firstName(),
                    'surname' => fake()->lastName(),
                    'birthdate' => '1995-01-01',
                    'gender' => 'Male',
                    'email' => $user->email,
                    'contact_number' => '+63917' . fake()->numerify('#######'),
                    'commuter_type' => 'Regular',
                    'username' => 'commuter_' . Str::random(8),
                    'language_preference' => 'en',
                    'account_status' => 'ACTIVE',
                    'verified_at' => now(),
                ]);
            }
        });
    }
}
