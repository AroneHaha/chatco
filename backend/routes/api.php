<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Admin\AdminController;
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