<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Commuter\CommuterController;
use App\Http\Controllers\Commuter\HailController;
use App\Http\Controllers\Commuter\VehicleLocationController;
use App\Http\Controllers\Conductor\ConductorController;
use App\Http\Controllers\Conductor\ConductorHailController;
use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Payment\PaymentController;
use App\Http\Controllers\Payment\QrController;

/*
|--------------------------------------------------------------------------
| Auth Routes (Public)
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
});

/*
|--------------------------------------------------------------------------
| Authenticated User Route
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->get('/user', [AuthController::class, 'user']);

/*
|--------------------------------------------------------------------------
| Commuter Routes (COMMUTER role required)
|--------------------------------------------------------------------------
*/
Route::prefix('commuter')->middleware(['auth:sanctum', 'role:COMMUTER'])->group(function () {
    Route::get('/profile', [CommuterController::class, 'profile']);
    Route::get('/trips', [CommuterController::class, 'trips']);
    Route::get('/rewards', [CommuterController::class, 'rewards']);

    // Hail lifecycle (commuter-side) — 10 req/min per user
    Route::post('/hail', [HailController::class, 'store'])->middleware('throttle:commuter-hail');
    Route::delete('/hail/{id}', [HailController::class, 'destroy'])->middleware('throttle:commuter-hail');

    // Payment lifecycle (commuter-side) — claim GCash + view history
    Route::post('/payments/claim', [PaymentController::class, 'claim'])->middleware('throttle:commuter-hail');
    Route::get('/payments', [PaymentController::class, 'history'])->middleware('throttle:conductor-read');
});

/*
|--------------------------------------------------------------------------
| Conductor Routes (CONDUCTOR role required)
|--------------------------------------------------------------------------
| Per-route throttle limits use named rate limiters (defined in
| AppServiceProvider::configureRateLimiters) so the 429 response uses
| the project's ApiResponse JSON envelope. Limits are tuned to the
| legitimate cadence of each endpoint:
|   - Read endpoints:  60 req/min  (1 req/s — generous for UI polling)
|   - GPS updates:     30 req/min  (supports 5s cadence w/ ~2.5x headroom)
|   - Shift mutations: 10 req/min  (one active shift per conductor anyway)
|   - Transactions:    30 req/min  (still a 501 stub — minimal limit)
|--------------------------------------------------------------------------
*/
Route::prefix('conductor')->middleware(['auth:sanctum', 'role:CONDUCTOR'])->group(function () {
    // Read endpoints — 60 req/min (generous for UI polling)
    Route::get('/shift', [ConductorController::class, 'shiftStatus'])->middleware('throttle:conductor-read');
    Route::get('/shift-logs', [ConductorController::class, 'shiftLogs'])->middleware('throttle:conductor-read');
    Route::get('/profile', [ConductorController::class, 'profile'])->middleware('throttle:conductor-read');
    Route::get('/units', [ConductorController::class, 'units'])->middleware('throttle:conductor-read');
    Route::get('/drivers', [ConductorController::class, 'drivers'])->middleware('throttle:conductor-read');

    // Mutations — strict limit (one shift per conductor at a time anyway)
    Route::post('/shifts/start', [ConductorController::class, 'startShift'])->middleware('throttle:conductor-mutation');
    Route::post('/remittances', [ConductorController::class, 'remittances'])->middleware('throttle:conductor-mutation');

    // GPS updates — allows 5-second cadence with headroom for retries/reconnects
    Route::post('/location', [ConductorController::class, 'updateLocation'])->middleware('throttle:conductor-gps');

    // Capacity status updates
    Route::post('/capacity-status', [ConductorController::class, 'updateCapacityStatus'])->middleware('throttle:conductor-write');

    // Transaction lifecycle (S4-T5) — cash recording, GCash initiate, earnings.
    // POST fare recording uses conductor-write (30/min) — comfortably above
    // the real boarding cadence; reads use conductor-read (60/min).
    Route::get('/transactions', [ConductorController::class, 'transactions'])->middleware('throttle:conductor-read');
    Route::post('/transactions', [ConductorController::class, 'storeTransaction'])->middleware('throttle:conductor-write');
    Route::post('/payments/gcash/initiate', [ConductorController::class, 'initiateGcash'])->middleware('throttle:conductor-write');
    Route::get('/earnings', [ConductorController::class, 'earnings'])->middleware('throttle:conductor-read');

    // Hail lifecycle (conductor-side) — reads 60/min, mutations via write limiter
    Route::get('/hails', [ConductorHailController::class, 'index'])->middleware('throttle:conductor-read');
    Route::post('/hails/{id}/accept', [ConductorHailController::class, 'accept'])->middleware('throttle:conductor-write');
    Route::post('/hails/{id}/reject', [ConductorHailController::class, 'reject'])->middleware('throttle:conductor-write');
});

/*
|--------------------------------------------------------------------------
| Vehicle Locations (Authenticated — any role)
|--------------------------------------------------------------------------
*/
Route::prefix('vehicles')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/locations', [VehicleLocationController::class, 'index'])->middleware('throttle:vehicle-locations');
});

/*
|--------------------------------------------------------------------------
| Admin Routes (ADMIN role required)
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->middleware(['auth:sanctum', 'role:ADMIN'])->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboard']);
    Route::get('/users', [AdminController::class, 'users']);
    Route::get('/drivers', [AdminController::class, 'drivers']);
    Route::get('/vehicles', [AdminController::class, 'vehicles']);
    Route::post('/vehicles', [AdminController::class, 'storeVehicle']);
    Route::put('/vehicles/{id}', [AdminController::class, 'updateVehicle']);
    Route::patch('/vehicles/{id}', [AdminController::class, 'updateVehicle']);
    Route::delete('/vehicles/{id}', [AdminController::class, 'destroyVehicle']);
    Route::get('/routes', [AdminController::class, 'routes']);
    Route::get('/transactions', [AdminController::class, 'transactions']);
    Route::get('/remittances', [AdminController::class, 'remittances']);
    Route::get('/announcements', [AdminController::class, 'announcements']);
    Route::get('/lost-items', [AdminController::class, 'lostItems']);
    Route::get('/shift-logs', [AdminController::class, 'shiftLogs']);
});

/*
|--------------------------------------------------------------------------
| Payment Routes (Shared + Webhook)
|--------------------------------------------------------------------------
|   GET  /payments/{id}/status  -> auth:sanctum (any role) — status polling
|   POST /payments/webhook      -> PUBLIC (no auth) — PayMongo webhook (S4-T6)
|
| The commuter-side payment routes (claim, history) live in the commuter
| group above. The conductor-side GCash initiate route lives in the
| conductor group above.
|--------------------------------------------------------------------------
*/
Route::prefix('payments')->group(function () {
    // Status polling — auth required, any role (conductor or commuter)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/{id}/status', [PaymentController::class, 'status'])->middleware('throttle:conductor-read');

        // DEV ONLY (config payments.allow_simulation): drive a PENDING GCash
        // payment to a terminal status without a real provider. Hard-disabled
        // in production by the controller.
        Route::post('/{id}/simulate', [PaymentController::class, 'simulate'])->middleware('throttle:conductor-write');
    });

    // PayMongo webhook — PUBLIC (server-to-server, signature-verified in S4-T6)
    Route::post('/webhook', [PaymentController::class, 'webhook']);
});

/*
|--------------------------------------------------------------------------
| QR Routes (Authenticated — any role)
|--------------------------------------------------------------------------
*/
Route::prefix('qr')->middleware(['auth:sanctum'])->group(function () {
    Route::post('/generate', [QrController::class, 'generate']);
    Route::post('/validate', [QrController::class, 'validate']);
    Route::post('/scan', [QrController::class, 'scan']);
});