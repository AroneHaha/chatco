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
});

/*
|--------------------------------------------------------------------------
| Conductor Routes (CONDUCTOR role required)
|--------------------------------------------------------------------------
*/
Route::prefix('conductor')->middleware(['auth:sanctum', 'role:CONDUCTOR'])->group(function () {
    Route::get('/shift', [ConductorController::class, 'shiftStatus'])->middleware('throttle:conductor-read');
    Route::get('/shift-logs', [ConductorController::class, 'shiftLogs'])->middleware('throttle:conductor-read');
    Route::get('/profile', [ConductorController::class, 'profile'])->middleware('throttle:conductor-read');
    Route::get('/units', [ConductorController::class, 'units'])->middleware('throttle:conductor-read');
    Route::get('/drivers', [ConductorController::class, 'drivers'])->middleware('throttle:conductor-read');

    Route::post('/shifts/start', [ConductorController::class, 'startShift'])->middleware('throttle:conductor-mutation');
    Route::post('/remittances', [ConductorController::class, 'remittances'])->middleware('throttle:conductor-mutation');

    Route::post('/location', [ConductorController::class, 'updateLocation'])->middleware('throttle:conductor-gps');

    Route::post('/capacity-status', [ConductorController::class, 'updateCapacityStatus'])->middleware('throttle:conductor-write');

    Route::get('/transactions', [ConductorController::class, 'transactions'])->middleware('throttle:conductor-write');

    // Hail lifecycle (conductor-side)
    Route::get('/hails', [ConductorHailController::class, 'index'])->middleware('throttle:conductor-read');
    Route::post('/hails/{id}/accept', [ConductorHailController::class, 'accept'])->middleware('throttle:conductor-mutation');
    Route::post('/hails/{id}/reject', [ConductorHailController::class, 'reject'])->middleware('throttle:conductor-mutation');
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
