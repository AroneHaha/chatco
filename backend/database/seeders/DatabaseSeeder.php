<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
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
        $admin = User::create([
            'email'    => 'admin@gmail.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::ADMIN,
        ]);
        AdminProfile::create([
            'id'                  => $admin->id,
            'first_name'          => 'System',
            'middle_name'         => null,
            'last_name'           => 'Admin',
            'profile_picture_url' => null,
        ]);

        // ── Conductors ──
        $conductor1 = User::create([
            'email'    => 'conductor1@gmail.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id'                  => $conductor1->id,
            'first_name'          => 'Juan',
            'middle_name'         => null,
            'last_name'           => 'Dela Cruz',
            'birthday'            => '1990-03-15',
            'profile_picture_url' => null,
            'generated_username'  => 'conductor001',
            'generated_password'  => Hash::make('password123'),
        ]);

        $conductor2 = User::create([
            'email'    => 'conductor2@gmail.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id'                  => $conductor2->id,
            'first_name'          => 'Maria',
            'middle_name'         => 'Santos',
            'last_name'           => 'Reyes',
            'birthday'            => '1992-07-20',
            'profile_picture_url' => null,
            'generated_username'  => 'conductor002',
            'generated_password'  => Hash::make('password123'),
        ]);

        // ── Commuters ──
        // Seeded separately in CommuterSeeder (20 PH-celebrity accounts across
        // every discount tier + account status). See the $this->call() at the
        // end of this method.

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

        $route = Route::create([
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
                'route_id'        => $route->id,
                'point_number'    => $pointNumber,
                'code'            => $stop['code'],
                'name'            => $stop['name'],
                'landmarks'       => $stop['landmarks'], // auto JSON via cast
                'sub_stops'       => null,
                'regular_fare'    => $regularFare,
                'discounted_fare' => $discountedFare,
                'latitude'        => $stop['lat'],
                'longitude'       => $stop['lng'],
            ]);
        }

        // ════════════════════════════════════════════════════
        // 4. DRIVERS + 5. VEHICLES (10 each)
        // ════════════════════════════════════════════════════
        // Generates 10 drivers + 10 vehicles with realistic Philippine
        // names, proper plate numbers (XXX NNNN format), and unit
        // numbers (UNIT-NNN format).
        //
        // Vehicles start UNASSIGNED — no current driver or conductor. The
        // driver + conductor assignment happens dynamically through the
        // conductor login workflow (startShift sets vehicle.driver_id /
        // conductor_id) and is cleared on EOD / the daily reset. Drivers
        // likewise start with no vehicle so they appear in the conductor's
        // available-driver pool.

        $driverSpecs = [
            ['Pedro',     'Santos',       '1985-06-10', '+639171112222', '2023-01-15'],
            ['Ricardo',   'Cruz',         '1988-09-22', '+639172223333', '2023-03-01'],
            ['Antonio',   'Garcia',       '1990-12-05', '+639173334444', '2023-06-20'],
            ['Manuel',    'Reyes',        '1983-04-18', '+639174445555', '2022-11-10'],
            ['Roberto',   'Flores',       '1987-08-30', '+639175556666', '2023-02-14'],
            ['Eduardo',   'Lim',          '1991-01-25', '+639176667777', '2023-09-05'],
            ['Fernando',  'Torres',       '1986-07-12', '+639177778888', '2023-04-22'],
            ['Jose',      'Mendoza',      '1989-03-08', '+639178889999', '2023-07-30'],
            ['Ramon',     'Villanueva',   '1984-11-17', '+639179990000', '2022-08-15'],
            ['Carlos',    'Dela Rosa',    '1992-05-20', '+639170001111', '2023-10-12'],
        ];

        // Plate number prefixes — Philippine region-style codes
        $platePrefixes = ['NAA', 'NAB', 'NAC', 'NBC', 'NBD', 'DAB', 'DAC', 'AAD', 'AAE', 'PAA'];

        foreach ($driverSpecs as $i => $spec) {
            [$firstName, $lastName, $birthday, $contact, $hireDate] = $spec;

            // Generate unique license number
            $licenseNumber = 'DL-2024-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT);

            // Create the driver — starts with no vehicle (unassigned pool).
            Driver::create([
                'first_name'          => $firstName,
                'middle_name'         => null,
                'last_name'           => $lastName,
                'birthday'            => $birthday,
                'contact'             => $contact,
                'license_number'      => $licenseNumber,
                'hire_date'           => $hireDate,
                'profile_picture_url' => null,
                'status'              => 'ACTIVE',
                'vehicle_id'          => null,
            ]);

            // Generate unique plate: XXX NNNN (3 letters + space + 4 digits)
            $plateNumber = $platePrefixes[$i] . ' ' . str_pad($i + 1, 4, '0', STR_PAD_LEFT);

            // Generate unique unit number: UNIT-001 through UNIT-010
            $unitNumber = 'UNIT-' . str_pad($i + 1, 3, '0', STR_PAD_LEFT);

            // Create the vehicle — starts UNASSIGNED (no current driver or
            // conductor). Assignment happens at conductor login, not here.
            Vehicle::create([
                'unit_number'          => $unitNumber,
                'plate_number'         => $plateNumber,
                'route_id'             => $route->id,
                'driver_id'            => null,
                'conductor_id'         => null,
                'status'               => 'ACTIVE',
                'speed'                => null,
                'capacity_status'      => 'AVAILABLE',
                'latitude'             => null,
                'longitude'            => null,
                'last_location_update' => null,
            ]);
        }

        // ════════════════════════════════════════════════════
        // 6. TRANSACTIONAL / OPERATIONAL DATA (separate seeders)
        // ════════════════════════════════════════════════════
        // Split into focused seeders so each dataset is easy to inspect and can
        // be re-run in isolation (php artisan db:seed --class=XxxSeeder).
        // Order matters: commuters + shifts → transactions → remittances.
        $this->call([
            CommuterSeeder::class,      // 20 PH-celebrity commuters
            ShiftLogSeeder::class,      // conductor shifts (ended + active today)
            TransactionSeeder::class,   // fares (Receipts + remittance source)
            RemittanceSeeder::class,    // completed remittances (from ended shifts)
            AnnouncementSeeder::class,  // system announcements feed
            FaqSeeder::class,           // landing-page FAQ chat content
        ]);
    }
}
