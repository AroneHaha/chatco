<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\AdminProfile;
use App\Models\ConductorProfile;
use App\Models\CommuterProfile;
use App\Models\Route;
use App\Models\FarePoint;
use App\Models\Driver;
use App\Models\Vehicle;
use App\Enums\UserRole;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ════════════════════════════════════════════════════
        // 1. USERS & PROFILES
        // ════════════════════════════════════════════════════

        // ── Admin ──
        $adminId = (string) Str::uuid();
        User::create([
            'id'       => $adminId,
            'email'    => 'admin@gmail.com',
            'password' => 'password123', // hashed cast on User model
            'role'     => UserRole::ADMIN,
        ]);
        AdminProfile::create([
            'id'                  => $adminId,
            'first_name'          => 'System',
            'middle_name'         => null,
            'last_name'           => 'Admin',
            'profile_picture_url' => null,
        ]);

        // ── Conductors ──
        $conductor1Id = (string) Str::uuid();
        User::create([
            'id'       => $conductor1Id,
            'email'    => 'conductor1@gmail.com',
            'password' => 'password123',
            'role'     => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id'                  => $conductor1Id,
            'first_name'          => 'Juan',
            'middle_name'         => null,
            'last_name'           => 'Dela Cruz',
            'birthday'            => '1990-03-15',
            'profile_picture_url' => null,
            'generated_username'  => 'conductor001',
            'generated_password'  => Hash::make('password123'),
        ]);

        $conductor2Id = (string) Str::uuid();
        User::create([
            'id'       => $conductor2Id,
            'email'    => 'conductor2@gmail.com',
            'password' => 'password123',
            'role'     => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id'                  => $conductor2Id,
            'first_name'          => 'Maria',
            'middle_name'         => 'Santos',
            'last_name'           => 'Reyes',
            'birthday'            => '1992-07-20',
            'profile_picture_url' => null,
            'generated_username'  => 'conductor002',
            'generated_password'  => Hash::make('password123'),
        ]);

        // ── Commuters ──
        $commuter1Id = (string) Str::uuid();
        User::create([
            'id'       => $commuter1Id,
            'email'    => 'commuter1@gmail.com',
            'password' => 'password123',
            'role'     => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id'                  => $commuter1Id,
            'first_name'          => 'Jose',
            'middle_name'         => 'Rizal',
            'surname'             => 'Mendoza',
            'birthdate'           => '1998-05-12',
            'gender'              => 'Male',
            'email'               => 'commuter1@gmail.com',
            'contact_number'      => '+639171234567',
            'commuter_type'       => 'Regular',
            'applied_type'        => null,
            'username'            => 'commuter001',
            'language_preference' => 'en',
            'account_status'      => 'ACTIVE',
            'id_image_url'        => null,
            'verified_at'         => now(),
            'rejection_reason'    => null,
        ]);

        $commuter2Id = (string) Str::uuid();
        User::create([
            'id'       => $commuter2Id,
            'email'    => 'commuter2@gmail.com',
            'password' => 'password123',
            'role'     => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id'                  => $commuter2Id,
            'first_name'          => 'Ana',
            'middle_name'         => 'Cristina',
            'surname'             => 'Villanueva',
            'birthdate'           => '2001-09-25',
            'gender'              => 'Female',
            'email'               => 'commuter2@gmail.com',
            'contact_number'      => '+639172345678',
            'commuter_type'       => 'Regular',
            'applied_type'        => null,
            'username'            => 'commuter002',
            'language_preference' => 'en',
            'account_status'      => 'ACTIVE',
            'id_image_url'        => null,
            'verified_at'         => now(),
            'rejection_reason'    => null,
        ]);

        $commuter3Id = (string) Str::uuid();
        User::create([
            'id'       => $commuter3Id,
            'email'    => 'commuter3@gmail.com',
            'password' => 'password123',
            'role'     => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id'                  => $commuter3Id,
            'first_name'          => 'Marco',
            'middle_name'         => 'Antonio',
            'surname'             => 'Reyes',
            'birthdate'           => '1995-11-08',
            'gender'              => 'Male',
            'email'               => 'commuter3@gmail.com',
            'contact_number'      => '+639173456789',
            'commuter_type'       => 'Regular',
            'applied_type'        => null,
            'username'            => 'commuter003',
            'language_preference' => 'en',
            'account_status'      => 'ACTIVE',
            'id_image_url'        => null,
            'verified_at'         => now(),
            'rejection_reason'    => null,
        ]);

        // ════════════════════════════════════════════════════
        // 2. ROUTE — McArthur Highway
        // ════════════════════════════════════════════════════

        $barangayStops = [
            ['code' => 'CLM-01', 'name' => 'Calumpit Poblacion',   'lat' => 14.9158000, 'lng' => 120.7267000, 'landmarks' => ['Calumpit Municipal Hall', 'Calumpit Market', 'Calumpit Church']],
            ['code' => 'CLM-02', 'name' => 'Gatbuca',              'lat' => 14.9092000, 'lng' => 120.7278000, 'landmarks' => ['Gatbuca Elementary School', 'Gatbuca Crossing']],
            ['code' => 'CLM-03', 'name' => 'San Miguel',           'lat' => 14.9026000, 'lng' => 120.7289000, 'landmarks' => ['San Miguel Chapel', 'Rice Mills']],
            ['code' => 'CLM-04', 'name' => 'Paliwas',              'lat' => 14.8960000, 'lng' => 120.7300000, 'landmarks' => ['Paliwas Bridge', 'Paliwas Junction']],
            ['code' => 'PUL-01', 'name' => 'Pulilan Poblacion',    'lat' => 14.8894000, 'lng' => 120.7311000, 'landmarks' => ['Pulilan Municipal Hall', 'Pulilan Market', 'Pulilan Church']],
            ['code' => 'PUL-02', 'name' => 'Dampol',               'lat' => 14.8828000, 'lng' => 120.7322000, 'landmarks' => ['Dampol Crossing', 'Dampol Terminal']],
            ['code' => 'PUL-03', 'name' => 'Taal',                 'lat' => 14.8762000, 'lng' => 120.7333000, 'landmarks' => ['Taal Elementary School']],
            ['code' => 'PUL-04', 'name' => 'Abangan Norte',        'lat' => 14.8696000, 'lng' => 120.7344000, 'landmarks' => ['Abangan Bridge', 'Shell Station']],
            ['code' => 'PLR-01', 'name' => 'Plaridel Poblacion',   'lat' => 14.8630000, 'lng' => 120.7355000, 'landmarks' => ['Plaridel Municipal Hall', 'Plaridel Market', 'Plaridel Church']],
            ['code' => 'PLR-02', 'name' => 'Agnaya',               'lat' => 14.8564000, 'lng' => 120.7366000, 'landmarks' => ['Agnaya Crossing', 'Caltex Station']],
            ['code' => 'PLR-03', 'name' => 'Banga 1st',            'lat' => 14.8498000, 'lng' => 120.7377000, 'landmarks' => ['Banga Market', 'Banga Chapel']],
            ['code' => 'PLR-04', 'name' => 'Banga 2nd',            'lat' => 14.8432000, 'lng' => 120.7388000, 'landmarks' => ['Banga 2nd Elementary School']],
            ['code' => 'BST-01', 'name' => 'Bustos Poblacion',     'lat' => 14.8366000, 'lng' => 120.7399000, 'landmarks' => ['Bustos Municipal Hall', 'Bustos Market', 'Bustos Church']],
            ['code' => 'BST-02', 'name' => 'Bonga Mayor',          'lat' => 14.8300000, 'lng' => 120.7410000, 'landmarks' => ['Bonga Mayor Junction']],
            ['code' => 'BST-03', 'name' => 'Tibagan',              'lat' => 14.8234000, 'lng' => 120.7421000, 'landmarks' => ['Tibagan Bridge', 'Tibagan Road']],
            ['code' => 'BLG-01', 'name' => 'Baliuag Poblacion',    'lat' => 14.8168000, 'lng' => 120.7432000, 'landmarks' => ['Baliuag Municipal Hall', 'Baliuag Market', 'SM City Baliwag']],
            ['code' => 'BLG-02', 'name' => 'Sabang',               'lat' => 14.8102000, 'lng' => 120.7443000, 'landmarks' => ['Sabang Bridge']],
            ['code' => 'BLG-03', 'name' => 'Tangos',               'lat' => 14.8036000, 'lng' => 120.7454000, 'landmarks' => ['Tangos Crossing']],
            ['code' => 'BLG-04', 'name' => 'Tinig',                'lat' => 14.7970000, 'lng' => 120.7465000, 'landmarks' => ['Tinig Elementary School']],
            ['code' => 'BLG-05', 'name' => 'Catulinan',            'lat' => 14.7904000, 'lng' => 120.7476000, 'landmarks' => ['Catulinan Chapel']],
            ['code' => 'BLG-06', 'name' => 'Pinaod',               'lat' => 14.7838000, 'lng' => 120.7487000, 'landmarks' => ['Pinaod Junction']],
            ['code' => 'STM-01', 'name' => 'Sta. Barbara',         'lat' => 14.7772000, 'lng' => 120.7498000, 'landmarks' => ['Sta. Barbara Church']],
            ['code' => 'STM-02', 'name' => 'Malamig',              'lat' => 14.7706000, 'lng' => 120.7509000, 'landmarks' => ['Malamig Market', 'Malamig Terminal']],
            ['code' => 'STM-03', 'name' => 'Bagbaguin',            'lat' => 14.7640000, 'lng' => 120.7520000, 'landmarks' => ['Bagbaguin Crossing']],
            ['code' => 'STM-04', 'name' => 'Mahangin',             'lat' => 14.7574000, 'lng' => 120.7531000, 'landmarks' => ['Mahangin Chapel']],
            ['code' => 'STM-05', 'name' => 'Pulong Buhangin',      'lat' => 14.7508000, 'lng' => 120.7542000, 'landmarks' => ['Pulong Buhangin Market']],
            ['code' => 'MYC-01', 'name' => 'Meycauayan Poblacion', 'lat' => 14.7442000, 'lng' => 120.7553000, 'landmarks' => ['Meycauayan Municipal Hall', 'Meycauayan Market', 'Meycauayan Church']],
            ['code' => 'MYC-02', 'name' => 'Bahay Pari',           'lat' => 14.7376000, 'lng' => 120.7564000, 'landmarks' => ['Bahay Pari Bridge']],
            ['code' => 'MYC-03', 'name' => 'Bancal',               'lat' => 14.7310000, 'lng' => 120.7575000, 'landmarks' => ['Bancal Junction']],
            ['code' => 'MYC-04', 'name' => 'Caingin',              'lat' => 14.7244000, 'lng' => 120.7586000, 'landmarks' => ['Caingin Road']],
            ['code' => 'MYC-05', 'name' => 'Calvario',             'lat' => 14.7178000, 'lng' => 120.7597000, 'landmarks' => ['Calvario Church', 'Calvario Market']],
            ['code' => 'MYC-06', 'name' => 'Lawa',                 'lat' => 14.7112000, 'lng' => 120.7608000, 'landmarks' => ['Lawa Elementary School']],
            ['code' => 'MYC-07', 'name' => 'Banga',                'lat' => 14.7046000, 'lng' => 120.7619000, 'landmarks' => ['Banga Terminal', 'Banga Market']],
        ];

        // Build waypoints JSON for the route
        $waypoints = array_map(function ($stop) {
            return ['lat' => $stop['lat'], 'lng' => $stop['lng'], 'name' => $stop['name']];
        }, $barangayStops);

        $routeId = (string) Str::uuid();
        Route::create([
            'id'        => $routeId,
            'name'      => 'McArthur Highway — Calumpit to Meycauayan',
            'status'    => 'ACTIVE',
            'waypoints' => $waypoints, // auto JSON via cast
        ]);

        // ════════════════════════════════════════════════════
        // 3. FARE POINTS — 33 Barangays
        // ════════════════════════════════════════════════════

        $BASE_BARANGAY_COUNT = 4;
        $BASE_FARE_REGULAR = 15.00;
        $BASE_FARE_DISCOUNTED = 12.00;
        $SUCCEEDING_REGULAR = 2.25;
        $SUCCEEDING_DISCOUNTED = 1.75;

        foreach ($barangayStops as $index => $stop) {
            $pointNumber = $index + 1;

            if ($pointNumber <= $BASE_BARANGAY_COUNT) {
                $regularFare = $BASE_FARE_REGULAR;
                $discountedFare = $BASE_FARE_DISCOUNTED;
            } else {
                $extra = $pointNumber - $BASE_BARANGAY_COUNT;
                $regularFare = $BASE_FARE_REGULAR + ($extra * $SUCCEEDING_REGULAR);
                $discountedFare = $BASE_FARE_DISCOUNTED + ($extra * $SUCCEEDING_DISCOUNTED);
            }

            FarePoint::create([
                'id'             => (string) Str::uuid(),
                'route_id'       => $routeId,
                'point_number'   => $pointNumber,
                'code'           => $stop['code'],
                'name'           => $stop['name'],
                'landmarks'      => json_encode($stop['landmarks']),
                'sub_stops'      => null,
                'regular_fare'   => $regularFare,
                'discounted_fare' => $discountedFare,
                'latitude'       => $stop['lat'],
                'longitude'      => $stop['lng'],
            ]);
        }

        // ════════════════════════════════════════════════════
        // 4. DRIVERS
        // ════════════════════════════════════════════════════

        $driver1Id = (string) Str::uuid();
        Driver::create([
            'id'                  => $driver1Id,
            'first_name'          => 'Pedro',
            'middle_name'         => null,
            'last_name'           => 'Santos',
            'birthday'            => '1985-06-10',
            'contact'             => '+639171112222',
            'license_number'      => 'DL-2024-0001',
            'hire_date'           => '2023-01-15',
            'profile_picture_url' => null,
            'status'              => 'ACTIVE',
            'vehicle_id'          => null,
        ]);

        $driver2Id = (string) Str::uuid();
        Driver::create([
            'id'                  => $driver2Id,
            'first_name'          => 'Ricardo',
            'middle_name'         => 'G.',
            'last_name'           => 'Cruz',
            'birthday'            => '1988-09-22',
            'contact'             => '+639172223333',
            'license_number'      => 'DL-2024-0002',
            'hire_date'           => '2023-03-01',
            'profile_picture_url' => null,
            'status'              => 'ACTIVE',
            'vehicle_id'          => null,
        ]);

        $driver3Id = (string) Str::uuid();
        Driver::create([
            'id'                  => $driver3Id,
            'first_name'          => 'Antonio',
            'middle_name'         => null,
            'last_name'           => 'Garcia',
            'birthday'            => '1990-12-05',
            'contact'             => '+639173334444',
            'license_number'      => 'DL-2024-0003',
            'hire_date'           => '2023-06-20',
            'profile_picture_url' => null,
            'status'              => 'ACTIVE',
            'vehicle_id'          => null,
        ]);

        // ════════════════════════════════════════════════════
        // 5. VEHICLES (after routes + drivers + conductors)
        // ════════════════════════════════════════════════════

        $vehicle1 = Vehicle::create([
            'id'                   => (string) Str::uuid(),
            'unit_number'          => 'BUS-001',
            'plate_number'         => 'ABC-1234',
            'route_id'             => $routeId,
            'driver_id'            => $driver1Id,
            'conductor_id'         => $conductor1Id,
            'status'               => 'ACTIVE',
            'speed'                => null,
            'capacity_status'      => 'AVAILABLE',
            'latitude'             => null,
            'longitude'            => null,
            'last_location_update' => null,
        ]);

        $vehicle2 = Vehicle::create([
            'id'                   => (string) Str::uuid(),
            'unit_number'          => 'JEEP-001',
            'plate_number'         => 'DEF-5678',
            'route_id'             => $routeId,
            'driver_id'            => $driver2Id,
            'conductor_id'         => $conductor2Id,
            'status'               => 'ACTIVE',
            'speed'                => null,
            'capacity_status'      => 'AVAILABLE',
            'latitude'             => null,
            'longitude'            => null,
            'last_location_update' => null,
        ]);

        $vehicle3 = Vehicle::create([
            'id'                   => (string) Str::uuid(),
            'unit_number'          => 'JEEP-002',
            'plate_number'         => 'GHI-9012',
            'route_id'             => $routeId,
            'driver_id'            => $driver3Id,
            'conductor_id'         => $conductor1Id,
            'status'               => 'ACTIVE',
            'speed'                => null,
            'capacity_status'      => 'AVAILABLE',
            'latitude'             => null,
            'longitude'            => null,
            'last_location_update' => null,
        ]);

        // Update drivers with vehicle_id
        Driver::where('id', $driver1Id)->update(['vehicle_id' => $vehicle1->id]);
        Driver::where('id', $driver2Id)->update(['vehicle_id' => $vehicle2->id]);
        Driver::where('id', $driver3Id)->update(['vehicle_id' => $vehicle3->id]);
    }
}