<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\CommuterProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/** A repeatable development account; rerunning never resets reviewed discounts. */
class Commuter022Seeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            if (CommuterProfile::where('username', 'commuter022')->exists()) {
                return;
            }

            $user = User::create([
                'email' => 'commuter022@gmail.com',
                'password' => Hash::make('password123'),
                'role' => UserRole::COMMUTER,
            ]);
            CommuterProfile::create([
                'id' => $user->id,
                'first_name' => 'Test',
                'surname' => 'Commuter',
                'birthdate' => '1960-01-01',
                'gender' => 'Male',
                'email' => $user->email,
                'contact_number' => '09171000022',
                'username' => 'commuter022',
                'language_preference' => 'en',
                'commuter_type' => 'REGULAR',
                'applied_type' => 'REGULAR',
                'account_status' => 'APPROVED',
                'verified_at' => now(),
            ]);
        });
    }
}
