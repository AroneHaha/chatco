<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Commuter\CommuterController;
use App\Http\Controllers\Commuter\VehicleLocationController;
use App\Http\Controllers\Conductor\ConductorController;
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
    Route::get('/wallet', [CommuterController::class, 'wallet']);
    Route::post('/wallet/topup', [CommuterController::class, 'walletTopup']);
    Route::get('/rewards', [CommuterController::class, 'rewards']);
});

/*
|--------------------------------------------------------------------------
| Conductor Routes (CONDUCTOR role required)
|--------------------------------------------------------------------------
| Per-route throttle limits are applied on top of the group auth/role
| middleware. Limits are tuned to the legitimate cadence of each endpoint:
|   - Read endpoints:  60 req/min  (1 req/s — generous for UI polling)
|   - GPS updates:     30 req/min  (supports 5s cadence w/ ~2.5x headroom)
|   - Shift mutations: 10 req/min  (one active shift per conductor anyway)
|   - Transactions:    30 req/min  (still a 501 stub — minimal limit)
|--------------------------------------------------------------------------
*/
Route::prefix('conductor')->middleware(['auth:sanctum', 'role:CONDUCTOR'])->group(function () {
    // Read endpoints — generous limit
    Route::get('/shift', [ConductorController::class, 'shiftStatus'])->middleware('throttle:60,1');
    Route::get('/shift-logs', [ConductorController::class, 'shiftLogs'])->middleware('throttle:60,1');
    Route::get('/profile', [ConductorController::class, 'profile'])->middleware('throttle:60,1');
    Route::get('/units', [ConductorController::class, 'units'])->middleware('throttle:60,1');
    Route::get('/drivers', [ConductorController::class, 'drivers'])->middleware('throttle:60,1');

    // Mutations — strict limit (one shift per conductor at a time anyway)
    Route::post('/shifts/start', [ConductorController::class, 'startShift'])->middleware('throttle:10,1');
    Route::post('/remittances', [ConductorController::class, 'remittances'])->middleware('throttle:10,1');
    Route::post('/capacity-status', [ConductorController::class, 'updateCapacityStatus'])->middleware('throttle:30,1');

    // GPS updates — allows 5-second cadence with headroom for retries/reconnects
    Route::post('/location', [ConductorController::class, 'updateLocation'])->middleware('throttle:30,1');

    // Still a 501 stub — keep minimal limit
    Route::get('/transactions', [ConductorController::class, 'transactions'])->middleware('throttle:30,1');
});

/*
|--------------------------------------------------------------------------
| Vehicle Locations (Authenticated — any role)
|--------------------------------------------------------------------------
*/
Route::prefix('vehicles')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/locations', [VehicleLocationController::class, 'index'])->middleware('throttle:60,1');
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
    Route::get('/routes', [AdminController::class, 'routes']);
    Route::get('/transactions', [AdminController::class, 'transactions']);
    Route::get('/remittances', [AdminController::class, 'remittances']);
    Route::get('/announcements', [AdminController::class, 'announcements']);
    Route::get('/lost-items', [AdminController::class, 'lostItems']);
    Route::get('/shift-logs', [AdminController::class, 'shiftLogs']);
});

/*
|--------------------------------------------------------------------------
| Payment Routes (Authenticated — any role)
|--------------------------------------------------------------------------
*/
Route::prefix('payments')->middleware(['auth:sanctum'])->group(function () {
    Route::post('/initiate', [PaymentController::class, 'initiate']);
    Route::post('/verify', [PaymentController::class, 'verify']);
    Route::get('/history', [PaymentController::class, 'history']);
    Route::post('/topup', [PaymentController::class, 'topup']);
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