<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Commuter\CommuterController;
use App\Http\Controllers\Commuter\FeedbackController;
use App\Http\Controllers\Commuter\HailController;
use App\Http\Controllers\Commuter\VehicleLocationController;
use App\Http\Controllers\Conductor\ConductorController;
use App\Http\Controllers\Conductor\ConductorHailController;
use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AdminRegistrationController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminVehicleController;
use App\Http\Controllers\Admin\AdminLostItemController;
use App\Http\Controllers\Admin\AdminAnnouncementController;
use App\Http\Controllers\LostItemController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\Payment\PaymentController;
use App\Http\Controllers\Payment\QrController;

/*
|--------------------------------------------------------------------------
| Auth Routes (Public)
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:commuter-hail');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:commuter-hail'); // PUBLIC — commuter self-sign-up (S5-T15)
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
    Route::get('/profile', [CommuterController::class, 'profile'])->middleware('throttle:conductor-read');
    Route::put('/profile', [CommuterController::class, 'updateProfile'])->middleware('throttle:conductor-write');
    Route::post('/change-password', [CommuterController::class, 'changePassword'])->middleware('throttle:conductor-write');
    Route::get('/trips', [CommuterController::class, 'trips'])->middleware('throttle:conductor-read');
    Route::get('/rewards', [CommuterController::class, 'rewards'])->middleware('throttle:conductor-read');

    // Hail lifecycle (commuter-side) — 10 req/min per user
    Route::post('/hail', [HailController::class, 'store'])->middleware('throttle:commuter-hail');
    Route::delete('/hail/{id}', [HailController::class, 'destroy'])->middleware('throttle:commuter-hail');

    // Payment lifecycle (commuter-side) — claim GCash + view history
    Route::post('/payments/claim', [PaymentController::class, 'claim'])->middleware('throttle:commuter-hail');
    Route::get('/payments', [PaymentController::class, 'history'])->middleware('throttle:conductor-read');

    // Feedback submission (S6) — commuter submits a rating for a shift_id
    // resolved via /qr/scan. Throttled at commuter-hail (10/min) to deter
    // spam; the (commuter_id, shift_id) unique constraint also enforces
    // one-feedback-per-shift at the DB level.
    Route::post('/feedback', [FeedbackController::class, 'store'])->middleware('throttle:commuter-hail');
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

    // Read — conductor's own submitted remittance history (Week 5).
    // Scoped to auth conductor in ConductorService::listRemittances().
    Route::get('/remittances', [ConductorController::class, 'remittancesIndex'])->middleware('throttle:conductor-read');

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
    Route::get('/analytics', [AdminController::class, 'analytics'])->middleware('throttle:conductor-read');
    Route::get('/monitoring', [AdminController::class, 'monitoring'])->middleware('throttle:conductor-read');
    Route::get('/users', [AdminUserController::class, 'index'])->middleware('throttle:conductor-read');
    Route::get('/users/{id}', [AdminUserController::class, 'show'])->middleware('throttle:conductor-read');
    Route::put('/users/{id}', [AdminUserController::class, 'update'])->middleware('throttle:conductor-write');
    Route::patch('/users/{id}', [AdminUserController::class, 'update'])->middleware('throttle:conductor-write');
    Route::delete('/users/{id}', [AdminUserController::class, 'destroy'])->middleware('throttle:conductor-write');
    Route::get('/registrations', [AdminRegistrationController::class, 'pending'])->middleware('throttle:conductor-read');
    Route::post('/registrations/{id}/approve', [AdminRegistrationController::class, 'approve'])->middleware('throttle:conductor-write');
    Route::post('/registrations/{id}/reject', [AdminRegistrationController::class, 'reject'])->middleware('throttle:conductor-write');
    Route::get('/drivers', [AdminController::class, 'drivers'])->middleware('throttle:conductor-read');
    Route::post('/drivers', [AdminController::class, 'storeDriver'])->middleware('throttle:conductor-write');
    Route::get('/drivers/{id}', [AdminController::class, 'showDriver'])->middleware('throttle:conductor-read');
    Route::put('/drivers/{id}', [AdminController::class, 'updateDriver'])->middleware('throttle:conductor-write');
    Route::patch('/drivers/{id}', [AdminController::class, 'updateDriver'])->middleware('throttle:conductor-write');
    Route::get('/conductors/{id}', [AdminController::class, 'showConductor'])->middleware('throttle:conductor-read');
    Route::get('/conductors', [AdminController::class, 'conductors'])->middleware('throttle:conductor-read');
    Route::post('/conductors', [AdminController::class, 'storeConductor'])->middleware('throttle:conductor-write');
    Route::get('/vehicles', [AdminVehicleController::class, 'index'])->middleware('throttle:conductor-read');
    Route::post('/vehicles', [AdminVehicleController::class, 'store'])->middleware('throttle:conductor-write');
    Route::put('/vehicles/{id}', [AdminVehicleController::class, 'update'])->middleware('throttle:conductor-write');
    Route::patch('/vehicles/{id}', [AdminVehicleController::class, 'update'])->middleware('throttle:conductor-write');
    Route::delete('/vehicles/{id}', [AdminVehicleController::class, 'destroy'])->middleware('throttle:conductor-write');
    Route::get('/routes', [AdminController::class, 'routes'])->middleware('throttle:conductor-read');
    Route::get('/transactions', [AdminController::class, 'transactions'])->middleware('throttle:conductor-read');
    Route::get('/remittances', [AdminController::class, 'remittances'])->middleware('throttle:conductor-read');
    Route::get('/announcements', [AdminAnnouncementController::class, 'index'])->middleware('throttle:conductor-read');
    Route::post('/announcements', [AdminAnnouncementController::class, 'store'])->middleware('throttle:admin-write');
    Route::get('/announcements/{id}', [AdminAnnouncementController::class, 'show'])->middleware('throttle:conductor-read');
    Route::put('/announcements/{id}', [AdminAnnouncementController::class, 'update'])->middleware('throttle:admin-write');
    Route::patch('/announcements/{id}', [AdminAnnouncementController::class, 'update'])->middleware('throttle:admin-write');
    Route::patch('/announcements/{id}/archive', [AdminAnnouncementController::class, 'archive'])->middleware('throttle:admin-write');
    Route::get('/shift-logs', [AdminController::class, 'shiftLogs'])->middleware('throttle:conductor-read');

    // ── Lost & Found management (S6-T3) ─────────────────────────
    // Replaces the old AdminController::lostItems() 501 stub. Admin creates
    // reported items, reviews claims (approve/reject), and closes released
    // items. Commuter-side browse + claim live in the /lost-found group.
    Route::get('/lost-items', [AdminLostItemController::class, 'index'])->middleware('throttle:conductor-read');
    Route::post('/lost-items', [AdminLostItemController::class, 'store'])->middleware('throttle:admin-write');
    Route::get('/lost-items/{itemId}', [AdminLostItemController::class, 'show'])->middleware('throttle:conductor-read');
    Route::get('/lost-items/{itemId}/claims', [AdminLostItemController::class, 'claims'])->middleware('throttle:conductor-read');
    Route::patch('/lost-items/{itemId}/claims/{claimId}/approve', [AdminLostItemController::class, 'approveClaim'])->middleware('throttle:admin-write');
    Route::patch('/lost-items/{itemId}/claims/{claimId}/reject', [AdminLostItemController::class, 'rejectClaim'])->middleware('throttle:admin-write');
    Route::patch('/lost-items/{itemId}/close', [AdminLostItemController::class, 'close'])->middleware('throttle:admin-write');
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
| Lost & Found — Shared Browse + Commuter Claim (S6-T3)
|--------------------------------------------------------------------------
|   GET  /lost-found            (any auth role) — paginated browse
|   GET  /lost-found/{itemId}   (any auth role) — item detail
|   POST /lost-found/{itemId}/claim (COMMUTER)   — submit a claim with proof
|
| Admin management (create, review claims, close) lives in the /admin
| group above via AdminLostItemController.
|--------------------------------------------------------------------------
*/
Route::prefix('lost-found')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/', [LostItemController::class, 'index'])->middleware('throttle:commuter-read');
    Route::get('/{itemId}', [LostItemController::class, 'show'])->middleware('throttle:commuter-read');
    Route::post('/{itemId}/claim', [LostItemController::class, 'claim'])->middleware(['role:COMMUTER', 'throttle:commuter-write']);
});

/*
|--------------------------------------------------------------------------
| Announcements — User-Facing Reads (S6-T4)
|--------------------------------------------------------------------------
|   GET  /announcements                (any auth role) — ACTIVE feed w/ is_read
|   GET  /announcements/unread-count   (any auth role) — bell badge count
|   POST /announcements/{id}/read      (any auth role) — mark-as-read (204)
|
| Admin CRUD (create/update/archive) lives in the /admin group above via
| AdminAnnouncementController.
|--------------------------------------------------------------------------
*/
Route::prefix('announcements')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/unread-count', [AnnouncementController::class, 'unreadCount'])->middleware('throttle:commuter-read');
    Route::get('/', [AnnouncementController::class, 'index'])->middleware('throttle:commuter-read');
    Route::post('/{id}/read', [AnnouncementController::class, 'markRead'])->middleware('throttle:commuter-write');
});

/*
|--------------------------------------------------------------------------
| QR Routes — Feedback Unit-QR (S6)
|--------------------------------------------------------------------------
| Repurposed from S1 501 stubs. These are NOT the GCash payment QR — the
| GCash flow uses /conductor/payments/gcash/initiate + /commuter/payments/claim.
|
|   POST /qr/generate  (ADMIN)    — issue HMAC-signed unit-QR for a vehicle
|   POST /qr/validate  (COMMUTER) — verify signature + expiry (pre-check)
|   POST /qr/scan      (COMMUTER) — verify + resolve today's driver+conductor
|
| Each route has its own role middleware (the 3 roles are split, not shared)
| because the issuer (admin) and the consumers (commuters) are different.
|--------------------------------------------------------------------------
*/
Route::prefix('qr')->middleware(['auth:sanctum'])->group(function () {
    Route::post('/generate', [QrController::class, 'generate'])->middleware(['role:ADMIN', 'throttle:admin-write']);
    Route::post('/validate', [QrController::class, 'verify'])->middleware(['role:COMMUTER', 'throttle:commuter-write']);
    Route::post('/scan', [QrController::class, 'scan'])->middleware(['role:COMMUTER', 'throttle:commuter-write']);
});