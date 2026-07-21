<?php

use App\Enums\HailStatus;
use App\Exceptions\OutsideRadiusException;
use App\Models\Hail;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use App\Services\HailService;
use Symfony\Component\HttpKernel\Exception\HttpException;

 $pass = 0; $fail = 0; $tests = [];

function check($label, $ok, $detail = '') {
    global $pass, $fail, $tests;
    $tests[] = ['label' => $label, 'ok' => $ok, 'detail' => $detail];
    if ($ok) $pass++; else $fail++;
    echo "  [" . ($ok ? 'PASS' : 'FAIL') . "] {$label}";
    if (!$ok && $detail) echo " -- {$detail}";
    echo "\n";
}

echo "=== S3-T4 HailService Verification ===\n\n";

// ─── Setup: find existing seeded data ──────────────────────────────
 $commuter  = User::where('role', 'COMMUTER')->first();
 $conductor = User::where('role', 'CONDUCTOR')->first();
 $vehicle   = Vehicle::first();

if (!$commuter || !$conductor || !$vehicle) {
    echo "Need at least 1 COMMUTER, 1 CONDUCTOR, 1 Vehicle.\n";
    echo "Run: php artisan migrate:fresh --seed\n";
    return;
}

echo "commuter:  {$commuter->email}\n";
echo "conductor: {$conductor->email}\n";
echo "vehicle:   {$vehicle->unit_number} (id={$vehicle->id})\n\n";

// Clean slate
Hail::query()->delete();
VehicleLocation::query()->delete();
ShiftLog::where('shift_id', 'like', 'SFT-TEST-%')->delete();

// ─── Setup: put vehicle on active shift + at a known GPS position ──
// NOTE: ShiftLog model's $fillable is missing 'unit_number', so we use
// forceCreate() to bypass fillable. Also skip 'total_trips' which is in
// fillable but NOT in the migration (pre-existing model/migration drift).
 $shift = ShiftLog::forceCreate([
    'shift_id'       => 'SFT-TEST-' . now()->format('His'),
    'conductor_id'   => $conductor->id,
    'driver_id'      => $vehicle->driver_id,
    'vehicle_id'     => $vehicle->id,
    'route_id'       => $vehicle->route_id,
    'conductor_name' => $conductor->email,
    'driver_name'    => 'Test Driver',
    'unit_number'    => $vehicle->unit_number,
    'plate_number'   => $vehicle->plate_number,
    'route_name'     => null,
    'time_in'        => now(),
    'time_out'       => null,
    'is_active'      => true,
    'status'         => 'ACTIVE',
    'notes'          => null,
]);
 $vehicle->update(['active_shift_id' => $shift->shift_id]);

// Put vehicle at Manila coordinate
 $vehicleLat = 14.5995120;
 $vehicleLng = 120.9842190;
VehicleLocation::create([
    'vehicle_id'    => $vehicle->id,
    'conductor_id'  => $conductor->id,
    'lat'           => $vehicleLat,
    'lng'           => $vehicleLng,
]);

 $service = app(HailService::class);

// ─── AC #1: createHail at 500m succeeds ────────────────────────────
echo "-- AC #1: createHail at 500m succeeds --\n";
try {
    // 0.0045 deg latitude ~= 500m north
    $commuterLat = $vehicleLat + 0.0045;
    $hail = $service->createHail($commuter, $vehicle->id, $commuterLat, $vehicleLng);
    check('createHail returned Hail instance', $hail instanceof Hail);
    check('status is PENDING', $hail->status === HailStatus::PENDING);
    check('distance_m is approximately 500', abs((float) $hail->distance_m - 500) < 50, "got {$hail->distance_m}");
    $diffMin = $hail->expires_at->diffInMinutes(now());
    check('expires_at is ~3 minutes in future', $diffMin >= 2 && $diffMin <= 4, "got {$diffMin}min");
    echo "    distance_m = {$hail->distance_m}\n";
    echo "    expires_at = {$hail->expires_at->toIso8601String()}\n\n";
} catch (\Throwable $e) {
    check('createHail at 500m succeeded', false, get_class($e) . ': ' . $e->getMessage());
}

// ─── AC #2: createHail at 1500m throws OutsideRadiusException ──────
echo "-- AC #2: createHail at 1500m throws OutsideRadiusException --\n";
 $service->cancelHail($commuter, $hail->id);

try {
    $commuterLatFar = $vehicleLat + 0.0135;
    $service->createHail($commuter, $vehicle->id, $commuterLatFar, $vehicleLng);
    check('OutsideRadiusException was thrown', false, 'no exception thrown');
} catch (OutsideRadiusException $e) {
    check('OutsideRadiusException thrown', true);
    check('distanceMeters is public float', is_float($e->distanceMeters));
    check('distanceMeters is approximately 1500', abs($e->distanceMeters - 1500) < 100, "got {$e->distanceMeters}");
    echo "    distance_m = {$e->distanceMeters}\n\n";
} catch (\Throwable $e) {
    check('Correct exception type', false, 'Got ' . get_class($e) . ': ' . $e->getMessage());
}

// ─── AC #3: Duplicate pending hail returns 409 ─────────────────────
echo "-- AC #3: Duplicate pending hail returns 409 --\n";
 $hail1 = $service->createHail($commuter, $vehicle->id, $vehicleLat + 0.0045, $vehicleLng);
try {
    $service->createHail($commuter, $vehicle->id, $vehicleLat + 0.0045, $vehicleLng);
    check('409 abort fired', false, 'no exception thrown');
} catch (HttpException $e) {
    check('HttpException thrown', true);
    check('Status is 409', $e->getStatusCode() === 409, "got {$e->getStatusCode()}");
    echo "    message = {$e->getMessage()}\n\n";
} catch (\Throwable $e) {
    check('Correct exception type', false, 'Got ' . get_class($e) . ': ' . $e->getMessage());
}

// ─── AC #4: cancelHail only works for owning commuter ──────────────
echo "-- AC #4: cancelHail ownership check --\n";
 $otherCommuter = User::where('role', 'COMMUTER')->where('id', '!=', $commuter->id)->first();
if ($otherCommuter) {
    try {
        $service->cancelHail($otherCommuter, $hail1->id);
        check('403 for non-owner', false, 'no exception thrown');
    } catch (HttpException $e) {
        check('403 for non-owner', $e->getStatusCode() === 403, "got {$e->getStatusCode()}");
    } catch (\Throwable $e) {
        check('Correct exception type', false, 'Got ' . get_class($e));
    }
} else {
    check('Skipped (need 2 commuters)', true);
}

 $cancelled = $service->cancelHail($commuter, $hail1->id);
check('Owner can cancel', $cancelled->status === HailStatus::CANCELLED);
echo "\n";

// ─── AC #5: acceptHail only works for conductor on correct vehicle ─
echo "-- AC #5: acceptHail ownership check --\n";
 $hail2 = $service->createHail($commuter, $vehicle->id, $vehicleLat + 0.0045, $vehicleLng);

 $otherConductor = User::where('role', 'CONDUCTOR')->where('id', '!=', $conductor->id)->first();
if ($otherConductor) {
    try {
        $service->acceptHail($otherConductor, $hail2->id);
        check('403 for wrong conductor', false, 'no exception thrown');
    } catch (HttpException $e) {
        check('403 for wrong conductor', $e->getStatusCode() === 403, "got {$e->getStatusCode()}");
    } catch (\Throwable $e) {
        check('Correct exception type', false, 'Got ' . get_class($e));
    }
}

 $accepted = $service->acceptHail($conductor, $hail2->id);
check('Correct conductor can accept', $accepted->status === HailStatus::ACCEPTED);
check('conductor_id set on hail', $accepted->conductor_id === $conductor->id);
echo "\n";

// ─── AC #6: expireStaleHails transitions old pending to expired ────
echo "-- AC #6: expireStaleHails --\n";
Hail::query()->where('status', HailStatus::PENDING)->delete();

Hail::create(['commuter_id'=>$commuter->id,'vehicle_id'=>$vehicle->id,'commuter_lat'=>$vehicleLat,'commuter_lng'=>$vehicleLng,'distance_m'=>100,'status'=>HailStatus::PENDING,'expires_at'=>now()->subMinutes(5)]);
Hail::create(['commuter_id'=>$commuter->id,'vehicle_id'=>$vehicle->id,'commuter_lat'=>$vehicleLat,'commuter_lng'=>$vehicleLng,'distance_m'=>200,'status'=>HailStatus::PENDING,'expires_at'=>now()->subMinutes(10)]);
Hail::create(['commuter_id'=>$commuter->id,'vehicle_id'=>$vehicle->id,'commuter_lat'=>$vehicleLat,'commuter_lng'=>$vehicleLng,'distance_m'=>300,'status'=>HailStatus::PENDING,'expires_at'=>now()->addMinutes(3)]);

 $expiredCount = $service->expireStaleHails();
check('expireStaleHails returned 2', $expiredCount === 2, "got {$expiredCount}");
 $stillPending = Hail::pending()->count();
check('Fresh pending hail remains', $stillPending === 1, "got {$stillPending}");
echo "\n";

// ─── Cleanup ───────────────────────────────────────────────────────
Hail::query()->delete();
VehicleLocation::query()->delete();
 $vehicle->update(['active_shift_id' => null]);
ShiftLog::where('shift_id', 'like', 'SFT-TEST-%')->delete();
echo "-- Cleanup complete --\n\n";

// ─── Final report ──────────────────────────────────────────────────
echo "=== RESULTS ===\n";
foreach ($tests as $t) {
    $mark = $t['ok'] ? 'PASS' : 'FAIL';
    echo "  [{$mark}] {$t['label']}";
    if (!$t['ok'] && $t['detail']) echo " -- {$t['detail']}";
    echo "\n";
}
echo "\nPassed: {$pass} / " . ($pass + $fail) . "\n";
echo "Failed: {$fail} / " . ($pass + $fail) . "\n";
if ($fail === 0) echo "\nALL CHECKS PASSED -- S3-T4 verified.\n";
else echo "\n{$fail} CHECK(S) FAILED -- review above.\n";
