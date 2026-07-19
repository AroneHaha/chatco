<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\CommuterProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * CommuterSeeder — 20 commuter accounts using well-known Filipino celebrity
 * names as demo data.
 *
 * Deliberately varied so the admin/commuter UIs get exercised across every
 * branch:
 *   - Discount tiers:  REGULAR / STUDENT / SENIOR / PWD
 *   - Account states:  ACTIVE, APPROVED, PENDING (awaiting review),
 *                      REJECTED (declined), SUSPENDED (admin-disabled)
 *   - Genders, language prefs, and a few edge cases (spaces / long names /
 *     ñ) to catch truncation + layout breaks.
 *
 * Login: every account uses password "password123". PENDING/REJECTED/SUSPENDED
 * accounts are intentionally blocked at login (see AuthService) — they exist
 * to populate the admin review + user-management screens.
 *
 * Run alone with:  php artisan db:seed --class=CommuterSeeder
 */
class CommuterSeeder extends Seeder
{
    public function run(): void
    {
        // [first, middle, surname, birthdate, gender, type, status, verified, appliedType, rejectionReason, lang]
        $commuters = [
            ['Coco',       null,        'Martin',      '1981-11-01', 'Male',   'REGULAR', 'ACTIVE',    true,  null,      null, 'fil'],
            ['Sarah',      null,        'Geronimo',    '1988-07-25', 'Female', 'REGULAR', 'ACTIVE',    true,  null,      null, 'en'],
            ['Daniel',     'John',      'Padilla',     '1995-04-26', 'Male',   'STUDENT', 'ACTIVE',    true,  null,      null, 'fil'],
            ['Kathryn',    null,        'Bernardo',    '1996-03-26', 'Female', 'STUDENT', 'ACTIVE',    true,  null,      null, 'en'],
            ['Vilma',      null,        'Santos',      '1953-11-03', 'Female', 'SENIOR',  'ACTIVE',    true,  null,      null, 'fil'],
            ['Nora',       null,        'Aunor',       '1953-05-21', 'Female', 'SENIOR',  'ACTIVE',    true,  null,      null, 'fil'],
            ['Piolo',      null,        'Pascual',     '1977-01-12', 'Male',   'REGULAR', 'ACTIVE',    true,  null,      null, 'en'],
            ['Angel',      null,        'Locsin',      '1985-04-23', 'Female', 'REGULAR', 'ACTIVE',    true,  null,      null, 'fil'],
            ['Anne',       null,        'Curtis',      '1985-02-17', 'Female', 'REGULAR', 'APPROVED',  true,  null,      null, 'en'],
            ['Dingdong',   null,        'Dantes',      '1980-08-02', 'Male',   'REGULAR', 'ACTIVE',    true,  null,      null, 'fil'],
            ['Marian',     'Rivera',    'Gracia',      '1984-08-12', 'Female', 'PWD',     'ACTIVE',    true,  null,      null, 'fil'],
            ['John Lloyd', null,        'Cruz',        '1983-06-24', 'Male',   'REGULAR', 'ACTIVE',    true,  null,      null, 'en'],
            ['Bea',        null,        'Alonzo',      '1987-10-17', 'Female', 'REGULAR', 'APPROVED',  true,  null,      null, 'en'],
            ['Enrique',    null,        'Gil',         '1992-03-30', 'Male',   'STUDENT', 'ACTIVE',    true,  null,      null, 'fil'],
            ['Liza',       null,        'Soberano',    '1998-01-04', 'Female', 'STUDENT', 'PENDING',   false, 'STUDENT', null, 'en'],
            ['Alden',      null,        'Richards',    '1992-01-02', 'Male',   'REGULAR', 'PENDING',   false, 'REGULAR', null, 'fil'],
            ['Maine',      'Nicdao',    'Mendoza',     '1995-03-03', 'Female', 'PWD',     'PENDING',   false, 'PWD',     null, 'en'],
            ['Kris',       null,        'Aquino',      '1971-02-14', 'Female', 'REGULAR', 'SUSPENDED', true,  null,      null, 'fil'],
            ['Emmanuel',   'Pacman',    'Pacquiao',    '1978-12-17', 'Male',   'SENIOR',  'REJECTED',  false, 'SENIOR',  'Submitted ID does not match the applied discount tier.', 'fil'],
            ['Vice',       null,        'Ganda',       '1976-03-31', 'Male',   'PWD',     'ACTIVE',    true,  null,      null, 'fil'],
        ];

        foreach ($commuters as $i => $c) {
            [$first, $middle, $surname, $birthdate, $gender, $type, $status, $verified, $appliedType, $rejection, $lang] = $c;

            $seq = str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT);
            $handle = strtolower(str_replace(' ', '', $first) . '.' . str_replace(' ', '', $surname));
            $email = "{$handle}@gmail.com";
            $contact = '+63917' . str_pad((string) (1000000 + $i), 7, '0', STR_PAD_LEFT);

            $user = User::create([
                'email'    => $email,
                'password' => Hash::make('password123'),
                'role'     => UserRole::COMMUTER,
            ]);

            CommuterProfile::create([
                'id'                  => $user->id,
                'first_name'          => $first,
                'middle_name'         => $middle,
                'surname'             => $surname,
                'birthdate'           => $birthdate,
                'gender'              => $gender,
                'email'               => $email,
                'contact_number'      => $contact,
                'commuter_type'       => $type,
                'applied_type'        => $appliedType,
                'username'            => "commuter{$seq}",
                'language_preference' => $lang,
                'account_status'      => $status,
                'id_image_url'        => null,
                'verified_at'         => $verified ? now() : null,
                'rejection_reason'    => $rejection,
            ]);
        }

        $this->command?->info('Seeded ' . count($commuters) . ' commuters (PH celebrities).');
    }
}
