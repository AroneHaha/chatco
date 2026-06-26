# ChatCo — Full ClickUp Task Dump (incl. closed)

- **Workspace:** E-Chatco Workspace (team 90161628825)
- **Space:** DEV & DOCU (90167055028)
- **List:** E-CHATCO (901615041878)
- **Total tasks dumped:** 84 (open + closed)
- **Generated:** 2026-06-26 18:13 UTC

---

## Status overview by sprint

| Sprint | Total | Open | Closed | In Progress | s4 |
|---|---|---|---|---|---|
| OTHER | 14 | 0 | 14 | 0 | 0 |
| S1 | 21 | 0 | 21 | 0 | 0 |
| S2 | 7 | 0 | 7 | 0 | 0 |
| S3 | 12 | 0 | 12 | 0 | 0 |
| S4 | 13 | 0 | 11 | 2 | 0 |
| S5 | 17 | 10 | 3 | 4 | 10 |

---

## OTHER (14 tasks)

### FIXING FOR NEXT DEV
- **ID:** `86d3dfcbc`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-19 10:24
- **Updated:** 2026-06-20 06:07
- **Closed:** 2026-06-20 06:07
- **URL:** https://app.clickup.com/t/86d3dfcbc

**Description:**
```
Error 1 — AlertItem not exported
File: components/admin/dashboard/recent-alerts.tsx:4
typescript

import type { AlertItem } from '@/app/(admin)/admin-dashboard/data/dashboard-data';
The AlertItem type isn't exported from dashboard-data.ts. Either:
Add export interface AlertItem {...} to dashboard-data.ts, OR
Define AlertItem inline in recent-alerts.tsx, OR
Import from wherever it's actually defined
Error 2 — duration missing in shift log
File: lib/conductor/persistence/shift.store.ts:31
The ShiftLog type requires duration: string | null, but the object being passed doesn't include it. Quick fix — add duration: null to the object literal at line 31-39.
Errors 3 + 4 — Missing laravel-echo + pusher-js packages
File: lib/echo.ts
These npm packages aren't installed. Fix:
powershell

cd "C:\BSIT 1\chatco\frontend"
npm install laravel-echo pusher-js
npm install --save-dev @types/pusher-js
(laravel-echo ships with its own types; pusher-js may need @types/pusher-js.
```

### [COMMUTER-FRONTEND] ETA of Nearest Unit
- **ID:** `86d338y3v`
- **Status:** `complete` (closed)
- **Assignees:** Rod Dulalia
- **Created:** 2026-05-22 17:30
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-05-22 20:00
- **URL:** https://app.clickup.com/t/86d338y3v

**Description:**
```
This task focuses on adding an Estimated Time of Arrival (ETA) feature for commuters within the system. When a commuter is detected to be within the 1-kilometer radius of a conductor or jeepney unit, the system should automatically display the estimated arrival time of the nearest available unit. The ETA must be calculated based on the current GPS location of the jeepney and the commuter’s location. This feature aims to improve commuter convenience by giving real-time arrival information before initiating the hail or pickup process. The displayed ETA should update dynamically as the jeepney changes position.
```

### [CONTEXT] S2 — Environment Setup & Installation Guide
- **ID:** `86d3cbvmt`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-16 14:39
- **Updated:** 2026-06-17 06:15
- **Closed:** 2026-06-17 06:15
- **URL:** https://app.clickup.com/t/86d3cbvmt

**Description:**
```
Sprint 2 — New Dependencies
Backend (only 1 new package)
bash

cd backend
composer require pusher/pusher-php-server
Frontend (only 2 new packages)
bash

cd frontend
npm install laravel-echo pusher-js
That's it. No other installations needed for Sprint 2.
Sprint 2 — Backend .env Additions
Append these to your existing backend/.env (do NOT replace the whole file):
env

# Sprint 2 — Real-time broadcasting
BROADCAST_CONNECTION=pusher
QUEUE_CONNECTION=sync

# Pusher Credentials (Sandbox tier — free)
PUSHER_APP_ID=2167016
PUSHER_APP_KEY=323230b941a07bf166d8
PUSHER_APP_SECRET=fddb5e30057caaba31f9
PUSHER_APP_CLUSTER=ap1
PUSHER_PORT=443
PUSHER_SCHEME=https

Update backend/.env.example (for teammates)
Append the same block, but with placeholder values:
env

# Sprint 2 — Real-time broadcasting
BROADCAST_CONNECTION=pusher
QUEUE_CONNECTION=sync

PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_APP_CLUSTER=ap1
PUSHER_PORT=443
PUSHER_SCHEME=https
Sprint 2 — Frontend .env.local Additions
Append to your existing frontend/.env.local:
env

# Sprint 2 — Pusher real-time
NEXT_PUBLIC_PUSHER_APP_KEY=323230b941a07bf166d8
NEXT_PUBLIC_PUSHER_APP_CLUSTER=ap1
Update frontend/.env.example
env

# Sprint 2 — Pusher real-time
NEXT_PUBLIC_PUSHER_APP_KEY=your_app_key
NEXT_PUBLIC_PUSHER_APP_CLUSTER=ap1
Sprint 2 — Database Migrations
5 new migrations to run:
bash

cd backend
php artisan migrate
Migrations applied:

[table-embed:1:1 #| 1:2 Migration| 1:3 Purpose| 2:1 1| 2:2 2026_06_16_000001_create_vehicle_locations_table.php | 2:3 GPS tracking table (upsert pattern)| 3:1 2| 3:2 2026_06_16_000002_add_status_to_shift_logs_table.php | 3:3 status  enum (ACTIVE/ENDED) + indexes| 4:1 3| 4:2 2026_06_16_000003_add_active_shift_id_to_vehicles_table.php | 4:3 Vehicle → active shift FK| 5:1 4| 5:2 2026_06_16_000004_add_active_shift_id_to_drivers_table.php | 5:3 Driver → active shift FK| 6:1 5| 6:2 2026_06_16_000005_add_shift_fields_to_remittances_table.php | 6:3 Remittance shift linkage|]
All migrations are idempotent — safe to re-run.
Sprint 2 — Configuration File Updates
1. backend/config/broadcasting.php — Ensure pusher block exists
If it doesn't exist, add:
php

'pusher' => [
    'driver' => 'pusher',
    'key' => env('PUSHER_APP_KEY'),
    'secret' => env('PUSHER_APP_SECRET'),
    'app_id' => env('PUSHER_APP_ID'),
    'options' => [
        'cluster' => env('PUSHER_APP_CLUSTER'),
        'encrypted' => true,
        'useTLS' => true,
    ],
],
2. backend/bootstrap/providers.php — Enable BroadcastServiceProvider
php

This prevents tests from hitting Pusher API.
Sprint 2 — New Files Created
Backend

[table-embed:1:1 File| 1:2 Purpose| 2:1 app/Events/VehicleLocationUpdated.php | 2:2 Broadcast event on  vehicles  channel| 3:1 app/Services/ShiftService.php | 3:2 Shift start/end business logic| 4:1 app/Services/LocationService.php | 4:2 GPS upsert + broadcast logic| 5:1 app/Http/Controllers/Conductor/ConductorController.php | 5:2 Updated with shift/location/profile/units/drivers methods| 6:1 app/Http/Controllers/Commuter/VehicleLocationController.php | 6:2 Public endpoint to fetch all vehicle locations| 7:1 app/Http/Requests/Conductor/StartShiftRequest.php | 7:2 Validates vehicle_id, driver_id, route_id| 8:1 app/Http/Requests/Conductor/UpdateLocationRequest.php | 8:2 Validates lat/lng/speed/heading/capacity_status| 9:1 app/Http/Requests/Conductor/SubmitRemittanceRequest.php | 9:2 Validates shift_id, total_collected, remitted_amount| 10:1 app/Models/VehicleLocation.php | 10:2 Model with  upsertPosition()  helper| 11:1 app/Models/ShiftLog.php | 11:2 Updated with status enum, scopes, relationships| 12:1 app/Models/Vehicle.php | 12:2 Updated with  active_shift_id ,  activeShift() ,  currentLocation() | 13:1 app/Models/Driver.php | 13:2 Updated with  active_shift_id ,  activeShift() | 14:1 app/Models/Remittance.php | 14:2 Updated with shift relationships| 15:1 app/Enums/ShiftStatus.php | 15:2 ACTIVE  /  ENDED  enum| 16:1 app/Enums/CapacityStatus.php | 16:2 AVAILABLE  /  STANDING  /  FULL  enum|]
Frontend

[table-embed:1:1 File| 1:2 Purpose| 2:1 frontend/lib/echo.ts | 2:2 Laravel Echo singleton with Pusher driver| 3:1 frontend/hooks/useVehicleLocations.ts | 3:2 React hook for vehicle location subscription| 4:1 frontend/app/test-realtime/page.tsx | 4:2 Test page for real-time verification|]
Tests

[table-embed:1:1 File| 1:2 Purpose| 2:1 backend/tests/Feature/ShiftTest.php | 2:2 10 tests — shift lifecycle| 3:1 backend/tests/Feature/LocationTest.php | 3:2 9 tests — GPS tracking| 4:1 backend/tests/Feature/BroadcastTest.php | 4:2 5 tests — real-time broadcasting| 5:1 backend/tests/Feature/Sprint2RoleAccessTest.php | 5:2 8 tests — RBAC matrix| 6:1 backend/tests/Feature/SchemaTest.php | 6:2 Updated — 8 schema assertions|]
Sprint 2 — Verification Steps
Step 1: Clear all caches (run after every config change)
bash

cd backend
php artisan config:clear
php artisan route:clear
php artisan cache:clear
Step 2: Verify Pusher config is loaded
bash

php artisan config:show broadcasting | findstr pusher
Expected:
text

connections ⇁ pusher ⇁ driver ............................. pusher
connections ⇁ pusher ⇁ key .................. 323230b941a07bf166d8
connections ⇁ pusher ⇁ secret ............... fddb5e30057caaba31f9
connections ⇁ pusher ⇁ app_id ............................ 2167016
connections ⇁ pusher ⇁ options ⇁ cluster ..................... ap1
Step 3: Verify routes are registered
bash

php artisan route:list --path=api/conductor
Expected: 10 routes including:
GET api/conductor/profile
GET api/conductor/units
GET api/conductor/drivers
GET api/conductor/shift
POST api/conductor/shifts/start
POST api/conductor/remittances
POST api/conductor/location
POST api/conductor/capacity-status
GET api/conductor/shift-logs
GET api/conductor/transactions
Step 4: Run Sprint 2 tests
bash

php artisan test --filter=ShiftTest
php artisan test --filter=LocationTest
php artisan test --filter=BroadcastTest
php artisan test --filter=Sprint2RoleAccessTest
php artisan test --filter=SchemaTest
All should pass.
Step 5: Smoke test Pusher (direct SDK)
bash

php artisan tinker
Inside tinker (single line):
php

 $pusher = new \Pusher\Pusher(env('PUSHER_APP_KEY'), env('PUSHER_APP_SECRET'), env('PUSHER_APP_ID'), ['cluster' => env('PUSHER_APP_CLUSTER'), 'useTLS' => true]); $response = $pusher->trigger('vehicles', 'TestEvent', ['msg' => 'hello from tinker']); dump($response);
Check Pusher Debug Console → should see TestEvent on vehicles channel.
Step 6: Smoke test via API
bash

# Login as conductor
 $body = @{ login = "conductor1@gmail.com"; password = "password123" } | ConvertTo-Json
 $loginResp = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Headers @{ "Accept" = "application/json" } -ContentType "application/json" -Body $body
 $token = $loginResp.data.token

# Test conductor profile
 $headers = @{ "Accept" = "application/json"; "Authorization" = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:8000/api/conductor/profile" -Method Get -Headers $headers
Expected: success: true with conductor user data.
Step 7: Frontend real-time verification
Start backend: php artisan serve
Start frontend: npm run dev
Open Pusher Dashboard → Debug Console → "Clear logs"
Login as conductor on frontend
Start a shift
Send a GPS update
Pusher Debug Console shows VehicleLocationUpdated event ✅
Sprint 2 — Common Issues & Fixes
Issue 1: Pusher events not appearing in Debug Console
Cause: QUEUE_CONNECTION=database but no worker running
Fix:
bash

# In .env: QUEUE_CONNECTION=sync
php artisan config:clear
Issue 2: 403 Forbidden on conductor endpoints (with valid token)
Cause: Role case mismatch — DB stores CONDUCTOR, middleware expects conductor
Fix: Add accessor to app/Models/User.php:
php

public function getRoleAttribute(?string $value): ?string
{
    return $value ? strtolower($value) : null;
}
Issue 3: 404 on /api/conductor/profile, /api/conductor/units, /api/conductor/drivers
Cause: Routes not registered
Fix: Add to routes/api.php inside conductor route group:
php

Route::get('/profile', [ConductorController::class, 'profile']);
Route::get('/units', [ConductorController::class, 'units']);
Route::get('/drivers', [ConductorController::class, 'drivers']);
Issue 4: Cannot find module '@/lib/api'
Cause: Frontend path alias not configured
Fix: Ensure frontend/tsconfig.json has:
json

{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
Issue 5: Generic type 'Echo' requires 1 type argument(s)
Cause: Newer laravel-echo types require generic
Fix: Use Echo in frontend/lib/echo.ts (see file content above).
Issue 6: strtoupper intelephense error in ShiftService.php
Cause: Intelephense bug with global functions in namespaced files
Fix: Use \strtoupper( with leading backslash.
Issue 7: Frontend 401 on all conductor APIs
Cause: Token not being attached to requests
Fix: Ensure frontend/lib/api.ts has request interceptor:
typescript

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
Sprint 2 — Quick Start Checklist
Backend
 composer require pusher/pusher-php-server
 Append Sprint 2 block to backend/.env
 Append Sprint 2 block to backend/.env.example
 Run php artisan migrate (5 new migrations)
 Verify config/broadcasting.php has pusher block
 Create/verify app/Providers/BroadcastServiceProvider.php
 Enable BroadcastServiceProvider in bootstrap/providers.php
 Create/verify routes/channels.php with vehicles channel
 Update phpunit.xml with BROADCAST_DRIVER=log and QUEUE_CONNECTION=sync
 php artisan config:clear && php artisan route:clear
 Verify php artisan config:show broadcasting shows pusher creds
 Verify php artisan route:list --path=api/conductor shows 10 routes
 Run php artisan test — all Sprint 2 tests pass
Frontend
 npm install laravel-echo pusher-js
 Append Sprint 2 block to frontend/.env.local
 Append Sprint 2 block to frontend/.env.example
 Verify tsconfig.json has @/* path alias
 Create frontend/lib/echo.ts (Echo singleton)
 Create frontend/hooks/useVehicleLocations.ts
 Verify frontend/lib/api.ts has token interceptor
 npm run dev starts without errors
Real-Time Verification
 Pusher test event appears in Debug Console (Step 5 above)
 Login → start shift → send GPS → event appears in Debug Console
 Commuter portal receives real-time updates
Summary
Sprint 2 setup requires:
1 backend package (pusher/pusher-php-server)
2 frontend packages (laravel-echo, pusher-js)
5 migrations (run via php artisan migrate)
~15 new files (events, services, controllers, models, enums, tests)
2 .env updates (backend + frontend, Pusher credentials)
4 config file updates (broadcasting.php, providers.php, channels.php, phpunit.xml)
Once these are in place, the real-time GPS tracking pipeline is fully functional: conductor sends GPS → backend broadcasts → Pusher → commuter portal receives instant update.
```

### [DOCU] Minor Revisions
- **ID:** `86d323fvj`
- **Status:** `complete` (closed)
- **Assignees:** Marinel Carbonell
- **Created:** 2026-05-20 04:20
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-05-19 20:00
- **URL:** https://app.clickup.com/t/86d323fvj

### [DOCU] Official Revisions(Panels)
- **ID:** `86d32wc1r`
- **Status:** `complete` (closed)
- **Assignees:** Marinel Carbonell
- **Created:** 2026-05-21 16:58
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-05-21 20:00
- **URL:** https://app.clickup.com/t/86d32wc1r

### [DOCU] Updated ERD
- **ID:** `86d32wbxe`
- **Status:** `complete` (closed)
- **Assignees:** Mark Arone Dela Cruz, Marinel Carbonell
- **Created:** 2026-05-21 16:56
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-05-21 20:00
- **URL:** https://app.clickup.com/t/86d32wbxe

**Comments (1):**
- **[2026-05-22 01:58] Mark Arone Dela Cruz:** 

### [HANDOFF] S2 — Feature Test Suite Specification
- **ID:** `86d3cbv0v`
- **Status:** `complete` (closed)
- **Assignees:** Rod Dulalia
- **Created:** 2026-06-16 14:35
- **Updated:** 2026-06-18 13:12
- **Closed:** 2026-06-18 13:11
- **URL:** https://app.clickup.com/t/86d3cbv0v

**Description:**
```
Key business rules to encode in tests:
Shift can ONLY end via remittance submission — no standalone end-shift endpoint
vehicle_locations uses UPSERT (one row per vehicle_id, never append)
GPS broadcasts VehicleLocationUpdated event on vehicles channel
Three entities (conductor, driver, vehicle) cannot be on two active shifts simultaneously → 409 Conflict
Denormalized names baked into shift_logs (conductor_name, driver_name, plate_number)
Current State — What Exists

[table-embed:1:1 Test File | 1:2 Status | 1:3 Notes | 2:1 tests/Feature/ShiftTest.php | 2:2 ✅ Exists | 2:3 Has shift start, duplicate shift, end via remittance tests — needs review against final spec | 3:1 tests/Feature/LocationTest.php | 3:2 ✅ Exists | 3:3 Has GPS update + capacity status tests — needs broadcast assertion | 4:1 tests/Feature/BroadcastTest.php | 4:2 ✅ Exists | 4:3 Has  Broadcast::fake()  assertion for event — needs capacity update coverage | 5:1 tests/Feature/Sprint2RoleAccessTest.php | 5:2 ✅ Exists | 5:3 Has RBAC matrix tests — needs 401 unauth coverage | 6:1 tests/Feature/SchemaTest.php | 6:2 ❓ Verify existence | 6:3 Needs update for Sprint 2 schema additions |]
What Needs to Be Built/Updated
A. ShiftTest.php — Complete Shift Lifecycle Coverage
Tests required (10 total):

[table-embed:1:1 # | 1:2 Test Name | 1:3 Expected Status | 1:4 Validates | 2:1 1 | 2:2 test_conductor_can_start_shift | 2:3 201 | 2:4 Shift created,  vehicle.active_shift_id  set,  driver.active_shift_id  set | 3:1 2 | 3:2 test_conductor_cannot_start_duplicate_shift | 3:3 409 | 3:4 Same conductor cannot start 2nd active shift | 4:1 3 | 4:2 test_conductor_cannot_start_shift_if_driver_in_use | 4:3 409 | 4:4 Driver on another active shift | 5:1 4 | 5:2 test_conductor_cannot_start_shift_if_vehicle_in_use | 5:3 409 | 5:4 Vehicle on another active shift | 6:1 5 | 6:2 test_conductor_can_end_shift_via_remittance | 6:3 200 | 6:4 Remittance record created,  shift.status=ENDED ,  time_out  set,  active_shift_id  cleared | 7:1 6 | 7:2 test_remittance_without_active_shift | 7:3 422 | 7:4 Shift doesn't exist or already ended | 8:1 7 | 8:2 test_remittance_for_other_conductor_shift | 8:3 403 | 8:4 Conductor cannot end another conductor's shift | 9:1 8 | 9:2 test_get_active_shift_when_exists | 9:3 200 | 9:4 Returns shift data with vehicle/driver/route eager loaded | 10:1 9 | 10:2 test_get_active_shift_when_none | 10:3 200 | 10:4 Returns  data: null | 11:1 10 | 11:2 test_get_shift_logs_paginated | 11:3 200 | 11:4 Returns paginated history ordered by  time_in DESC |]
Critical fixtures:
User factory must support role attribute (currently conductor, may need case-normalization per Phase 1 of previous brief)
Vehicle factory — verify plate_number, vehicle_type fields exist
Driver factory — verify first_name, last_name, contact fields exist
Route factory — verify route_name field exists
B. LocationTest.php — GPS Tracking + UPSERT Coverage
Tests required (9 total):

[table-embed:1:1 # | 1:2 Test Name | 1:3 Expected Status | 1:4 Validates | 2:1 1 | 2:2 test_conductor_can_update_location | 2:3 200 | 2:4 vehicle_locations  row upserted with lat/lng | 3:1 2 | 3:2 test_location_update_requires_active_shift | 3:3 422 | 3:4 No active shift → service aborts 422 | 4:1 3 | 4:2 test_location_update_validates_lat_range | 4:3 422 | 4:4 lat > 90 or  180 or assertTrue(Schema::hasTable('vehicle_locations'));
 $this->assertTrue(Schema::hasColumns('vehicle_locations', [
    'vehicle_id', 'conductor_id', 'lat', 'lng',
    'speed', 'heading', 'capacity_status', 'updated_at',
]));
 $this->assertFalse(Schema::hasColumn('vehicle_locations', 'wallet_balance'));
What Needs Consideration
1. Test Database Setup
RefreshDatabase trait runs migrations on every test — ensure Sprint 2 migrations are idempotent (they already use Schema::hasColumn checks)
Ensure phpunit.xml has BROADCAST_DRIVER=log to prevent Pusher API calls during tests
Verify QUEUE_CONNECTION=sync in phpunit.xml so broadcast events fire synchronously
2. Factory Completeness
Before tests can run, factories must exist for ALL models used:
UserFactory — must support role attribute (check if conductor/CONDUCTOR accepted)
VehicleFactory — must populate plate_number, vehicle_type, status
DriverFactory — must populate first_name, last_name, contact
RouteFactory — must populate route_name
ShiftLogFactory — must auto-generate shift_id (format SFT-YYYYMMDDHHMMSS), populate denormalized name fields
VehicleLocationFactory — must use vehicle_id as string PK (no auto-increment)
RemittanceFactory — must populate shift_id, total_collected, remitted_amount, shortage
3. Role Case Sensitivity (carried over from previous brief)
If RoleMiddleware does case-sensitive comparison, tests using ['role' => 'conductor'] (lowercase) will fail with 403. Two options:
Use ['role' => 'CONDUCTOR'] in tests to match DB convention (quick fix)
Implement User accessor to normalize case (long-term fix per Phase 1 of previous brief)
Recommendation: Use uppercase in test fixtures to match current DB convention; add a TODO comment to revisit after the accessor is added.
4. Denormalized Name Assertions
ShiftLog has conductor_name, driver_name, plate_number baked in at creation time. Tests must verify these match the related entities:
php

 $shiftLog = ShiftLog::where('conductor_id', $conductor->id)->first();
 $this->assertEquals(
    $conductor->first_name . ' ' . $conductor->last_name,
    $shiftLog->conductor_name
);
 $this->assertEquals($vehicle->plate_number, $shiftLog->plate_number);
5. Broadcast Assertions Pattern
Use Broadcast::fake() and assert channel + event name + payload:
php

Broadcast::fake();

// Trigger action
 $this->actingAs($conductor)->postJson('/api/conductor/location', [...]);

Broadcast::assertBroadcasted(function (VehicleLocationUpdated $event) use ($vehicleId) {
    return $event->broadcastOn()->name === 'vehicles'
        && $event->broadcastAs() === 'VehicleLocationUpdated'
        && $event->broadcastWith()['vehicle_id'] === $vehicleId;
});
6. Test Isolation
Each test should start with clean state — RefreshDatabase handles this
For tests checking "no duplicate active shift", explicitly create one shift first, then attempt second
For remittance tests, verify post-shift state changes (active_shift_id = null, status = ENDED, time_out != null)
What I Need You to Do
Phase 1 — Verify Factory Coverage
Before writing tests, run:
bash

php artisan tinker
>>> User::factory()->make(['role' => 'conductor']);
>>> Vehicle::factory()->make();
>>> Driver::factory()->make();
>>> Route::factory()->make();
If any factory is missing or fields are wrong, fix factories FIRST. Tests will fail confusingly without proper fixtures.
Phase 2 — Write/Update 5 Test Files
ShiftTest.php — implement 10 tests per Section A above
LocationTest.php — implement 9 tests per Section B above
BroadcastTest.php — implement 5 tests per Section C above
Sprint2RoleAccessTest.php — implement 8 tests per Section D above
SchemaTest.php — add 8 assertions per Section E above
Phase 3 — Configure phpunit.xml
Ensure these env vars are set in the 
 section:
xml

Phase 4 — Run Full Suite
bash

php artisan test --filter=ShiftTest
php artisan test --filter=LocationTest
php artisan test --filter=BroadcastTest
php artisan test --filter=Sprint2RoleAccessTest
php artisan test --filter=SchemaTest

# Full suite
php artisan test
All tests must pass. Investigate any failures — likely causes:
403 instead of 200 → role case sensitivity (see Section 3)
404 instead of 200 → route name mismatch (e.g., shifts/start vs shift/start)
500 errors → missing factory fields or denormalized name columns
Phase 5 — Coverage Verification
After all tests pass, verify acceptance criteria:

[table-embed:1:1 Criterion | 1:2 Verification Method | 2:1 All shift lifecycle tests pass | 2:2 php artisan test --filter=ShiftTest  → 10/10 pass | 3:1 409 Conflict for duplicates | 3:2 Tests 2, 3, 4 in ShiftTest | 4:1 Shift cannot end without remittance | 4:2 No standalone end-shift endpoint exists — verify in  routes/api.php | 5:1 GPS upsert works | 5:2 Test 5 in LocationTest (no duplicate rows) | 6:1 Broadcast on GPS + capacity | 6:2 Tests 1, 2 in BroadcastTest | 7:1 Invalid GPS returns 422 | 7:2 Tests 3, 4 in LocationTest | 8:1 All vehicles returned (no distance filter) | 8:2 Test 8 in LocationTest | 9:1 Commuter RBAC enforced | 9:2 Tests 3-5 in Sprint2RoleAccessTest | 10:1 All responses use ApiResponse format | 10:2 Assert  success ,  data ,  message ,  errors ,  meta  keys in every test | 11:1 SchemaTest updated | 11:2 8 assertions in SchemaTest pass | 12:1 No wallet columns | 12:2 Test 8 in SchemaTest explicitly asserts  wallet_balance  does NOT exist |]
Expected Behavior Summary

[table-embed:1:1 Case | 1:2 HTTP Status | 1:3 Test File | 1:4 Test Name | 2:1 Valid shift start | 2:2 201 | 2:3 ShiftTest | 2:4 test_conductor_can_start_shift | 3:1 Duplicate active shift (conductor) | 3:2 409 | 3:3 ShiftTest | 3:4 test_conductor_cannot_start_duplicate_shift | 4:1 Duplicate active shift (driver) | 4:2 409 | 4:3 ShiftTest | 4:4 test_conductor_cannot_start_shift_if_driver_in_use | 5:1 Duplicate active shift (vehicle) | 5:2 409 | 5:3 ShiftTest | 5:4 test_conductor_cannot_start_shift_if_vehicle_in_use | 6:1 Valid remittance + shift end | 6:2 200 | 6:3 ShiftTest | 6:4 test_conductor_can_end_shift_via_remittance | 7:1 Remittance without active shift | 7:2 422 | 7:3 ShiftTest | 7:4 test_remittance_without_active_shift | 8:1 Remittance wrong conductor | 8:2 403 | 8:3 ShiftTest | 8:4 test_remittance_for_other_conductor_shift | 9:1 Valid GPS update | 9:2 200 | 9:3 LocationTest | 9:4 test_conductor_can_update_location | 10:1 GPS without active shift | 10:2 422 | 10:3 LocationTest | 10:4 test_location_update_requires_active_shift | 11:1 Invalid lat/lng | 11:2 422 | 11:3 LocationTest | 11:4 test_location_update_validates_lat/lng_range | 12:1 GPS update triggers broadcast | 12:2 Event fired | 12:3 BroadcastTest | 12:4 test_gps_update_triggers_vehicle_location_updated_event | 13:1 Capacity update triggers broadcast | 13:2 Event fired | 13:3 BroadcastTest | 13:4 test_capacity_status_update_triggers_broadcast | 14:1 Get vehicle locations (any role) | 14:2 200 | 14:3 LocationTest | 14:4 test_commuter_can_get_all_active_locations | 15:1 Wrong role on conductor endpoints | 15:2 403 | 15:3 Sprint2RoleAccessTest | 15:4 test_commuter_cannot_* | 16:1 No auth on protected routes | 16:2 401 | 16:3 Sprint2RoleAccessTest | 16:4 test_guest_cannot_access_protected_routes |]
Known Risks & Mitigations
Factory drift — If factories don't match current schema (e.g., drivers.surname vs drivers.last_name), tests fail with cryptic SQL errors. Mitigation: Phase 1 factory verification step.
Test pollution from previous Sprint 1 tests — If Sprint 1 tests assumed different schema (e.g., shift_logs.started_at instead of time_in), they'll fail. Mitigation: run full suite, fix Sprint 1 tests to match current schema.
Pusher rate limiting — Even with BROADCAST_DRIVER=log, if any test accidentally hits Pusher, you may see rate limit errors. Mitigation: verify phpunit.xml env vars, never use Event::dispatch() directly in tests — always go through controller endpoints.
Time-sensitive assertions — Tests asserting time_out != null may be flaky if timezone handling differs. Mitigation: use assertNotNull($shift->fresh()->time_out) rather than asserting exact timestamp.
Database transaction isolation — RefreshDatabase wraps each test in a transaction. If a test calls DB::beginTransaction() manually (e.g., in service layer), it may conflict. Mitigation: ensure ShiftService and LocationService use DB::transaction() (which integrates with the test transaction), not manual beginTransaction().
Role string inconsistency — If tests use lowercase conductor but DB stores CONDUCTOR, RBAC tests will spuriously pass with 403. Mitigation: explicit test asserting the actual stored role value, OR add a fixture normalization layer.
Acceptance Sign-Off
Hand this brief to the senior dev. Deliverables:
 All 5 test files implemented per spec
 php artisan test shows 100% pass rate for Sprint 2 tests
 php artisan test --coverage shows ShiftService + LocationService + conductor endpoints at >90% coverage
 phpunit.xml properly configured (BROADCAST_DRIVER=log, QUEUE_CONNECTION=sync)
 No test makes real Pusher API calls
 All test fixtures (factories) updated to match current schema
 Commit message: test: add Sprint 2 feature tests for shift lifecycle, GPS, broadcasting, RBAC
Once tests pass, the conductor portal issues from the previous brief can be confidently fixed — tests will catch any regressions.
```

### [HARDENING] S2 Remove Dead Wallet & Top-Up Route Stubs from API
- **ID:** `86d3d1tfw`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 08:27
- **Updated:** 2026-06-18 13:12
- **Closed:** 2026-06-18 13:11
- **URL:** https://app.clickup.com/t/86d3d1tfw

**Description:**
```
Context

The Sprint 1 bootstrap registered 501 placeholder stubs for all planned endpoints � including wallet and top-up routes that the project will never implement. The sprint roadmap explicitly states:

Wallet system is fully and permanently removed � no internal balance, no top-up, no ledger

These dead stubs are still registered in backend/routes/api.php and their controller methods still exist. They pose no security risk (they return 501), but they:

Mislead any developer reading the route file into thinking wallet/top-up is a planned feature
Show up in php artisan route:list and Postman collections as real endpoints
Will be flagged in the Week 7 hardening audit � better to remove now while Sprint 2 cleanup is in progress

Dead Routes to Remove

[table-embed:1:1 Route | 1:2 Controller Method | 1:3 File | 2:1 GET /api/commuter/wallet | 2:2 CommuterController::wallet() | 2:3 app/Http/Controllers/Commuter/CommuterController.php | 3:1 POST /api/commuter/wallet/topup | 3:2 CommuterController::walletTopup() | 3:3 app/Http/Controllers/Commuter/CommuterController.php | 4:1 POST /api/payments/topup | 4:2 PaymentController::topup() | 4:3 app/Http/Controllers/Payment/PaymentController.php |]
All three are 501 stubs with zero logic.

What to Do

1. Remove routes from backend/routes/api.php

In the commuter route group, delete these two lines:

Route::get("/wallet", [CommuterController::class, "wallet"]);
Route::post("/wallet/topup", [CommuterController::class, "walletTopup"]);

In the payments route group, delete this line:

Route::post("/topup", [PaymentController::class, "topup"]);

2. Remove controller methods

In app/Http/Controllers/Commuter/CommuterController.php, delete:

wallet() method
walletTopup() method

In app/Http/Controllers/Payment/PaymentController.php, delete:

topup() method

3. Verify no frontend references

Grep the frontend for any calls to these endpoints:

cd frontend
rg "wallet" --type=ts --type=tsx
rg "topup|top-up|top_up" --type=ts --type=tsx

If any frontend code references these routes, remove or comment those calls (they would already be hitting 501 anyway).

4. Update tests if applicable

Check if any test file asserts against these routes:

cd backend
rg "wallet|topup" tests/

Remove any test cases that reference wallet/topup endpoints.

Acceptance Criteria

php artisan route:list | grep wallet returns zero results
php artisan route:list | grep topup returns zero results
grep -r "wallet" backend/routes/ returns zero results
grep -r "topup" backend/routes/ returns zero results
No dead wallet(), walletTopup(), or topup() methods remain in any controller
Existing tests still pass (php artisan test)
No frontend build errors after removal

Files Touched

EDIT: backend/routes/api.php (remove 3 route lines)
EDIT: backend/app/Http/Controllers/Commuter/CommuterController.php (remove 2 methods)
EDIT: backend/app/Http/Controllers/Payment/PaymentController.php (remove 1 method)
VERIFY: frontend for stale references
VERIFY: test suite for stale assertions
```

### [HARDENING] S2 — Add Database Performance Indexes on vehicle_locations.updated_at and shift_logs.time_in
- **ID:** `86d3cdmfh`
- **Status:** `complete` (closed)
- **Assignees:** Rod Dulalia
- **Created:** 2026-06-16 20:21
- **Updated:** 2026-06-18 13:12
- **Closed:** 2026-06-18 13:11
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3cdmfh

**Description:**
```
Context
The LocationService::getAllActiveLocations() method runs this query (from backend/app/Services/LocationService.php):
return VehicleLocation::join('vehicles', ...)
    ->leftJoin('shift_logs', ...)
    ->leftJoin('routes', ...)
    ->select(...)
    ->orderBy('vehicle_locations.updated_at', 'desc')
    ->get();
The ORDER BY vehicle_locations.updated_at DESC clause forces the database to sort every row in vehicle_locations on every commuter request. Without an index on updated_at, MySQL performs a filesort — fine for 10 vehicles, painful for 1000+.
Similarly, the shift_logs table has indexes on conductor_id, driver_id, vehicle_id, and status (added in the Sprint 2 status migration), but no index on time_in — which ShiftService::getShiftLogs() uses for ORDER BY time_in DESC.
This is a small migration that adds the missing indexes. Low effort, high long-term payoff.
What to do
1. Create a new migration
php artisan make:migration add_performance_indexes_to_vehicle_locations_and_shift_logs
2. Edit the migration file (in backend/database/migrations/)
pluck('Key_name')->unique();

            if (! $indexes->contains('vehicle_locations_updated_at_index')) {
                $table->index('updated_at', 'vehicle_locations_updated_at_index');
            }
        });

        // Index for ShiftService::getShiftLogs() ORDER BY time_in DESC
        Schema::table('shift_logs', function (Blueprint $table) {
            $indexes = collect(DB::select("SHOW INDEX FROM shift_logs"))
                ->pluck('Key_name')->unique();

            if (! $indexes->contains('shift_logs_time_in_index')) {
                $table->index('time_in', 'shift_logs_time_in_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vehicle_locations', function (Blueprint $table) {
            $indexes = collect(DB::select("SHOW INDEX FROM vehicle_locations"))
                ->pluck('Key_name')->unique();

            if ($indexes->contains('vehicle_locations_updated_at_index')) {
                $table->dropIndex('vehicle_locations_updated_at_index');
            }
        });

        Schema::table('shift_logs', function (Blueprint $table) {
            $indexes = collect(DB::select("SHOW INDEX FROM shift_logs"))
                ->pluck('Key_name')->unique();

            if ($indexes->contains('shift_logs_time_in_index')) {
                $table->dropIndex('shift_logs_time_in_index');
            }
        });
    }
};
Note: The migration uses the same idempotent pattern (SHOW INDEX check before adding) as the existing Sprint 2 migrations, so it's safe to re-run.
3. Run the migration
php artisan migrate
4. Verify the indexes exist
php artisan tinker
>>> DB::select("SHOW INDEX FROM vehicle_locations");
>>> DB::select("SHOW INDEX FROM shift_logs");
Both should show a row with Key_name = the new index name.
5. (Optional) Verify the query plan uses the index
DB::select("EXPLAIN SELECT * FROM vehicle_locations ORDER BY updated_at DESC LIMIT 100");
The type column should show index (not ALL) and Extra should not contain Using filesort.
6. Update SchemaTest
In backend/tests/Feature/SchemaTest.php, add assertions that the indexes exist:
public function test_vehicle_locations_has_updated_at_index(): void
{
    $indexes = collect(DB::select("SHOW INDEX FROM vehicle_locations"))
        ->pluck('Key_name')->unique();

    $this->assertTrue($indexes->contains('vehicle_locations_updated_at_index'));
}

public function test_shift_logs_has_time_in_index(): void
{
    $indexes = collect(DB::select("SHOW INDEX FROM shift_logs"))
        ->pluck('Key_name')->unique();

    $this->assertTrue($indexes->contains('shift_logs_time_in_index'));
}
Acceptance Criteria
Migration runs successfully without errors
SHOW INDEX FROM vehicle_locations includes vehicle_locations_updated_at_index
SHOW INDEX FROM shift_logs includes shift_logs_time_in_index
EXPLAIN on the getAllActiveLocations query shows type=index (no filesort)
Migration is idempotent (safe to run twice)
New SchemaTest assertions pass
Existing test suite still passes
Files Touched
CREATE: backend/database/migrations/YYYY_MM_DD_000007_add_performance_indexes_to_vehicle_locations_and_shift_logs.php
MODIFY: backend/tests/Feature/SchemaTest.php (add 2 new index assertions)
Priority
MEDIUM — small effort, prevents a scaling cliff. Should be done before any load testing.
```

**Comments (3):**
- **[2026-06-18 11:44] Rod Dulalia:** 
- **[2026-06-18 09:08] Mark Arone Dela Cruz:** 
- **[2026-06-18 09:05] Mark Arone Dela Cruz:** 

### [HARDENING] S2 — Add Per-Route Rate Limiting to Conductor API Endpoints
- **ID:** `86d3cdm23`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-16 20:19
- **Updated:** 2026-06-17 09:14
- **Closed:** 2026-06-17 09:14
- **URL:** https://app.clickup.com/t/86d3cdm23

**Description:**
```
Context
The Sprint 2 conductor endpoints — especially POST /api/conductor/location (called every ~5 seconds by each active conductor) and POST /api/conductor/shifts/start — have no rate limiting. A misbehaving client, a bug in the frontend polling loop, or a malicious actor could spam these endpoints and either degrade backend performance or exhaust the Pusher message quota (Sandbox tier: 200k messages/day).
Laravel ships with a throttle middleware that handles this cleanly. The goal is to add sensible per-route limits without breaking the legitimate 5-second GPS update cadence.
What to do
1. Add throttle middleware to conductor routes in backend/routes/api.php
Inside the existing Route::prefix('conductor')->middleware(['auth:sanctum', 'role:CONDUCTOR']) group, add per-route throttling rather than a blanket limit (different endpoints have different legitimate cadences):
Route::prefix('conductor')->middleware(['auth:sanctum', 'role:CONDUCTOR'])->group(function () {
    // Read endpoints — generous limit
    Route::get('/profile', [ConductorController::class, 'profile'])->middleware('throttle:60,1');
    Route::get('/units', [ConductorController::class, 'units'])->middleware('throttle:60,1');
    Route::get('/drivers', [ConductorController::class, 'drivers'])->middleware('throttle:60,1');
    Route::get('/shift', [ConductorController::class, 'shiftStatus'])->middleware('throttle:60,1');
    Route::get('/shift-logs', [ConductorController::class, 'shiftLogs'])->middleware('throttle:60,1');

    // Mutations — strict limit (one shift per conductor at a time anyway)
    Route::post('/shifts/start', [ConductorController::class, 'startShift'])->middleware('throttle:10,1');
    Route::post('/remittances', [ConductorController::class, 'remittances'])->middleware('throttle:10,1');
    Route::post('/capacity-status', [ConductorController::class, 'updateCapacityStatus'])->middleware('throttle:30,1');

    // GPS updates — allows 5-second cadence with headroom for retries
    Route::post('/location', [ConductorController::class, 'updateLocation'])->middleware('throttle:30,1');

    // Still a 501 stub — keep minimal limit
    Route::get('/transactions', [ConductorController::class, 'transactions'])->middleware('throttle:30,1');
});
Limit rationale:
throttle:60,1 = 60 requests per minute (1 per second) — generous for read endpoints
throttle:30,1 = 30 requests per minute — supports the 5-second GPS cadence (12 req/min) with ~2.5x headroom for retries/reconnects
throttle:10,1 = 10 requests per minute — strict for shift mutations (a conductor can only have one active shift anyway; rapid retries indicate a frontend bug)
2. Add throttle to the public vehicle locations endpoint
Route::get('/vehicles/locations', [VehicleLocationController::class, 'locations'])
    ->middleware(['auth:sanctum', 'throttle:60,1']);
3. Configure the rate-limit response in bootstrap/app.php (Laravel 11+)
Ensure 429 responses use the project's ApiResponse envelope so the frontend can handle them gracefully:
// In bootstrap/app.php -> withExceptions()
$exceptions->throttle(function (Request $request, Limit $limit) {
    return $limit->response(function () {
        return response()->json([
            'success' => false,
            'data' => null,
            'message' => 'Too many requests. Please slow down.',
            'errors' => null,
            'meta' => null,
        ], 429);
    });
});
4. Add a feature test verifying the throttle kicks in
In a new backend/tests/Feature/ThrottleTest.php, add a test that hits POST /api/conductor/location 31 times rapidly and asserts that the 31st returns 429.
public function test_location_endpoint_is_rate_limited(): void
{
    $conductor = User::factory()->conductor()->create();
    $vehicle = Vehicle::factory()->create();
    $driver = Driver::factory()->create();
    ShiftLog::factory()->create([
        'conductor_id' => $conductor->id,
        'vehicle_id' => $vehicle->id,
        'driver_id' => $driver->id,
        'status' => ShiftStatus::ACTIVE->value,
    ]);

    // Send 30 requests (the limit) — all should be 200
    for ($i = 0; $i actingAs($conductor)
            ->postJson('/api/conductor/location', ['lat' => 14.5995, 'lng' => 120.9842])
            ->assertOk();
    }

    // 31st request — should be 429
    $this->actingAs($conductor)
        ->postJson('/api/conductor/location', ['lat' => 14.5995, 'lng' => 120.9842])
        ->assertStatus(429);
}
Note: Throttle uses the cache store configured in config/cache.php. In phpunit.xml the cache is set to array which is per-request — so throttle may not work as expected across requests in the same test method. Either (a) use Cache::flush() between groups of requests, or (b) configure a file-based cache for the test environment. Research and document the cleanest approach in the PR description.
Acceptance Criteria
Every conductor endpoint has a throttle middleware attached
POST /api/conductor/location returns 429 after 30 requests in 1 minute
429 responses use the ApiResponse JSON envelope (not Laravel's default HTML)
Normal conductor usage (5-second GPS cadence) never hits the limit
Test suite still passes (no throttle interference with other tests)
The throttle test passes reliably (no flakiness from cache timing)
Files Touched
MODIFY: backend/routes/api.php (add throttle middleware per route)
MODIFY: backend/bootstrap/app.php (429 response format)
CREATE: backend/tests/Feature/ThrottleTest.php
Priority
MEDIUM — not blocking feature work, but should be in place before any real load testing or production deployment.
```

### [HARDENING] S2 — Repo Hygiene — Remove Debug Artifacts & Add Frontend .env.example
- **ID:** `86d3cdk4n`
- **Status:** `complete` (closed)
- **Assignees:** Rod Dulalia
- **Created:** 2026-06-16 20:13
- **Updated:** 2026-06-18 13:12
- **Closed:** 2026-06-18 08:35
- **Due:** 2026-06-17 20:00
- **URL:** https://app.clickup.com/t/86d3cdk4n

**Description:**
```
Context
During the Sprint 2 review (PR #12 merge into dev), several debug artifacts and a missing frontend env template were flagged as repo hygiene issues. These are small but they matter for onboarding and for not leaking test credentials.
What to do
Delete frontend/body.json
This file contains plaintext test credentials and was committed by accident:
{"login":"conductor1@gmail.com","password":"password123"}
It serves no purpose in the repo. Delete it.
git rm frontend/body.json
Delete backend/test-pusher.php
This is a manual Pusher smoke-test script that was used during Sprint 2 setup. It hardcodes Pusher credentials from env() calls and should not ship in the repo. If the team wants a Pusher smoke test, it belongs in a scripts/ directory (gitignored) or as a phpunit test.
git rm backend/test-pusher.php
Create frontend/.env.example
The backend has .env.example but the frontend does not. New developers cloning the repo have to guess the required environment variable names. Create frontend/.env.example with the following content (placeholder values only — never commit real credentials):
# API
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Sprint 2 — Pusher real-time broadcasting
NEXT_PUBLIC_PUSHER_APP_KEY=your_app_key
NEXT_PUBLIC_PUSHER_APP_CLUSTER=ap1

# Auth token storage key (must match frontend/lib/api.ts interceptor)
# Optional — only document if your app reads from a custom localStorage key
Then verify frontend/.gitignore ignores .env.local but does NOT ignore .env.example (the example file must be committed).
Acceptance Criteria
frontend/body.json no longer exists in the repo
backend/test-pusher.php no longer exists in the repo
frontend/.env.example exists with the placeholder content above
git grep -i "password123" returns zero matches across the entire repo
git grep -i "2167016" (the sandbox Pusher app id) returns zero matches in committed files (it should only appear in .env which is gitignored)
Frontend still boots locally after copying .env.example to .env.local and filling in real values
Files Touched
DELETE: frontend/body.json
DELETE: backend/test-pusher.php
CREATE: frontend/.env.example
VERIFY: frontend/.gitignore (no change unless .env.example is incorrectly ignored)
Priority
HIGH — quick wins, should be done before any external collaborator clones the repo.
```

**Comments (2):**
- **[2026-06-18 08:34] Rod Dulalia:** 
- **[2026-06-18 06:08] Mark Arone Dela Cruz:** 

### [INFRA] S2 — Migrate Real-Time Broadcasting to Queue-Based ShouldBroadcast
- **ID:** `86d3cdmff`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-16 20:21
- **Updated:** 2026-06-18 13:12
- **Closed:** 2026-06-18 13:11
- **Due:** 2026-06-17 20:00
- **URL:** https://app.clickup.com/t/86d3cdmff

**Description:**
```
Context
Sprint 2 broadcasts VehicleLocationUpdated events synchronously — every GPS update from every conductor blocks the HTTP request until the Pusher API call completes. The current QUEUE_CONNECTION=sync in .env means the broadcast happens inline with the controller response.
This works for a handful of conductors in development, but in production with N conductors sending GPS every 5 seconds, the POST /api/conductor/location response time becomes directly coupled to Pusher's network latency — which is unpredictable and can spike during Pusher incidents. A single slow Pusher call would back up the PHP-FPM worker pool.
The standard Laravel solution is to mark broadcast events as ShouldBroadcast (queueable) and run a queue worker process. The event gets pushed to Redis/Database, the HTTP response returns immediately, and a worker dispatches it to Pusher asynchronously.
What to do
1. Update VehicleLocationUpdated event to use the queue
In backend/app/Events/VehicleLocationUpdated.php, add the ShouldBroadcast interface (instead of just ShouldBroadcastNow):
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
// Remove: use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class VehicleLocationUpdated implements ShouldBroadcast
{
    // Existing code stays the same — just swap the interface.
    // ShouldBroadcast triggers the queue; ShouldBroadcastNow runs inline.
}
2. Choose a queue driver
For capstone purposes, database driver is the simplest (no Redis dependency). For production, redis is preferred.
Option A — Database driver (recommended for capstone):
Run php artisan queue:table and php artisan migrate to create the jobs table
Set QUEUE_CONNECTION=database in .env
Option B — Redis driver (production):
Install Redis server
composer require predis/predis or use phpredis extension
Set QUEUE_CONNECTION=redis in .env
3. Configure .env.example with both options documented
# Queue — sync for testing, database for capstone dev, redis for production
QUEUE_CONNECTION=database
# Options: sync, database, redis, sqs, null
4. Update phpunit.xml
Keep QUEUE_CONNECTION=sync in the test environment so tests don't need a queue worker running:

5. Document how to run the queue worker
Add a section to the backend README.md (or a new DEPLOYMENT.md):
# Start the queue worker (in a separate terminal/process)
php artisan queue:work --queue=default --tries=3 --timeout=30

# Or use Supervisor for production (see Laravel docs):
# https://laravel.com/docs/queues#supervisor-configuration
6. Optionally add Horizon for queue monitoring (production only)
For production visibility into queue health, install Laravel Horizon:
composer require laravel/horizon
php artisan horizon:install
This is optional for capstone but recommended if you want a dashboard showing failed/retried jobs.
7. Verify end-to-end
Start the queue worker: php artisan queue:work
Login as conductor on the frontend, start a shift
Send a GPS update via POST /api/conductor/location
The HTTP response should return immediately (under 100ms)
The queue worker terminal should log the VehicleLocationUpdated job being processed
The Pusher Debug Console should show the event arriving
The commuter frontend should receive the real-time update
8. Add a test for the queue dispatch
In backend/tests/Feature/BroadcastTest.php, add a test that uses Queue::fake() to verify the event is pushed to the queue (rather than dispatched inline):
public function test_vehicle_location_updated_is_queued(): void
{
    Queue::fake();

    $conductor = User::factory()->conductor()->create();
    // ... set up active shift ...

    $this->actingAs($conductor)
        ->postJson('/api/conductor/location', ['lat' => 14.5995, 'lng' => 120.9842])
        ->assertOk();

    Queue::assertPushed(VehicleLocationUpdated::class);
}
Acceptance Criteria
VehicleLocationUpdated implements ShouldBroadcast (not ShouldBroadcastNow)
.env.example sets QUEUE_CONNECTION=database with alternatives documented
phpunit.xml keeps QUEUE_CONNECTION=sync so tests run without a worker
Running php artisan queue:work processes VehicleLocationUpdated jobs successfully
GPS updates return HTTP 200 in under 100ms with the worker running (decoupled from Pusher latency)
Commuter frontend still receives real-time updates end-to-end
New queue dispatch test passes
Documentation exists for how to start the worker in dev and production
Files Touched
MODIFY: backend/app/Events/VehicleLocationUpdated.php (ShouldBroadcast interface)
MODIFY: backend/.env.example (QUEUE_CONNECTION setting)
MODIFY: backend/phpunit.xml (verify QUEUE_CONNECTION=sync is set)
CREATE: migration for jobs table (via php artisan queue:table)
MODIFY: backend/tests/Feature/BroadcastTest.php (add queue dispatch test)
MODIFY or CREATE: backend/README.md or DEPLOYMENT.md (worker instructions)
Priority
MEDIUM — required before any production deployment. Optional for capstone demo if Pusher latency is acceptable during the demo.
```

**Comments (2):**
- **[2026-06-18 05:52] Mark Arone Dela Cruz:** 
- **[2026-06-16 20:45] Mark Arone Dela Cruz:** 

### [INFRA] S2 — Prefix All API Routes with /v1/ for API Versioning
- **ID:** `86d3cdmfn`
- **Status:** `complete` (closed)
- **Assignees:** Rod Dulalia
- **Created:** 2026-06-16 20:21
- **Updated:** 2026-06-18 13:12
- **Closed:** 2026-06-18 13:11
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3cdmfn

**Description:**
```
Context
All API routes currently live under /api/ with no version prefix:
POST /api/conductor/shifts/start
GET /api/vehicles/locations
POST /api/auth/login
etc.
This is fine while the API is internal-only and consumed exclusively by the project's own frontend. But the moment the backend needs to ship a breaking change — a renamed response field, a changed status code, a removed endpoint — there's no way to do it without either (a) breaking the frontend simultaneously, or (b) maintaining two parallel codebases.
The industry-standard solution is URL-based API versioning: prefix all routes with /api/v1/ today, so future breaking changes can ship under /api/v2/ while /api/v1/ continues to work for existing clients.
This is a small refactor today (one config change + URL updates in the frontend) but expensive to retrofit later. Best done early.
What to do
1. Update backend/routes/api.php
Wrap all route definitions in a versioned prefix. The cleanest approach in Laravel 11+ is to set the prefix in bootstrap/app.php so it applies to all routes loaded from routes/api.php:
->withRouting(
    web: __DIR__.'/../routes/web.php',
    api: __DIR__.'/../routes/api.php',   // existing
    apiPrefix: 'api/v1',                 // ADD THIS
    commands: __DIR__.'/../routes/console.php',
    health: '/up',
)
Alternatively, wrap the contents of routes/api.php in a Route::prefix('v1')->group(...) — but the apiPrefix approach is cleaner and applies uniformly.
2. Update the frontend API base URL
In frontend/lib/api.ts (or wherever NEXT_PUBLIC_API_URL is read), update the default:
// Before
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// After
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
If any other file references /api/ directly (e.g. echo.ts, websocket config, hardcoded fetch URLs), update those too. Grep to find them:
cd frontend
rg "/api/" --type=ts --type=tsx
3. Update frontend/.env.example (and .env.local if present)
# Before
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# After
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
4. Update backend test URLs
All test files currently call endpoints like /api/conductor/shifts/start. They need to be updated to /api/v1/conductor/shifts/start. This is mechanical — use find and replace:
cd backend
rg "\"/api/" tests/Feature/

find tests/Feature -name "*.php" -exec sed -i 's|"/api/|"/api/v1/|g' {} +
Files to update:
ShiftTest.php, LocationTest.php, BroadcastTest.php, Sprint2RoleAccessTest.php, SchemaTest.php, AuthTest.php, PlaceholderEndpointsTest.php, RoleMiddlewareTest.php.
5. Verify Sanctum / auth config
If SANCTUM_STATEFUL_DOMAINS or session config references /api, no change is usually needed. Sanctum is path-agnostic.
6. Verify Pusher / Echo config
Pusher channels are not HTTP routes, so they remain unchanged. Confirm:
frontend/lib/echo.ts
frontend/hooks/useVehicleLocations.ts
still work as-is (they should not reference /api/).
7. Verify backend route helpers
Route names remain unchanged; only URLs change. Still, sanity-check:
rg "route\(" backend/app/
8. Run full test suite
cd backend
php artisan test
php artisan route:list --path=api
Expected: all routes under /api/v1/....
9. Smoke test end-to-end
Start backend: php artisan serve
Start frontend: npm run dev
Login as conductor
Start shift
Send GPS update
Verify Pusher event appears
Verify commuter map updates
Acceptance Criteria
php artisan route:list --path=api shows all routes under /api/v1/...
No routes remain under /api/... without versioning
All backend tests pass after URL updates
Frontend login / shift start / GPS update still works end-to-end
frontend/.env.example uses /api/v1
No remaining /api/conductor or /api/auth references without v1
Files Touched
MODIFY: backend/bootstrap/app.php (add apiPrefix: 'api/v1')
MODIFY: frontend/lib/api.ts
MODIFY: frontend/.env.example and .env.local
MODIFY: all backend/tests/Feature/* test files
VERIFY: frontend/lib/echo.ts, frontend/hooks/useVehicleLocations.ts
Priority
MEDIUM — pure refactor, no immediate functional change, but critical for future API evolution and avoiding breaking changes later.
```

**Comments (1):**
- **[2026-06-18 10:11] Mark Arone Dela Cruz:** 

### [VALIDATION] HailHttpTest -- confirm suite green after shift_logs.route_name removal
- **ID:** `86d3dpbzf`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-20 12:52
- **Updated:** 2026-06-25 18:21
- **Closed:** 2026-06-25 18:21
- **URL:** https://app.clickup.com/t/86d3dpbzf

**Description:**
```
What to validate

Confirm the Tests\Feature\HailHttpTest suite runs green again. As of dev it has 12 failing tests (all in this one file) — re-check after the fix below lands.

Observed on dev

php artisan test
-> 12 failed, 118 passed
Tests\Feature\HailHttpTest  (all 12 cases)
QueryException: SQLSTATE[HY000]: General error: 1
table shift_logs has no column named route_name

Affected cases: post hail 500m/1500m, delete hail, get conductor hails, accept/reject hail, RBAC 403s (admin/conductor/commuter), hails:expire command (x2), schedule registration.

Root cause (already diagnosed)

Migration 2026_06_20_000001_drop_route_name_from_shift_logs_table.php dropped shift_logs.route_name (intentional — the route is identified by route_id, the column was never populated or read).
But tests/Feature/HailHttpTest.php line 135 still seeds it in setUp():
$this->shift = ShiftLog::forceCreate([
    ...
    'route_name'  => null,   //  QueryException
    ...
]);
Every test in the file shares this setUp(), so all 12 fail before their assertions run.

Suggested fix (one line)

Remove the 'route_name' => null, entry from the forceCreate(...) array in HailHttpTest::setUp() (line 135). No other change needed — nothing reads route_name.

Validation steps

cd backend
php artisan test --filter=HailHttpTest -> expect 12 passed.
php artisan test -> expect 0 failed (full suite green).

Acceptance / sign-off

HailHttpTest 12/12 green.
Full suite has no route_name QueryException.
Grep guard: grep -rn "route_name" backend/tests backend/database/factories returns no live writes to shift_logs.

Notes / scope

This is a test–schema drift, not a product bug — the hail endpoints themselves are fine; only the test fixture is stale.
Surfaced during S3-T12 (GeoHelper unit tests) full-suite run; S3-T12 itself is unaffected and green. Not fixed there to avoid scope creep into the hail test owner's work.
```

---

## S1 (21 tasks)

### S1-QA1 — Authentication Flow — Login, Logout & User Endpoint
- **ID:** `86d3c0z9f`
- **Status:** `complete` (closed)
- **Assignees:** Marinel Carbonell
- **Created:** 2026-06-15 20:58
- **Updated:** 2026-06-17 12:58
- **Closed:** 2026-06-17 12:58
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0z9f

**Description:**
```
Manually test the complete authentication flow for all three roles (admin, conductor, commuter) using the seeded accounts.

## Test Cases

### TC1.1 — Admin Login (Email)
- POST /api/auth/login with { login: 'admin@gmail.com', password: 'password123' }
- Expected: 200 OK
- Verify response has: success=true, data.token (non-empty), data.role='ADMIN', data.email='admin@gmail.com'
- Copy the Bearer token for next tests

### TC1.2 — Commuter Login (Email)
- POST /api/auth/login with { login: 'commuter1@gmail.com', password: 'password123' }
- Expected: 200 OK
- Verify response has: success=true, data.role='COMMUTER'

### TC1.3 — Conductor Login (Username)
- POST /api/auth/login with { login: 'conductor001', password: 'password123' }
- Expected: 200 OK
- Verify response has: success=true, data.role='CONDUCTOR'

### TC1.4 — Wrong Password
- POST /api/auth/login with { login: 'admin@gmail.com', password: 'wrongpassword' }
- Expected: 401 Unauthorized
- Verify: success=false, message='Invalid credentials'

### TC1.5 — Non-existent Email
- POST /api/auth/login with { login: 'nobody@gmail.com', password: 'password123' }
- Expected: 401 Unauthorized
- Verify: success=false

### TC1.6 — Missing Fields
- POST /api/auth/login with empty body
- Expected: 422 Validation Error
- Verify: success=false, message='Validation failed', errors object contains login and password

### TC1.7 — Logout with Valid Token
- POST /api/auth/logout with Bearer token from TC1.1
- Expected: 200 OK
- Verify: success=true, message='Logged out successfully'

### TC1.8 — Logout without Token
- POST /api/auth/logout with no Authorization header
- Expected: 401 Unauthorized

### TC1.9 — Get Authenticated User (Admin)
- GET /api/user with admin Bearer token
- Expected: 200 OK
- Verify: data.user exists with id, email, role='ADMIN'
- Verify: data.profile exists with first_name, last_name

### TC1.10 — Get Authenticated User (Commuter with Profile)
- GET /api/user with commuter Bearer token
- Expected: 200 OK
- Verify: data.user.role='COMMUTER'
- Verify: data.profile has commuter fields: first_name, surname, commuter_type, account_status, etc.

### TC1.11 — Get User without Token
- GET /api/user with no Authorization header
- Expected: 401 Unauthorized

### TC1.12 — Token Revoked after Logout
- After TC1.7, reuse the same admin token to GET /api/user
- Expected: 401 Unauthorized (token should be revoked)

## Prerequisites
- Backend server running (php artisan serve)
- Database migrated and seeded (php artisan migrate --seed)
- All 6 seeded accounts available from DatabaseSeeder

Acceptance Criteria
 All 12 test cases pass with expected results
 Login works for email-based (admin, commuter) and username-based (conductor)
 Wrong credentials return 401 with correct message
 Missing fields return 422 with validation errors
 Logout revokes token (subsequent requests fail with 401)
 GET /api/user returns user + role-specific profile data
 All responses follow { success, data, message, errors, meta } format
Post-Task Requirement
If there are any issues found during testing, drop a comment on this ticket with a comprehensive explanation of what went wrong, what was expected, and what actually happened. Include the exact request, response, and status code for reproduction. If all tests pass, update the ticket status to complete.
```

### S1-QA2 — Role-Based Access Control — Middleware Enforcement
- **ID:** `86d3c0z9v`
- **Status:** `complete` (closed)
- **Assignees:** Marinel Carbonell
- **Created:** 2026-06-15 20:58
- **Updated:** 2026-06-17 12:58
- **Closed:** 2026-06-17 12:58
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0z9v

**Description:**
```
Manually test that role middleware correctly blocks unauthorized access across all role-specific endpoints.

## Test Cases

### TC2.1 — Admin Can Access Admin Routes
- GET /api/admin/dashboard with admin token
- Expected: 501 Not Implemented (admin has access, endpoint is placeholder)
- Verify: NOT 403 (admin is allowed)

### TC2.2 — Admin Cannot Access Commuter Routes
- GET /api/commuter/profile with admin token
- Expected: 403 Forbidden
- Verify: success=false, message='Forbidden'

### TC2.3 — Commuter Can Access Commuter Routes
- GET /api/commuter/profile with commuter token
- Expected: 501 Not Implemented (commuter has access, endpoint is placeholder)

### TC2.4 — Commuter Cannot Access Admin Routes
- GET /api/admin/dashboard with commuter token
- Expected: 403 Forbidden

### TC2.5 — Conductor Can Access Conductor Routes
- GET /api/conductor/shift with conductor token
- Expected: 501 Not Implemented (conductor has access, endpoint is placeholder)

### TC2.6 — Conductor Cannot Access Admin Routes
- GET /api/admin/dashboard with conductor token
- Expected: 403 Forbidden

### TC2.7 — Unauthenticated Access to Admin Routes
- GET /api/admin/dashboard with no token
- Expected: 401 Unauthorized

### TC2.8 — Unauthenticated Access to Commuter Routes
- GET /api/commuter/profile with no token
- Expected: 401 Unauthorized

### TC2.9 — Unauthenticated Access to Conductor Routes
- GET /api/conductor/shift with no token
- Expected: 401 Unauthorized

### TC2.10 — Cross-Role Access Matrix (Full)
- Test every role against every role-protected route group:
  - Admin token → admin routes (501), commuter routes (403), conductor routes (403)
  - Commuter token → commuter routes (501), admin routes (403), conductor routes (403)
  - Conductor token → conductor routes (501), admin routes (403), commuter routes (403)

### TC2.11 — Payment Routes (Auth Required, No Role Restriction)
- POST /api/payments/initiate with commuter token → 501
- POST /api/payments/initiate with admin token → 501
- POST /api/payments/initiate with conductor token → 501
- POST /api/payments/initiate with no token → 401

### TC2.12 — QR Routes (Auth Required, No Role Restriction)
- POST /api/qr/generate with commuter token → 501
- POST /api/qr/generate with no token → 401

## Prerequisites
- Backend server running
- Valid tokens for all 3 roles (from S1-QA1)

Acceptance Criteria
 All 12 test cases pass with expected results
 Admin can only access admin routes (501), blocked from commuter/conductor (403)
 Commuter can only access commuter routes (501), blocked from admin/conductor (403)
 Conductor can only access conductor routes (501), blocked from admin/commuter (403)
 Unauthenticated requests to any protected route return 401
 Payment and QR routes require auth but no specific role (any authenticated user can access)
 All 403 responses return message='Forbidden'
 All 401 responses return correct unauthenticated message
Post-Task Requirement
If there are any issues found during testing, drop a comment on this ticket with a comprehensive explanation of what went wrong, what was expected, and what actually happened. Include the exact request, response, and status code for reproduction. If all tests pass, update the ticket status to complete.
```

### S1-QA3 — API Placeholder Endpoints — All 28 Routes Return 501
- **ID:** `86d3c0za4`
- **Status:** `complete` (closed)
- **Assignees:** Marinel Carbonell
- **Created:** 2026-06-15 20:58
- **Updated:** 2026-06-17 12:58
- **Closed:** 2026-06-17 12:58
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0za4

**Description:**
```
Manually verify that all 28 non-auth API endpoints are registered and return the correct 501 placeholder response with exact JSON structure.

## Test Cases

### Commuter Endpoints (5)
- GET /api/commuter/profile (commuter token) → 501
- GET /api/commuter/trips (commuter token) → 501
- GET /api/commuter/wallet (commuter token) → 501
- POST /api/commuter/wallet/topup (commuter token) → 501
- GET /api/commuter/rewards (commuter token) → 501

### Conductor Endpoints (6)
- POST /api/conductor/location (conductor token) → 501
- GET /api/conductor/shift (conductor token) → 501
- POST /api/conductor/shift/start (conductor token) → 501
- POST /api/conductor/shift/end (conductor token) → 501
- GET /api/conductor/remittances (conductor token) → 501
- GET /api/conductor/transactions (conductor token) → 501

### Admin Endpoints (10)
- GET /api/admin/dashboard (admin token) → 501
- GET /api/admin/users (admin token) → 501
- GET /api/admin/drivers (admin token) → 501
- GET /api/admin/vehicles (admin token) → 501
- GET /api/admin/routes (admin token) → 501
- GET /api/admin/transactions (admin token) → 501
- GET /api/admin/remittances (admin token) → 501
- GET /api/admin/announcements (admin token) → 501
- GET /api/admin/lost-items (admin token) → 501
- GET /api/admin/shift-logs (admin token) → 501

### Payment Endpoints (4)
- POST /api/payments/initiate (commuter token) → 501
- POST /api/payments/verify (commuter token) → 501
- GET /api/payments/history (commuter token) → 501
- POST /api/payments/topup (commuter token) → 501

### QR Endpoints (3)
- POST /api/qr/generate (commuter token) → 501
- POST /api/qr/validate (commuter token) → 501
- POST /api/qr/scan (commuter token) → 501

### Response Format Verification (for EVERY endpoint above)
Each 501 response MUST return exactly:
```json
{
  "success": false,
  "data": null,
  "message": "Not Implemented",
  "errors": null,
  "meta": null
}
```

### TC3.1 — No 404 Responses
- Verify NONE of the 28 endpoints return 404
- All must return 501 (route is registered, just not implemented)

### TC3.2 — Total Endpoint Count
- Confirm exactly 28 non-auth endpoints are registered
- 5 + 6 + 10 + 4 + 3 = 28

### TC3.3 — Auth Endpoints Are NOT 501
- POST /api/auth/login → should return 200 or 401/422 (not 501)
- POST /api/auth/logout → should return 200 or 401 (not 501)
- GET /api/user → should return 200 or 401 (not 501)

## Prerequisites
- Backend server running
- Valid tokens for all 3 roles

Acceptance Criteria
 All 28 endpoints return HTTP 501 (Not Implemented)
 All 28 responses have exact JSON: { success: false, data: null, message: 'Not Implemented', errors: null, meta: null }
 No endpoint returns 404 (all routes are registered)
 Auth endpoints (login, logout, user) do NOT return 501 — they are fully implemented
 Total count is exactly 28 non-auth endpoints
Post-Task Requirement
If there are any issues found during testing, drop a comment on this ticket with a comprehensive explanation of what went wrong, what was expected, and what actually happened. Include the exact request, response, and status code for reproduction. If all tests pass, update the ticket status to complete.
```

### S1-QA4 — Database Schema — Table Existence & Wallet Absence Verification
- **ID:** `86d3c0zam`
- **Status:** `complete` (closed)
- **Assignees:** Marinel Carbonell
- **Created:** 2026-06-15 20:59
- **Updated:** 2026-06-17 12:58
- **Closed:** 2026-06-17 12:58
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0zam

**Description:**
```
Manually verify the database schema matches Sprint 1 specifications: all 17 required tables exist, wallet-related tables/columns are absent, and key column constraints are correct.

## Test Cases

### TC4.1 — Required Tables (17 total)
Connect to the database and verify these tables exist:
1. users
2. personal_access_tokens
3. commuter_profiles
4. conductor_profiles
5. admin_profiles
6. drivers
7. routes
8. fare_points
9. vehicles
10. shift_logs
11. transactions
12. gcash_payment_intents
13. remittances
14. announcements
15. lost_items
16. claims
17. vouchers

Run: php artisan tinker
then: Schema::getTableListing()
Confirm all 17 tables are present.

### TC4.2 — Wallet Tables Must NOT Exist
Verify these tables do NOT exist:
- wallet_balance
- wallet_transactions
- wallet_ledger

### TC4.3 — Users Table Column Checks
Verify users table has these columns:
- id (UUID/string type, primary key)
- email
- password
- role
- created_at
- updated_at
- deleted_at

Verify users table does NOT have:
- name
- phone
- email_verified_at
- remember_token
- is_active

### TC4.4 — UUID Primary Key on Users
- Verify users.id is string/varchar type (UUID), not auto-increment integer
- Run: Schema::getColumnType('users', 'id') → should return 'varchar' or 'string'

### TC4.5 — String Primary Keys
- shift_logs.shift_id is string type (varchar 20)
- transactions.transaction_id is string type (varchar 30)

### TC4.6 — No Wallet Columns in Any Table
- Check every table for columns named: wallet_balance, wallet_amount, wallet_funds
- None should exist

### TC4.7 — Foreign Key Integrity
- All FK relationships resolve without type mismatch
- commuter_profiles.id → users.id (both UUID/string)
- conductor_profiles.id → users.id (both UUID/string)
- admin_profiles.id → users.id (both UUID/string)
- shift_logs.conductor_id → users.id
- shift_logs.vehicle_id → vehicles.id
- transactions.shift_id → shift_logs.shift_id (both varchar)

## Prerequisites
- Database migrated (php artisan migrate)
- Access to MySQL/SQLite database

Acceptance Criteria
 All 17 required tables exist in the database
 No wallet-related tables exist (wallet_balance, wallet_transactions, wallet_ledger)
 Users table has UUID primary key (string type, not integer)
 Users table has only spec-defined columns (no name, phone, email_verified_at, remember_token, is_active)
 shift_logs.shift_id and transactions.transaction_id are string primary keys
 No wallet columns exist in any table
 All FK relationships resolve without type mismatch
Post-Task Requirement
If there are any issues found during testing, drop a comment on this ticket with a comprehensive explanation of what went wrong, what was expected, and what actually happened. Include the exact request, response, and status code for reproduction. If all tests pass, update the ticket status to complete.
```

### S1-QA5 — Seeded Data Verification — All 6 Accounts & Profile Integrity
- **ID:** `86d3c0zaz`
- **Status:** `complete` (closed)
- **Assignees:** Marinel Carbonell
- **Created:** 2026-06-15 20:59
- **Updated:** 2026-06-17 12:58
- **Closed:** 2026-06-17 12:58
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0zaz

**Description:**
```
Manually verify that the database seeder correctly created all 6 user accounts with proper profiles, hashed passwords, and role assignments.

## Test Cases

### TC5.1 — Admin Account
- Login with admin@gmail.com / password123 → should succeed
- GET /api/user → verify role='ADMIN'
- Verify admin profile has: first_name='System', last_name='Admin'

### TC5.2 — Commuter Accounts (2)
- Login with commuter1@gmail.com / password123 → should succeed
- GET /api/user → verify role='COMMUTER'
- Verify commuter profile has: first_name, surname, commuter_type, account_status='ACTIVE', username

- Login with commuter2@gmail.com / password123 → should succeed
- Same verification as above

### TC5.3 — Conductor Accounts (2)
- Login with conductor001 / password123 → should succeed
- GET /api/user → verify role='CONDUCTOR'
- Verify conductor profile has: first_name, generated_username, generated_password (hashed)

- Login with conductor002 / password123 → should succeed
- Same verification as above

### TC5.4 — Passwords Are Hashed
- Query the users table directly
- Verify no password is stored as plain text 'password123'
- All passwords should be bcrypt hashes starting with $2y$

### TC5.5 — Profile-User Linkage
- Each user should have exactly one profile record
- commuter_profiles.id = users.id (1:1 relationship)
- conductor_profiles.id = users.id (1:1 relationship)
- admin_profiles.id = users.id (1:1 relationship)

### TC5.6 — UserRole Enum Consistency
- All users.role values are valid UserRole enum values: ADMIN, COMMUTER, CONDUCTOR
- No invalid or empty role values

### TC5.7 — UUID Format
- All user IDs should be UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)
- Not auto-increment integers

### TC5.8 — Conductor Username Login
- conductor001 should login via username (not email)
- conductor001 is NOT an email address — it's the generated_username from conductor_profiles

## Prerequisites
- Database migrated and seeded (php artisan migrate --seed)

Acceptance Criteria
 All 6 seeded accounts can login successfully (1 admin + 2 commuters + 2 conductors)
 Admin account has correct profile with first_name and last_name
 Commuter accounts have complete profiles with all required fields
 Conductor accounts have profiles with generated_username for login
 All passwords are hashed (no plain text in database)
 Each user has exactly one linked profile (1:1 relationship)
 All role values are valid UserRole enum members (ADMIN, COMMUTER, CONDUCTOR)
 All user IDs are UUID format
 Conductor login works via username (not email)
Post-Task Requirement
If there are any issues found during testing, drop a comment on this ticket with a comprehensive explanation of what went wrong, what was expected, and what actually happened. Include the exact request, response, and status code for reproduction. If all tests pass, update the ticket status to complete.
```

### S1-QA6 — API Response Format — Consistent JSON Structure Across All Endpoints
- **ID:** `86d3c0zd4`
- **Status:** `complete` (closed)
- **Assignees:** Marinel Carbonell
- **Created:** 2026-06-15 20:59
- **Updated:** 2026-06-17 12:58
- **Closed:** 2026-06-17 12:58
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0zd4

**Description:**
```
Manually verify that every API response (success and error) follows the standardized { success, data, message, errors, meta } format consistently.

## Test Cases

### TC6.1 — Success Response Structure
- POST /api/auth/login with valid credentials → 200
- Verify response contains ALL 5 fields: success, data, message, errors, meta
- success is boolean true
- data is an object (not null on success)
- message is a string
- errors is null
- meta is null

### TC6.2 — Error Response Structure (401)
- POST /api/auth/login with wrong password → 401
- Verify: success=false, data=null, message='Invalid credentials', errors=null, meta=null

### TC6.3 — Error Response Structure (403)
- GET /api/admin/dashboard with commuter token → 403
- Verify: success=false, data=null, message='Forbidden', errors=null, meta=null

### TC6.4 — Error Response Structure (422)
- POST /api/auth/login with empty body → 422
- Verify: success=false, data=null, message='Validation failed', errors is an object (not null), meta=null
- errors should contain field-specific validation messages

### TC6.5 — Error Response Structure (501)
- GET /api/admin/dashboard with admin token → 501
- Verify: success=false, data=null, message='Not Implemented', errors=null, meta=null

### TC6.6 — No Extra Fields in Response
- Verify no response includes fields beyond: success, data, message, errors, meta
- No nested data structures that deviate from the spec

### TC6.7 — HTTP Status Code Matches Response
- 200 → success=true
- 401 → success=false, authentication error
- 403 → success=false, authorization error
- 422 → success=false, validation error
- 501 → success=false, not implemented

### TC6.8 — No HTML Responses
- Hit any undefined API route (e.g., GET /api/nonexistent)
- Verify response is JSON, not HTML error page

### TC6.9 — Content-Type Header
- All API responses should have Content-Type: application/json
- No text/html responses from any /api/* route

## Prerequisites
- Backend server running
- Valid tokens for all 3 roles

Acceptance Criteria
 All success responses contain exactly: { success: true, data, message, errors: null, meta: null }
 All 401 error responses contain: { success: false, data: null, message, errors: null, meta: null }
 All 403 error responses contain: { success: false, data: null, message: 'Forbidden', errors: null, meta: null }
 All 422 error responses contain: { success: false, data: null, message: 'Validation failed', errors: {...}, meta: null }
 All 501 placeholder responses contain: { success: false, data: null, message: 'Not Implemented', errors: null, meta: null }
 No response includes fields beyond the 5 standard fields
 HTTP status codes always match the response success/error state
 No HTML responses from any /api/* route
 All responses have Content-Type: application/json
Post-Task Requirement
If there are any issues found during testing, drop a comment on this ticket with a comprehensive explanation of what went wrong, what was expected, and what actually happened. Include the exact request, response, and status code for reproduction. If all tests pass, update the ticket status to complete.
```

### S1-QA7 — Automated Test Suite — php artisan test Verification
- **ID:** `86d3c0zdq`
- **Status:** `complete` (closed)
- **Assignees:** Marinel Carbonell
- **Created:** 2026-06-15 20:59
- **Updated:** 2026-06-17 12:58
- **Closed:** 2026-06-17 12:58
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0zdq

**Description:**
```
Run the full automated test suite and verify all 75 tests pass with 182 assertions. Document any failures or warnings.

## Test Cases

### TC7.1 — Run Full Test Suite
- Execute: php artisan test
- Expected: 75 passed, 0 failed
- Expected: 182 assertions
- Expected duration: under 5 seconds

### TC7.2 — AuthTest (11 tests)
- Verify all AuthTest cases pass:
  - Login with valid admin credentials → 200
  - Login with wrong password → 401
  - Login with non-existent email → 401
  - Login with missing fields → 422
  - Login with conductor username → 200
  - Logout with valid token → 200
  - Logout without token → 401
  - Get user with valid token → 200
  - Get user without token → 401
  - Get user commuter profile data → 200
  - (1 more from seed helper)

### TC7.3 — RoleMiddlewareTest (9 tests)
- Verify all RoleMiddlewareTest cases pass:
  - Admin can access admin dashboard (501)
  - Admin cannot access commuter profile (403)
  - Commuter can access own profile (501)
  - Commuter cannot access admin dashboard (403)
  - Conductor can access shift (501)
  - Conductor cannot access admin dashboard (403)
  - Unauthenticated to admin route (401)
  - Unauthenticated to commuter route (401)
  - Unauthenticated to conductor route (401)

### TC7.4 — PlaceholderEndpointsTest (29 tests)
- Verify all 28 endpoint tests pass (each returns 501 with exact JSON)
- Verify total count test passes (5 + 6 + 10 + 4 + 3 = 28)

### TC7.5 — SchemaTest (23 tests)
- Verify all schema tests pass:
  - 17 table existence tests
  - 3 wallet table absence tests
  - UUID primary key test
  - Required columns test
  - Excluded columns test
  - String primary key tests (shift_logs, transactions)
  - No wallet columns test
  - Required table count test

### TC7.6 — Test Environment
- Verify tests use SQLite in-memory database (not MySQL)
- Verify RefreshDatabase trait works correctly
- Verify no test leaves residual data in the main database

### TC7.7 — No Skipped or Incomplete Tests
- Verify no tests are marked as skipped, incomplete, or risky
- All tests must actually execute and assert

## Prerequisites
- PHP 8.2+ installed
- Composer dependencies installed (composer install)
- phpunit.xml configured for SQLite in-memory testing

Acceptance Criteria
 php artisan test reports 75 passed, 0 failed
 Total assertions = 182
 All 4 test files pass without errors
 AuthTest: 11 tests pass
 RoleMiddlewareTest: 9 tests pass
 PlaceholderEndpointsTest: 29 tests pass
 SchemaTest: 23 tests pass
 (3 additional default Laravel tests)
 Test execution completes under 5 seconds
 No skipped, incomplete, or risky tests
 Tests use SQLite in-memory (not production database)
Post-Task Requirement
If there are any issues found during testing, drop a comment on this ticket with a comprehensive explanation of what went wrong, what was expected, and what actually happened. Include the exact request, response, and status code for reproduction. If all tests pass, update the ticket status to complete.
```

### S1-T1 — Laravel 11 Project Initialization & Environment Configuration
- **ID:** `86d3brqq8`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 05:56
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3brqq8

**Description:**
```
Objective
Initialize the Laravel backend project and establish the foundational environment configuration required for all subsequent development work.
Scope
Create a new Laravel 11 application using PHP 8.2+ and configure the project for local development, database connectivity, and backend architecture standards.
Requirements
Project Setup
 Create a new Laravel 11 project using Composer. 
 Configure composer.json with: 
 Name: transeguro/api
 Type: project
 Keywords: 
 laravel 
 transit 
 api 
Environment Configuration
Configure .env with the following baseline settings:
APP_NAME
APP_ENV
APP_URL
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=chatco
 Database credentials 
 Sanctum stateful domains 
Generate the application encryption key using:

php artisan key:generate

Database Configuration
Update config/database.php to use:

'charset' => 'utf8mb4',
'collation' => 'utf8mb4_unicode_ci',

to ensure full Unicode support.
Database Validation
Verify successful database connectivity by running:

php artisan db:show

Directory Structure
Establish the following application structure:
app/
 ├── Http/
 │   ├── Controllers/
 │   │   ├── Auth/
 │   │   ├── Commuter/
 │   │   ├── Conductor/
 │   │   ├── Admin/
 │   │   └── Payment/
 │   └── Middleware/
 └── Services/

Deliverables
 Laravel 11 project successfully initialized 
 Environment configuration completed 
 Database connection verified 
 Folder structure established 
Acceptance Criteria
 Application boots successfully. 
 Database connection test passes. 
 Application key exists. 
 Required controller and service directories are present. 
 UTF8MB4 configuration is enabled.
```

### S1-T10 — API Response Trait & Consistent JSON Structure
- **ID:** `86d3bt79c`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:25
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3bt79c

**Description:**
```
Create a unified API response system that enforces a single, consistent JSON structure across all endpoints. This eliminates frontend ambiguity and standardizes success, error, and stub responses.
Implementation Requirements
1. ApiResponse Trait
Create app/Http/ApiResponse.php
Must include:
successResponse($data, $message, $code = 200)
Returns:

{
  "success": true,
  "data": "...",
  "message": "...",
  "errors": null,
  "meta": null
}

errorResponse($message, $code, $errors = null)
Returns:

{
  "success": false,
  "data": null,
  "message": "...",
  "errors": "...",
  "meta": null
}

notImplementedResponse()
Returns HTTP 501:

{
  "success": false,
  "data": null,
  "message": "Not Implemented",
  "errors": null,
  "meta": null
}

Global Response Rules
Every API response MUST follow:
 success (boolean) 
 data (nullable) 
 message (string) 
 errors (nullable) 
 meta (always null for Sprint 1) 
No field is ever omitted.
Standard Error Mapping
401 Unauthorized

{
  "success": false,
  "data": null,
  "message": "Invalid credentials",
  "errors": null,
  "meta": null
}

422 Validation Error

{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": {
    "field": ["error message"]
  },
  "meta": null
}

501 Not Implemented
Used for all placeholder endpoints.
Acceptance Criteria
 All responses use ApiResponse trait 
 No controller returns raw JSON manually 
 All responses include full 5-field structure 
 No missing/null omitted keys 
 401, 422, 501 follow strict format 
 Frontend can rely on single response parser 
 Trait is reusable across all controllers 
 No business logic inside response layer 
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S1-T11 — Authentication System — AuthService & AuthController
- **ID:** `86d3btavk`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:33
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3btavk

**Description:**
```
Build a high-performance authentication system using Laravel Sanctum with optimized querying, eager loading, and centralized identity resolution.
This is the ONLY business-logic controller in Week 1, and it must be optimized for:
 minimal database queries (1-query login pattern)
 clean separation of concerns
 reusable identity resolution logic
 role-aware authentication (ADMIN / CONDUCTOR / COMMUTER)

AuthService (app/Services/AuthService.php)
Core Principle: Single-query login with eager-loaded profiles and zero redundant database calls.

1. login(string $login, string $password): array
Input:
 $login = email OR conductor generated_username
 $password

Step 1: Single Optimized Lookup (1 Query Only)

$user = User::with([
    'adminProfile',
    'conductorProfile',
    'commuterProfile'
])
->where('email', $login)
->orWhereHas('conductorProfile', function ($q) use ($login) {
    $q->where('generated_username', $login);
})
->first();

Step 2: Validate User
 If user not found -> throw ValidationException
Step 3: Password Check
 Hash::check($password, $user->password)
 If invalid -> throw ValidationException
Step 4: Token Generation
 $token = $user->createToken('auth-token')->plainTextToken;
Step 5: Return Payload
 return ['user' => $user, 'token' => $token];

2. logout(User $user): void
 Revoke ONLY current session: $user->currentAccessToken()->delete();

3. getAuthenticatedUser(User $user): User
 Return already authenticated Sanctum user
 No additional DB query
 Profiles already eager loaded during login flow

AuthController (app/Http/Controllers/Auth/AuthController.php)
Principle: Controller = thin layer only. No business logic. Only validation + response formatting.

Helper Method (Add to User Model):

public function getDisplayName(): string
{
    return match ($this->role) {
        UserRole::ADMIN =>
            $this->adminProfile->first_name . ' ' . $this->adminProfile->last_name,
        UserRole::CONDUCTOR =>
            $this->conductorProfile->first_name . ' ' . $this->conductorProfile->last_name,
        UserRole::COMMUTER =>
            $this->commuterProfile->first_name . ' ' . $this->commuterProfile->surname,
    };
}

1. login(Request $request)
Validation:
 login: required|string (accepts email OR conductor generated_username)
 password: required|string|min:6

Flow: call authService->login($request->login, $request->password)

Login Examples (using seeder accounts):
 Admin login: POST /api/auth/login { "login": "admin@gmail.com", "password": "password123" }
 Conductor login: POST /api/auth/login { "login": "conductor001", "password": "password123" }
 Commuter login: POST /api/auth/login { "login": "commuter1@gmail.com", "password": "password123" }

Success Response:
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "admin@gmail.com",
    "role": "ADMIN",
    "name": "System Admin",
    "token": "1|abc123..."
  },
  "message": "Login successful",
  "errors": null,
  "meta": null
}

2. logout(Request $request)
 Call authService->logout($request->user())
 Response: { "success": true, "data": null, "message": "Logged out successfully", "errors": null, "meta": null }

3. user(Request $request)
 No DB query needed (user already authenticated via Sanctum)
 Load relationships once: $request->user()->load(['adminProfile', 'conductorProfile', 'commuterProfile']);
 Admin returns: first_name, middle_name, last_name
 Conductor returns: first_name, middle_name, last_name, username
 Commuter returns: first_name, surname, username, commuter_type, account_status

API Routes (routes/api.php)
Public:
 POST /api/auth/login
Protected (auth:sanctum):
 POST /api/auth/logout
 GET /api/user

Error Handling
422 Validation Error: invalid input format (missing login, password too short)
 Response: { "success": false, "data": null, "message": "Validation failed", "errors": { "login": ["The login field is required."] }, "meta": null }
401 Invalid Credentials: wrong password / user not found
 Response: { "success": false, "data": null, "message": "Invalid credentials", "errors": null, "meta": null }

Acceptance Criteria
 Login uses SINGLE optimized query (email OR generated_username)
 Profiles are eager-loaded in login
 No N+1 queries in auth flow
 Sanctum token is generated correctly
 Conductor login supports generated_username
 getDisplayName() used for name resolution
 Controller contains ZERO business logic
 Logout revokes only current token
 GET /api/user uses authenticated user only
 All responses follow ApiResponse 5-field structure: { success, data, message, errors, meta }
 Supports ADMIN / CONDUCTOR / COMMUTER roles

Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S1-T12 — API Routes & Controllers — All 28 Endpoints
- **ID:** `86d3btbx6`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:35
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3btbx6

**Description:**
```
Define all non-auth API route groups and create placeholder controllers that return HTTP 501. Also create the ApiResponse trait that enforces consistent JSON across every endpoint.

ApiResponse Trait (app/Traits/ApiResponse.php)
Create a reusable PHP trait with three methods:

1. successResponse(mixed $data, string $message, int $code = 200): JsonResponse
 Returns: { "success": true, "data": $data, "message": $message, "errors": null, "meta": null } with HTTP $code

2. errorResponse(string $message, int $code, mixed $errors = null): JsonResponse
 Returns: { "success": false, "data": null, "message": $message, "errors": $errors, "meta": null } with HTTP $code

3. notImplementedResponse(): JsonResponse
 Returns: { "success": false, "data": null, "message": "Not Implemented", "errors": null, "meta": null } with HTTP 501

ALL endpoints in the entire system MUST return exactly these 5 fields: success, data, message, errors, meta. No exceptions.

Route Groups (routes/api.php)
All routes below use the ApiResponse trait. Every method returns $this->notImplementedResponse().

1. Commuter Routes — prefix: commuter, middleware: ['auth:sanctum', 'role:COMMUTER']
 GET /profile -> CommuterController@profile
 GET /trips -> CommuterController@trips
 GET /wallet -> CommuterController@wallet
 POST /wallet/topup -> CommuterController@walletTopup
 GET /rewards -> CommuterController@rewards

2. Conductor Routes — prefix: conductor, middleware: ['auth:sanctum', 'role:CONDUCTOR']
 POST /location -> ConductorController@updateLocation
 GET /shift -> ConductorController@shiftStatus
 POST /shift/start -> ConductorController@startShift
 POST /shift/end -> ConductorController@endShift
 GET /remittances -> ConductorController@remittances
 GET /transactions -> ConductorController@transacDefine all non-auth API route groups and create placeholder controllers that return HTTP 501. Also create the ApiResponse trait that enforces consistent JSON across every endpoint.

ApiResponse Trait (app/Traits/ApiResponse.php)
Create a reusable PHP trait with three methods:

1. successResponse(mixed $data, string $message, int $code = 200): JsonResponse
 Returns: { "success": true, "data": $data, "message": $message, "errors": null, "meta": null } with HTTP $code

2. errorResponse(string $message, int $code, mixed $errors = null): JsonResponse
 Returns: { "success": false, "data": null, "message": $message, "errors": $errors, "meta": null } with HTTP $code

3. notImplementedResponse(): JsonResponse
 Returns: { "success": false, "data": null, "message": "Not Implemented", "errors": null, "meta": null } with HTTP 501

ALL endpoints in the entire system MUST return exactly these 5 fields: success, data, message, errors, meta. No exceptions.

Route Groups (routes/api.php)
All routes below use the ApiResponse trait. Every method returns $this->notImplementedResponse().

1. Commuter Routes — prefix: commuter, middleware: ['auth:sanctum', 'role:COMMUTER']
 GET /profile -> CommuterController@profile
 GET /trips -> CommuterController@trips
 GET /wallet -> CommuterController@wallet
 POST /wallet/topup -> CommuterController@walletTopup
 GET /rewards -> CommuterController@rewards

2. Conductor Routes — prefix: conductor, middleware: ['auth:sanctum', 'role:CONDUCTOR']
 POST /location -> ConductorController@updateLocation
 GET /shift -> ConductorController@shiftStatus
 POST /shift/start -> ConductorController@startShift
 POST /shift/end -> ConductorController@endShift
 GET /remittances -> ConductorController@remittances
 GET /transactions -> ConductorController@transactionss

3. Admin Routes — prefix: admin, middleware: ['auth:sanctum', 'role:ADMIN']
 GET /dashboard -> AdminController@dashboard
 GET /users -> AdminController@3. Admin Routes — prefix: admin, middleware: ['auth:sanctum', 'role:ADMIN']
 GET /dashboard -> AdminController@dashboard
 GET /users -> AdminController@userss
 GET /drivers -> AdminController@drivers
 GET /vehicles -> AdminController@vehicles
 GET /routes -> AdminController@routes
 GET /transactions -> AdminController@transactions
 GET /remittances -> AdminController@remittances
 GET /announcements -> AdminController@announcements
 GET /lost-items -> AdminController@lostItems
 GET /shift-logs -> AdminController@shiftLogs

4. Payment Routes — prefix: payments, middleware: ['auth:sanctum'] (no role restriction, anGET /drivers -> AdminController@drivers
 GET /vehicles -> AdminController@vehicles
 GET /routes -> AdminController@routes
 GET /transactions -> AdminController@transactions
 GET /remittances -> AdminController@remittances
 GET /announcements -> AdminController@announcements
 GET /lost-items -> AdminController@lostItems
 GET /shift-logs -> AdminController@shiftLogs

4. Payment Routes — prefix: payments, middleware: ['auth:sanctum'] (no role restriction, any authenticated user))
 POST /initiate -> PaymentController@initiate
 POST /verify -> PaymentController@verify
 GET /history -> PaymentController@history
 POST /topup -> PaymentController@topup

5. QR Routes — prefix: qr, middleware: ['auth:sanctum'] (no POST /initiate -> PaymentController@initiate
 POST /verify -> PaymentController@verify
 GET /history -> PaymentController@history
 POST /topup -> PaymentController@topup

5. QR Routes — prefix: qr, middleware: ['auth:sanctum'] (no role restriction)
 POST /generate -> QrController@generate
 POST /validate -> QrController@validate
 POST /scan -> QrController@scan

Placeholder Controllers (all in app/Http/Controllers/)
Each controller uses the ApiResponse trait. Every method body is restriction)
 POST /generate -> QrController@generate
 POST /validate -> QrController@validate
 POST /scan -> QrController@scan

Placeholder Controllers (all in app/Http/Controllers/)
Each controller uses the ApiResponse trait. Every method body is:

public function mmethodName()
{
    return $this->notImplementedResponse();
}

Create these 5 controller files:
 CommuterController.php — 5 methods: profile, trips, wallet, walletTopup, rewards
 ConductorController.php — 6 methods: updateLocation, shiftStatus, startShift, endShift, remittances, transactions
 AdminController.php — 10 methods: dashboard, users, drivers, vehicles, routes, transactions, remittances, announcements, lostItems, shiftLogs
 PaymentController.php — 4 methods: initiate, verify, history, topup
 QrController.php — 3 methods: generate, validate, scan

501 Response Behavior
Every placeholder endpoint returns HTTP 501 with:
{hodName()
{
    return $this->notImplementedResponse();
}

Create these 5 controller files:
 CommuterController.php — 5 methods: profile, trips, wallet, walletTopup, rewards
 ConductorController.php — 6 methods: updateLocation, shiftStatus, startShift, endShift, remittances, transactions
 AdminController.php — 10 methods: dashboard, users, drivers, vehicles, routes, transactions, remittances, announcements, lostItems, shiftLogs
 PaymentController.php — 4 methods: initiate, verify, history, topup
 QrController.php — 3 methods: generate, validate, scan

501 Response Behavior
Every placeholder endpoint returns HTTP 501 with:
{ "success": false,false, "data": null, "message": "Not Implemented",Not Implemented", "errors": null, "meta": null  }

This allows the frontend team to test route existence and authentication without waiting for business logic:
 401 = unauthenticated (no/invalid token)
 403 = wrong role (valid token but insufficient permissions)
 501 = route exists, auth passed, feature not built yet

Auth Flow Test Examples (using seeder accounts after T11 + T13 are done):
 Admin token can access /api/admin/dashboard -> returns 501 (not 403)
 Admin token cannot access /api/commuter/profile -> returns 403
 Commuter token can access /api/commuter/profile -> returns 501
 Conductor token can access /api/conductor/shift -> returns 501
 Unauthenticated request to any protected route -> returns 401

Total Endpoints
28 placeholder endpoints (5 commuter + 6 conductor + 10 admin + 4 payment + 3 QR).
Combined with the 3 auth endpoints from T11, that is 31 total API endpoints for Week 1.

Acceptance Criteria
 ApiResponse trait created with successResponse, errorResponse, notImplementedResponse
 All 5 route groups defined with correct prefixes and middleware
 All 5 placeholder controllers created with correct method names
 Every non-auth endpoint returns HTTP 501 with consistent JSON
 Role middleware returns 403 for wrong role, 401 for no auth
 All responses follow strict 5-field structure: { success, data, message, errors, meta }
 Total of 28 placeholder endpoints + 3 auth endpoints = 31 API endpointThis allows the frontend team to test route existence and authentication without waiting for business logic:
 401 = unauthenticated (no/invalid token)
 403 = wrong role (valid token but insufficient permissions)
 501 = route exists, auth passed, feature not built yet

Auth Flow Test Examples (using seeder accounts after T11 + T13 are done):
 Admin token can access /api/admin/dashboard -> returns 501 (not 403)
 Admin token cannot access /api/commuter/profile -> returns 403
 Commuter token can access /api/commuter/profile -> returns 501
 Conductor token can access /api/conductor/shift -> returns 501
 Unauthenticated request to any protected route -> returns 401

Total Endpoints
28 placeholder endpoints (5 commuter + 6 conductor + 10 admin + 4 payment + 3 QR).
Combined with the 3 auth endpoints from T11, that is 31 total API endpoints for Week 1.

Acceptance Criteria
 ApiResponse trait created with successResponse, errorResponse, notImplementedResponse
 All 5 route groups defined with correct prefixes and middleware
 All 5 placeholder controllers created with correct method names
 Every non-auth endpoint returns HTTP 501 with consistent JSON
 Role middleware returns 403 for wrong role, 401 for no auth
 All responses follow strict 5-field structure: { success, data, message, errors, meta }
 Total of 28 placeholder endpoints + 3 auth endpoints = 31 API endpoints

Post-Task Requirement
Upon completion of this task, p, push all changes to your assigned feature branch and cand create a Pull Request (PR) targeting the dev branch for code review for code review and  integration.tegration.
```

### S1-T13 — Database Seeder — All Seed Data
- **ID:** `86d3btkwe`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:54
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3btkwe

**Description:**
```
Create seed data in DatabaseSeeder.php following the correct dependency order: Users first, then Profiles (which reference users.id), then Routes (no dependencies), then FarePoints (reference routes.id), then Drivers (no dependencies), then Vehicles (which reference routes, drivers, conductor_profiles).
Users & Profiles
Seed 1 admin user:
 email: admin@gmail.com
 password: Hash::make('password123')
 role: ADMIN
Create matching AdminProfile (1:1 with users.id):
 first_name: System
 middle_name: null
 last_name: Admin
Seed 2 conductor users:
 emails: conductor1@gmail.com, conductor2@gmail.com
 role: CONDUCTOR
 passwords: Hash::make('password123')
ConductorProfiles (same id as users):
 Juan Dela Cruz → username: conductor001
 Maria Santos Reyes → username: conductor002
 generated_password: hashed (password123 for testing) 
Seed 3 commuter users:
 emails: commuter1@gmail.com, commuter2@gmail.com, commuter3@gmail.com
 role: COMMUTER
 password: Hash::make('password123')
CommuterProfiles (all 19 fields filled):
 Filipino names (realistic) 
 birthdates realistic 
 gender alternating Male/Female 
 contact numbers starting with +63917
 commuter_type: Regular
 username: commuter001, commuter002, commuter003
 language_preference: en
 account_status: ACTIVE
 verified_at: now() (pre-verified for testing) 
Route — McArthur Highway (Calumpit → Meycauayan)
Seed 1 Route:
 name: McArthur Highway — Calumpit to Meycauayan
 status: ACTIVE
 waypoints: json_encode([...])
Waypoints must represent the same 33 barangay stops (Calumpit → Banga) with:
 lat 
 lng 
 name 
This matches FarePoints exactly.
FarePoints — 33 Barangays (McArthur Highway System)
Seed 33 FarePoints ordered north → south.
Each record includes:
 route_id (McArthur Highway route) 
 point_number (1–33) 
 code 
 name 
 landmarks (json_encode array of strings) 
 sub_stops = null (Week 1) 
 regular_fare (cumulative from Calumpit) 
 discounted_fare (cumulative from Calumpit) 
 latitude 
 longitude 
Fare rules:
 BASE_BARANGAY_COUNT = 4 
 BASE_FARE_REGULAR = ₱15.00 
 BASE_FARE_DISCOUNTED = ₱12.00 
 SUCCEEDING_FARE_REGULAR = ₱2.25 per barangay 
 SUCCEEDING_FARE_DISCOUNTED = ₱1.75 per barangay 
 TOTAL_BARANGAYS = 33 
 minimum fare enforced in logic (₱15 / ₱12) 
Landmarks must be stored as:

json_encode(["Gatbuca", "Crossing", "Caltex"])

All 33 entries must match the provided McArthur Highway dataset exactly (Calumpit → Banga).
Drivers
Seed 3 Drivers:
 Pedro Santos 
 Ricardo G. Cruz 
 Antonio Garcia 
Fields:
 birthday (date) 
 contact (+63917 format) 
 license_number: DL-2024-0001, 0002, 0003
 hire_date: 2023 
 status: ACTIVE
 vehicle_id: null initially 
Drivers are NOT users.
Vehicles
Seed 3 Vehicles AFTER routes + drivers + conductors exist:
 BUS-001 → ABC-1234 
 JEEP-001 → DEF-5678 
 JEEP-002 → GHI-9012 
Fields:
 route_id → McArthur Highway route 
 driver_id → assigned driver 
 conductor_id → assigned conductor_profiles 
 status: ACTIVE 
 capacity_status: AVAILABLE 
 speed, GPS fields: null 
After vehicle creation:
 update each driver.vehicle_id to match assigned vehicle 
Not Seeded in Week 1
DO NOT seed:
 transactions 
 gcash_payment_intents 
 remittances 
 lost_items 
 claims 
 vouchers 
These belong to later sprints and must remain empty.
Execution Requirement
Run:

php artisan db:seed

Expected result:
 No foreign key errors 
 All inserts successful 
 Proper dependency order respected:
 Users → Profiles → Routes → FarePoints → Drivers → Vehicles 
If errors occur:
 verify FK types (UUID vs string consistency) 
 verify seeding order 
 verify column names match schema exactly 
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.Create seed data in DatabaseSeeder.php following the correct dependency order: Users first, then Profiles (which reference users.id), then Routes (no dependencies), then FarePoints (reference routes.id), then Drivers (no dependencies), then Vehicles (which reference routes, drivers, conductor_profiles).
Users & Profiles
Seed 1 admin user:
 email: admin@gmail.com
 password: Hash::make('password123')
 role: ADMIN
Create matching AdminProfile (1:1 with users.id):
 first_name: System
 middle_name: null
 last_name: Admin
Seed 2 conductor users:
 emails: conductor1@gmail.com, conductor2@gmail.com
 role: CONDUCTOR
 passwords: Hash::make('password123')
ConductorProfiles (same id as users):
 Juan Dela Cruz → username: conductor001
 Maria Santos Reyes → username: conductor002
 generated_password: hashed (password123 for testing) 
Seed 3 commuter users:
 emails: commuter1@gmail.com, commuter2@gmail.com, commuter3@gmail.com
 role: COMMUTER
 password: Hash::make('password123')
CommuterProfiles (all 19 fields filled):
 Filipino names (realistic) 
 birthdates realistic 
 gender alternating Male/Female 
 contact numbers starting with +63917
 commuter_type: Regular
 username: commuter001, commuter002, commuter003
 language_preference: en
 account_status: ACTIVE
 verified_at: now() (pre-verified for testing) 
Route — McArthur Highway (Calumpit → Meycauayan)
Seed 1 Route:
 name: McArthur Highway — Calumpit to Meycauayan
 status: ACTIVE
 waypoints: json_encode([...])
Waypoints must represent the same 33 barangay stops (Calumpit → Banga) with:
 lat 
 lng 
 name 
This matches FarePoints exactly.
FarePoints — 33 Barangays (McArthur Highway System)
Seed 33 FarePoints ordered north → south.
Each record includes:
 route_id (McArthur Highway route) 
 point_number (1–33) 
 code 
 name 
 landmarks (json_encode array of strings) 
 sub_stops = null (Week 1) 
 regular_fare (cumulative from Calumpit) 
 discounted_fare (cumulative from Calumpit) 
 latitude 
 longitude 
Fare rules:
 BASE_BARANGAY_COUNT = 4 
 BASE_FARE_REGULAR = ₱15.00 
 BASE_FARE_DISCOUNTED = ₱12.00 
 SUCCEEDING_FARE_REGULAR = ₱2.25 per barangay 
 SUCCEEDING_FARE_DISCOUNTED = ₱1.75 per barangay 
 TOTAL_BARANGAYS = 33 
 minimum fare enforced in logic (₱15 / ₱12) 
Landmarks must be stored as:

json_encode(["Gatbuca", "Crossing", "Caltex"])

All 33 entries must match the provided McArthur Highway dataset exactly (Calumpit → Banga).
Drivers
Seed 3 Drivers:
 Pedro Santos 
 Ricardo G. Cruz 
 Antonio Garcia 
Fields:
 birthday (date) 
 contact (+63917 format) 
 license_number: DL-2024-0001, 0002, 0003
 hire_date: 2023 
 status: ACTIVE
 vehicle_id: null initially 
Drivers are NOT users.
Vehicles
Seed 3 Vehicles AFTER routes + drivers + conductors exist:
 BUS-001 → ABC-1234 
 JEEP-001 → DEF-5678 
 JEEP-002 → GHI-9012 
Fields:
 route_id → McArthur Highway route 
 driver_id → assigned driver 
 conductor_id → assigned conductor_profiles 
 status: ACTIVE 
 capacity_status: AVAILABLE 
 speed, GPS fields: null 
After vehicle creation:
 update each driver.vehicle_id to match assigned vehicle 
Not Seeded in Week 1
DO NOT seed:
 transactions 
 gcash_payment_intents 
 remittances 
 lost_items 
 claims 
 vouchers 
These belong to later sprints and must remain empty.
Execution Requirement
Run:

php artisan db:seed

Expected result:
 No foreign key errors 
 All inserts successful 
 Proper dependency order respected:
 Users → Profiles → Routes → FarePoints → Drivers → Vehicles 
If errors occur:
 verify FK types (UUID vs string consistency) 
 verify seeding order 
 verify column names match schema exactly 
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S1-T14 — Feature Testing & End-to-End Verification
- **ID:** `86d3btmt1`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:56
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3btmt1

**Description:**
```
Create automated feature tests to validate authentication, role-based access control, placeholder endpoints, and database schema integrity for the transport system backend.
AuthTest (tests/Feature/AuthTest.php)
Create feature tests covering authentication flow:
 POST /api/auth/login valid admin credentials → 200 OK
 response includes: 
 token 
 user data 
 role 
 POST /api/auth/login wrong password → 401 Unauthorized
 POST /api/auth/login non-existent email → 401 Unauthorized
 POST /api/auth/login missing email/password → 422 Validation Error
 POST /api/auth/logout valid token → 200 OK
 POST /api/auth/logout no token → 401 Unauthorized
 GET /api/user valid token → 200 OK with profile data 
 GET /api/user no token → 401 Unauthorized
RoleMiddlewareTest (tests/Feature/RoleMiddlewareTest.php)
Validate RBAC enforcement:
 Admin token: 
 can access /api/admin/dashboard
 → returns 501 (Not Implemented), NOT 403 
 cannot access /api/commuter/profile
 → 403 Forbidden
 Commuter token: 
 can access /api/commuter/profile
 → 501 Not Implemented
 cannot access /api/admin/dashboard
 → 403 Forbidden
 Conductor token: 
 can access /api/conductor/shift
 → 501 Not Implemented
 cannot access /api/admin/dashboard
 → 403 Forbidden
 Unauthenticated request to any protected route:
 → 401 Unauthorized
PlaceholderEndpointsTest (tests/Feature/PlaceholderEndpointsTest.php)
Validate all 28 API endpoints exist and return correct placeholder response.
For every non-auth endpoint:
 Assert HTTP 501
 Assert JSON structure: 

{
  "success": false,
  "data": null,
  "message": "Not Implemented",
  "errors": null,
  "meta": null
}

Ensure:
 No endpoint returns 404 (must be registered) 
 Middleware chain is functional (auth + role + route access) 
SchemaTest (tests/Feature/SchemaTest.php)
Verify database structure after migrations:
Required Tables (17 total)
Assert these exist:
 users 
 personal_access_tokens 
 commuter_profiles 
 conductor_profiles 
 admin_profiles 
 drivers 
 routes 
 fare_points 
 vehicles 
 shift_logs 
 transactions 
 gcash_payment_intents 
 remittances 
 announcements 
 lost_items 
 claims 
 vouchers 
Hard Constraint Check
Assert:
 NO wallet-related tables exist: 
 wallet_balance ❌ 
 wallet_transactions ❌ 
 wallet_ledger ❌ 
End-to-End Manual Testing
Run local server:

php artisan serve

Perform curl-based verification:
1. Login
 POST /api/auth/login
 Use admin credentials 
 Extract Bearer token 
2. Authenticated User
 GET /api/user
 Must return: 
 user info 
 role-specific profile 
3. Role Testing
 Test admin, conductor, commuter tokens across endpoints: 
 valid role → 501 
 invalid role → 403 
4. Security Checks
 No token → 401 Unauthorized 
 Wrong role → 403 Forbidden 
 Missing endpoint → MUST NOT be 404 
Expected Behavior Summary

[table-embed:1:1 Case| 1:2 Expected| 2:1 Valid auth| 2:2 200| 3:1 Invalid credentials| 3:2 401| 4:1 Validation failure| 4:2 422| 5:1 Unauthorized access| 5:2 401| 6:1 Forbidden role| 6:2 403| 7:1 Valid route not implemented| 7:2 501| 8:1 Missing route| 8:2 ❌ NOT allowed|]
Final Requirement
Ensure:
 All routes are registered 
 Middleware works correctly 
 No 404 responses on defined endpoints 
 All tests pass successfully 
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S1-T2 — Sanctum & Breeze Authentication Setup
- **ID:** `86d3brvka`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:02
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3brvka

**Description:**
```
Objective
Configure Laravel Sanctum and Breeze API authentication to support both SPA cookie authentication and token-based API authentication.
Scope
Install and configure all authentication infrastructure required by the frontend Next.js application.
Requirements
Sanctum Installation
Install Sanctum:

composer require laravel/sanctum:^4.0

Publish Sanctum assets and configuration.
Middleware Registration
Register:

Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful

as the first middleware in the API middleware stack inside bootstrap/app.php.
This ensures:
 SPA requests use session/cookie authentication. 
 External API requests use token authentication. 
 Sanctum correctly identifies trusted frontend domains. 
Breeze Installation
Install Laravel Breeze:

composer require laravel/breeze --dev

Generate API authentication scaffolding:

php artisan breeze:install api

The expected warning:
API routes file already exists

may appear and should not block implementation.
Stateful Domain Configuration
Configure:

SANCTUM_STATEFUL_DOMAINS=

to include frontend development and production domains.
Deliverables
 Sanctum installed and configured 
 Breeze API scaffolding installed 
 Stateful middleware configured 
 Sanctum token migration published 
Acceptance Criteria
 Sanctum configuration file exists. 
 Middleware is registered first in the API stack. 
 Breeze authentication assets are generated. 
 Frontend domains are recognized as stateful. 
 API supports both cookie-based and token-based authentication.
```

### S1-T3 — Authentication & Profile Database Schema
- **ID:** `86d3brw85`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:04
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3brw85

**Description:**
```
Objective
Create the foundational authentication and user profile database schema using UUID-based primary keys.
Scope
Implement all identity-related tables required by the platform:
 Users 
 Personal Access Tokens 
 Commuter Profiles 
 Conductor Profiles 
 Admin Profiles 
Requirements
Users Table
Create a UUID-based users table containing:

[table-embed:1:1 Column| 1:2 Type| 2:1 id| 2:2 UUID Primary Key| 3:1 email| 3:2 Unique| 4:1 password| 4:2 String| 5:1 role| 5:2 String (ADMIN, CONDUCTOR, COMMUTER)| 6:1 timestamps| 6:2 Standard| 7:1 deleted_at| 7:2 Soft Delete|]
Exclusions
Do not include:
 name 
 phone 
 email_verified_at 
 remember_token 
 is_active 
These attributes belong in profile-specific tables.
Personal Access Tokens
Create a Sanctum-compatible token table using UUID relationships.
Requirements
Replace:

$table->id();
$table->morphs('tokenable');

with:

$table->uuid('id')->primary();
$table->uuidMorphs('tokenable');

This prevents MySQL foreign key mismatch errors caused by UUID user IDs.
Required columns:
 id 
 tokenable_type 
 tokenable_id 
 name 
 token 
 abilities 
 last_used_at 
 expires_at 
 timestamps 
Commuter Profiles
Create a 1:1 profile table linked directly to users.
Relationship
commuter_profiles.id
      ↓
users.id

The UUID serves as both:
 Primary Key 
 Foreign Key 
Required fields:
 First Name 
 Middle Name 
 Surname 
 Birthdate 
 Gender 
 Email 
 Contact Number 
 Commuter Type 
 Applied Type 
 Username 
 Language Preference 
 Account Status 
 ID Image URL 
 Verified At 
 Rejection Reason 
 Timestamps 
 Soft Deletes 
Conductor Profiles
Create a conductor profile table using a shared UUID primary key.
Required fields:
 First Name 
 Middle Name 
 Last Name 
 Birthday 
 Profile Picture URL 
 Generated Username 
 Generated Password 
 Timestamps 
 Soft Deletes 
Business Rule
Conductors do not self-register.
Administrator accounts are responsible for:
 Creating conductor accounts 
 Generating credentials 
 Distributing login information 
Admin Profiles
Create a lightweight administrator profile table.
Required fields:
 First Name 
 Middle Name 
 Last Name 
 Profile Picture URL 
 Timestamps 
 Soft Deletes 
Business Rule
Administrative users require only minimal profile information because they primarily interact through internal dashboards.
Deliverables
 All authentication migrations completed 
 UUID relationships implemented 
 Soft delete support enabled 
Acceptance Criteria
 All tables migrate successfully. 
 UUID foreign keys are compatible. 
 Sanctum migration supports UUID users. 
 Profile tables enforce 1:1 user relationships. 
 No redundant profile fields exist in users table.

Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S1-T4 — Database Migrations — Operational Tables
- **ID:** `86d3brzpq`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:10
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3brzpq

**Description:**
```
Create all core operational database migrations for drivers, routes, fare points, vehicles, and shift logs. These tables form the backbone of the transport and dispatch system and must follow strict schema rules, FK integrity, and ordering constraints.
Drivers Table Migration
Create drivers table:
 UUID primary key 
 first_name varchar(100), not null 
 middle_name varchar(100), nullable 
 last_name varchar(100), not null 
 birthday date, not null 
 contact varchar(20), not null 
 license_number varchar(50), not null 
 hire_date date, not null 
 profile_picture_url varchar(500), nullable 
 status varchar(20), nullable (ACTIVE/INACTIVE) 
 vehicle_id UUID, nullable FK → vehicles (set null on delete) 
 timestamps 
 soft deletes 
Drivers are NOT users and do not authenticate.
Routes Table Migration
Create routes table:
 UUID primary key 
 name varchar(100), not null 
 status varchar(20), nullable (ACTIVE/INACTIVE) 
 waypoints varchar(2000), nullable (JSON string of lat/lng/name objects) 
 timestamps 
Waypoints represent full route geometry stored as JSON.
Fare Points Table Migration
Create fare_points table:
 UUID primary key 
 route_id UUID, not null FK → routes (cascade delete) 
 point_number int, not null 
 code varchar(10), not null 
 name varchar(100), not null 
 landmarks varchar(500), nullable 
 sub_stops varchar(500), nullable 
 regular_fare decimal(10,2), not null 
 discounted_fare decimal(10,2), not null 
 latitude decimal(10,7), nullable 
 longitude decimal(10,7), nullable 
 timestamps 
Supports fare calculation and commuter discounts.
Vehicles Table Migration (000032 ORDER REQUIRED)
Create vehicles table:
 UUID primary key 
 unit_number varchar(20), unique, not null 
 plate_number varchar(20), unique, not null 
 route_id UUID, nullable FK → routes (set null on delete) 
 driver_id UUID, nullable FK → drivers (set null on delete) 
 conductor_id UUID, nullable FK → conductor_profiles (set null on delete) 
 status varchar(30), nullable (ACTIVE/INACTIVE/MAINTENANCE) 
 speed int, nullable 
 capacity_status varchar(20), nullable 
 latitude decimal(10,7), nullable 
 longitude decimal(11,7), nullable 
 last_location_update timestamp, nullable 
 timestamps 
 soft deletes 
Must run AFTER routes and fare_points.
Shift Logs Table Migration
Create shift_logs table:
 shift_id varchar(20) primary key 
 conductor_id UUID FK → conductor_profiles 
 conductor_name varchar(100), denormalized 
 driver_id UUID FK → drivers 
 driver_name varchar(100), denormalized 
 vehicle_id UUID FK → vehicles 
 unit_number varchar(20), denormalized 
 plate_number varchar(20), denormalized 
 route_id UUID nullable FK → routes 
 route_name varchar(100), nullable 
 time_in timestamp, not null 
 time_out timestamp, nullable 
 is_active boolean, nullable 
 notes text, nullable 
 timestamps 
 soft deletes 
Denormalized fields are stored for performance optimization.
Acceptance Criteria
 Drivers table migration is created with correct UUID PK and soft deletes 
 Routes table correctly stores waypoints as JSON string 
 Fare points table enforces route relationship with cascade delete 
 Vehicles table is correctly ordered (000032) and FK-safe 
 Shift logs table uses shift_id as string primary key (not UUID) 
 All foreign keys are correctly defined and match referenced column types 
 No UUID vs varchar mismatch exists in any relationship 
 Soft deletes are implemented where required 
 Timestamps exist in all tables 
 Vehicles migration runs after routes and fare_points without FK errors 
 No wallet-related tables or fields are introduced 
 Database migrates successfully without errors using php artisan migrate
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S1-T5 — Database Migrations — Transactions & Financial System
- **ID:** `86d3bt2q6`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:15
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3bt2q6

**Description:**
```
Create all financial, payment, voucher, remittance, announcements, claims, and lost item system migrations.
Transactions Table
 transaction_id varchar(30) primary key 
 shift_id FK → shift_logs 
 payment_method (CASH/GCASH_SCANNED/GCASH_DIRECT/VOUCHER) 
 final_amount decimal(10,2) 
 passenger_id UUID nullable FK → commuter_profiles 
 passenger_name varchar(100), nullable 
 passenger_role varchar(20), nullable 
 pickup_stop_id FK → fare_points 
 dropoff_stop_id FK → fare_points 
 pickup_name varchar(100), nullable 
 dropoff_name varchar(100), nullable 
 distance decimal(10,2), nullable 
 base_fare decimal(10,2), nullable 
 succeeding_km decimal(10,2), nullable 
 discount_amount decimal(10,2), nullable 
 conductor_name varchar(100), nullable 
 unit_number varchar(20), nullable 
 driver_name varchar(100), nullable 
 voucher_id UUID nullable FK → vouchers 
 timestamps 
GCash Payment Intents
 id varchar(30) primary key 
 amount decimal(10,2) 
 amount_in_centavos bigint 
 currency varchar(3) default PHP 
 status (PENDING/PROCESSING/SUCCEEDED/FAILED/CANCELLED) 
 payment_method (GCASH_SCAN/GCASH_DIRECT) 
 commuter_id FK → commuter_profiles 
 commuter_name varchar(100) 
 pickup_point int 
 dropoff_point int 
 vehicle_id UUID nullable 
 conductor_id UUID nullable 
 shift_id varchar(20) nullable FK → shift_logs 
 paymongo_payment_id varchar(100) 
 redirect_url varchar(500) 
 timestamps 
Remittances
 shift_id varchar(20) primary key FK → shift_logs 
 date date 
 conductor_id FK → conductor_profiles 
 conductor_name varchar(100) 
 driver_id FK → drivers 
 driver_name varchar(100) 
 vehicle_id FK → vehicles 
 unit_number varchar(20) 
 total_passengers int 
 gcash_scanned_total decimal(10,2) 
 gcash_direct_total decimal(10,2) 
 voucher_total decimal(10,2) 
 total_cashless decimal(10,2) 
 cash_declared decimal(10,2) 
 cash_total decimal(10,2) 
 gcash_total decimal(10,2) 
 remittance_status varchar(20) 
 time_in timestamp 
 time_out timestamp 
 timestamps 
Announcements
 UUID primary key 
 type varchar(20) 
 title varchar(200) 
 message text 
 timestamps 
 soft deletes 
Lost Items
 id varchar(20) primary key 
 item_name varchar(200) 
 description text 
 image_url varchar(500) 
 plate_number varchar(20) 
 driver_name varchar(100) 
 conductor_name varchar(100) 
 vehicle_id UUID FK 
 estimated_time_lost varchar(100) 
 category varchar(20) 
 reported_by_id FK → users 
 reported_by_role varchar(20) 
 reporter_name varchar(100) 
 status varchar(20) 
 claimed_by varchar(100) 
 timestamps 
Claims
 UUID primary key 
 item_id FK → lost_items 
 claimant_id FK → commuter_profiles 
 claimant_name varchar(100) 
 claimant_contact varchar(20) 
 claimant_email varchar(255) 
 status varchar(20) 
 proof varchar(500) 
 timestamps 
Vouchers
 UUID primary key 
 code varchar(20) unique 
 commuter_id FK → commuter_profiles nullable 
 type (FIXED/PERCENTAGE/RIDE_FREE) 
 status (ACTIVE/USED/EXPIRED) 
 amount decimal(10,2) nullable 
 expires_at timestamp 
 ride_origin varchar(100) 
 timestamps 
 soft deletes

Acceptance Criteria
 All 7 migrations are created successfully (transactions, gcash_payment_intents, remittances, announcements, lost_items, claims, vouchers) 
 All primary keys follow correct type rules (UUID vs varchar identifiers) 
 All foreign keys correctly reference existing tables without type mismatch 
 Transactions table properly links shift_logs, fare_points, commuters, and vouchers 
 GCash payment intents properly track payment lifecycle independently of transactions 
 Remittances are correctly keyed by shift_id (1:1 per shift) 
 Lost items support reporting with proper user and vehicle references 
 Claims only allow commuter-based claimants 
 Vouchers support all required types and optional commuter assignment 
 Soft deletes implemented where required (announcements, vouchers) 
 All timestamps exist and are consistent across tables 
 No wallet-related tables or fields exist anywhere in schema 
 php artisan migrate runs successfully without errors 
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S1-T6 — Migration Execution & Database Integrity Verification
- **ID:** `86d3bt3ay`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:17
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3bt3ay

**Description:**
```
Execute all database migrations and ensure full schema integrity across operational, financial, and system tables. This task ensures correct migration order, FK compatibility, UUID consistency, and removal of deprecated architecture components.
Migration Execution Requirements
Run all migrations using:

php artisan migrate

Expected result:
 All migrations complete successfully 
 Every migration shows DONE
 No FAIL or SQL error output 
Critical Migration Order Validation
Ensure correct execution order:
routes → runs first 
fare_points → runs second 
vehicles → runs after both (000032 requirement) 
This order prevents foreign key failures.
Schema Integrity Checks
UUID Consistency Fix
personal_access_tokens.id must be UUID 
tokenable morph columns must use UUID (uuidMorphs) 
Non-UUID Primary Key Validation
Ensure correct implementation of string-based primary keys:
 shift_logs.shift_id (varchar 20) 
 transactions.transaction_id (varchar 30) 
 gcash_payment_intents.id (varchar 30) 
 remittances.shift_id (varchar 20) 
 lost_items.id (varchar 20) 
All must function as valid primary keys without UUID conversion.
Foreign Key Validation
Confirm all relationships resolve without type mismatch:
 shift_logs → conductor_profiles, drivers, vehicles, routes 
 transactions → shift_logs (varchar FK), commuter_profiles, fare_points, vouchers 
 gcash_payment_intents → commuter_profiles, vehicles, conductor_profiles, shift_logs 
 remittances → shift_logs, conductor_profiles, drivers, vehicles 
No UUID ↔ varchar mismatches allowed.
Architecture Constraint Validation
🚫 HARD RULE: Wallet Removal
Verify database contains:
 ❌ NO wallet_balance column 
 ❌ NO wallet_transactions table 
 ❌ NO wallet_ledger table 
Wallet system is permanently removed from architecture.
Error Recovery Rule
If migrations fail:
 Run: 

php artisan db:wipe

 Re-run: 

php artisan migrate

 Fix root cause before proceeding (usually FK type mismatch) 
Final Verification Checklist
 All migrations execute successfully with no errors 
 Migration order (routes → fare_points → vehicles) is correct 
 UUID and varchar PK/FK types are consistent across schema 
 No foreign key constraint violations exist 
 personal_access_tokens uses UUID-based structure 
 All 5 non-UUID primary key tables work correctly 
 No wallet-related tables or columns exist anywhere 
 Database schema fully reflects ERD design 
 System is ready for Eloquent model implementation phase 
Acceptance Criteria
 php artisan migrate completes successfully with zero failures 
 All migrations show successful execution status 
 No foreign key errors occur during migration 
 Route order dependency (000030–000032) is correctly enforced 
 All UUID vs varchar mismatches are resolved 
 Wallet system is fully absent from database 
 Schema matches ERD design exactly 
 Database is clean, consistent, and production-ready 
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S1-T7 — Eloquent Models User & Profile Models
- **ID:** `86d3bt6dg`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:23
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3bt6dg

**Description:**
```
Create Eloquent models for User, CommuterProfile, ConductorProfile, and AdminProfile with strict alignment to database schema and proper relationships.
User Model
Create User model extending Authenticatable with:
 Traits: 
 HasApiTokens 
 HasFactory 
 Notifiable 
$fillable: 
 email 
 password 
 role 
(No name, phone, or status fields exist in schema)
$hidden: 
 password 
 remember_token 
$casts: 
 password → hashed 
 role → UserRole enum (backed enum) 
Relationships
Define:
 hasOne commuterProfile() 
 hasOne conductorProfile() 
 hasOne adminProfile() 
Helper Methods
Add:
 hasRole(UserRole $role) 
 isAdmin() 
 isConductor() 
 isCommuter() 
CommuterProfile Model
Create CommuterProfile with SoftDeletes:
$fillable (all fields): 
 id 
 first_name 
 middle_name 
 surname 
 birthdate 
 gender 
 email 
 contact_number 
 commuter_type 
 applied_type 
 username 
 language_preference 
 account_status 
 id_image_url 
 verified_at 
 rejection_reason 
$casts: 
 birthdate → date 
 verified_at → datetime 
 Relationships: 

belongsTo User (id = FK to users.id)
Note: id is both primary key and foreign key (1:1 relationship with users).
ConductorProfile Model
Create ConductorProfile with SoftDeletes:
$fillable: 
 id 
 first_name 
 middle_name 
 last_name 
 birthday 
 profile_picture_url 
 generated_username 
 generated_password 
$casts: 
 birthday → date 
 Relationships: 
 belongsTo User 
 hasOne Vehicle (via vehicles.conductor_id) 
 hasMany ShiftLog 
Note:
generated_username is unique and used for login (not email-based authentication) 
AdminProfile Model
Create AdminProfile with SoftDeletes:
$fillable: 
 id 
 first_name 
 middle_name 
 last_name 
 profile_picture_url 
 Relationships: 
 belongsTo User 
Minimal structure since admins primarily use dashboard access.

Acceptance Criteria
 User model is created with correct traits and schema-aligned fields only 
 User role is properly cast to UserRole enum 
 User helper methods (isAdmin, isConductor, isCommuter, hasRole) are implemented and functional 
 User hasOne relationships correctly link to all profile types 
 CommuterProfile uses id as both primary key and foreign key to users 
 CommuterProfile casts birthdate and verified_at correctly 
 ConductorProfile includes correct relationships (User, Vehicle, ShiftLog) 
 ConductorProfile uses generated_username as unique login identifier 
 AdminProfile is correctly linked to User with minimal structure 
 All models strictly follow database schema (no extra fields) 
 All relationships match ERD definitions exactly 
 No missing or incorrect foreign key assumptions exist 
 Models are ready for authentication and API integration 
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S1-T8 — Eloquent Models (Operational & System Models)
- **ID:** `86d3bt5fv`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:21
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3bt5fv

**Description:**
```
Create all operational and system Eloquent models for the transport system with strict alignment to database schema, correct primary key handling, casts, relationships, and denormalized field rules.
Driver Model
Create Driver model with SoftDeletes:
$fillable
 first_name 
 middle_name 
 last_name 
 birthday 
 contact 
 license_number 
 hire_date 
 profile_picture_url 
 status 
 vehicle_id 
$casts
 birthday → date 
 hire_date → date 
Relationships
 belongsTo Vehicle 
 hasMany ShiftLog 
Drivers are NOT users and do not authenticate.
Vehicle Model
Create Vehicle model with SoftDeletes:
$fillable
 unit_number 
 plate_number 
 route_id 
 driver_id 
 conductor_id 
 status 
 speed 
 capacity_status 
 latitude 
 longitude 
 last_location_update 
$casts
 speed → integer 
 latitude → decimal:7 
 longitude → decimal:7 
 last_location_update → datetime 
Relationships
 belongsTo Route 
 belongsTo Driver 
 belongsTo Conductor (conductor_profiles via conductor_id) 
 hasMany ShiftLog 
 hasMany Transaction 
Route Model
$fillable
 name 
 status 
 waypoints 
$casts
 waypoints → array (auto JSON encode/decode) 
Relationships
 hasMany Vehicles 
 hasMany FarePoint 
Waypoints represent full route geometry as JSON array.
FarePoint Model
$fillable
 route_id 
 point_number 
 code 
 name 
 landmarks 
 sub_stops 
 regular_fare 
 discounted_fare 
 latitude 
 longitude 
$casts
 point_number → integer 
 regular_fare → decimal:2 
 discounted_fare → decimal:2 
 latitude → decimal:7 
 longitude → decimal:7 
Relationships
 belongsTo Route 
Supports dual fare system (regular vs discounted).
ShiftLog Model
Create ShiftLog with SoftDeletes:
Primary Key Configuration
 shift_id (string PK) 
 $incrementing = false 
 $keyType = string 
$fillable
 shift_id 
 conductor_id 
 conductor_name 
 driver_id 
 driver_name 
 vehicle_id 
 unit_number 
 plate_number 
 route_id 
 route_name 
 time_in 
 time_out 
 is_active 
 notes 
$casts
 time_in → datetime 
 time_out → datetime 
 is_active → boolean 
Relationships
 belongsTo Conductor (conductor_profiles) 
 belongsTo Driver 
 belongsTo Vehicle 
 belongsTo Route 
Denormalized fields are read-only snapshots for performance.
Transaction Model
Primary Key:
 transaction_id (string) 
 $incrementing = false 
 $keyType = string 
$fillable
 transaction_id 
 shift_id 
 payment_method 
 final_amount 
 passenger_id 
 passenger_name 
 passenger_role 
 pickup_stop_id 
 dropoff_stop_id 
 pickup_name 
 dropoff_name 
 distance 
 base_fare 
 succeeding_km 
 discount_amount 
 conductor_name 
 unit_number 
 driver_name 
 voucher_id 
$casts
 final_amount → decimal:2 
 distance → decimal:2 
 base_fare → decimal:2 
 succeeding_km → decimal:2 
 discount_amount → decimal:2 
Relationships
 belongsTo ShiftLog 
 belongsTo CommuterProfile (passenger) 
 belongsTo FarePoint (pickupStop) 
 belongsTo FarePoint (dropoffStop) 
 belongsTo Voucher 
GcashPaymentIntent Model
Primary Key:
 id (string) 
 $incrementing = false 
 $keyType = string 
$fillable
 id 
 amount 
 amount_in_centavos 
 currency 
 status 
 payment_method 
 commuter_id 
 commuter_name 
 pickup_point 
 dropoff_point 
 vehicle_id 
 conductor_id 
 shift_id 
 paymongo_payment_id 
 redirect_url 
$casts
 amount → decimal:2 
 amount_in_centavos → integer 
 pickup_point → integer 
 dropoff_point → integer 
Relationships
 belongsTo CommuterProfile 
 belongsTo Vehicle 
 belongsTo ConductorProfile 
 belongsTo ShiftLog 
Remittance Model
Primary Key:
 shift_id (string) 
 $incrementing = false 
 $keyType = string 
$fillable
 shift_id 
 date 
 conductor_id 
 conductor_name 
 driver_id 
 driver_name 
 vehicle_id 
 unit_number 
 total_passengers 
 gcash_scanned_total 
 gcash_direct_total 
 voucher_total 
 total_cashless 
 cash_declared 
 cash_total 
 gcash_total 
 remittance_status 
 time_in 
 time_out 
$casts
 date → date 
 total_passengers → integer 
 gcash_scanned_total → decimal:2 
 gcash_direct_total → decimal:2 
 voucher_total → decimal:2 
 total_cashless → decimal:2 
 cash_declared → decimal:2 
 cash_total → decimal:2 
 gcash_total → decimal:2 
 time_in → datetime 
 time_out → datetime 
Relationships
 belongsTo ShiftLog 
 belongsTo ConductorProfile 
 belongsTo Driver 
 belongsTo Vehicle 
Announcement Model
Create with SoftDeletes:
$fillable
 type 
 title 
 message 
LostItem Model
Primary Key:
 id (string) 
 $incrementing = false 
 $keyType = string 
$fillable
 id 
 item_name 
 description 
 image_url 
 plate_number 
 driver_name 
 conductor_name 
 vehicle_id 
 estimated_time_lost 
 category 
 reported_by_id 
 reported_by_role 
 reporter_name 
 status 
 claimed_by 
Relationships
 belongsTo User (reporter) 
 belongsTo Vehicle 
 hasMany Claims 
Claim Model
$fillable
 item_id 
 claimant_id 
 claimant_name 
 claimant_contact 
 claimant_email 
 status 
 proof 
$casts
 item_id → string 
Relationships
 belongsTo LostItem 
 belongsTo CommuterProfile (claimant) 
Voucher Model
Create with SoftDeletes:
$fillable
 code 
 commuter_id 
 type 
 status 
 amount 
 expires_at 
 ride_origin 
$casts
 amount → decimal:2 
 expires_at → datetime 
Relationships
 belongsTo CommuterProfile 
Acceptance Criteria
 All models are created exactly matching database schema (no extra fields added) 
 All string-based primary keys correctly configured ($incrementing = false, $keyType = string) 
 All UUID-based models use correct Laravel defaults 
 All casts correctly applied (decimal, date, datetime, integer) 
 All relationships match ERD exactly (no missing or incorrect FK mappings) 
 Route, Vehicle, ShiftLog, Transaction, and Remittance relationships function correctly 
 Denormalized fields are treated as read-only snapshot data 
 No wallet-related models or logic exist anywhere in codebase 
 Models are compatible with migrations from S1-T5 and S1-T4 
 Eloquent relationships resolve without errors or type mismatches 
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S1-T9 — UserRole Enum & Role-Based Access Control
- **ID:** `86d3bt72a`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 06:24
- **Updated:** 2026-06-15 21:03
- **Closed:** 2026-06-15 21:03
- **Due:** 2026-06-20 20:00
- **URL:** https://app.clickup.com/t/86d3bt72a

**Description:**
```
Create a strongly-typed role system using a PHP backed enum and enforce role-based access control through middleware. This ensures all authorization checks are centralized, type-safe, and consistent across the application.
Implementation Requirements
1. UserRole Enum
Create app/Enums/UserRole.php:
 Backed string enum with values: 
ADMIN = 'ADMIN'
CONDUCTOR = 'CONDUCTOR'
COMMUTER = 'COMMUTER'
 Must be used for: 
 User model casting (role field) 
 Middleware validation 
 Authorization checks 
2. Role Middleware
Create app/Http/Middleware/EnsureUserRole.php
Behavior:
 Accepts multiple roles: 
role:ADMIN,CONDUCTOR
 Logic: 
 If user is not authenticated → return 401
 Convert allowed roles using UserRole::from()
 Compare against $user->role
 If match → allow request 
 If no match → return 403
 Invalid enum values must be safely ignored via try/catch 
3. Middleware Registration
In bootstrap/app.php:
 Register alias: 
role => EnsureUserRole::class
 Ensure Sanctum stateful middleware is enabled for API group 
4. Security Rule
All protected routes must enforce:
auth:sanctum
role:
Frontend role values are display-only and NOT trusted
Acceptance Criteria
 UserRole enum is used everywhere role is referenced 
 Middleware correctly blocks unauthorized roles (403) 
 Unauthenticated requests return 401 
 Invalid role strings do not crash system 
 Role middleware works with multiple roles 
 Sanctum authentication works alongside role checks 
 No role logic exists inside controllers 
 Role enforcement is fully backend-controlled 
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

---

## S2 (7 tasks)

### S2-T1 — Shift & GPS Database Schema — Migrations & Schema Updates
- **ID:** `86d3c0x9a`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 20:32
- **Updated:** 2026-06-16 04:06
- **Closed:** 2026-06-16 04:06
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0x9a

**Description:**
```
Create and update database migrations for the shift lifecycle system, GPS tracking, and vehicle-driver-conductor pairing.

## Context

Sprint 2 introduces real business logic. Conductors log in, select which vehicle/unit they are operating and which driver they are paired with, then their shift begins. The shift ends only when the conductor submits a remittance (total collected amount). This pairing of conductor + driver + vehicle on each shift is the accountability link for payments, feedback, and disputes later on.

## New Migration: vehicle_locations

Create a new migration for the vehicle_locations table:

- vehicle_id (FK → vehicles.id, primary key for upsert)
- conductor_id (FK → users.id, nullable)
- lat (decimal(10,7), NOT NULL)
- lng (decimal(10,7), NOT NULL)
- speed (decimal(5,2), nullable)
- heading (decimal(5,2), nullable)
- capacity_status (enum: AVAILABLE, STANDING, FULL, default: AVAILABLE)
- updated_at (timestamp)

CRITICAL: This table uses UPSERT by vehicle_id — always the latest position only, never append. The doc explicitly warns that appending = unbounded table growth + stale duplicates.

## Update Existing: shift_logs

The shift_logs table already exists from Sprint 1. Verify and update:

- shift_id (string PK, varchar(20)) — already exists
- conductor_id (FK → users.id) — already exists
- driver_id (FK → drivers.id) — ADD if missing
- vehicle_id (FK → vehicles.id) — verify exists
- route_id (FK → routes.id) — verify exists
- started_at (timestamp) — verify exists
- ended_at (timestamp, nullable) — verify exists
- status (enum: ACTIVE, ENDED, default: ACTIVE) — ADD if missing

## Update Existing: vehicles

Add to the vehicles table:

- active_shift_id (FK → shift_logs.shift_id, nullable) — tracks which shift is currently active on this vehicle

When a shift starts, set active_shift_id. When shift ends, set to null.

## Update Existing: drivers

Add to the drivers table:

- active_shift_id (FK → shift_logs.shift_id, nullable) — tracks which shift the driver is currently on

When a shift starts, set active_shift_id. When shift ends, set to null.

This ensures both conductor and driver reflect their active shift status.

## Index Requirements

- vehicle_locations.vehicle_id — primary index (for upsert)
- shift_logs.conductor_id — index (for querying conductor shifts)
- shift_logs.driver_id — index (for querying driver shifts)
- shift_logs.status — index (for filtering active shifts)
- shift_logs.vehicle_id — index (for vehicle shift history)

## Hard Constraints

- NO wallet-related columns or tables
- NO distance/radius columns in vehicle_locations (radius logic is in HailService, Sprint 3)
- vehicle_locations MUST use upsert pattern, NOT insert-only
- shift_logs.status must be ENUM constrained at DB level

Acceptance Criteria
 vehicle_locations migration created with upsert-compatible schema
 shift_logs has driver_id and status columns
 vehicles has active_shift_id column
 drivers has active_shift_id column
 All FK relationships resolve without type mismatch
 All indexes created
 php artisan migrate runs successfully
 No wallet tables or columns exist
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S2-T2 — Shift & Location Models — Eloquent Models & Relationships
- **ID:** `86d3c0x9u`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 20:32
- **Updated:** 2026-06-16 06:08
- **Closed:** 2026-06-16 06:08
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0x9u

**Description:**
```
Create and update Eloquent models for the shift lifecycle, GPS tracking, and vehicle-driver-conductor relationships.

## Context

Sprint 2 models connect the conductor, driver, and vehicle through the shift system. Every shift record is the accountability link — it records who was together, on which unit, and when. This chain is used later for payments, feedback, and disputes.

## New Model: VehicleLocation

Create VehicleLocation model:

$fillable:
- vehicle_id (PK, for upsert)
- conductor_id (nullable)
- lat
- lng
- speed (nullable)
- heading (nullable)
- capacity_status (default: AVAILABLE)

$casts:
- lat → decimal:10,7
- lng → decimal:10,7
- speed → decimal:5,2
- heading → decimal:5,2

Relationships:
- belongsTo Vehicle (vehicle_id)
- belongsTo User (conductor_id) — the conductor currently on this vehicle

Key behavior:
- Upsert by vehicle_id — always ONE record per vehicle, never append
- No created_at column, only updated_at (latest position only)
- Set $timestamps = false and manually handle updated_at, or override to only use updated_at

## Update Model: ShiftLog

Update the existing ShiftLog model:

Add to $fillable:
- driver_id (FK → drivers.id)
- status (enum: ACTIVE, ENDED)

$casts:
- status → ShiftStatus enum (backed enum)
- started_at → datetime
- ended_at → datetime

Relationships:
- belongsTo User (conductor_id)
- belongsTo Driver (driver_id)
- belongsTo Vehicle (vehicle_id)
- belongsTo Route (route_id)
- hasOne Remittance

Scopes:
- scopeActive($query) — where status = ACTIVE
- scopeByConductor($query, $conductorId)
- scopeByDriver($query, $driverId)

## Create Enum: ShiftStatus

Create app/Enums/ShiftStatus.php:
- ACTIVE = 'ACTIVE'
- ENDED = 'ENDED'

## Create Enum: CapacityStatus

Create app/Enums/CapacityStatus.php:
- AVAILABLE = 'AVAILABLE'
- STANDING = 'STANDING'
- FULL = 'FULL'

## Update Model: Vehicle

Add to Vehicle model:
- active_shift_id in $fillable
- Relationship: hasOne ShiftLog (active shift via active_shift_id)
- Helper: hasActiveShift() — returns bool
- Helper: getActiveShift() — returns ShiftLog or null

## Update Model: Driver

Add to Driver model:
- active_shift_id in $fillable
- Relationship: hasOne ShiftLog (active shift via active_shift_id)
- Helper: hasActiveShift() — returns bool
- Helper: getActiveShift() — returns ShiftLog or null

Acceptance Criteria
 VehicleLocation model created with upsert-compatible design
 ShiftLog model updated with driver_id, status, scopes
 ShiftStatus enum created (ACTIVE, ENDED)
 CapacityStatus enum created (AVAILABLE, STANDING, FULL)
 Vehicle model has active_shift_id + helper methods
 Driver model has active_shift_id + helper methods
 All relationships resolve correctly (no FK type mismatch)
 Upsert pattern is enforced in VehicleLocation (no duplicate records per vehicle)
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S2-T3 — ShiftService — Shift Lifecycle & Remittance Business Logic
- **ID:** `86d3c0xb1`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 20:32
- **Updated:** 2026-06-16 08:12
- **Closed:** 2026-06-16 08:12
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0xb1

**Description:**
```
Implement the core business logic for the conductor shift lifecycle including shift start (with vehicle + driver selection), shift end (via remittance submission), and shift history.

## Context

The shift flow is:
1. Conductor logs in
2. Conductor selects which vehicle/unit they are operating AND which driver they are paired with
3. Shift starts — conductor + driver + vehicle are linked
4. During shift: GPS tracking + fare transactions happen
5. Conductor submits remittance (total collected amount) → shift ends

NO remittance = shift stays active. The shift ends ONLY upon remittance submission.

This pairing matters because later:
- Payments → which conductor+driver handled this fare?
- Feedback → commuter rates a ride → which shift? which conductor? which driver?
- Disputes → who was responsible for this trip?

## ShiftService Methods

Create app/Services/ShiftService.php:

### startShift(User $conductor, string $vehicleId, string $driverId): ShiftLog
- Validate conductor role is CONDUCTOR
- Check conductor has no existing active shift → if yes, throw 409 Conflict
- Check driver is not already on another active shift → if yes, throw 409 Conflict
- Check vehicle is not already on another active shift → if yes, throw 409 Conflict
- Create ShiftLog record: conductor_id, driver_id, vehicle_id, status=ACTIVE, started_at=now()
- Update vehicle.active_shift_id = new shift ID
- Update driver.active_shift_id = new shift ID
- Return the ShiftLog

### endShiftViaRemittance(User $conductor, string $shiftId, float $totalCollected, float $remittedAmount): ShiftLog
- Validate the shift belongs to this conductor → if not, 403
- Validate shift status is ACTIVE → if not, 422
- Create Remittance record: shift_id, conductor_id, driver_id, vehicle_id, total_collected, remitted_amount
- Update ShiftLog: status=ENDED, ended_at=now()
- Clear vehicle.active_shift_id = null
- Clear driver.active_shift_id = null
- Return the ShiftLog

### getActiveShift(User $conductor): ?ShiftLog
- Return the conductor's current active shift (status=ACTIVE, scoped to auth conductor)
- Return null if no active shift
- Eager load: vehicle, driver, route relationships

### getShiftLogs(User $conductor, int $perPage = 15): LengthAwarePaginator
- Return paginated shift history for the authenticated conductor
- Order by started_at DESC
- Eager load: vehicle, driver, route

### getShiftDetail(User $conductor, string $shiftId): ShiftLog
- Return a single shift with all relationships
- Validate shift belongs to this conductor
- Eager load: vehicle, driver, route, remittance, transactions

## Error Responses

All methods must use the ApiResponse trait format:
- 409 Conflict: { success: false, message: 'Already on active shift' } (duplicate shift)
- 409 Conflict: { success: false, message: 'Driver already on active shift' }
- 409 Conflict: { success: false, message: 'Vehicle already on active shift' }
- 403 Forbidden: { success: false, message: 'Forbidden' }
- 422 Validation: { success: false, message: 'Validation failed', errors: {...} }

Acceptance Criteria
 Conductor can only have ONE active shift (409 on duplicate)
 Driver can only be on ONE active shift (409 on duplicate)
 Vehicle can only have ONE active shift (409 on duplicate)
 Shift ends ONLY via remittance submission — no standalone end-shift endpoint
 vehicle.active_shift_id is set on shift start, cleared on shift end
 driver.active_shift_id is set on shift start, cleared on shift end
 Remittance record is created when shift ends
 All error responses use ApiResponse format
 No business logic in controllers — all logic in ShiftService
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S2-T4 — LocationService — GPS Tracking, Vehicle Location Logic & Real-Time Broadcasting
- **ID:** `86d3c0xbe`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 20:33
- **Updated:** 2026-06-16 12:23
- **Closed:** 2026-06-16 12:23
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0xbe

**Description:**
```
Implement the GPS tracking service for real-time vehicle location updates and commuter-facing vehicle location queries. GPS updates trigger Pusher broadcast events so commuters see location changes in real-time via Laravel Echo.

## Context

During an active shift, conductors send GPS updates every ~5 seconds. These updates are stored via upsert in vehicle_locations (always latest position only). Each update also broadcasts a VehicleLocationUpdated event via Pusher so subscribed commuters receive the new position instantly. The GET /api/vehicles/locations endpoint remains as a fallback for initial load and reconnection.

## LocationService Methods

Create app/Services/LocationService.php:

### updateLocation(User $conductor, float $lat, float $lng, ?float $speed = null, ?float $heading = null, ?string $capacityStatus = null): VehicleLocation
- Validate lat range: -90 to 90 → if out of range, 422
- Validate lng range: -180 to 180 → if out of range, 422
- Get the conductor's active shift → if no active shift, 422 ('No active shift')
- Get the vehicle_id from the active shift
- Upsert vehicle_locations by vehicle_id:
  - UPDATE if vehicle_id exists: lat, lng, speed, heading, capacity_status, conductor_id, updated_at
  - INSERT if vehicle_id does not exist
- Broadcast VehicleLocationUpdated event with the updated vehicle location data
- Return the VehicleLocation

### getAllActiveLocations(): Collection
- Return all vehicles from vehicle_locations table
- No distance filter — ALL vehicles are visible to commuters at ALL times
- Join with vehicles table to include: plate_number, vehicle_type
- Join with active shifts to include: route info
- Each record should return: vehicle_id, plate_number, vehicle_type, lat, lng, speed, heading, capacity_status, route_name, updated_at
- Order by updated_at DESC (most recently updated first)
- NOTE: This endpoint serves as fallback/initial load. Real-time updates come via Pusher broadcast.

### updateCapacityStatus(User $conductor, string $status): VehicleLocation
- Validate status is one of: AVAILABLE, STANDING, FULL
- Get the conductor's active shift → if no active shift, 422
- Get the vehicle_id from the active shift
- Upsert vehicle_locations with new capacity_status
- Broadcast VehicleLocationUpdated event with updated capacity status
- Return the updated VehicleLocation

## Broadcasting Integration

When a GPS update or capacity status change occurs:
- Broadcast VehicleLocationUpdated event on the 'vehicles' Pusher channel
- Event payload includes: vehicle_id, plate_number, lat, lng, speed, heading, capacity_status, route_name, updated_at
- Commuter frontend subscribes to 'vehicles' channel via Laravel Echo to receive real-time updates
- GET /api/vehicles/locations is the fallback for initial page load and reconnection

## Capacity Status Rules

- AVAILABLE → vehicle has seats
- STANDING → vehicle is standing room only
- FULL → vehicle cannot take more passengers
- Capacity status is conductor-updated only — the frontend NEVER infers or sets this
- This is server-authoritative data

## Hard Constraints

- NO distance filter on getAllActiveLocations — visibility is unrestricted
- NO radius/radius logic in this service — that belongs to HailService (Sprint 3)
- Upsert pattern is mandatory — never append-only
- GPS updates require an active shift — no shift = no location update
- Every GPS update MUST broadcast via Pusher (no silent updates)

Acceptance Criteria
 GPS POST updates vehicle_locations via upsert (always latest position)
 GPS updates trigger VehicleLocationUpdated broadcast event
 getAllActiveLocations returns ALL vehicles with no distance filter
 Invalid lat/lng values return 422 validation error
 GPS update without an active shift returns 422
 Capacity status can only be updated by conductor with active shift
 Capacity status updates trigger VehicleLocationUpdated broadcast event
 Capacity status values are restricted to AVAILABLE, STANDING, FULL
 No duplicate vehicle records in vehicle_locations (upsert enforced)
 All responses use ApiResponse format
 No business logic in controllers — all logic in LocationService
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S2-T5 — Shift & Location API — Controllers, Routes, FormRequests & Broadcasting
- **ID:** `86d3c0xc0`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 20:33
- **Updated:** 2026-06-16 12:29
- **Closed:** 2026-06-16 12:29
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0xc0

**Description:**
```
Create API controllers, routes, FormRequest validation, and broadcast event setup for the shift lifecycle and GPS tracking endpoints. Replace Sprint 1 placeholder stubs (501) with real implementations.

## Context

Sprint 1 registered these endpoints as 501 stubs. Sprint 2 replaces them with real controllers that delegate to ShiftService and LocationService. GPS updates also trigger Pusher broadcast events so commuters receive real-time location data via Laravel Echo.

## Controllers to Update/Create

### ConductorController (update existing)

Update app/Http/Controllers/Conductor/ConductorController.php:

Replace placeholder methods with real implementations:

- shiftStatus() → delegates to ShiftService::getActiveShift()
- startShift() → delegates to ShiftService::startShift()
- endShift() → delegates to ShiftService::endShiftViaRemittance()
- updateLocation() → delegates to LocationService::updateLocation()
- remittances() → delegates to ShiftService::endShiftViaRemittance() (POST creates remittance + ends shift)
- transactions() → keep as 501 stub (Sprint 4)

### New: VehicleLocationController

Create app/Http/Controllers/VehicleLocationController.php:

- locations() → delegates to LocationService::getAllActiveLocations()
- This is the commuter-facing fallback endpoint that returns all vehicle positions
- Serves initial data load and reconnection; real-time updates come via Pusher

## Broadcast Event: VehicleLocationUpdated

Create app/Events/VehicleLocationUpdated.php implementing ShouldBroadcast:

- Broadcast on 'vehicles' channel (public channel — all authenticated users can subscribe)
- Event payload: vehicle_id, plate_number, vehicle_type, lat, lng, speed, heading, capacity_status, route_name, updated_at
- Triggered by LocationService::updateLocation() and LocationService::updateCapacityStatus()

### Broadcast Routes

Add to routes/channels.php:
- 'vehicles' channel — publicly accessible to any authenticated user

## Routes

### Update existing conductor routes:

POST /api/conductor/shifts/start — start shift (requires: vehicle_id, driver_id)
  - Auth: auth:sanctum + role:CONDUCTOR
  - Replaces the current 501 stub at /api/conductor/shift/start

POST /api/conductor/remittances — submit remittance + end shift (requires: shift_id, total_collected, remitted_amount)
  - Auth: auth:sanctum + role:CONDUCTOR
  - This replaces the current 501 stub at /api/conductor/remittances
  - NOTE: This is the ONLY way to end a shift

GET /api/conductor/shift — get active shift status
  - Auth: auth:sanctum + role:CONDUCTOR
  - Replaces the current 501 stub

GET /api/conductor/shift-logs — paginated shift history (NEW route)
  - Auth: auth:sanctum + role:CONDUCTOR

POST /api/conductor/location — GPS update (requires: lat, lng, optional: speed, heading, capacity_status)
  - Auth: auth:sanctum + role:CONDUCTOR
  - Replaces the current 501 stub
  - Triggers VehicleLocationUpdated broadcast event

### Commuter-facing route:

GET /api/vehicles/locations — all active vehicle positions
  - Auth: auth:sanctum (any authenticated role)
  - No distance filter — ALL vehicles visible
  - Response includes: vehicle_id, plate_number, vehicle_type, lat, lng, speed, heading, capacity_status, route_name, updated_at
  - This is the fallback for initial page load and reconnection
  - Real-time updates come via Pusher subscription to 'vehicles' channel

### Keep as 501 stubs (future sprints):

- GET /api/conductor/transactions — Sprint 4

## FormRequests

Create app/Http/Requests/Conductor/:

### StartShiftRequest
- vehicle_id: required, string, must exist in vehicles table
- driver_id: required, string, must exist in drivers table

### UpdateLocationRequest
- lat: required, numeric, between:-90,90
- lng: required, numeric, between:-180,180
- speed: nullable, numeric, min:0
- heading: nullable, numeric, between:0,360
- capacity_status: nullable, string, in:AVAILABLE,STANDING,FULL

### SubmitRemittanceRequest
- shift_id: required, string
- total_collected: required, numeric, min:0
- remitted_amount: required, numeric, min:0

## Response Format

All responses must use the ApiResponse trait:
- Success: { success: true, data: {...}, message: '...', errors: null, meta: null }
- Error: { success: false, data: null, message: '...', errors: {...}, meta: null }

Acceptance Criteria
 All conductor 501 stubs replaced with real implementations
 POST /api/conductor/shifts/start requires vehicle_id + driver_id
 POST /api/conductor/remittances creates remittance + ends shift (only way to end shift)
 POST /api/conductor/location validates lat/lng, upserts vehicle_locations, and broadcasts event
 GET /api/vehicles/locations returns all vehicle positions (no distance filter, fallback for initial load)
 GET /api/vehicles/locations requires authentication but works for any role
 VehicleLocationUpdated broadcast event created and fires on GPS update
 'vehicles' Pusher channel is accessible to authenticated users
 All conductor routes protected by auth:sanctum + role:CONDUCTOR
 FormRequest validation classes created for all inputs
 No standalone end-shift endpoint exists (shift ends via remittance only)
 No business logic in controllers — all logic delegated to services
 All responses use ApiResponse format
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S2-T6 — Feature Testing & End-to-End Verification
- **ID:** `86d3c0xe8`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 20:33
- **Updated:** 2026-06-16 12:52
- **Closed:** 2026-06-16 12:52
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0xe8

**Description:**
```
Create automated feature tests to validate the shift lifecycle, GPS tracking, remittance-based shift ending, real-time broadcasting, and role-based access control for Sprint 2 endpoints.

## Context

Sprint 2 introduces real business logic for the first time. Tests must verify the complete shift flow: start (with vehicle + driver selection) → GPS tracking → real-time broadcasting → remittance submission → shift end. The 409 Conflict status code is new to Sprint 2.

## ShiftTest (tests/Feature/ShiftTest.php)

Create feature tests covering shift lifecycle:

- POST /api/conductor/shifts/start with valid vehicle_id + driver_id → 200 OK
  - Response includes: shift data with conductor_id, driver_id, vehicle_id, status=ACTIVE, started_at
  - vehicle.active_shift_id is set
  - driver.active_shift_id is set

- POST /api/conductor/shifts/start when conductor already has active shift → 409 Conflict

- POST /api/conductor/shifts/start when driver already on active shift → 409 Conflict

- POST /api/conductor/shifts/start when vehicle already on active shift → 409 Conflict

- POST /api/conductor/remittances with valid data → 200 OK
  - Remittance record created with shift_id, total_collected, remitted_amount
  - Shift status = ENDED, ended_at is set
  - vehicle.active_shift_id = null
  - driver.active_shift_id = null

- POST /api/conductor/remittances without active shift → 422

- POST /api/conductor/remittances for shift belonging to another conductor → 403

- GET /api/conductor/shift with active shift → 200 OK with shift data

- GET /api/conductor/shift without active shift → 200 OK with null data

- GET /api/conductor/shift-logs → 200 OK with paginated history

## LocationTest (tests/Feature/LocationTest.php)

Create feature tests covering GPS tracking:

- POST /api/conductor/location with valid lat/lng during active shift → 200 OK
  - vehicle_locations record upserted with correct data

- POST /api/conductor/location without active shift → 422

- POST /api/conductor/location with invalid lat (out of -90 to 90) → 422 Validation Error

- POST /api/conductor/location with invalid lng (out of -180 to 180) → 422 Validation Error

- POST /api/conductor/location with capacity_status → 200 OK, status updated

- GET /api/vehicles/locations with active vehicles → 200 OK
  - Returns ALL vehicles (no distance filter)
  - Each record includes: vehicle_id, lat, lng, capacity_status

- GET /api/vehicles/locations without authentication → 401

- Commuter role cannot POST /api/conductor/location → 403

- Conductor sends GPS update → commuter fetches locations → data matches (end-to-end flow)

## BroadcastTest (tests/Feature/BroadcastTest.php)

Create feature tests covering real-time broadcasting:

- GPS update triggers VehicleLocationUpdated event on 'vehicles' channel
- Capacity status update triggers VehicleLocationUpdated event
- Event payload contains correct vehicle location data
- Shift start/end does NOT broadcast location events
- Verify broadcast event structure matches expected payload

## RoleAccessTest (tests/Feature/Sprint2RoleAccessTest.php)

Validate RBAC for Sprint 2 endpoints:

- Conductor can access all conductor shift + location endpoints
- Commuter cannot POST /api/conductor/shifts/start → 403
- Commuter cannot POST /api/conductor/location → 403
- Commuter can GET /api/vehicles/locations → 200
- Admin can GET /api/vehicles/locations → 200
- Unauthenticated request to any conductor endpoint → 401

## SchemaTest Updates (tests/Feature/SchemaTest.php)

Update existing SchemaTest:

- vehicle_locations table exists
- vehicle_locations has required columns: vehicle_id, conductor_id, lat, lng, speed, heading, capacity_status, updated_at
- shift_logs has driver_id column
- shift_logs has status column
- vehicles has active_shift_id column
- drivers has active_shift_id column
- NO wallet columns in vehicle_locations

## Expected Behavior Summary

| Case | Expected |
|------|----------|
| Valid shift start | 200 |
| Duplicate active shift (conductor) | 409 |
| Duplicate active shift (driver) | 409 |
| Duplicate active shift (vehicle) | 409 |
| Valid remittance + shift end | 200 |
| Remittance without active shift | 422 |
| Remittance wrong conductor | 403 |
| Valid GPS update | 200 |
| GPS without active shift | 422 |
| Invalid lat/lng | 422 |
| GPS update triggers broadcast | Event fired |
| Capacity update triggers broadcast | Event fired |
| Get vehicle locations (any role) | 200 |
| Wrong role on conductor endpoints | 403 |
| No auth on protected routes | 401 |

Acceptance Criteria
 All shift lifecycle tests pass (start, remittance/end, history)
 409 Conflict correctly returned for duplicate active shifts (conductor, driver, vehicle)
 Shift cannot end without remittance
 GPS upsert works correctly (no duplicate vehicle records)
 GPS updates trigger VehicleLocationUpdated broadcast event
 Capacity updates trigger VehicleLocationUpdated broadcast event
 Invalid GPS data returns 422
 GET /api/vehicles/locations returns all vehicles with no distance filter
 Commuter can view vehicle locations but cannot access conductor endpoints
 All responses use ApiResponse format
 SchemaTest updated for new tables and columns
 No wallet columns or tables exist
 All tests pass with php artisan test
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

### S2-T7 — Laravel Echo & Pusher — Real-Time Setup & Configuration
- **ID:** `86d3c0yq0`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-15 20:46
- **Updated:** 2026-06-16 13:12
- **Closed:** 2026-06-16 13:12
- **Due:** 2026-06-16 20:00
- **URL:** https://app.clickup.com/t/86d3c0yq0

**Description:**
```
Set up Laravel Echo and Pusher for real-time broadcasting of vehicle location updates. This enables commuters to receive GPS location changes instantly via WebSocket instead of polling.

## Context

Per adviser recommendation, real-time updates must use Pusher (not HTTP polling). When a conductor sends a GPS update, the backend broadcasts a VehicleLocationUpdated event via Pusher. The commuter frontend subscribes to the 'vehicles' channel via Laravel Echo and receives updates instantly. GET /api/vehicles/locations remains as a fallback for initial load and reconnection.

## Prerequisites

- Pusher account created at pusher.com (free Sandbox tier: 200k messages/day, 100 concurrent connections)
- Pusher app created in Pusher dashboard
- Obtain credentials: PUSHER_APP_ID, PUSHER_APP_KEY, PUSHER_APP_SECRET, PUSHER_APP_CLUSTER

## Backend Setup

### 1. Install Pusher PHP SDK

```
composer require pusher/pusher-php-server
```

### 2. Configure .env

Add to backend/.env:

```
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=2167016
PUSHER_APP_KEY=323230b941a07bf166d8
PUSHER_APP_SECRET=fddb5e30057caaba31f9
PUSHER_APP_CLUSTER=ap1
```

Add to backend/.env.example with placeholder values.

### 3. Configure broadcasting.php

Update config/broadcasting.php to use Pusher connection:
- driver: pusher
- key, secret, app_id, cluster from env
- options: cluster, encrypted (true), useTLS (true)

### 4. Enable BroadcastServiceProvider

Uncomment or add App\Providers\BroadcastServiceProvider in bootstrap/providers.php (Laravel 11+) so broadcast routes are registered.

### 5. Create Broadcast Event: VehicleLocationUpdated

Create app/Events/VehicleLocationUpdated.php implementing ShouldBroadcast:

- Implement ShouldBroadcast interface
- Broadcast on: Channel('vehicles') (public channel)
- Broadcast with payload:
  - vehicle_id
  - plate_number
  - vehicle_type
  - lat
  - lng
  - speed
  - heading
  - capacity_status
  - route_name
  - updated_at
- Queue: optional (use ShouldQueue for production, sync for testing)

### 6. Register Channel Authorization

Update routes/channels.php:

- 'vehicles' channel — publicly accessible to any authenticated user
- No authorization callback needed (public channel), but must be registered

## Frontend Setup (Next.js)

### 1. Install Laravel Echo + Pusher JS

```
npm install laravel-echo pusher-js
```

### 2. Create Echo Configuration

Create frontend/lib/echo.ts:

- Initialize Laravel Echo with Pusher driver
- Configure with PUSHER_APP_KEY and PUSHER_APP_CLUSTER from Next.js env
- Export singleton instance

### 3. Add Frontend Environment Variables

Add to frontend/.env.local:

```
NEXT_PUBLIC_PUSHER_APP_KEY=your_app_key
NEXT_PUBLIC_PUSHER_APP_CLUSTER=your_cluster
```

### 4. Create useVehicleLocations Hook

Create frontend/hooks/useVehicleLocations.ts:

- On mount: fetch initial data from GET /api/vehicles/locations
- Subscribe to 'vehicles' channel via Laravel Echo
- On VehicleLocationUpdated event: update vehicle location in state
- On unmount: unsubscribe from channel
- Return: { vehicles, loading, error }

## Broadcast Testing Configuration

Update phpunit.xml to use log broadcaster for tests:

```
BROADCAST_DRIVER=log
```

This prevents tests from actually sending Pusher events while allowing assertion that events were broadcast.

In test files, use Event::fake() or Broadcast::fake() to assert events were dispatched without hitting Pusher.

## Architecture Diagram

```
Conductor Phone                     Backend                         Commuter Phone
      |                                |                                  |
      |--- POST /conductor/location -->|                                  |
      |                                |-- Upsert vehicle_locations       |
      |                                |-- Broadcast VehicleLocationUpdated|
      |                                |   via Pusher                     |
      |                                |                                  |
      |                                |          Pusher Server           |
      |                                |         ============            |
      |                                |---- Push event to Pusher ------->|
      |                                |                                  |
      |                                |        Commuter subscribes       |
      |                                |        via Laravel Echo          |
      |                                |                                  |
      |                                ||
      |                                |                                  |
      |                                |                    Real-time update received!
      |                                |                    Vehicle moves on map
```

Acceptance Criteria
 Pusher PHP SDK installed and configured
 BROADCAST_DRIVER=pusher in .env
 Pusher credentials in .env (not hardcoded)
 VehicleLocationUpdated event created implementing ShouldBroadcast
 Event broadcasts on 'vehicles' channel with correct payload
 BroadcastServiceProvider enabled
 routes/channels.php registers 'vehicles' channel
 Laravel Echo + pusher-js installed in frontend
 Echo configuration created with PUSHER_APP_KEY and CLUSTER
 useVehicleLocations hook created (subscribes + initial fetch fallback)
 Frontend environment variables added (NEXT_PUBLIC_PUSHER_*)
 phpunit.xml uses BROADCAST_DRIVER=log for testing
 Pusher Sandbox free tier is sufficient for development and testing
 No credentials committed to code (all in .env)
Post-Task Requirement
Upon completion of this task, push all changes to your assigned feature branch and create a Pull Request (PR) targeting the dev branch for code review and integration.
```

---

## S3 (12 tasks)

### S3-T1 -- Hail Database Migration & HailStatus Enum
- **ID:** `86d3d6qb4`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 19:14
- **Updated:** 2026-06-19 08:02
- **Closed:** 2026-06-19 08:02
- **URL:** https://app.clickup.com/t/86d3d6qb4

**Description:**
```
Create the hails database migration and the HailStatus PHP backed enum for the server-enforced 1KM hail system.

Migration: create_hails_table

id: uuid primary key (auto-generated)
commuter_id: uuid FK -> users.id (cascadeOnDelete)
vehicle_id: uuid FK -> vehicles.id (cascadeOnDelete)
conductor_id: uuid nullable FK -> users.id (nullOnDelete)
commuter_lat: decimal(10,7)
commuter_lng: decimal(10,7)
distance_m: decimal(10,2) — computed Haversine distance at creation time
status: enum('pending','accepted','rejected','cancelled','expired') default 'pending'
expires_at: timestamp
created_at, updated_at: timestamps
Composite indexes: (vehicle_id, status), (commuter_id, status), (status, expires_at)

HailStatus Enum (follows ShiftStatus / CapacityStatus pattern):

PENDING, ACCEPTED, REJECTED, CANCELLED, EXPIRED
Backed string enum for Eloquent cast compatibility

Acceptance Criteria:

php artisan migrate creates hails table with all columns, FKs, and indexes
php artisan migrate:rollback cleanly drops the table
HailStatus enum has exactly 5 cases matching the spec
No wallet-related tables or columns introduced
```

### S3-T10 -- Frontend Commuter Hail API Route Handlers (Next.js Proxies)
- **ID:** `86d3d6tb8`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 19:26
- **Updated:** 2026-06-20 11:07
- **Closed:** 2026-06-20 11:07
- **URL:** https://app.clickup.com/t/86d3d6tb8

**Description:**
```
Create the Next.js API route handlers that proxy commuter hail requests to the Laravel backend, matching the conductor proxy route pattern in app/api/conductor/shifts/start/route.ts.

Files to Create:

frontend/app/api/commuter/hail/route.ts — handles POST (create hail)
frontend/app/api/commuter/hail/[id]/route.ts — handles DELETE (cancel hail)

POST /api/commuter/hail (route.ts):

Parse request body: { vehicle_id, commuter_lat, commuter_lng }
Validate required fields (vehicle_id, commuter_lat, commuter_lng)
Proxy to Laravel: POST /commuter/hail using commuter proxy from S3-T9
On success: return jsonData(hail, 201)
On 422 outside_radius: passthrough the error with distance_m value
On other errors: return jsonError with message

DELETE /api/commuter/hail/[id] (route.ts):

Extract hail ID from route params
Proxy to Laravel: DELETE /commuter/hail/{id}
Return mapped response

Design Notes:

Pattern is identical to app/api/conductor/shifts/start/route.ts
Uses the new commuter proxy from S3-T9
Special handling needed for 422 outside_radius error — must forward the distance_m value to the client

Acceptance Criteria:

POST to /api/commuter/hail from the browser reaches Laravel POST /api/v1/commuter/hail
DELETE to /api/commuter/hail/{id} reaches Laravel DELETE /api/v1/commuter/hail/{id}
422 outside_radius error is forwarded with distance_m value intact
Missing/invalid auth cookie returns 401
```

### S3-T11 -- Frontend Commuter Dashboard Hail Integration
- **ID:** `86d3d6uuj`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 19:31
- **Updated:** 2026-06-20 11:11
- **Closed:** 2026-06-20 11:09
- **URL:** https://app.clickup.com/t/86d3d6uuj

**Description:**
```
Wire the commuter dashboard's existing hail button to the real hail API. Implement the full create-hail, cancel-hail, and real-time status notification flow.

Files to Modify:

frontend/app/(commuter)/dashboard/use-dashboard.ts — wire handleHail() to createHail() API
frontend/components/commuter/commuter-map/commuter-map.tsx — pass commuter lat/lng up via callback

Changes to use-dashboard.ts:

Import createHail, cancelHail from lib/commuter/services/hail.service.ts
Add state: activeHailId (string|null), hailError (string|null), isSubmittingHail (boolean)
Update handleHail():
On hail initiation: call createHail(nearestVehicle.id, commuterLat, commuterLng)
On success: set isHailing=true, store activeHailId
On outside_radius error: show inline error with distance
On cancel: call cancelHail(activeHailId)
Add Laravel Echo subscription: listen on commuter.{userId}.hails channel
On 'accepted': play playHailAcceptedSound(), show success notification
On 'rejected': reset hail state, show rejection notification
On 'expired': reset hail state, show expiry notification

Changes to commuter-map.tsx:

Extend onNearbyVehiclesChange callback to also pass the commuter's own GPS coordinates
The dashboard needs commuter lat/lng for the createHail API call

Hail Button States:

Default: 'Hail Me' (enabled when canHail is true)
Submitting: 'Sending...' (disabled)
Active: 'Cancel Hail' (toggles to cancel flow)
Accepted: 'Hail Accepted!' (success state)

Acceptance Criteria:

Clicking 'Hail Me' sends POST /api/commuter/hail with nearest vehicle ID and commuter GPS coords
Successful hail shows 'Cancel Hail' button; clicking it sends DELETE
outside_radius error shows distance message to commuter
Real-time Echo events update hail status (accepted/rejected/expired)
playHailAcceptedSound() plays on acceptance notification
Commuter lat/lng are available from map component for hail creation
```

### S3-T12 -- GeoHelper Unit Test (Haversine Verification)
- **ID:** `86d3d6w39`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 19:39
- **Updated:** 2026-06-20 13:57
- **Closed:** 2026-06-20 12:44
- **URL:** https://app.clickup.com/t/86d3d6w39

**Description:**
```
Goal

Goal

Create dedicated unit tests for the backend backend Haversine implementation so that distance math is regression-proof and stays byte-for-byte aligned with the frontend, which the 1 KM hail rule depends on.

Soimplementation so that distance math is regression-proof and stays byte-for-byte aligned with the frontend, which the 1 KM hail rule depends on.

Sourcce of truth: backend/app/Helpers/GeoHelper.php on dev. Golden distance values below were computed with the exact formula and constant shipped in that file (R = 6,371,000 m).

Implementation Reference (verified against dev)

App\Helpers\GeoHelper (final class, static methods):

haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float — great-circle distance in meters.
isWithinRadius(float $lat1, float $lng1, float $lat2, float $lng2, float $radiusMeters = self::HAIL_RADIUS_M): bool — of truth: backend/app/Helpers/GeoHelper.php on dev. Golden distance values below were computed with the exact formula and constant shipped in that file (R = 6,371,000 m).

Implementation Reference (verified against dev)

App\Helpers\GeoHelper (final class, static methods):

haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float — great-circle distance in meters.
isWithinRadius(float $lat1, float $lng1, float $lat2, float $lng2, float $radiusMeters = self::HAIL_RADIUS_M): bool — returns  distance  HAIL_RADIUS_M) throw OutsideRadiusException — i.e. exactly 1000 m is allowed, matching isWithinRadius inclusivity.

File to Create

backend/tests/Unit/GeoHelperTest.php

Test Cases (10)

[table-embed:1:1 #| 1:2 Test| 1:3 Inputs (exact)| 1:4 Assertion| 2:1 1| 2:2 test_same_point_returns_zero_distance | 2:3 (14.6, 120.98) twice| 2:4 === 0.0 | 3:1 2| 3:2 test_manila_to_quezon_city_distance | 3:3 Manila City Hall (14.5906, 120.9817) → QC Quezon Ave (14.6300, 121.0100)| 3:4 5335.3777 m  ± 1 m (~5.3 km)| 4:1 3| 4:2 test_bulacan_meycauayan_to_marilao_distance | 4:3 Meycauayan (14.7361, 120.9608) → Marilao (14.7578, 120.9479)| 4:4 2783.2455 m  ± 1 m (~2.8 km)| 5:1 4| 5:2 test_boundary_exactly_1000m_is_within_radius | 5:3 (14.6, 120.98) → (14.6089932161, 120.98) [1000 m due north via meridian offset  dLat = (1000/R)·180/π ]| 5:4 isWithinRadius(...) === true  (inclusive)| 6:1 5| 6:2 test_boundary_1001m_is_outside_radius | 6:3 (14.6, 120.98) → (14.6090022093, 120.98) [1001 m north]| 6:4 isWithinRadius(...) === false | 7:1 6| 7:2 test_within_radius_boundary_is_inclusive | 7:3 any pair; pass measured distance as radius| 7:4 isWithinRadius(...,$d) === true  and  isWithinRadius(...,$d - 0.001) === false  (float-safe proof of   HAIL_RADIUS_M) throw OutsideRadiusException — i.e. exactly 1000 m is allowed, matching isWithinRadius inclusivity.

File to Create

backend/tests/Unit/GeoHelperTest.php

Test Cases (10)

[table-embed:1:1 #| 1:2 Test| 1:3 Inputs (exact)| 1:4 Assertion| 2:1 1| 2:2 test_same_point_returns_zero_distance | 2:3 (14.6, 120.98) twice| 2:4 === 0.0 | 3:1 2| 3:2 test_manila_to_quezon_city_distance | 3:3 Manila City Hall (14.5906, 120.9817) → QC Quezon Ave (14.6300, 121.0100)| 3:4 5335.3777 m  ± 1 m (~5.3 km)| 4:1 3| 4:2 test_bulacan_meycauayan_to_marilao_distance | 4:3 Meycauayan (14.7361, 120.9608) → Marilao (14.7578, 120.9479)| 4:4 2783.2455 m  ± 1 m (~2.8 km)| 5:1 4| 5:2 test_boundary_exactly_1000m_is_within_radius | 5:3 (14.6, 120.98) → (14.6089932161, 120.98) [1000 m due north via meridian offset  dLat = (1000/R)·180/π ]| 5:4 isWithinRadius(...) === true  (inclusive)| 6:1 5| 6:2 test_boundary_1001m_is_outside_radius | 6:3 (14.6, 120.98) → (14.6090022093, 120.98) [1001 m north]| 6:4 isWithinRadius(...) === false | 7:1 6| 7:2 test_within_radius_boundary_is_inclusive | 7:3 any pair; pass measured distance as radius| 7:4 isWithinRadius(...,$d) === true  and  isWithinRadius(...,$d - 0.001) === false  (float-safe proof of  <= )| 8:1 7| 8:2 test_cross_hemisphere_coordinates | 8:3 (-14.6, -120.98) → (-14.59, -120.97)| 8:4 1547.3698 m  ± 1 m (negative lat/lng handled)| 9:1 8| 9:2 test_distance_is_symmetric | 9:3 A↔B from case 2| 9:4 haversine(A,B) === haversine(B,A) | 10:1 9| 10:2 test_hail_radius_constant_is_1000 | 10:3 —| 10:4 GeoHelper::HAIL_RADIUS_M === 1000 | 11:1 10| 11:2 test_earth_radius_constant_is_6371000 | 11:3 —| 11:4 GeoHelper::EARTH_RADIUS_M === 6_371_000  (frontend parity guard)|]
Design Notes

Pure unit test: extends Tests\TestCase, no RefreshDatabase, no DB, no HTTP. Lives in the Unit suite.
Golden values are deterministic across PHP/Python/JS (IEEE-754 + identical formula); 1 m tolerance absorbs platform float noise while still catching real regressions (changed R, broken formula).
Boundary points are built by inverse-meridian offset (same longitude) so the measured distance lands on ann exact integer meter — verified: 1000 m point measures 1000.000000 m, 1001 m point measures 1001.000000 m.
isWithinRadius cannot be fed a raw distance; tests must pass coordinate pairs (or use case 6's radius-parameter technique to prove <= semantics float-safely).

Acceptance Criteria

All 10 tests pass via php artisan test --filter=GeoHelperTest.
Golden distances (cases 2, 3, 7) match within 1 m.
Inclusive boundary verified: exactly 1000 m → inside (case 4); 1001 m → outside (case 5); <= semantics proven (case 6).
HAIL_RADIUS_M === 1000 and EARTH_RADIUS_M === 6_371_000 asserted.
Distance is symmetric (case 8).

Newly Documented Behavior

isWithinRadius signature includes an optional $radiusMeters defaulting to HAIL_RADIUS_M, and the boundary is inclusive (<=). The original spec implied a distance-in/distance-out API; the real API is coordinate-based.
The 1 KM rule is single-sourced on the backend via GeoHelper::HAIL_RADIUS_M, consumed by HailService.

Out of Scope / Risks

Frontend parity is not automatically enforced. Backend and frontend share the same formula and EARTH_RADIUS_M, but there is no cross-language test. Case 10 guards the constant only. If lib/utils/geo.ts diverges, this suite won't catch it.
The frontend 1 KM constant is duplicated (RADIUS_M = 1000 in conductor-map.tsx / nearby-detector.ts), not imported from a shared source — a drift risk for a future task, outside this unit test.
Task is labeled S3 but currently sits in the "dev sprint 2" status column (metadata only).
Test code is not yet implemented — this task now carries the finalized, build-ready spec. integer meter — verified: 1000 m point measures 1000.000000 m, 1001 m point measures 1001.000000 m.
isWithinRadius cannot be fed a raw distance; tests must pass coordinate pairs (or use case 6's radius-parameter technique to prove <= semantics float-safely).

Acceptance Criteria

All 10 tests pass via php artisan test --filter=GeoHelperTest.
Golden distances (cases 2, 3, 7) match within 1 m.
Inclusive boundary verified: exactly 1000 m → inside (case 4); 1001 m → outside (case 5); <= semantics proven (case 6).
HAIL_RADIUS_M === 1000 and EARTH_RADIUS_M === 6_371_000 asserted.
Distance is symmetric (case 8).

Newly Documented Behavior

isWithinRadius signature includes an optional $radiusMeters defaulting to HAIL_RADIUS_M, and the boundary is inclusive (<=). The original spec implied a distance-in/distance-out API; the real API is coordinate-based.
The 1 KM rule is single-sourced on the backend via GeoHelper::HAIL_RADIUS_M, consumed by HailService.

Out of Scope / Risks

Frontend parity is not automatically enforced. Backend and frontend share the same formula and EARTH_RADIUS_M, but there is no cross-language test. Case 10 guards the constant only. If lib/utils/geo.ts diverges, this suite won't catch it.
The frontend 1 KM constant is duplicated (RADIUS_M = 1000 in conductor-map.tsx / nearby-detector.ts), not imported from a shared source — a drift risk for a future task, outside this unit test.
Task is labeled S3 but currently sits in the "dev sprint 2" status column (metadata only).
Test code is not yet implemented — this task now carries the finalized, build-ready spec.
```

### S3-T2 -- Hail Eloquent Model & Relationships
- **ID:** `86d3d6qbd`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 19:14
- **Updated:** 2026-06-19 09:10
- **Closed:** 2026-06-19 09:10
- **URL:** https://app.clickup.com/t/86d3d6qbd

**Description:**
```
Create the Hail Eloquent model with UUID primary key, enum casts, fillable fields, relationships, and query scopes.

Model: App\Models\Hail

UUID PK with auto-generation in booted() — same pattern as Vehicle, Driver models
incrementing = false, keyType = 'string'
fillable: commuter_id, vehicle_id, conductor_id, commuter_lat, commuter_lng, distance_m, status, expires_at
Casts: status -> HailStatus::class, commuter_lat/lng -> decimal:7, distance_m -> decimal:2, expires_at -> datetime

Relationships:

commuter() -> belongsTo(User::class, 'commuter_id')
vehicle() -> belongsTo(Vehicle::class)
conductor() -> belongsTo(User::class, 'conductor_id') — nullable

Query Scopes:

scopePending(Builder) -> where status = PENDING
scopeForVehicle(Builder, vehicleId) -> where vehicle_id
scopeExpired(Builder) -> where status = PENDING AND expires_at < now()

Acceptance Criteria:

Model can be created and persisted with valid data
Scopes filter correctly (pending, for-vehicle, expired)
Relationships resolve to correct User/Vehicle records
UUID auto-generates on creation
```

### S3-T3 -- GeoHelper Utility (Server-Side Haversine Distance)
- **ID:** `86d3d6qgr`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 19:15
- **Updated:** 2026-06-19 09:15
- **Closed:** 2026-06-19 09:15
- **URL:** https://app.clickup.com/t/86d3d6qgr

**Description:**
```
Create a reusable GeoHelper utility class with the Haversine distance formula, mirroring the frontend haversineMeters() from lib/utils/geo.ts. This is the backend single source of truth for the 1KM hail radius rule.

File: app/Helpers/GeoHelper.php

Constants:

EARTH_RADIUS_M = 6,371,000 (matches frontend implementation exactly)
HAIL_RADIUS_M = 1000 — the 1KM hard limit for hail creation

Static Methods:

haversineMeters(float lat1, float lng1, float lat2, float lng2): float — standard Haversine formula using atan2, must produce identical results to the frontend implementation
isWithinRadius(float lat1, float lng1, float lat2, float lng2, float radiusMeters = HAIL_RADIUS_M): bool — convenience wrapper

Design Notes:

Pure static utility class, no state, no dependencies
Formula must match frontend lib/utils/geo.ts exactly (same Earth radius, same atan2-based calculation)
HAIL_RADIUS_M constant is referenced by HailService — changing it here changes the rule everywhere
PSR-4 autoloaded under App\Helpers namespace

Acceptance Criteria:

Same-point distance returns 0
Two known points ~500m apart return approximately 500
Two known points ~1500m apart return approximately 1500
isWithinRadius returns true at 500m, false at 1500m
```

### S3-T4 -- HailService (Hail Lifecycle Business Logic & Radius Enforcement)
- **ID:** `86d3d6qgv`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 19:15
- **Updated:** 2026-06-19 09:30
- **Closed:** 2026-06-19 09:30
- **URL:** https://app.clickup.com/t/86d3d6qgv

**Description:**
```
Create HailService with all hail lifecycle methods. This service is the sole gatekeeper for the 1KM radius rule — the frontend radius check is display-only.

File: app/Services/HailService.php
File: app/Exceptions/OutsideRadiusException.php

Methods:

createHail(User commuter, string vehicleId, float commuterLat, float commuterLng): Hail
Verify commuter role (abort 403)
Reject duplicate pending hail for same commuter (abort 409)
Fetch latest vehicle position from vehicle_locations table
Compute Haversine distance via GeoHelper::haversineMeters()
If distance > GeoHelper::HAIL_RADIUS_M -> throw OutsideRadiusException(distance)
Verify vehicle has active shift via ShiftLog (abort 422 if not on duty)
Create hail record with expires_at = now() + 3 minutes
Dispatch HailCreated broadcast event
Return Hail model
cancelHail(User commuter, string hailId): Hail
Find hail, verify commuter_id matches (abort 403), verify status is pending
Update status to CANCELLED
Dispatch HailStatusChanged event
acceptHail(User conductor, string hailId): Hail
Find hail, verify conductor has active shift on hail's vehicle (abort 403)
Verify hail is pending and not expired (abort 422)
Update status to ACCEPTED, set conductor_id
Dispatch HailStatusChanged event
rejectHail(User conductor, string hailId): Hail
Same vehicle ownership check as acceptHail
Update status to REJECTED
Dispatch HailStatusChanged event
getPendingHailsForVehicle(string vehicleId): Collection
Return pending, non-expired hails for vehicle, eager-load commuter, ordered by created_at desc
expireStaleHails(): int
Bulk update: status pending AND expires_at  status expired
Return count of expired hails

OutsideRadiusException: Extends Exception, carries public float distanceMeters for the 422 response body { error: 'outside_radius', distance_m: N }

Acceptance Criteria:

createHail at 500m succeeds with 201
createHail at 1500m throws OutsideRadiusException with correct distance
Duplicate pending hail for same commuter returns 409
cancelHail only works for owning commuter
acceptHail only works for conductor on correct vehicle's shift
expireStaleHails transitions old pending hails to expired
```

### S3-T5 -- CreateHailRequest FormRequest Validation
- **ID:** `86d3d6rt6`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 19:20
- **Updated:** 2026-06-19 09:33
- **Closed:** 2026-06-19 09:33
- **URL:** https://app.clickup.com/t/86d3d6rt6

**Description:**
```
Create the CreateHailRequest form request for commuter hail creation, following the StartShiftRequest and UpdateLocationRequest validation patterns.

File: app/Http/Requests/Commuter/CreateHailRequest.php

Validation Rules:

vehicle_id: required|uuid|exists:vehicles,id
commuter_lat: required|numeric|between:-90,90
commuter_lng: required|numeric|between:-180,180

Custom Error Messages:

vehicle_id.required: 'Vehicle is required'
vehicle_id.exists: 'Vehicle not found'
commuter_lat.required: 'Commuter latitude is required'
commuter_lat.between: 'Latitude must be between -90 and 90'
commuter_lng.required: 'Commuter longitude is required'
commuter_lng.between: 'Longitude must be between -180 and 180'

Design Notes:

authorize() returns true — role checking is handled by route-level role:COMMUTER middleware
Shape/type validation only — business logic checks (active shift, radius) are in HailService
Follows same pattern as StartShiftRequest (validated data passed to service layer)

Acceptance Criteria:

Missing vehicle_id returns 422 with validation error
Invalid lat/lng values (e.g., lat=200) return 422
Non-existent vehicle UUID returns 422
Valid payload passes validation and reaches controller
```

### S3-T6 -- Hail Controllers, API Routes & Rate Limiting
- **ID:** `86d3d6rt7`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 19:20
- **Updated:** 2026-06-19 09:39
- **Closed:** 2026-06-19 09:39
- **URL:** https://app.clickup.com/t/86d3d6rt7

**Description:**
```
Create HailController (commuter-side) and ConductorHailController (conductor-side). Register all hail routes in api.php and add commuter-hail rate limiter.

Files to Create:

app/Http/Controllers/Commuter/HailController.php
app/Http/Controllers/Conductor/ConductorHailController.php

Files to Modify:

routes/api.php — add hail routes inside existing middleware groups
app/Providers/AppServiceProvider.php — add commuter-hail rate limiter

HailController (commuter):

store(CreateHailRequest): POST /commuter/hail -> calls HailService::createHail(), catches OutsideRadiusException for 422 { error: 'outside_radius', distance_m: N } response, returns 201 on success
destroy(Request, id): DELETE /commuter/hail/{id} -> calls HailService::cancelHail()

ConductorHailController:

index(Request): GET /conductor/hails -> find conductor's active shift, call HailService::getPendingHailsForVehicle()
accept(Request, id): POST /conductor/hails/{id}/accept -> calls HailService::acceptHail()
reject(Request, id): POST /conductor/hails/{id}/reject -> calls HailService::rejectHail()

Routes (inside existing middleware groups in api.php):

Commuter group (auth:sanctum + role:COMMUTER):
POST /hail -> HailController@store (throttle:commuter-hail)
DELETE /hail/{id} -> HailController@destroy (throttle:commuter-hail)
Conductor group (auth:sanctum + role:CONDUCTOR):
GET /hails -> ConductorHailController@index (throttle:conductor-read)
POST /hails/{id}/accept -> ConductorHailController@accept (throttle:conductor-mutation)
POST /hails/{id}/reject -> ConductorHailController@reject (throttle:conductor-mutation)

Rate Limiter (AppServiceProvider):

commuter-hail: 10 req/min per user (one hail at a time with headroom for cancel + retry)

Acceptance Criteria:

POST /api/v1/commuter/hail at 500m -> 201 Created
POST /api/v1/commuter/hail at 1500m -> 422 with outside_radius error and distance_m
DELETE /api/v1/commuter/hail/{id} -> 200 with status=cancelled
GET /api/v1/conductor/hails -> 200 with pending hails for conductor's vehicle
POST /api/v1/conductor/hails/{id}/accept -> 200 with status=accepted
POST /api/v1/conductor/hails/{id}/reject -> 200 with status=rejected
Admin/conductor cannot POST commuter hail -> 403
Commuter cannot access conductor hail endpoints -> 403
```

### S3-T7 -- Hail Expiry Scheduler (Artisan Command & Schedule)
- **ID:** `86d3d6t3h`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 19:22
- **Updated:** 2026-06-19 09:42
- **Closed:** 2026-06-19 09:42
- **URL:** https://app.clickup.com/t/86d3d6t3h

**Description:**
```
Create a scheduled Artisan command to auto-expire pending hails after their 3-minute TTL. This is the first queued/scheduled job in the project.

File to Create: app/Console/Commands/ExpireStaleHails.php
File to Modify: routes/console.php — register the schedule

ExpireStaleHails Command:

Signature: hails:expire
Calls HailService::expireStaleHails()
Logs count of expired hails via this->info()
No arguments or options needed

Schedule Registration (routes/console.php):

Schedule::command('hails:expire')->everyMinute()

Design Notes:

Running every minute is adequate — 3min TTL means a hail lives at most ~4 minutes (3min + up to 1min before next scheduler tick)
The scheduler approach is simpler than delayed queue jobs and aligns with the sprint spec ('queue job or scheduler')
Requires php artisan schedule:work or schedule:run to be running in production

Acceptance Criteria:

php artisan hails:expire transitions pending hails past expires_at to expired status
Hails not yet past expires_at remain pending
Command outputs count of expired hails (e.g., '3 hails expired')
Schedule is registered and appears in php artisan schedule:list
```

### S3-T8 -- Pusher Broadcast Events for Real-Time Hail Notifications
- **ID:** `86d3d6t3n`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 19:22
- **Updated:** 2026-06-19 10:10
- **Closed:** 2026-06-19 10:10
- **URL:** https://app.clickup.com/t/86d3d6t3n

**Description:**
```
Create broadcast events for real-time hail state push notifications to both commuters and conductors, reducing polling dependence.

Files to Create:

app/Events/HailCreated.php
app/Events/HailStatusChanged.php

HailCreated Event:

Implements ShouldBroadcast (queue-based, matches VehicleLocationUpdated pattern)
Broadcasts on Channel('vehicle.{vehicle_id}.hails') — scoped to the vehicle
Payload: hail_id, commuter_name, commuter_lat, commuter_lng, distance_m, expires_at
broadcastAs(): 'HailCreated'
Triggered after successful HailService::createHail()

HailStatusChanged Event:

Implements ShouldBroadcast
Broadcasts on Channel('commuter.{commuter_id}.hails') — scoped to the commuter
Payload: hail_id, status, conductor_id, vehicle_id
broadcastAs(): 'HailStatusChanged'
Triggered after acceptHail(), rejectHail(), cancelHail(), and expireStaleHails()

Integration with HailService:

After createHail() success: broadcast(new HailCreated(hail))
After acceptHail(): broadcast(new HailStatusChanged(hail))
After rejectHail(): broadcast(new HailStatusChanged(hail))
After cancelHail(): broadcast(new HailStatusChanged(hail))

Design Notes:

Uses public channels (matches existing VehicleLocationUpdated on Channel('vehicles'))
Channels are namespaced by vehicle_id/commuter_id — minimal data leakage risk for MVP
Can be upgraded to PrivateChannel in future sprint by adding routes/channels.php callbacks

Acceptance Criteria:

Creating a hail fires HailCreated on the vehicle's channel
Accepting/rejecting/cancelling fires HailStatusChanged on the commuter's channel
Events are queue-dispatched (not synchronous)
Events can be captured in tests using Event::fake()
```

### S3-T9 -- Frontend Commuter Proxy Infrastructure & Hail Service
- **ID:** `86d3d6tb7`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-18 19:26
- **Updated:** 2026-06-19 10:24
- **Closed:** 2026-06-19 10:24
- **URL:** https://app.clickup.com/t/86d3d6tb7

**Description:**
```
Build the commuter-side server proxy layer (mirroring the conductor proxy pattern in lib/conductor/server/proxy.ts) and create the client-side commuter hail service.

Files to Create:

frontend/lib/commuter/server/proxy.ts — commuter-scoped proxy to Laravel backend
frontend/lib/commuter/services/hail.service.ts — client-side hail API service

Files to Modify:

frontend/lib/commuter/endpoints.ts — update tracking.hail path to /api/commuter/hail (align with roadmap)
frontend/lib/commuter/types.ts — add CommuterHailData type

Commuter Proxy (lib/commuter/server/proxy.ts):

Mirrors lib/conductor/server/proxy.ts exactly
Reads chatco_session cookie, forwards as Authorization: Bearer header
proxyToLaravel(request, path, options) -> ProxyResult
API_URL from process.env.API_URL, API_V1 = '/api/v1'

Hail Service (lib/commuter/services/hail.service.ts):

createHail(vehicleId: string, lat: number, lng: number): Promise
cancelHail(hailId: string): Promise
Uses api.post() and api.delete() from shared API client

Endpoint Updates (lib/commuter/endpoints.ts):

tracking.hail: '/api/commuter/hail'
tracking.cancelHail: (id: string) => '/api/commuter/hail/{id}'

CommuterHailData Type:

id, vehicleId, status ('pending'|'accepted'|'rejected'|'cancelled'|'expired'), distanceM, expiresAt, createdAt

Acceptance Criteria:

Commuter proxy correctly forwards requests to Laravel with auth token from cookie
createHail() sends POST with { vehicle_id, commuter_lat, commuter_lng }
cancelHail() sends DELETE to correct URL
Endpoint registry reflects roadmap paths (not legacy /tracking/hail)
```

---

## S4 (13 tasks)

### S4 CLEAN UP GUIDE
- **ID:** `86d3dv5cb`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-21 16:29
- **Updated:** 2026-06-22 21:08
- **Closed:** 2026-06-22 21:08
- **URL:** https://app.clickup.com/t/86d3dv5cb

**Description:**
```
# Handoff Guide: Conductor Cash Flow (Sprint 4)

Here's a complete guide to hand off to your groupmate. Copy/paste this into your team chat (Discord, Slack, Teams, etc.).

---

## 📋 What was done (Sprint 4 — S4-T1 through S4-T9)

The conductor cash fare flow is now **fully wired to the real backend**. Previously, cash fares lived only in the browser's localStorage; now they persist to the MySQL database.

**What works now:**
- Recording a cash fare → `POST /api/v1/conductor/transactions` → saved to DB as `PAID`
- End-of-Day page → reads the real cash-vs-GCash split from `GET /api/v1/conductor/earnings`
- Remittance → `POST /api/v1/conductor/remittances` (saves remittance row) + `POST /api/v1/conductor/shifts/end` (ends shift in DB)
- Offline fallback: if the backend is down, fares save to localStorage and sync later
- GCash flow: `PaymentService` is fully integrated with PayMongo (S4-T3), but needs a sandbox API key to test live

**What is NOT done yet (deferred):**
- PayMongo sandbox account setup (need API key + webhook secret)
- GCash QR scanning UI (frontend commuter side)
- Frontend throttling tuning (I temporarily disabled backend rate limits for testing)

---

## 🛠️ What your groupmate needs to do

### 1. Pull the latest code

```bash
git checkout sprintMhak
git pull origin sprintMhak
```

### 2. Run the database migration

A new migration was added for the transactions table:

```bash
cd backend
php artisan migrate
```

**Verify it ran:** You should see `2026_06_21_000001_finalize_transactions_table_for_s4` in the migration list. The `transactions` table should now have these new columns:
- `status` (PENDING | PAID | FAILED)
- `qr_token` (for GCash binding QR)
- `paymongo_intent_id`
- `paymongo_checkout_url`
- `paid_at`

### 3. Add PayMongo sandbox keys (for GCash testing)

Get a sandbox account at https://dashboard.paymongo.com/developers/api-keys

Add to `backend/.env`:
```
PAYMONGO_SECRET_KEY=sk_test_your_sandbox_key
PAYMONGO_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 4. Clear all caches

```bash
cd backend
php artisan route:clear
php artisan config:clear
php artisan cache:clear
```

### 5. Re-enable rate limiting (IMPORTANT)

I temporarily **disabled all conductor throttling** to unblock testing. Before merging to `dev`, re-enable it.

Open `backend/routes/api.php`. Find the conductor routes (around line 64). They currently look like this (no throttle):
```php
Route::get('/shift', [ConductorController::class, 'shiftStatus']);
Route::post('/transactions', [ConductorController::class, 'storeTransaction']);
```

Change them back to include throttling, but use **higher limits** to handle the frontend's polling:
```php
Route::get('/shift', [ConductorController::class, 'shiftStatus'])->middleware('throttle:conductor-read');
Route::get('/shift-logs', [ConductorController::class, 'shiftLogs'])->middleware('throttle:conductor-read');
Route::get('/profile', [ConductorController::class, 'profile'])->middleware('throttle:conductor-read');
Route::get('/units', [ConductorController::class, 'units'])->middleware('throttle:conductor-read');
Route::get('/drivers', [ConductorController::class, 'drivers'])->middleware('throttle:conductor-read');
Route::post('/shifts/start', [ConductorController::class, 'startShift'])->middleware('throttle:conductor-mutation');
Route::post('/remittances', [ConductorController::class, 'remittances'])->middleware('throttle:conductor-mutation');
Route::post('/location', [ConductorController::class, 'updateLocation'])->middleware('throttle:conductor-gps');
Route::post('/capacity-status', [ConductorController::class, 'updateCapacityStatus'])->middleware('throttle:conductor-write');
Route::get('/transactions', [ConductorController::class, 'transactions'])->middleware('throttle:conductor-read');
Route::post('/transactions', [ConductorController::class, 'storeTransaction'])->middleware('throttle:conductor-write');
Route::post('/payments/gcash/initiate', [ConductorController::class, 'initiateGcash'])->middleware('throttle:conductor-write');
Route::get('/earnings', [ConductorController::class, 'earnings'])->middleware('throttle:conductor-read');
Route::get('/hails', [ConductorHailController::class, 'index'])->middleware('throttle:conductor-read');
Route::post('/hails/{id}/accept', [ConductorHailController::class, 'accept'])->middleware('throttle:conductor-mutation');
Route::post('/hails/{id}/reject', [ConductorHailController::class, 'reject'])->middleware('throttle:conductor-mutation');
```

Also, update the rate limits in `backend/app/Providers/AppServiceProvider.php` to be higher (the frontend polls aggressively):
```php
// Inside configureRateLimiting()
RateLimiter::for('conductor-read', function (Request $request) use ($rateLimitResponse) {
    return Limit::perMinute(200)  // Was 60, bumped to 200 for polling
        ->by($request->user()?->id ?: $request->ip())
        ->response($rateLimitResponse);
});
```

### 6. Run the tests

```bash
cd backend
php artisan test --filter=TransactionFlowTest
```

All 20 tests should pass.

### 7. Test the full conductor cash flow

1. Start the backend: `php artisan serve`
2. Start the frontend: `cd frontend && npm run dev`
3. Log in as `conductor1@gmail.com` / `password123`
4. Start a shift
5. Record a cash fare
6. Go to End of Day → verify the cash total is correct
7. Click "Remit to Admin" → verify the success
```

### S4-T1 - Transaction Schema Finalization & Eloquent Model
- **ID:** `86d3dqrju`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-20 21:40
- **Updated:** 2026-06-21 15:55
- **Closed:** 2026-06-21 15:55
- **URL:** https://app.clickup.com/t/86d3dqrju

**Description:**
```
Finalize the transactions table and Transaction model so cash and GCash fares persist per the clarified Sprint 4 flow. Cash is recorded immediately as PAID from the fare matrix (no fare-point UUIDs). GCash uses an in-app binding QR generated by the conductor plus PayMongo SANDBOX authorize; the row starts PENDING and flips to PAID via the webhook. GCash earnings are record-only (not physically remitted); cash is physically remitted. No wallet / balance anywhere.

Migration (new, additive, guarded with hasColumn, must run on MySQL dev + SQLite tests)

Make pickup_stop_id and dropoff_stop_id NULLABLE (cash fares have no fare_point UUID).
payment_method: string, values CASH | GCASH, default CASH. (Collapse the old GCash_Scanned / GCash_Direct / Voucher values into a single GCASH.)
status: string, values PENDING | PAID | FAILED. Cash inserts PAID; GCash inserts PENDING.
paymongo_intent_id: nullable string (the PayMongo PaymentIntent id).
paymongo_checkout_url: nullable text (the PayMongo hosted authorize URL returned by /attach).
qr_token: nullable string, UNIQUE + indexed. Opaque random token embedded in the conductor binding QR; the commuter app sends it to claim the transaction. NEVER put the raw transaction id in the QR.
paid_at: nullable timestamp.
passenger_id: keep nullable FK to commuter_profiles; set when a commuter scans/claims a GCash transaction (stays null for cash).

Model (App\Models\Transaction)

fillable += payment_method, status, paymongo_intent_id, paymongo_checkout_url, qr_token, paid_at.
casts: paid_at => datetime; final_amount / base_fare / discount_amount => decimal:2.
relationships: shiftLog (shift_id -> shift_logs.shift_id), passenger (commuter_profiles), pickupStop / dropoffStop (fare_points, nullable).
query scopes: scopeCash, scopeGcash, scopePaid (used by the earnings breakdown in S4-T2).

Acceptance Criteria

A cash transaction inserts with null pickup/dropoff stop ids and status PAID.
A GCash transaction inserts with status PENDING, a populated unique qr_token, and passenger_id null until claimed.
New columns are fillable; migration runs clean on MySQL and SQLite.
No wallet table or balance column is introduced.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S4-T11 - Frontend Commuter Payment History Integration
- **ID:** `86d3dqrkw`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-20 21:41
- **Updated:** 2026-06-22 21:07
- **Closed:** 2026-06-22 21:07
- **URL:** https://app.clickup.com/t/86d3dqrkw

**Description:**
```
Wire the commuter Payment History UI to the backend (cash + GCash).

Files to Create / Modify

frontend/app/api/commuter/payments/route.ts - GET proxy to Laravel GET /api/v1/commuter/payments (cookie auth).
frontend/lib/commuter/services/ - a payment-history service (map snake_case -> camelCase; amounts as numbers).
frontend/components/commuter/modals/payment-history-modal.tsx - render real data with loading / empty / error states; show payment_method (Cash / GCash) and status (PAID / PENDING / FAILED) and date.

Acceptance Criteria

The modal lists the authed commuter real transactions (cash + GCash).
Only the commuter own payments are shown.
401 / unauthenticated handled gracefully.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S4-T2 - TransactionService (Fare Recording, Listing & Idempotency)
- **ID:** `86d3dqrjv`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-20 21:40
- **Updated:** 2026-06-22 06:46
- **Closed:** 2026-06-22 06:46
- **URL:** https://app.clickup.com/t/86d3dqrjv

**Description:**
```
Create TransactionService holding ALL fare/payment business logic (controllers stay thin). Covers cash recording, GCash initiation/claim/confirmation, listing, and the cash-vs-GCash earnings split.

Context

Cash is recorded immediately as PAID. GCash is a two-party binding flow: the conductor initiates (PENDING + binding QR), the commuter claims by scanning, then PayMongo confirms via webhook (S4-T3 / S4-T6). GCash earnings are record-only; cash is the remitted figure.

Methods

recordCashFare(conductor, data): resolve the conductor active shift; persist final_amount + base_fare + distance + discount_amount + denormalized conductor_name / unit_number / driver_name + pickup_name / dropoff_name; payment_method=CASH, status=PAID, paid_at=now. Returns the Transaction.
initiateGcashFare(conductor, data): resolve active shift; create a PENDING GCASH transaction with a generated unique qr_token (Str::random/uuid); call PaymentService::createGcashIntent(amountCentavos, meta) and store paymongo_intent_id + paymongo_checkout_url. Return { transaction, qr_token, checkout_url, amount, expires_at }.
claimGcash(commuter, qrToken): find the PENDING transaction by qr_token (404 if missing, 410 if expired/already PAID); set passenger_id to the commuter commuter_profile; return { transaction_id, checkout_url, amount, pickup_name, dropoff_name }. Idempotent for the same commuter; 409 if a different commuter already claimed it.
markPaid(transaction): set status=PAID, paid_at=now. Idempotent (no-op if already PAID). Called by the webhook.
markFailed(transaction): set status=FAILED. Called by the webhook.
getShiftTransactions(conductor, shiftId): list, scoped to the conductor own shift (403/422 otherwise).
getShiftEarnings(conductor, shiftId): return { cash_total, gcash_total, total } where cash_total = sum of CASH+PAID, gcash_total = sum of GCASH+PAID. Feeds end-of-day + remittance (cash_total is the remit figure; gcash_total is record-only).

Rules

Conductor must own the active shift.
Idempotency on recordCashFare via a client idempotency_key (or natural key: shift + amount + pickup + dropoff within a short window) to survive double-submit.
GCash only counts toward earnings after PAID. No wallet / balance side effects anywhere.

Acceptance Criteria

Cash persists with status PAID; GCash persists PENDING then PAID via markPaid.
claimGcash binds passenger_id and is idempotent / blocks a second commuter.
getShiftEarnings returns a correct cash vs GCash split.
Double-submitting a cash fare does not create a duplicate row.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S4-T3 - PaymentService (PayMongo GCash Wrapper - Sandbox)
- **ID:** `86d3dqrjw`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-20 21:40
- **Updated:** 2026-06-22 06:46
- **Closed:** 2026-06-22 06:46
- **URL:** https://app.clickup.com/t/86d3dqrjw

**Description:**
```
Wrap the PayMongo API for GCash payments in SANDBOX. No wallet, no internal balance.

IMPORTANT - how PayMongo GCash actually works (read first)

Our app QR is an INTERNAL binding QR (see S4-T10 / S4-T12) - it is scanned by OUR commuter app, NOT by the GCash app. PayMongo GCash itself is a redirect/authorize flow: PayMongo returns a hosted checkout_url. In SANDBOX that page shows "Authorize Test Payment" / "Fail Test Payment" buttons (NO number / PIN / OTP - those appear only in LIVE). Sandbox cannot validate a real balance; success vs failure is chosen via those test buttons. The ONLY differences between sandbox and live are the API key and that authorize page - so live requires zero code change, just the key.

Config

PAYMONGO_SECRET_KEY and PAYMONGO_WEBHOOK_SECRET in .env only (never in code). Add a paymongo block to config/services.php.
Base URL https://api.paymongo.com/v1. Auth: HTTP Basic, username = secret key, password empty -> header Authorization: Basic base64(secret + ":").
Sandbox vs live is inferred from the key prefix (sk_test_ vs sk_live_); expose isSandbox().

Methods

createGcashIntent(int amountCentavos, array meta): (peso * 100 = centavos)
POST /payment_intents { amount, currency: "PHP", payment_method_allowed: ["gcash"], capture_type: "automatic", metadata } -> intent id.
POST /payment_methods { type: "gcash" } -> payment_method id.
POST /payment_intents/{id}/attach { payment_method, return_url } -> response next_action.redirect.url = checkout_url.
Return { intent_id, checkout_url }.
verifyIntent(string intentId): GET /payment_intents/{id}; map attributes.status -> succeeded=PAID, awaiting_next_action/awaiting_payment_method/processing=PENDING, anything else=FAILED.
Use the Laravel Http client with a timeout; throw on non-2xx; log the PayMongo error body (never the key).

Acceptance Criteria

createGcashIntent returns intent_id + checkout_url with NO wallet credit / stored funds.
verifyIntent returns the live PayMongo status.
Secret read from .env; nothing hardcoded; works against the sk_test_ sandbox key.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S4-T4 - Fare & Payment FormRequest Validation
- **ID:** `86d3dqrk0`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-20 21:40
- **Updated:** 2026-06-22 06:46
- **Closed:** 2026-06-22 06:46
- **URL:** https://app.clickup.com/t/86d3dqrk0

**Description:**
```
Validate the three fare/payment payloads via FormRequests (no inline validation in controllers). Server-generated fields (qr_token, paymongo_*, status, paid_at) are NEVER accepted from the client.

RecordCashRequest (POST /conductor/transactions)

payment_method: required, in: CASH
final_amount: required, numeric, min:0
pickup_name / dropoff_name: required string
base_fare / distance / discount_amount: nullable numeric
passenger_name / passenger_role: nullable string
pickup_stop_id / dropoff_stop_id: nullable, exists in fare_points
idempotency_key: nullable string (de-dupe double-submit)

InitiateGcashRequest (POST /conductor/payments/gcash/initiate)

payment_method: required, in: GCASH
final_amount: required, numeric, min:1 (PayMongo minimum)
pickup_name / dropoff_name: required string
base_fare / distance / discount_amount: nullable numeric

ClaimGcashRequest (POST /commuter/payments/claim)

qr_token: required string

Acceptance Criteria

Missing/invalid required fields return 422 with errors in ApiResponse format.
Client-supplied qr_token / status / paymongo_* on the cash/initiate requests are ignored (not mass-assignable through validated()).
authorize() returns true (role enforced at the route level).

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S4-T5 - Transaction & Payment Controllers, Routes & Rate Limiting
- **ID:** `86d3dqrk4`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-20 21:40
- **Updated:** 2026-06-22 06:46
- **Closed:** 2026-06-22 06:46
- **URL:** https://app.clickup.com/t/86d3dqrk4

**Description:**
```
Replace the Sprint 4 501 stubs with thin controllers + routes for cash recording, GCash initiate/claim, status polling, webhook, earnings, and commuter history. All logic delegates to TransactionService / PaymentService.

Routes (api/v1)

Conductor (auth:sanctum + role:CONDUCTOR; throttle:conductor-write on POSTs):

POST /conductor/transactions -> record cash fare (TransactionService::recordCashFare) -> 201
GET  /conductor/transactions?shift_id={id} -> list shift transactions
POST /conductor/payments/gcash/initiate -> initiateGcashFare -> returns { transaction_id, qr_token, checkout_url, amount, expires_at }
GET  /conductor/earnings?shift_id={id} -> getShiftEarnings -> { cash_total, gcash_total, total }

Commuter (auth:sanctum + role:COMMUTER):

POST /commuter/payments/claim -> claimGcash -> { transaction_id, checkout_url, amount, pickup_name, dropoff_name }
GET  /commuter/payments -> commuter payment history (cash + gcash)

Shared (auth:sanctum):

GET /payments/{id}/status -> { status } (authorized to the conductor who owns the shift OR the bound commuter)

Public:

POST /payments/webhook -> PayMongo webhook (implemented in S4-T6)

Controllers (thin, ApiResponse format)

ConductorController: transactions (GET), storeTransaction (POST), initiateGcash (POST), earnings (GET).
PaymentController: claim (POST), status (GET), history (GET), webhook (POST -> S4-T6).
No business logic in controllers.

Acceptance Criteria

POST conductor/transactions persists a cash fare and returns 201.
POST conductor/payments/gcash/initiate returns the binding-QR payload (qr_token + checkout_url), transaction PENDING, no wallet.
POST commuter/payments/claim binds the commuter and returns the checkout_url.
GET payments/{id}/status returns the current status to authorized parties only.
GET conductor/earnings returns the cash vs GCash split.
GET commuter/payments returns only the authed commuter rows.
All non-webhook routes role-protected.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S4-T6 - PayMongo Webhook Handler (Signature + Idempotent Status Update)
- **ID:** `86d3dqrk5`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-20 21:40
- **Updated:** 2026-06-22 06:46
- **Closed:** 2026-06-22 06:46
- **URL:** https://app.clickup.com/t/86d3dqrk5

**Description:**
```
Receive PayMongo async confirmations, update the matching transaction, and notify both parties in real time.

Route

POST /api/v1/payments/webhook - public (no auth). Verify the PayMongo signature BEFORE processing.

Signature verification

Read the Paymongo-Signature header, format: t={timestamp},te={testSig},li={liveSig}.
Compute HMAC-SHA256 over the string "{t}.{rawRequestBody}" using PAYMONGO_WEBHOOK_SECRET. Use the RAW body (do not re-encode JSON).
hash_equals against te in sandbox, li in live. Mismatch -> 400, no state change.

Processing (by data.attributes.type)

payment.paid: resolve the payment_intent id from the event, find the Transaction by paymongo_intent_id, call TransactionService::markPaid (idempotent - skip if already PAID), then broadcast App\Events\PaymentStatusUpdated(transaction, "PAID").
payment.failed: TransactionService::markFailed, broadcast PaymentStatusUpdated(transaction, "FAILED").
Always return 200 quickly for accepted events (PayMongo retries non-2xx).

Realtime event (new)

App\Events\PaymentStatusUpdated implements ShouldBroadcast on a public channel payments.{transactionId}, broadcastAs "PaymentStatusUpdated", payload { transaction_id, status, paid_at }. The conductor (S4-T10) and commuter (S4-T12) both listen so each flips to the success modal without polling (polling /payments/{id}/status remains the fallback).

Acceptance Criteria

A valid payment.paid webhook flips the matching transaction to PAID and broadcasts.
An invalid signature is rejected (400) with no state change.
A duplicate webhook is idempotent (no double broadcast/state change).

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S4-T7 - Feature Tests: Transactions & GCash Payment Flow
- **ID:** `86d3dqrk7`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-20 21:40
- **Updated:** 2026-06-22 06:46
- **Closed:** 2026-06-22 06:46
- **URL:** https://app.clickup.com/t/86d3dqrk7

**Description:**
```
Cover the clarified Sprint 4 flow with feature tests (mock PayMongo Http calls; Event::fake() for broadcasts; SQLite).
Tests

Cash: recordCashFare persists a row with status PAID and null fare_point ids; appears in getShiftTransactions.
GCash initiate: POST /conductor/payments/gcash/initiate creates a PENDING row with a qr_token and returns a checkout_url (PayMongo mocked); no wallet side effect.
GCash claim: POST /commuter/payments/claim binds passenger_id and returns the checkout_url; a second different commuter is rejected (409); claiming an already-PAID/expired token returns 410.
Webhook: a signed payment.paid flips the transaction to PAID and dispatches PaymentStatusUpdated; an invalid signature returns 400 with no change; a duplicate event is idempotent.
Earnings split: getShiftEarnings returns correct cash_total vs gcash_total (only PAID counts).
Remittance: GCash totals are NOT included in the remitted cash figure (record-only).
Authorization: a conductor cannot read another conductor shift transactions; a commuter sees only their own payments.
Schema audit: no wallet table or balance column exists.

Acceptance Criteria

All listed tests pass under php artisan test.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S4-T8 - Frontend Conductor Transactions Proxy & Service Wiring (Next.js -> Laravel)
- **ID:** `86d3dqrkp`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-20 21:40
- **Updated:** 2026-06-21 15:55
- **Closed:** 2026-06-21 15:55
- **URL:** https://app.clickup.com/t/86d3dqrkp

**Description:**
```
Wire conductor fare recording to the real backend. Replace the localStorage-only transactions service with Next.js proxy routes that forward to Laravel, keeping an offline cache as fallback. (Currently conductor fares live only in localStorage because the transactions Next route is a mock in-memory store; this supersedes that interim decision.)

Files to Create / Modify:

frontend/app/api/conductor/transactions/route.ts - convert the mock store to a Laravel proxy (GET list + POST create) using the conductor proxy
frontend/lib/conductor/services/transactions.service.ts - call the API (createTransaction POST, fetchShiftTransactions GET), map snake_case to camelCase, fall back to the localStorage cache only on network error
frontend/lib/conductor/server/mappers.ts - add a transaction mapper

Behavior:

POST proxies to Laravel POST /api/v1/conductor/transactions
GET proxies to Laravel GET /api/v1/conductor/transactions?shift_id=
401 when no session cookie

Acceptance Criteria:

A recorded fare persists to the DB (verify the row) and appears in the dashboard total.
Reads come from the backend, not the empty mock store.
The Transaction shape consumed by the dashboard / end-of-day is unchanged.

Post-Task Requirement: push all changes to your feature branch and open a PR targeting dev.
```

### S4-T9 - Frontend Conductor Cash Payment UI Integration (Persist Fares + Real Remittance)
- **ID:** `86d3dqrkq`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-20 21:41
- **Updated:** 2026-06-21 15:55
- **Closed:** 2026-06-21 15:55
- **URL:** https://app.clickup.com/t/86d3dqrkq

**Description:**
```
Make the conductor CASH flow persist end-to-end to the DB and have end-of-day / remittance read real transactions and the cash-vs-GCash split (builds on S4-T8).

Files to Modify

frontend/components/conductor/modals/fare-calculator-modal.tsx - the cash "confirm" records the fare via the real API (POST /api/conductor/transactions) using pickup/dropoff + the fare matrix amount; success modal on 201.
frontend/app/(conductor)/conductor-dashboard/end-of-day/* - summary + breakdown read DB transactions and show cash_total AND gcash_total separately (GET /api/conductor/earnings).
use-conductor-transactions / use-remittance-data - consume API data.

Behavior

Cash payment increments the dashboard CASH total from the DB.
GCash earnings are shown as a separate, record-only figure (NOT added to the remit amount).
Remittance posts ONLY the cash total; the shift ends in DB (remittances row + shift_logs ENDED). GCash is recorded for the day, never physically remitted.

Acceptance Criteria

A cash payment increments the DB-backed cash total.
End-of-day shows cash vs GCash totals distinctly.
Remittance uses the real cash total and ends the shift in DB.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S4-T10 - Frontend Conductor GCash UI (Binding QR + PayMongo Sandbox)
- **ID:** `86d3dqrku`
- **Status:** `in progress` (custom)
- **Assignees:** —
- **Created:** 2026-06-20 21:41
- **Updated:** 2026-06-22 21:30
- **URL:** https://app.clickup.com/t/86d3dqrku

**Description:**
```
Wire the conductor GCash branch to the binding-QR + PayMongo sandbox flow. The conductor inputs pickup/dropoff (same as cash), then shows an INTERNAL binding QR for that exact (not-yet-paid) transaction and waits for the commuter to scan & authorize.

Files to Create / Modify

frontend/app/api/conductor/payments/gcash/initiate/route.ts - POST proxy (cookie auth) -> Laravel POST /api/v1/conductor/payments/gcash/initiate.
frontend/app/api/payments/status/route.ts - GET proxy ?id= -> Laravel GET /api/v1/payments/{id}/status.
frontend/lib/conductor/services/payment.service.ts - initiateGcash(data) and pollStatus(id) (+ optional Echo subscribe).
frontend/components/conductor/modals/fare-calculator-modal.tsx - GCash branch.

Behavior

Conductor picks GCash -> call initiateGcash -> receive { transaction_id, qr_token, checkout_url, amount }.
Render an internal binding QR encoding the qr_token (use the existing QR lib). This QR is for OUR commuter app to scan - it is NOT a GCash-app QR and NOT the PayMongo checkout_url. Show amount + "Ask the commuter to scan and pay".
Wait for confirmation: subscribe to Echo channel payments.{transaction_id} (.PaymentStatusUpdated) and/or poll GET /api/payments/status?id= every ~3s.
On PAID -> success modal (the row was already created PENDING by initiate and flipped to PAID by the webhook). Refresh earnings. On FAILED/timeout -> error/cancel.

Acceptance Criteria

initiate returns a qr_token + (sandbox) checkout_url with no wallet credit; the binding QR renders.
The conductor modal flips to success when the transaction becomes PAID (via broadcast or poll).
The GCash transaction goes PENDING -> PAID in the DB.
isSandbox documented; switching to live keys needs no UI change.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S4-T12 - Frontend Commuter GCash Scan-to-Pay (Claim + PayMongo Authorize)
- **ID:** `86d3dqv8c`
- **Status:** `in progress` (custom)
- **Assignees:** —
- **Created:** 2026-06-20 22:20
- **Updated:** 2026-06-22 21:30
- **URL:** https://app.clickup.com/t/86d3dqv8c

**Description:**
```
Wire the commuter "Pay GCash" scan-to-pay flow. The commuter scans the conductor binding QR (confirmation/binding only), then authorizes the actual payment on PayMongo (sandbox), and both sides land on a success modal.

Flow (must match this exactly)

Commuter taps "Pay GCash" -> opens the in-app QR scanner.
Commuter scans the conductor binding QR -> decode the qr_token.
POST /api/commuter/payments/claim { qr_token } -> binds this commuter to that transaction; receive { transaction_id, checkout_url, amount, pickup_name, dropoff_name }. The scan is ONLY confirmation ("this commuter is the one paying") - it does NOT move money yet.
Open the PayMongo checkout_url (in-app browser / new tab / redirect). In SANDBOX this page shows "Authorize Test Payment" / "Fail Test Payment" (no number/PIN/OTP - that is LIVE only).
After authorize, PayMongo fires the webhook (S4-T6) -> transaction PAID -> broadcast.
Commuter success modal appears (via Echo payments.{transaction_id} .PaymentStatusUpdated, or poll GET /api/payments/status?id=). The conductor modal (S4-T10) flips at the same time.

Files to Create / Modify

frontend/app/api/commuter/payments/claim/route.ts - POST proxy (cookie auth) -> Laravel POST /api/v1/commuter/payments/claim.
frontend/lib/commuter/services/payment.service.ts - claim(qrToken) + pollStatus(id) / Echo subscribe.
frontend/components/commuter/modals/scan-modal.tsx (existing scanner) - decode -> claim -> open checkout_url -> await PAID -> success modal.

Acceptance Criteria

Scanning the conductor QR claims/binds the transaction (passenger_id set) and returns the checkout_url.
The checkout_url opens the PayMongo sandbox authorize page; tapping Authorize -> status PAID -> commuter success modal.
Re-scanning a paid/expired QR is handled (410); a QR already claimed by another commuter is blocked (409).
No wallet / balance; sandbox vs live differs only by the API key.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

## S5 (17 tasks)

### S5-T10 - Frontend Admin User Management CRUD Integration
- **ID:** `86d3fj2r0`
- **Status:** `s4` (open)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-25 19:17
- **URL:** https://app.clickup.com/t/86d3fj2r0

**Description:**
```
Wire frontend/app/(admin)/users to the real admin user endpoints (S5-T3), replacing the mock data in users/data. List with role filter + pagination, view, edit, delete with confirm.

Files to Create / Modify

frontend/app/api/admin/users/route.ts (new) - GET (list, query passthrough) proxy.
frontend/app/api/admin/users/[id]/route.ts (new) - GET/PUT/DELETE proxy.
frontend/lib/admin/services/user.service.ts (new) - list(filters), get(id), update(id, data), remove(id).
frontend/app/(admin)/users/* - table with role filter + pagination, edit modal, delete confirm; remove the users/data mock.

Acceptance Criteria

Users load from the API with working role filter + pagination.
Edit and delete hit the API and refresh the list; errors surfaced.
Mock user data removed.

Coordination (read before starting)

Scope here = the approved-users management table (list / filter / edit / delete existing users). The PENDING-registration review (approve/reject + ID image) is handled in S5-T17. Both this task and S5-T17 touch frontend/app/(admin)/users/page.tsx + users-table.tsx: this task owns the base table and should be built FIRST; S5-T17 layers the review flow on top. Do not duplicate state between them.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T11 - Frontend Admin Vehicle Management CRUD Integration
- **ID:** `86d3fj2r4`
- **Status:** `s4` (open)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-25 19:01
- **URL:** https://app.clickup.com/t/86d3fj2r4

**Description:**
```
Wire frontend/app/(admin)/vehicles to the admin vehicle endpoints (S5-T4), replacing the vehicles/data mock. Create/edit/delete with validation; show driver + route + status.

Files to Create / Modify

frontend/app/api/admin/vehicles/route.ts (new) - GET + POST proxy.
frontend/app/api/admin/vehicles/[id]/route.ts (new) - PUT/DELETE proxy.
frontend/lib/admin/services/vehicle.service.ts (new) - CRUD methods.
frontend/app/(admin)/vehicles/* - table + create/edit form + delete confirm; remove mock.

Acceptance Criteria

CRUD works end to end against the API; plate-uniqueness / active-shift-delete errors surfaced.
Mock vehicle data removed.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T12 - Frontend Admin Live Fleet Monitoring Integration
- **ID:** `86d3fj2r5`
- **Status:** `s4` (open)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-25 19:01
- **URL:** https://app.clickup.com/t/86d3fj2r5

**Description:**
```
Wire frontend/app/(admin)/monitoring to GET /api/v1/admin/monitoring (S5-T5) with 5s polling, replacing the monitoring/data mock. Render live vehicle positions/markers + capacity + stale flag.

Files to Create / Modify

frontend/app/api/admin/monitoring/route.ts (new) - GET proxy.
frontend/lib/admin/services/monitoring.service.ts (new) - getFleet() + 5s poll helper.
frontend/app/(admin)/monitoring/* - map/list bound to live data; flag stale (>10 min) units; remove mock.

Acceptance Criteria

Live positions update on the 5s poll from real data.
Stale units are visibly flagged; no mock data remains.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T13 - Frontend Admin Analytics Dashboard Integration
- **ID:** `86d3fj2r9`
- **Status:** `s4` (open)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-25 19:01
- **URL:** https://app.clickup.com/t/86d3fj2r9

**Description:**
```
Wire frontend/app/(admin)/analytics to GET /api/v1/admin/analytics (S5-T6), replacing the analytics/data mock. Render the aggregated metrics + date-range filter + charts.

Files to Create / Modify

frontend/app/api/admin/analytics/route.ts (new) - GET proxy with date_from/date_to passthrough.
frontend/lib/admin/services/analytics.service.ts (new) - getAnalytics(range).
frontend/app/(admin)/analytics/* - bind cards/charts (cash vs GCash, per-day series, totals); date filter; remove mock.

Acceptance Criteria

Charts/cards reflect real aggregates and respond to the date filter.
No mock analytics data remains.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T14 - Commuter Registration Endpoint & Valid-ID Upload
- **ID:** `86d3fj5ka`
- **Status:** `s4` (open)
- **Assignees:** —
- **Created:** 2026-06-25 19:14
- **Updated:** 2026-06-25 19:14
- **URL:** https://app.clickup.com/t/86d3fj5ka

**Description:**
```
Build the missing public registration endpoint so a new commuter account can actually be created from the signup form. The commuter_profiles schema already supports this (account_status, applied_type, commuter_type, id_image_url, verified_at, rejection_reason) — only the backend is missing (AuthController currently has login/logout only). A new account is created in PENDING status and waits for admin review (S5-T15) before it can log in.

Files to Create / Modify

app/Http/Controllers/Auth/AuthController.php - add register().
app/Services/AuthService.php - add register(array) creating User + CommuterProfile in one transaction.
app/Http/Requests/Auth/RegisterRequest.php (new) - validate first_name/surname/birthdate/gender/contact_number/email/username, language_preference, applied_type, and the id_image upload (image mime, max size).
routes/api.php - add PUBLIC POST /auth/register (no auth) in the auth group.
Storage: save the uploaded ID to the configured disk (e.g. storage/app/public/ids); persist the path/URL to commuter_profiles.id_image_url. NEVER store the raw file in the DB.

Behavior

applied_type is the discount tier the commuter is requesting: REGULAR | STUDENT | PWD | SENIOR (match the signup form's options). commuter_type stays null/REGULAR until an admin approves.
On success: create User (role COMMUTER) + CommuterProfile with account_status = PENDING, applied_type set, id_image_url set, verified_at null.
Email reuse: the unique check must IGNORE soft-deleted (rejected) accounts so a previously rejected email can register again (see S5-T15 reject = soft-delete). username stays globally unique.
Do NOT issue a Sanctum token on register — the account is not yet approved.

Acceptance Criteria

POST /api/v1/auth/register creates a PENDING commuter + stores the ID image and applied_type; returns 201 with no token.
Invalid/missing ID image or bad applied_type -> 422.
An email belonging only to a soft-deleted/rejected account can be reused; an active account's email is rejected (422).
A PENDING account cannot log in yet (gate lives in S5-T15).

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T15 - Admin Account Verification (Pending List, Approve & Reject + Discount Tier)
- **ID:** `86d3fj5ke`
- **Status:** `s4` (open)
- **Assignees:** —
- **Created:** 2026-06-25 19:14
- **Updated:** 2026-06-25 19:14
- **URL:** https://app.clickup.com/t/86d3fj5ke

**Description:**
```
Implement the admin review workflow for new commuter registrations. Admin sees pending accounts (with the uploaded valid ID), then approves — granting the requested discount tier — or rejects with a reason. The frontend review UI already exists (components/admin/users/review-request-modal.tsx) on mock data; this task builds the real endpoints behind it. All behind role:ADMIN.

Files to Create / Modify

app/Http/Controllers/Admin/AdminRegistrationController.php (new) - pending(), approve(id), reject(id).
app/Services/AdminService.php - listPendingRegistrations(), approveRegistration(id), rejectRegistration(id, reason).
app/Http/Requests/Admin/RejectRegistrationRequest.php (new) - rejection_reason required.
routes/api.php - admin group: GET /registrations (pending), POST /registrations/{id}/approve, POST /registrations/{id}/reject.
app/Services/AuthService.php (login) - block login unless account_status = APPROVED.

Behavior

GET /api/v1/admin/registrations - list account_status = PENDING commuters with id_image_url, applied_type, and identifying fields so the admin can verify the ID matches the requested tier.
APPROVE: set commuter_type = applied_type (the validated discount tier), verified_at = now, account_status = APPROVED, clear rejection_reason. The commuter can now log in and receives that tier's fare discount.
REJECT: set account_status = REJECTED + rejection_reason, then SOFT-DELETE the user/profile so the email frees up for re-registration (per S5-T14). The applicant can sign up again.
Login gate: a PENDING or REJECTED account is refused at login with a clear message (pending review / rejected).
Admin verifies the ID image is valid and matches applied_type before approving — reject if mismatched (e.g. no valid student/PWD/senior ID).

Acceptance Criteria

Pending list returns only PENDING commuters with their ID image + applied_type.
Approve flips account_status to APPROVED, copies applied_type -> commuter_type, sets verified_at; the account can then log in.
Reject records the reason, soft-deletes the account, and frees the email for reuse.
Non-admin tokens -> 403; PENDING/REJECTED accounts cannot log in.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T16 - Frontend Signup Registration & ID Upload Wiring
- **ID:** `86d3fj5kh`
- **Status:** `s4` (open)
- **Assignees:** —
- **Created:** 2026-06-25 19:14
- **Updated:** 2026-06-25 19:14
- **URL:** https://app.clickup.com/t/86d3fj5kh

**Description:**
```
Wire the existing signup form to the real registration endpoint (S5-T14), replacing any mock/stub submit. Capture the discount tier (applied_type) and the valid-ID image, submit as multipart, and land the user on a 'pending admin review' state.

Files to Create / Modify

frontend/app/api/auth/register/route.ts (new) - POST proxy forwarding multipart (ID image) -> Laravel /api/v1/auth/register.
frontend/components/auth/signup-form.tsx - submit real data: personal fields, applied_type (REGULAR|STUDENT|PWD|SENIOR), and the ID image file; client-side validate file type/size.
frontend/lib/api/* (or lib/auth) - add register(formData) service.

Behavior

Show the discount-tier selector; when STUDENT/PWD/SENIOR is chosen, require the valid-ID upload.
On success -> a 'Your account is pending admin approval' screen (no auto-login, since the account is PENDING).
Surface 422 validation errors inline (bad image, duplicate email of an active account, etc.).

Acceptance Criteria

Submitting the form creates a PENDING account via the API and uploads the ID image.
The user sees a pending-review confirmation, not a logged-in session.
Re-registering a previously rejected email works; an active email is blocked with the API message.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T17 - Frontend Admin Account Review Wiring (Approve / Reject)
- **ID:** `86d3fj5kn`
- **Status:** `s4` (open)
- **Assignees:** —
- **Created:** 2026-06-25 19:14
- **Updated:** 2026-06-25 19:17
- **URL:** https://app.clickup.com/t/86d3fj5kn

**Description:**
```
Wire the admin Users page and its review modals to the real verification endpoints (S5-T15), replacing the mock data in users/data. Admin reviews pending registrations, inspects the uploaded ID, then approves (granting the discount tier) or rejects with a reason.

Files to Create / Modify

frontend/app/api/admin/registrations/route.ts (new) - GET pending proxy.
frontend/app/api/admin/registrations/[id]/approve/route.ts + .../reject/route.ts (new) - POST proxies.
frontend/lib/admin/services/registration.service.ts (new) - listPending(), approve(id), reject(id, reason).
frontend/components/admin/users/review-request-modal.tsx - bind real pending data + the ID image; wire Approve / Reject (with reason) buttons.
frontend/components/admin/users/users-table.tsx + frontend/app/(admin)/users/page.tsx - show pending vs approved; remove users/data mock.

Behavior

The review modal displays the applicant's details, applied_type, and the uploaded valid ID for visual verification.
Approve -> calls approve endpoint -> row moves to approved (commuter_type = applied_type); Reject -> prompts for reason -> calls reject endpoint -> row removed/marked rejected.
Refresh the list after each action; surface errors.

Acceptance Criteria

Pending registrations load from the API with the ID image visible.
Approve and reject hit the real endpoints and update the list; reject captures a reason.
No mock user/registration data remains in the page.

Coordination (read before starting)

This builds on S5-T10, which owns the base users table. Add the pending-registration / review layer (review-request-modal + a pending view) ON TOP of that table — do not re-implement the CRUD table. Depends on S5-T15 (backend verification endpoints) and S5-T10 (frontend base table).

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T8 - Feature Tests: Profile, Remittance, Admin CRUD, Monitoring & Analytics
- **ID:** `86d3fj2qb`
- **Status:** `s4` (open)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-25 19:16
- **URL:** https://app.clickup.com/t/86d3fj2qb

**Description:**
```
Cover all Sprint 5 backend endpoints with feature tests (SQLite in-memory, matching the existing suite). Tests must assert real persistence and the standard ApiResponse envelope â€” not just status codes.

Files to Create / Modify

tests/Feature/CommuterProfileTest.php - GET/PUT profile + change-password (wrong vs right current_password).
tests/Feature/ConductorRemittanceTest.php - GET history scoping + existing POST still green.
tests/Feature/AdminUserCrudTest.php - list/filter/paginate, show, update (role validation), delete guards.
tests/Feature/AdminVehicleCrudTest.php - CRUD + plate uniqueness + active-shift delete guard.
tests/Feature/AdminMonitoringTest.php - live aggregation reflects seeded vehicle_locations.
tests/Feature/AdminAnalyticsTest.php - aggregates reconcile with seeded transactions; date filtering.

Acceptance Criteria

php artisan test is green (MySQL dev assumptions + SQLite test DB).
Each endpoint has at least: happy path, a validation failure, and a wrong-role (403) case.
No test depends on mocked/static data â€” every assertion checks DB state.

Additional Coverage — Registration & Verification

tests/Feature/AuthRegisterTest.php - register creates a PENDING commuter + stores the ID image + applied_type; missing/invalid ID or bad applied_type -> 422; no token issued; an email belonging only to a soft-deleted (rejected) account is reusable while an active email -> 422.
tests/Feature/AdminRegistrationTest.php - pending list returns only PENDING accounts; approve sets account_status=APPROVED + commuter_type=applied_type + verified_at and enables login; reject soft-deletes the account, records rejection_reason, and frees the email; PENDING/REJECTED accounts cannot log in; non-admin -> 403.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T9 - Frontend Commuter Profile & Change-Password Integration
- **ID:** `86d3fj2qn`
- **Status:** `s4` (open)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-25 19:01
- **URL:** https://app.clickup.com/t/86d3fj2qn

**Description:**
```
Wire the commuter Profile page to the real backend (S5-T1), replacing any mock/local data. Add the Next.js proxies and a service, then bind the profile view, edit form, and change-password form.

Files to Create / Modify

frontend/app/api/commuter/profile/route.ts (new) - GET + PUT proxy (cookie auth) -> Laravel /api/v1/commuter/profile.
frontend/app/api/commuter/change-password/route.ts (new) - POST proxy -> /api/v1/commuter/change-password.
frontend/lib/commuter/services/profile.service.ts (new) - getProfile(), updateProfile(data), changePassword(data).
frontend/app/(commuter)/profile/* - bind real data; edit + password forms with validation + error toasts.

Acceptance Criteria

Profile loads from the API; editing persists and re-renders fresh data.
A wrong current_password surfaces the 422 message; success clears the form.
No mock profile data remains in the page.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T1 - Commuter Profile API & Password Change
- **ID:** `86d3fj2ph`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-25 20:08
- **Closed:** 2026-06-25 20:08
- **URL:** https://app.clickup.com/t/86d3fj2ph

**Description:**
```
Implement the commuter self-service profile endpoints. CommuterController::profile() is currently a 501 stub; replace it with a real read + update, and add a password-change endpoint. All logic lives in a new CommuterService so the controller stays thin. A commuter may only read/modify their OWN record (scope by auth()->id()) — never accept or trust a user id from the request.

Files to Create / Modify

app/Services/CommuterService.php (new) - getProfile(User), updateProfile(User, array), changePassword(User, array).
app/Http/Controllers/Commuter/CommuterController.php - replace profile() stub; add update() + changePassword(); delegate to CommuterService only.
app/Http/Requests/Commuter/UpdateProfileRequest.php (new) - validate editable fields (name, phone, etc.); email/role/id are immutable.
app/Http/Requests/Commuter/ChangePasswordRequest.php (new) - current_password (required), password (required|confirmed + strength rules).
routes/api.php - in the commuter group add PUT /profile and POST /change-password (auth:sanctum + role:COMMUTER).

Endpoints

GET /api/v1/commuter/profile - return the authenticated commuter (User + CommuterProfile); never password/token fields.
PUT /api/v1/commuter/profile - update own editable fields; persist; return the fresh profile.
POST /api/v1/commuter/change-password - verify current_password with Hash::check before updating; wrong -> 422 and no write; correct -> re-hash new password.

Acceptance Criteria

GET returns only the authenticated commuter's profile via the standard ApiResponse envelope.
PUT persists to commuter_profiles/users and returns the updated record; email and role cannot be changed.
change-password rejects a wrong current_password with 422 (no update); a correct one re-hashes successfully.
A conductor/admin token cannot reach these routes (403).

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T2 - Conductor Remittance History Endpoint (GET)
- **ID:** `86d3fj2pn`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-26 12:19
- **Closed:** 2026-06-26 12:19
- **URL:** https://app.clickup.com/t/86d3fj2pn

**Description:**
```
Add the conductor-facing remittance history read. POST /conductor/remittances already exists (submit); Week 5 adds the GET so a conductor can review their own submitted remittances (one remittance per shift, own records only). Put the query in a ConductorService method and keep the controller thin.

Files to Create / Modify

app/Services/ConductorService.php (new, or add method) - listRemittances(User): own remittances, ordered date desc, eager-loaded.
app/Http/Controllers/Conductor/ConductorController.php - add remittancesIndex() for GET; keep existing remittances() as the POST submit.
routes/api.php - conductor group: add GET /remittances (throttle:conductor-read); keep POST /remittances.

Behavior

Scope strictly to the authenticated conductor (driver/conductor linkage = auth user) — never another conductor's remittances.
Each row returns: date, time_in, total_collected, cash_total, gcash_total, remitted_amount, shortage, shift_id + denormalized vehicle/route info.
Paginate/cap + order consistently with the other list endpoints.

Acceptance Criteria

GET /api/v1/conductor/remittances returns only the authenticated conductor's remittances.
The existing POST submit flow is unchanged and still links one remittance per shift_id.
A commuter/admin token cannot reach the route (403).

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T3 - Admin User Management CRUD (List, View, Update, Delete)
- **ID:** `86d3fj2pr`
- **Status:** `complete` (closed)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-25 20:08
- **Closed:** 2026-06-25 20:08
- **URL:** https://app.clickup.com/t/86d3fj2pr

**Description:**
```
Replace the AdminController::users() 501 stub with full user management — list (paginated, filterable by role), view, update, delete — all behind role:ADMIN. There is NO impersonation / user-switching endpoint. Logic goes in a new AdminService; split into an Admin/AdminUserController for clarity.

Files to Create / Modify

app/Services/AdminService.php (new) - listUsers(filters), getUser(id), updateUser(id, data), deleteUser(id).
app/Http/Controllers/Admin/AdminUserController.php (new) - index/show/update/destroy (thin; calls AdminService).
app/Http/Requests/Admin/UpdateUserRequest.php (new) - validate name, role (must be a valid UserRole enum), status, phone; never accept password here.
routes/api.php - admin group: GET /users, GET /users/{id}, PUT /users/{id}, DELETE /users/{id}.

Behavior

GET /api/v1/admin/users?role=&search=&page= - paginated; filter by UserRole (ADMIN|CONDUCTOR|COMMUTER); eager-load the matching profile.
GET /users/{id} - full user + profile; 404 if missing.
PUT /users/{id} - update editable fields; guard against an admin changing their own role into a lockout; never write password.
DELETE /users/{id} - delete (soft if supported); block deleting self or the last remaining admin.

Acceptance Criteria

List is paginated and role-filterable; no password/token fields leak.
Update persists and returns the fresh record; invalid role -> 422.
Delete guards FKs sensibly and cannot lock the system out of admin access.
Commuter/conductor tokens get 403 on every route; no user-switching endpoint exists.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T4 - Admin Vehicle Management CRUD (List, Create, Update, Delete)
- **ID:** `86d3fj2pt`
- **Status:** `in progress mhak` (custom)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-26 12:20
- **URL:** https://app.clickup.com/t/86d3fj2pt

**Description:**
```
Replace the AdminController::vehicles() 501 stub with full vehicle CRUD so admins manage the fleet master list — behind role:ADMIN. Reuse the Vehicle model and the vehicle_type column added in S2.

Files to Create / Modify

app/Services/AdminService.php - add listVehicles(filters), createVehicle(data), updateVehicle(id, data), deleteVehicle(id).
app/Http/Controllers/Admin/AdminVehicleController.php (new) - index/store/update/destroy.
app/Http/Requests/Admin/StoreVehicleRequest.php + UpdateVehicleRequest.php (new) - validate plate_number (unique), vehicle_type, capacity, route_id (exists), status.
routes/api.php - admin group: GET /vehicles, POST /vehicles, PUT /vehicles/{id}, DELETE /vehicles/{id}.

Behavior

GET /api/v1/admin/vehicles?status=&route_id=&search= - paginated, with driver + route relations.
POST - create a vehicle; plate_number must be unique (422 on dup).
PUT /{id} - update mutable fields.
DELETE /{id} - block (409) if the vehicle has an active_shift_id; otherwise delete.

Acceptance Criteria

CRUD persists to the vehicles table; plate_number uniqueness enforced.
Deleting a vehicle bound to an active shift is rejected with a clear error.
Non-admin tokens -> 403.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T5 - Admin Live Fleet Monitoring Endpoint
- **ID:** `86d3fj2pu`
- **Status:** `in progress mhak` (custom)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-26 12:19
- **URL:** https://app.clickup.com/t/86d3fj2pu

**Description:**
```
Add GET /api/v1/admin/monitoring returning real-time fleet state aggregated from vehicle_locations + active shift_logs — the admin equivalent of the commuter map, with NO fake/static data. Read-only, polled every 5s by the admin dashboard (same cadence as the commuter map).

Files to Create / Modify

app/Services/AdminService.php - monitoring(): join active vehicles with their latest vehicle_locations row + active shift + conductor/driver.
app/Http/Controllers/Admin/AdminController.php - implement monitoring() (replace the dashboard/users stub pattern with real aggregation).
routes/api.php - admin group: GET /monitoring (read-limiter suited to 5s polling).

Behavior

Return every active vehicle with: vehicle_id, plate_number, lat, lng, capacity_status, conductor name, route, updated_at.
Surface staleness: flag (or expose updated_at so the UI can flag) any vehicle whose location has not updated in 10 minutes.
No distance filter — all active units returned (matches the all-units-visible rule).

Acceptance Criteria

Returns live positions sourced from vehicle_locations (verify against DB), not mocked values.
Stale vehicles are distinguishable (updated_at / inactive flag).
Non-admin -> 403; response uses the standard ApiResponse envelope.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T6 - Admin Analytics Endpoint (Aggregated Metrics)
- **ID:** `86d3fj2q0`
- **Status:** `in progress mhak` (custom)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-26 15:23
- **URL:** https://app.clickup.com/t/86d3fj2q0

**Description:**
```
Add GET /api/v1/admin/analytics returning aggregated business metrics computed from real tables — transactions by date / payment_method, remittances, active fleet counts. NO wallet metrics (none exist). All aggregation server-side via Eloquent/Query Builder; no static data.

Files to Create / Modify

app/Services/AdminService.php - analytics(filters): aggregate transactions (count, sum final_amount) grouped by date and payment_method (CASH|GCASH), plus a remittance summary.
app/Http/Controllers/Admin/AdminController.php - add analytics().
routes/api.php - admin group: GET /analytics?date_from=&date_to= .

Behavior

Support optional date_from/date_to range filtering (document the default window).
Return: total fares, cash vs GCash split, paid vs pending counts, a per-day series, total remitted, active vehicle/conductor counts.
Only PAID transactions count toward revenue; expose pending separately.

Acceptance Criteria

Numbers reconcile with raw DB aggregates over the same range (spot-check).
date_from/date_to filtering works.
No wallet/balance metric anywhere; non-admin -> 403.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

### S5-T7 - Role-Scoped Security Audit & Data Isolation
- **ID:** `86d3fj2q4`
- **Status:** `in progress mhak` (custom)
- **Assignees:** —
- **Created:** 2026-06-25 19:01
- **Updated:** 2026-06-26 16:04
- **URL:** https://app.clickup.com/t/86d3fj2q4

**Description:**
```
Systematically verify every Sprint 5 endpoint (and the broader API) enforces auth:sanctum + the correct role middleware, and that no endpoint leaks another role's or another user's data. This is the Week 5 'role-scoped data access' gate.

Scope

Build a cross-role access matrix: for each protected route, assert the wrong actors get 401/403 and only the right role gets 2xx.
Confirm commuter profile / change-password and conductor remittance read scope strictly to auth()->id() — a user cannot read/modify another user's record by supplying a foreign id.
Confirm admin endpoints are all behind role:ADMIN and that there is NO impersonation / user-switching endpoint.
Confirm commuter/conductor responses never include admin-only fields (password hash, tokens, other users' rows).

Files to Create / Modify

tests/Feature/RoleAccessMatrixTest.php (new) - data-provider-driven cross-role assertions across the S5 routes.
Fix any controller/service that scopes by a request-supplied id instead of the authenticated user.

Acceptance Criteria

The access-matrix test passes: all wrong-role/owner combinations return 401/403; correct ones 2xx.
No endpoint returns another user's data when given a foreign id.
grep confirms no remaining notImplementedResponse() on shipped S5 routes.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---
