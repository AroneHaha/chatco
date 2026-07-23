<?php

use App\Models\User;
use App\Models\Vehicle;
use App\Models\Driver;
use App\Services\ShiftService;
use App\Models\ShiftLog;

echo "════════════════════════════════════════\n";
echo " SHIFT START DIAGNOSTIC\n";
echo "════════════════════════════════════════\n\n";

// ─── 1. Find conductor1 ──────────────────────────────────────────────
 $conductor = User::where('email', 'conductor1@gmail.com')->first();
if (!$conductor) {
    echo "❌ conductor1@gmail.com not found in DB.\n";
    echo "   Run: php artisan db:seed --class=DatabaseSeeder\n";
    return;
}
echo "✅ Conductor found: {$conductor->email}\n";
echo "   Role: {$conductor->role->value}\n";
echo "   isConductor(): " . ($conductor->isConductor() ? 'true' : 'false') . "\n\n";

// ─── 2. Check for stale active shifts ────────────────────────────────
 $activeShiftCount = ShiftLog::where('status', 'ACTIVE')->count();
 $vehiclesBusy = Vehicle::whereNotNull('active_shift_id')->count();
 $driversBusy = Driver::whereNotNull('active_shift_id')->count();
echo "Active shifts in DB: {$activeShiftCount}\n";
echo "Vehicles with active_shift_id set: {$vehiclesBusy}\n";
echo "Drivers with active_shift_id set:  {$driversBusy}\n";

if ($activeShiftCount > 0) {
    echo "\n── Existing active shifts ──\n";
    ShiftLog::where('status', 'ACTIVE')->get()->each(function ($s) {
        echo "  • Shift {$s->shift_id} | conductor={$s->conductor_id} | vehicle={$s->vehicle_id} | driver={$s->driver_id}\n";
    });
}

// ─── 3. Find available vehicle + driver ──────────────────────────────
 $vehicle = Vehicle::whereNull('active_shift_id')->where('status', 'ACTIVE')->first();
 $driver  = Driver::whereNull('active_shift_id')->first();

echo "\n";
echo "Available vehicle: " . ($vehicle ? "{$vehicle->id} (unit={$vehicle->unit_number})" : 'NONE') . "\n";
echo "Available driver:  " . ($driver  ? "{$driver->id} (name={$driver->first_name})"   : 'NONE') . "\n\n";

if (!$vehicle || !$driver) {
    echo "❌ No available vehicle or driver. Clear stale shifts first:\n\n";
    echo "  Vehicle::query()->update(['active_shift_id' => null]);\n";
    echo "  Driver::query()->update(['active_shift_id' => null]);\n";
    echo "  ShiftLog::where('status','ACTIVE')->update(['status'=>'ENDED','time_out'=>now()]);\n";
    return;
}

// ─── 4. Attempt to start shift ───────────────────────────────────────
echo "── Attempting to start shift ──\n";
try {
    $shift = app(ShiftService::class)->startShift(
        $conductor,
        $vehicle->id,
        $driver->id,
        null,
    );
    echo "✅ Shift started successfully!\n";
    echo "   shift_id:    {$shift->shift_id}\n";
    echo "   conductor:   {$shift->conductor_id}\n";
    echo "   vehicle_id:  {$shift->vehicle_id}\n";
    echo "   driver_id:   {$shift->driver_id}\n";
    echo "   status:      {$shift->status->value}\n";
    echo "   time_in:     {$shift->time_in}\n";
} catch (\Throwable $e) {
    echo "❌ FAILED!\n";
    echo "   Exception: " . get_class($e) . "\n";
    echo "   Message:   " . $e->getMessage() . "\n";
    echo "   File:      " . $e->getFile() . ":" . $e->getLine() . "\n\n";
    echo "   Trace (first 5 frames):\n";
    $trace = array_slice($e->getTrace(), 0, 5);
    foreach ($trace as $i => $frame) {
        echo "     #{$i} " . ($frame['file'] ?? '<unknown>') . ":" . ($frame['line'] ?? '?') . " → " . ($frame['function'] ?? '?') . "()\n";
    }
}

echo "\n════════════════════════════════════════\n";
