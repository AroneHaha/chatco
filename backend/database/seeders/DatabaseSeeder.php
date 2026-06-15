<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\AdminProfile;
use App\Models\ConductorProfile;
use App\Models\CommuterProfile;
use App\Enums\UserRole;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── ADMIN ──────────────────────────────────────────────────

        $adminId = (string) Str::uuid();
        User::create([
            'id'       => $adminId,
            'email'    => 'admin@chatco.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::ADMIN,
        ]);
        AdminProfile::create([
            'id'                 => $adminId,
            'first_name'         => 'Admin',
            'middle_name'        => null,
            'last_name'          => 'User',
            'profile_picture_url' => null,
        ]);

        // ── CONDUCTORS ─────────────────────────────────────────────

        $conductor1Id = (string) Str::uuid();
        User::create([
            'id'       => $conductor1Id,
            'email'    => 'conductor1@chatco.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id'                  => $conductor1Id,
            'first_name'          => 'Nardo',
            'middle_name'         => null,
            'last_name'           => 'Putik',
            'birthday'            => '1995-06-15',
            'profile_picture_url' => null,
            'generated_username'  => 'COND-001',
            'generated_password'  => Hash::make('password123'),
        ]);

        $conductor2Id = (string) Str::uuid();
        User::create([
            'id'       => $conductor2Id,
            'email'    => 'conductor2@chatco.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id'                  => $conductor2Id,
            'first_name'          => 'Jobert',
            'middle_name'         => null,
            'last_name'           => 'Sucaldito',
            'birthday'            => '1993-03-20',
            'profile_picture_url' => null,
            'generated_username'  => 'COND-002',
            'generated_password'  => Hash::make('password123'),
        ]);

        // ── COMMUTERS ──────────────────────────────────────────────

        $commuter1Id = (string) Str::uuid();
        User::create([
            'id'       => $commuter1Id,
            'email'    => 'mhak@gmail.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id'                  => $commuter1Id,
            'first_name'          => 'Mhaku Jose',
            'middle_name'         => null,
            'surname'             => 'Manalili',
            'birthdate'           => '2002-01-15',
            'gender'              => 'Male',
            'email'               => 'mhak@gmail.com',
            'contact_number'      => '0917-123-4567',
            'commuter_type'       => 'Regular',
            'applied_type'        => null,
            'username'            => 'mhaku_jose',
            'language_preference' => 'English',
            'account_status'      => 'Active',
            'id_image_url'        => 'https://placehold.co/150x150/0A1E33/FFFFFF?text=ID',
            'verified_at'         => now(),
            'rejection_reason'    => null,
        ]);

        $commuter2Id = (string) Str::uuid();
        User::create([
            'id'       => $commuter2Id,
            'email'    => 'marone.c@email.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id'                  => $commuter2Id,
            'first_name'          => 'Mark Arone',
            'middle_name'         => null,
            'surname'             => 'Dela Cruz',
            'birthdate'           => '2003-05-22',
            'gender'              => 'Male',
            'email'               => 'marone.c@email.com',
            'contact_number'      => '0918-234-5678',
            'commuter_type'       => 'Student',
            'applied_type'        => null,
            'username'            => 'mark_arone',
            'language_preference' => 'Filipino',
            'account_status'      => 'Active',
            'id_image_url'        => 'https://placehold.co/150x150/0A1E33/FFFFFF?text=ID',
            'verified_at'         => now(),
            'rejection_reason'    => null,
        ]);

        $commuter3Id = (string) Str::uuid();
        User::create([
            'id'       => $commuter3Id,
            'email'    => 'rod@gmail.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id'                  => $commuter3Id,
            'first_name'          => 'Rod',
            'middle_name'         => null,
            'surname'             => 'Dulalia',
            'birthdate'           => '2001-11-08',
            'gender'              => 'Male',
            'email'               => 'rod@gmail.com',
            'contact_number'      => '0923-324-4327',
            'commuter_type'       => 'Regular',
            'applied_type'        => null,
            'username'            => 'rod_dulalia',
            'language_preference' => 'English',
            'account_status'      => 'Active',
            'id_image_url'        => 'https://placehold.co/150x150/0A1E33/FFFFFF?text=ID',
            'verified_at'         => now(),
            'rejection_reason'    => null,
        ]);

        $commuter4Id = (string) Str::uuid();
        User::create([
            'id'       => $commuter4Id,
            'email'    => 'mari.c@email.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id'                  => $commuter4Id,
            'first_name'          => 'Marinel',
            'middle_name'         => null,
            'surname'             => 'Carbonel',
            'birthdate'           => '2000-09-12',
            'gender'              => 'Female',
            'email'               => 'mari.c@email.com',
            'contact_number'      => '0919-345-6789',
            'commuter_type'       => 'PWD',
            'applied_type'        => 'PWD',
            'username'            => 'marinel_carbonel',
            'language_preference' => 'English',
            'account_status'      => 'Pending Verification',
            'id_image_url'        => 'https://placehold.co/150x150/0A1E33/FFFFFF?text=PWD+ID',
            'verified_at'         => null,
            'rejection_reason'    => null,
        ]);
    }
}