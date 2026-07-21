<?php

use App\Enums\HailStatus;
use App\Models\Hail;
use App\Models\User;
use App\Models\Vehicle;

 $pass = 0;
 $fail = 0;
 $tests = [];

function check(string $label, bool $ok, string $detail = ''): void
{
    global $pass, $fail, $tests;
    $tests[] = ['label' => $label, 'ok' => $ok, 'detail' => $detail];
    if ($ok) $pass++; else $fail++;
}

echo "=== S3-T2 Hail Model Verification ===\n\n";

 $commuter = User::where('role', 'COMMUTER')->first()
    ?? User::where('role', 'CONDUCTOR')->first()
    ?? User::first();
 $vehicle = Vehicle::first();

if (!$commuter || !$vehicle) {
    echo "Need at least 1 user + 1 vehicle in DB.\n";
    echo "Run: php artisan migrate:fresh --seed\n";
    return;
}

echo "Using commuter: {$commuter->email}\n";
echo "Using vehicle:  {$vehicle->unit_number}\n\n";

Hail::query()->delete();

// AC #4: UUID auto-generates on creation
echo "-- AC #4: UUID auto-generation --\n";
 $hail = Hail::create([
    'commuter_id'   => $commuter->id,
    'vehicle_id'    => $vehicle->id,
    'commuter_lat'  => 14.5995120,
    'commuter_lng'  => 120.9842190,
    'distance_m'    => 850.50,
    'status'        => HailStatus::PENDING,
    'expires_at'    => now()->addMinutes(2),
]);
 $isUuid = preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $hail->id);
check('UUID auto-generated on create', $isUuid === 1, "id={$hail->id}");
check('Not a fake/empty id', !empty($hail->id) && $hail->id !== '0');
echo "   id = {$hail->id}\n";
echo "   valid UUID format? " . ($isUuid ? 'YES' : 'NO') . "\n\n";

// AC #1: Persisted with valid data
echo "-- AC #1: Persisted with valid data --\n";
 $reloaded = Hail::find($hail->id);
check('Row persisted to DB', $reloaded !== null);
check('commuter_id matches', $reloaded->commuter_id === $commuter->id);
check('vehicle_id matches',  $reloaded->vehicle_id  === $vehicle->id);
check('distance_m matches',  (float) $reloaded->distance_m === 850.50);
echo "   raw status: " . $reloaded->getRawOriginal('status') . "\n\n";

// Casts
echo "-- Casts --\n";
check('status cast to HailStatus enum',   $reloaded->status instanceof HailStatus);
check('status value is PENDING',          $reloaded->status === HailStatus::PENDING);
check('commuter_lat cast to decimal:7',   $reloaded->commuter_lat === '14.5995120');
check('commuter_lng cast to decimal:7',   $reloaded->commuter_lng === '120.9842190');
check('distance_m cast to decimal:2',     $reloaded->distance_m === '850.50');
check('expires_at cast to datetime',      $reloaded->expires_at instanceof \Illuminate\Support\Carbon);
echo "   status class: " . get_class($reloaded->status) . "\n";
echo "   expires_at:   " . $reloaded->expires_at->toIso8601String() . "\n\n";

// AC #3: Relationships
echo "-- AC #3: Relationships --\n";
check('commuter() returns User',     $reloaded->commuter instanceof User);
check('commuter is the right User',  $reloaded->commuter->id === $commuter->id);
check('vehicle() returns Vehicle',   $reloaded->vehicle instanceof Vehicle);
check('vehicle is the right Vehicle',$reloaded->vehicle->id === $vehicle->id);
check('conductor() is null (nullable)', $reloaded->conductor === null);
echo "   commuter:  {$reloaded->commuter->email}\n";
echo "   vehicle:   {$reloaded->vehicle->unit_number}\n";
echo "   conductor: " . ($reloaded->conductor ? 'set' : 'null (correct)') . "\n\n";

// AC #2: Scopes
echo "-- AC #2: Query Scopes --\n";

Hail::create([
    'commuter_id' => $commuter->id, 'vehicle_id' => $vehicle->id,
    'commuter_lat' => 14.5995120, 'commuter_lng' => 120.9842190,
    'distance_m' => 900.00, 'status' => HailStatus::PENDING,
    'expires_at' => now()->subMinutes(5), // expired
]);

Hail::create([
    'commuter_id' => $commuter->id, 'vehicle_id' => $vehicle->id,
    'commuter_lat' => 14.5995120, 'commuter_lng' => 120.9842190,
    'distance_m' => 950.00, 'status' => HailStatus::ACCEPTED,
    'expires_at' => now()->addMinutes(10),
]);

 $otherVehicle = Vehicle::where('id', '!=', $vehicle->id)->first();
if ($otherVehicle) {
    Hail::create([
        'commuter_id' => $commuter->id, 'vehicle_id' => $otherVehicle->id,
        'commuter_lat' => 14.5995120, 'commuter_lng' => 120.9842190,
        'distance_m' => 700.00, 'status' => HailStatus::PENDING,
        'expires_at' => now()->addMinutes(10),
    ]);
}

 $pendingCount    = Hail::pending()->count();
 $forVehicleCount = Hail::forVehicle($vehicle->id)->count();
 $expiredCount    = Hail::expired()->count();

check("scopePending returns 3 hails (not 4)", $pendingCount === 3, "got {$pendingCount}");
check("scopeForVehicle filters by vehicle_id", $forVehicleCount === 2, "got {$forVehicleCount}");
check("scopeExpired returns only past-due pending hails", $expiredCount === 1, "got {$expiredCount}");
echo "   scopePending count:    {$pendingCount} (expected 3)\n";
echo "   scopeForVehicle count: {$forVehicleCount} (expected 2)\n";
echo "   scopeExpired count:    {$expiredCount} (expected 1)\n\n";

// Status update sanity check
echo "-- Bonus: Status update works --\n";
 $reloaded->status = HailStatus::ACCEPTED;
 $reloaded->save();
 $reloaded->refresh
