<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\UsersController;
use App\Http\Controllers\Admin\VehiclesController;
use App\Http\Controllers\Admin\MonitoringController;
use App\Http\Controllers\Admin\RemittanceController;
use App\Http\Controllers\Admin\LostFoundController;
use App\Http\Controllers\Admin\ReceiptsController;
use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Commuter\CommuterController;
use App\Http\Controllers\Conductor\ConductorController;
use App\Http\Controllers\Payment\PaymentController;
use App\Http\Controllers\Payment\QrController;
use Illuminate\Support\Facades\Route;

// ── Auth (Public) ──────────────────────────────────────────
Route::post('/auth/login', [AuthController::class, 'login']);

// ── Auth (Protected) ──────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
});

// ── Commuter ──────────────────────────────────────────────
Route::prefix('commuter')->middleware(['auth:sanctum', 'role:COMMUTER'])->group(function () {
    Route::get('/profile', [CommuterController::class, 'profile']);
    Route::get('/trips', [CommuterController::class, 'trips']);
    Route::get('/wallet', [CommuterController::class, 'wallet']);
    Route::post('/wallet/topup', [CommuterController::class, 'walletTopup']);
    Route::get('/rewards', [CommuterController::class, 'rewards']);
});

// ── Conductor ─────────────────────────────────────────────
Route::prefix('conductor')->middleware(['auth:sanctum', 'role:CONDUCTOR'])->group(function () {
    Route::post('/location', [ConductorController::class, 'updateLocation']);
    Route::get('/shift', [ConductorController::class, 'shiftStatus']);
    Route::post('/shift/start', [ConductorController::class, 'startShift']);
    Route::post('/shift/end', [ConductorController::class, 'endShift']);
    Route::get('/remittances', [ConductorController::class, 'remittances']);
    Route::get('/transactions', [ConductorController::class, 'transactions']);
});

// ── Admin ─────────────────────────────────────────────────
Route::prefix('admin')->middleware(['auth:sanctum', 'role:ADMIN'])->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Users
    Route::get('/users', [UsersController::class, 'index']);
    Route::get('/users/{id}/history', [UsersController::class, 'history']);
    Route::patch('/users/{id}/approve', [UsersController::class, 'approve']);
    Route::patch('/users/{id}/reject', [UsersController::class, 'reject']);

    // Vehicles & Personnel
    Route::get('/vehicles', [VehiclesController::class, 'index']);
    Route::get('/drivers/{id}', [VehiclesController::class, 'showDriver']);
    Route::get('/drivers/{id}/ratings', [VehiclesController::class, 'driverRatings']);

    // Monitoring
    Route::get('/monitoring', [MonitoringController::class, 'index']);

    // Remittances
    Route::get('/remittances', [RemittanceController::class, 'index']);

    // Lost & Found
    Route::get('/lost-items', [LostFoundController::class, 'index']);

    // Receipts
    Route::get('/receipts', [ReceiptsController::class, 'index']);

    // Analytics
    Route::get('/analytics', [AnalyticsController::class, 'index']);

    // Settings
    Route::get('/settings', [SettingsController::class, 'index']);

    // Still using AdminController (not implemented yet)
    Route::get('/shift-logs', [AdminController::class, 'shiftLogs']);
    Route::get('/routes', [AdminController::class, 'routes']);
    Route::get('/announcements', [AdminController::class, 'announcements']);
    Route::get('/transactions', [AdminController::class, 'transactions']);
});

// ── Payment ───────────────────────────────────────────────
Route::prefix('payments')->middleware(['auth:sanctum'])->group(function () {
    Route::post('/initiate', [PaymentController::class, 'initiate']);
    Route::post('/verify', [PaymentController::class, 'verify']);
    Route::get('/history', [PaymentController::class, 'history']);
    Route::post('/topup', [PaymentController::class, 'topup']);
});

// ── QR ────────────────────────────────────────────────────
Route::prefix('qr')->middleware(['auth:sanctum'])->group(function () {
    Route::post('/generate', [QrController::class, 'generate']);
    Route::post('/validate', [QrController::class, 'validate']);
    Route::post('/scan', [QrController::class, 'scan']);
});