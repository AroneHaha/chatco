<?php

require __DIR__ . '/vendor/autoload.php';

 $app = require_once __DIR__ . '/bootstrap/app.php';
 $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Config Check ===\n";
echo "BROADCAST_DRIVER: " . config('broadcasting.default') . "\n";
echo "QUEUE_CONNECTION: " . config('queue.default') . "\n";
echo "PUSHER_KEY: " . config('broadcasting.connections.pusher.key') . "\n";
echo "PUSHER_CLUSTER: " . config('broadcasting.connections.pusher.options.cluster') . "\n";
echo "\n";

echo "=== Test 1: Direct Pusher SDK ===\n";
try {
    $pusher = new \Pusher\Pusher(
        config('broadcasting.connections.pusher.key'),
        config('broadcasting.connections.pusher.secret'),
        config('broadcasting.connections.pusher.app_id'),
        config('broadcasting.connections.pusher.options')
    );
    $response = $pusher->trigger('vehicles', 'DirectTest', ['message' => 'from direct SDK']);
    echo "Result: " . json_encode($response) . "\n";
    echo "Status: SUCCESS\n";
} catch (\Exception $e) {
    echo "Status: FAILED - " . $e->getMessage() . "\n";
}
echo "\n";

echo "=== Test 2: Laravel broadcast() ===\n";
try {
    broadcast(new \App\Events\VehicleLocationUpdated([
        'vehicle_id' => 'laravel-test',
        'plate_number' => 'LARAVEL',
        'vehicle_type' => 'Jeepney',
        'lat' => 14.5995,
        'lng' => 120.9842,
        'speed' => 0,
        'heading' => 0,
        'capacity_status' => 'AVAILABLE',
        'route_name' => 'Test',
        'updated_at' => now()->toIso8601String(),
    ]));
    echo "Status: SUCCESS\n";
} catch (\Exception $e) {
    echo "Status: FAILED - " . $e->getMessage() . "\n";
}
echo "\n";

echo "=== Test 3: event() helper ===\n";
try {
    event(new \App\Events\VehicleLocationUpdated([
        'vehicle_id' => 'event-test',
        'plate_number' => 'EVENT',
        'vehicle_type' => 'Jeepney',
        'lat' => 14.6000,
        'lng' => 120.9850,
        'speed' => 0,
        'heading' => 0,
        'capacity_status' => 'AVAILABLE',
        'route_name' => 'Test',
        'updated_at' => now()->toIso8601String(),
    ]));
    echo "Status: SUCCESS\n";
} catch (\Exception $e) {
    echo "Status: FAILED - " . $e->getMessage() . "\n";
}
echo "\n";

echo "=== Done. Check Pusher Debug Console for 3 events ===\n";
echo "1. DirectTest (direct SDK)\n";
echo "2. VehicleLocationUpdated (broadcast helper)\n";
echo "3. VehicleLocationUpdated (event helper)\n";