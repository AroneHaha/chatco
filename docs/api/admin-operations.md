# Admin: Operations API

The day-to-day running of the pilot: the dashboard/analytics aggregates, the live fleet map and overspeed history, demand heatmap zones, shift-log history, admin recovery of a lost conductor device, transaction/remittance finance views and cash declaration, SOS triage, staff feedback review, and the admin audit trail.

People (users, registrations, personnel, drivers, conductors) are in [admin-people.md](admin-people.md). Vehicles/routes/fare points are in [admin-fleet.md](admin-fleet.md). Settings, vouchers, FAQs, announcements and Lost & Found are in [admin-content.md](admin-content.md).

All paths are relative to `/api/v1`. Conventions are in [README.md](README.md). **Every route here requires role `ADMIN`** (`auth:sanctum` + `role:ADMIN`).

## Contents

- [Dashboard and analytics](#dashboard-and-analytics)
  - [GET /admin/dashboard](#get-admindashboard)
  - [GET /admin/analytics](#get-adminanalytics)
- [Monitoring](#monitoring)
  - [GET /admin/monitoring](#get-adminmonitoring)
  - [GET /admin/monitoring/overspeed](#get-adminmonitoringoverspeed)
  - [GET /admin/monitoring/demand-zones](#get-adminmonitoringdemand-zones)
- [Shift logs](#shift-logs)
  - [GET /admin/shift-logs](#get-adminshift-logs)
  - [POST /admin/shifts/{shift}/device/recover](#post-adminshiftsshiftdevicerecover)
- [Finance](#finance)
  - [GET /admin/transactions](#get-admintransactions)
  - [GET /admin/remittances](#get-adminremittances)
  - [POST /admin/remittances/{shiftId}/cash-declaration](#post-adminremittancesshiftidcash-declaration)
- [SOS](#sos)
  - [GET /admin/sos](#get-adminsos)
  - [PATCH /admin/sos/{id}/acknowledge](#patch-adminsosidacknowledge)
  - [PATCH /admin/sos/{id}/resolve](#patch-adminsosidresolve)
- [Feedback](#feedback)
  - [GET /admin/feedback](#get-adminfeedback)
- [Activity logs (audit trail)](#activity-logs-audit-trail)
  - [GET /admin/activity-logs](#get-adminactivity-logs)
- [Known quirks](#known-quirks)

---

## Dashboard and analytics

### GET /admin/dashboard

Returns the **same payload** as [GET /admin/analytics](#get-adminanalytics) with no filters (its default 30-day window). The frontend dashboard page actually calls `/analytics` directly — this route exists "for completeness and any future dashboard-specific aggregations" (per the controller's own comment), so it's effectively a second, equivalent entry point today.

- **Limiter: none.** This is the one admin route with no `throttle:` middleware at all — see [Known quirks](#known-quirks).

### GET /admin/analytics

All business metrics computed live from `transactions`, `remittances`, `vehicles` and `shift_logs` — no cached/static figures, no wallet or balance concept (none exists in the schema).

- **Limiter:** conductor-read (60/min)
- **Service:** `AdminService::analytics`

**Query:** `date_from`, `date_to` (both `YYYY-MM-DD`) — default window is the **last 30 days ending today**. Whatever window you pick, the service also computes the **immediately-preceding window of the same length** for period-over-period deltas (a 10-day range is compared against the 10 days directly before it) and returns both halves raw, rather than pre-computing percentages — so the frontend can render "no prior data" however it wants.

**200 OK (abridged — see the file for every field)**

```json
{
  "date_range": { "from": "2026-09-02", "to": "2026-10-01", "days": 30 },
  "previous_range": { "from": "2026-08-03", "to": "2026-09-01" },
  "totals": {
    "total_fares": 128430.5, "cash_total": 98200.0, "gcash_total": 30230.5,
    "paid_count": 4210, "total_passengers": 4512, "pending_count": 12,
    "voucher_count": 38, "avg_fare": 30.51
  },
  "previous_totals": { "total_fares": 110020.0, "cash_total": 84000.0, "gcash_total": 26020.0, "paid_count": 3900, "total_passengers": 4100, "avg_fare": 28.21 },
  "payment_split": { "cash": {"count": 3100, "total": 98200.0}, "gcash": {"count": 1110, "total": 30230.5}, "voucher": {"count": 38, "total": 0} },
  "daily_series": [ { "date": "2026-09-02", "cash": 3100.0, "gcash": 900.0, "total": 4000.0, "count": 130 } ],
  "hourly_series": [ { "hour": 0, "count": 2, "revenue": 60.0 } ],
  "status_breakdown": { "PAID": 4210, "PENDING": 8, "PROCESSING": 4, "FAILED": 15, "CANCELLED": 6, "EXPIRED": 20 },
  "gcash_health": { "attempts": 1151, "settled": 1110, "failed": 15, "expired": 20, "cancelled": 6, "success_rate": 96.4 },
  "remittances": { "total_remitted": 95800.0, "total_collected": 98200.0, "total_shortage": 2400.0, "count": 210, "shortage_rate": 2.44 },
  "fleet": { "active_vehicles": 9, "total_vehicles": 14, "active_conductors": 9, "total_conductors": 12 },
  "pickup_points": [ { "name": "Calumpit", "count": 812 } ],
  "heatmap_zones": [ { "zone": "Malolos Crossing", "commuters": 61, "intensity": "High", "color": "bg-orange-500", "lat": 14.86, "lng": 120.77 } ]
}
```

| Field group | Notes |
|---|---|
| `totals.total_fares` | `cash_total + gcash_total` — **excludes voucher rides by construction**, since a reward ride records `final_amount = 0`. Voucher rides still count toward `total_passengers` (every PAID row, including voucher). |
| `totals.paid_count` | Cash + GCash rows only (excludes voucher) — directly comparable to `payment_split.cash.count + .gcash.count` |
| `status_breakdown` | Always includes `PAID, PENDING, PROCESSING, FAILED, CANCELLED, EXPIRED` even at zero, plus any other status that actually occurred (e.g. a provider-side `REFUNDED`, which the app never initiates itself) |
| `gcash_health.attempts` | GCash transactions in `PAID/FAILED/CANCELLED/EXPIRED` — gateway-settled attempts only; cash never enters this ratio |
| `gcash_health.success_rate` | `null` (not `0`) when `attempts` is 0 — a genuine "no data" distinct from "0% success" |
| `daily_series`/`hourly_series` | **Zero-filled for every day/hour in the window**, not just days that had trades — a quiet day shows `count: 0`, it isn't skipped |
| `remittances.*` | Windowed on `remittances.date` (the shift's business date), **not** `created_at` like the transaction totals — a shift that runs past midnight can land its remittance in a different day-bucket than some of its fares. The two don't reconcile exactly; that's expected, not a bug. |
| `heatmap_zones` | Joined against `fare_points` by `pickup_stop_id` — a transaction with a free-text `pickup_name` but no matched `pickup_stop_id` never appears here (it still counts in `pickup_points`, which groups by name) |

---

## Monitoring

### GET /admin/monitoring

The live fleet view — every vehicle currently on an **active shift**, with its latest GPS fix, crew names and break/capacity state. Built to be polled every 5 seconds.

- **Limiter:** conductor-read (60/min)
- **Service:** `LocationService::getMonitoringFleet`

**Driven from `vehicles`, not `vehicle_locations`.** A unit that just started a shift but hasn't posted a GPS ping yet still appears — with `lat`/`lng`: `null` and `has_gps: false` — rather than being invisible until its first fix.

**200 OK:** an array, ordered so units with no GPS yet sort last:

```json
{
  "id": "…", "unit_number": "U-07", "plate_number": "ABC 1234", "vehicle_type": "Jeepney",
  "lat": 14.8601, "lng": 120.7791, "speed": 32, "heading": 180,
  "capacity_status": "AVAILABLE", "is_on_break": false, "break_started_at": null,
  "route_name": "Malolos - Meycauayan - Calumpit",
  "driver_name": "Jose Cruz", "conductor_name": "Pedro Reyes",
  "last_update": "2026-10-01 08:15:02", "minutes_since_update": 1,
  "has_gps": true, "is_stale": false
}
```

`is_stale` is `true` when the last GPS fix is more than **10 minutes** old **and** the vehicle isn't currently on break (an on-break unit is expected to stop pinging, so it's never flagged stale).

### GET /admin/monitoring/overspeed

Persisted overspeed episodes — a row per continuous stretch a vehicle spent above the limit, not one row per GPS ping. See [conductor.md](conductor.md#post-conductorlocation) for how an episode opens, extends and closes.

- **Limiter:** conductor-read (60/min)

**Query:** `page`, `per_page` (max 100), `shift_id` (must exist), `date` (`YYYY-MM-DD`).

**200 OK:** a Laravel paginator ordered by `last_logged_at` desc, each row `{id, unit, plate, speed, threshold, driver, conductor, date, last_update}`. `threshold` is the `speed_limit_kmh` setting value **at the time the episode was recorded** — changing the setting later doesn't rewrite historical episodes.

### GET /admin/monitoring/demand-zones

A lightweight, **in-memory** heatmap of where commuters are currently waiting — distinct from `analytics.heatmap_zones` above, which is historical PAID-ride demand. This one is live commuter GPS, grid-bucketed on the fly.

- **Limiter:** conductor-read (60/min)

No query params. Reads every `commuter_locations` row updated in the **last 5 minutes**, buckets them into a fixed ~550m grid (`0.005°` cells), and returns one entry per non-empty cell:

```json
{ "id": "demand-18234-30234", "lat": 14.8605, "lng": 120.7793, "commuter_count": 6, "intensity": "MEDIUM", "radius_meters": 350 }
```

| `commuter_count` | `intensity` | `radius_meters` |
|---|---|---|
| ≥ 10 | `HIGH` | 500 |
| 4–9 | `MEDIUM` | 350 |
| 1–3 | `LOW` | 250 |

This is **not paginated and not cached** — it's recomputed from scratch on every call, over however many `commuter_locations` rows were updated in the trailing 5-minute window.

---

## Shift logs

### GET /admin/shift-logs

The full shift history across the fleet. Supports two unrelated response shapes from one route, switched by `entry_view`.

- **Limiter:** conductor-read (60/min)

**Default mode (no `entry_view`):** one row per **shift**.

**Query:** `vehicle_id`, `conductor_id`, `driver_id` (exact match), `search` (driver/conductor name, unit/plate number, status, notes), `count_only` (`1`: `{total}` only), `per_page` (max 100), `page`.

**200 OK:** a Laravel paginator of `ShiftLog` with `vehicle`, `driver`, `route`, `latestDeviceRecovery` loaded, plus a computed `synced_offline_cash_count` (how many of this shift's cash transactions were offline-queued fares that have since synced — see [conductor.md](conductor.md#offline-replay-rules)).

**`entry_view=personnel` mode:** one row **per person per shift** (a shift with both a driver and a conductor produces two rows) — powers Fleet Management's "Assignment History" list, which reads more naturally as "who worked when" than "which shift had whom."

**Query:** `search` (same fields, plus role), `shift_range` (`today`/`last_7_days`/`this_month` — **not** the same vocabulary as the finance endpoints' `date_from`/`date_to`/`date`, see [Known quirks](#known-quirks)), `count_only`, `per_page`, `page`.

**200 OK:** a Laravel paginator of `{id, personnelName, role: "Driver"|"Conductor", vehicle, shiftDate, timeIn, timeOut, status, notes, details}` — `id` is a synthetic `{shift_id}:driver`/`{shift_id}:conductor` key, not a real row ID, since this view has no backing table of its own (it's a `UNION ALL` over `shift_logs` split in two). `details` is a pre-formatted summary string built server-side, not meant to be re-parsed.

### POST /admin/shifts/{shift}/device/recover

Force-releases a conductor's **operating device** lock when their phone/browser is lost mid-shift, so a different device can claim the shift and keep collecting fares. Fully documented in [conductor.md](conductor.md#admin-recovery-of-a-lost-device) (device ownership is primarily a conductor-side concept) — this entry just gives it a home in the admin route index.

- **Limiter:** admin-write (30/min)
- **Request:** `RecoverShiftDeviceRequest`

**Body (JSON):** `reason` (required, 10–500 chars), `acknowledge_unsynced_cash_risk` (required, must be `true` — the lost device may still hold unsynced offline cash; this never touches any transaction or remittance data, it only clears the device lock).

**Guards:** `409 "Only an active shift can recover an operating device."`; `409 "This shift no longer has an operating device to recover."`; `404` unknown shift.

**What it does:** records a `shift_device_recoveries` row (previous device, who recovered it, reason) and **permanently blocks that specific `device_id`** from ever operating this shift again — any later claim or write from it gets `409`. Logged as `SHIFT_DEVICE`.

**200 OK:** the ShiftLog (relations loaded) with its operating device cleared, `message: "The lost operating device was released. A conductor device must explicitly claim the shift before collecting fares."`

---

## Finance

### GET /admin/transactions

Every transaction across the fleet — the raw ledger, not an aggregate.

- **Limiter:** conductor-read (60/min)

**Query**

| Param | Rules |
|---|---|
| `shift_id` | Comma-separated to batch several shifts into one request (e.g. the remittance review modal's Transactions tab), or a single ID |
| `date` | `YYYY-MM-DD`, exact day on `created_at` |
| `date_from`, `date_to` | Range on `created_at` (plain comparisons, not `whereDate()`, so the query stays index-backed as the table grows) |
| `per_page` | Default 100 — **not clamped to a maximum** (see [Known quirks](#known-quirks)) |

**200 OK:** a Laravel paginator of `Transaction` with `shiftLog`, `passenger`, `payer`, `passengerBreakdown`, `paymentGroup:id,reference_number` loaded — includes every internal column, same as the conductor-facing transactions endpoint ([conductor.md](conductor.md#get-conductortransactions)).

### GET /admin/remittances

A **unified** view of remittances: real `Remittance` rows (ended shifts) stitched together with active shifts that already have unremitted cash on them — so a shift shows up as "Pending" the moment the conductor records their first cash fare, not only after they click "Remit."

- **Limiter:** conductor-read (60/min)

**Query:** `date`, `date_from`, `date_to` (plain `remittances.date` comparisons — a native `DATE` column, so `whereDate()` is deliberately avoided here too), `status` (see table below), `search` (conductor/driver name, shift ID), `conductor`, `driver` (exact name match — these mirror the admin UI's dropdown filters, applied server-side so switching filters doesn't just re-filter whatever page happened to be loaded), `per_page` (default 100, **clamped to 500** — raised from 100 specifically so the Analytics export buttons can pull a whole range in one page), `page`.

**`status` values and what they resolve to:**

| `status` | Meaning |
|---|---|
| (omitted) | Everything: completed remittances + active shifts with cash on the books |
| `REMITTED` / `SETTLED` | `COMPLETE`, `SHORTAGE`, `OVERAGE` (and the legacy literal `"Remitted"`) |
| `OVERDUE` | `PENDING` **and** past `remittance_due_at` |
| `FOR CASH DECLARATION` | `PENDING`, not yet overdue |
| `PENDING` | Deliberately returns **nothing** (`whereRaw('1 = 0')`) — a truly "pending" row is always either overdue or awaiting cash declaration; this value exists for callers that pass it anyway, rather than erroring |
| Anything else | Passed through as a literal `remittance_status` match |

**200 OK:** a hand-built pagination envelope (**not** a standard Laravel paginator — same field names, but assembled manually after merging and sorting the two sources in PHP):

```json
{
  "current_page": 1, "data": [ { "shift_id": "SHF-…", "is_active_shift": false, "is_overdue": false, "remittance_status": "COMPLETE", "..." : "..." } ],
  "from": 1, "last_page": 3, "per_page": 100, "to": 100, "total": 210
}
```

`is_active_shift` distinguishes a still-running shift (synthesized row, `remittance_status` forced to `PENDING`, no real `Remittance` row exists yet) from a genuine ended-but-unsettled remittance — only the latter can take the [cash-declaration](#post-adminremittancesshiftidcash-declaration) action.

### POST /admin/remittances/{shiftId}/cash-declaration

The admin's physical cash count for an ended shift's `PENDING` remittance. This is the **only** place cash is actually counted — the conductor's own `POST /conductor/remittances` deliberately ignores whatever cash figure it's sent (see [conductor.md](conductor.md#post-conductorremittances)).

- **Limiter:** admin-write (30/min)
- **Request:** `DeclareCashRequest` (`cash_declared`: required numeric ≥ 0) → `ShiftCloseoutService::recordCashDeclaration`

The remittance row is locked for the update. **409** `"Cash has already been declared for this remittance."` if it isn't still `PENDING` (including the [double-submit shortage](conductor.md#known-quirks) scenario — a remittance already forced to `SHORTAGE` by a duplicate conductor submit can't be re-declared). **404** (shape B, `findOrFail`) if `shiftId` doesn't correspond to a real `Remittance` row at all (e.g. it's still an active shift with no remittance yet).

**Resolution:**

| Declared vs. expected (`cash_total`) | `remittance_status` |
|---|---|
| Equal | `COMPLETE` |
| Less | `SHORTAGE` (`shortage` = the difference) |
| More | `OVERAGE` (`overage` = the difference) |

Every admin gets a `REMITTANCE_COMPLETED` notification afterward, worded with the resolved status ("...with a shortage" / "...with an overage" / "...in full").

**200 OK:** the Remittance with `shift`, `vehicle`, `driver` loaded, `message: "Cash declaration recorded"`.

---

## SOS

Admins triage the same `SosAlert` rows commuters and conductors trigger ([commuter.md](commuter.md#sos), [conductor.md](conductor.md#sos)).

```
ACTIVE ──(admin acknowledges)──► ACKNOWLEDGED ──(admin resolves)──► RESOLVED
   └──────────────────────(admin resolves directly)───────────────────┘
```

### GET /admin/sos

- **Limiter:** conductor-read (60/min)

**Query:** `status` — three distinct behaviors: omitted defaults to `ACTIVE` (the live dashboard feed), `ALL` (any casing) returns every status, anything else filters to that exact status. `per_page` (default 15).

**200 OK:** a Laravel paginator of `SosAlert` with `commuter`/`conductor` loaded, newest first.

### PATCH /admin/sos/{id}/acknowledge

Idempotent for an already-`ACKNOWLEDGED` alert (no-op, same 200). **422** `"Cannot acknowledge a resolved alert"` for a `RESOLVED` one. **404** `"SOS alert not found"`.

- **Limiter:** admin-write (30/min)

Sets `acknowledged_by`/`acknowledged_at` only when the alert was still `ACTIVE`. **200 OK:** the alert, `message: "SOS alert acknowledged"`. Logged as `SOS`.

### PATCH /admin/sos/{id}/resolve

Terminal — **422** `"Alert is already resolved"` if called twice. Works from either `ACTIVE` or `ACKNOWLEDGED`.

- **Limiter:** admin-write (30/min)

**200 OK:** the alert with `commuter`, `conductor`, `acknowledger`, `resolver` loaded, `message: "SOS alert resolved"`. Logged as `SOS`.

---

## Feedback

### GET /admin/feedback

Staff performance review — opened from User Management by double-clicking a driver or conductor row, not a standalone module. Replaced the old "Feedback QR" admin page entirely.

- **Limiter:** conductor-read (60/min)

**Query:** exactly one of `conductor_id` / `driver_id` (if both are sent, `conductor_id` wins); `per_page` (default 10, max 50).

**422** `"Either conductor_id or driver_id is required."` if neither is sent. **404** `"Conductor not found"` / `"Driver not found"` if the ID doesn't exist.

**For a conductor,** only rows that carry a `conductor_rating` are counted (older rows predating the driver/conductor rating split have it `null`) — the conductor's own score, category and comment are remapped onto the generic `rating`/`category`/`comment` keys in the response so both calls share one shape.

**200 OK**

```json
{
  "staff": { "id": "…", "...": "the conductor or driver's own identity, not detailed here" },
  "summary": { "average_rating": 4.6, "total_count": 82, "distribution": { "5": 60, "4": 15, "3": 5, "2": 1, "1": 1 } },
  "feedback": { "current_page": 1, "data": [ { "rating": 5, "category": "Safe driving", "comment": "…", "vehicle": {"unit_number": "U-07"}, "commuter": {"first_name": "Juan"} } ], "...": "standard paginator fields" }
}
```

`summary` is computed with one aggregate SQL query (`COUNT`/`AVG`/`SUM(CASE…)` per star) run against the **same filtered query** as the paginated rows, not by loading every row into PHP — so `average_rating`/`distribution` reflect the full history, not just the current page.

---

## Activity logs (audit trail)

### GET /admin/activity-logs

The **admin-action audit trail** — one row per mutating admin action, across every admin controller. This is distinct from [GET /admin/users/{id}/activity](admin-people.md#get-adminusersidactivity), which is a best-effort **per-user** timeline assembled from business tables, not an audit log.

- **Limiter:** conductor-read (60/min)
- **Service:** `ActivityLogService::listForAdmin`

**How rows get written:** `ActivityLogService::record(category, description, actor)` is called directly from the controller layer, right after a mutating action succeeds — not threaded through every service method. It **never throws**: a logging failure is caught and written to the application log instead, so a broken audit write can never roll back or fail the real admin action that triggered it. Every admin controller in this project calls it after create/update/delete/approve/reject/etc. — see the per-endpoint "Logged as `X`" notes throughout these four admin docs for exactly which action produces which category.

**The 13 categories** (`App\Enums\ActivityLogCategory`):

| Category | Written by |
|---|---|
| `MEMBER` | User update/delete/suspend/unsuspend ([admin-people.md](admin-people.md#users)), registration approve/reject/onsite-create |
| `PERSONNEL` | Driver/conductor create/update/delete/disable/reset-credentials |
| `VEHICLE` | Vehicle create/update/delete |
| `ROUTE` | Route create/update/delete/publish |
| `FARE_POINT` | Fare point create/update/delete/reorder |
| `SETTINGS` | Any `PUT /admin/settings/{key}` |
| `VOUCHER` | Voucher generate/delete |
| `REMITTANCE_OPTION` | Remittance option create/update/delete |
| `FAQ` | FAQ create/update/delete |
| `ANNOUNCEMENT` | Announcement create/update/archive |
| `LOST_FOUND` | Lost item create/update/photo add, claim approve/release/reject/manual, reactivate, close |
| `SOS` | Acknowledge/resolve |
| `SHIFT_DEVICE` | Admin device recovery |

**Query**

| Param | Rules |
|---|---|
| `category` | Exact match against one of the 13 above |
| `search` | Matches the log's description **or** the acting admin's display name — the search box's own placeholder reads "Search activity or admin name…" |
| `date` | Exact `Y-m-d` — wins over `date_range` if both are somehow sent |
| `date_range` | `today`, `last_7_days`, `last_30_days`, or `all`/anything unrecognized (no filter) — **a different set than every other admin list's date-range filter** (see [Known quirks](#known-quirks)) |
| `per_page` | Default 30 |

**200 OK:** a Laravel paginator, newest first, each row `{id, category, description, actor_id, actor_name, created_at}`. `description` is truncated to 500 characters at write time (`Str::limit`). This endpoint is **read-only** — there is no way to delete or edit a log entry through the API.

---

## Known quirks

1. **`GET /admin/dashboard` is the one admin route with no rate limit at all.** Every other route in this file, and across the whole `/admin` prefix, has an explicit `throttle:` middleware; this one has none, confirmed directly in `routes/api.php`. It runs the same `AdminService::analytics()` as the throttled `/admin/analytics`, so an authenticated client looping on `/admin/dashboard` can run the full 30-day aggregation (several grouped queries over `transactions`, plus a join against `fare_points` for the heatmap) as fast as it can fire requests.

2. **Three different, incompatible date-range vocabularies exist across these endpoints**, and none of them match: `GET /admin/shift-logs?entry_view=personnel` uses `shift_range` (`today`/`last_7_days`/`this_month`); `GET /admin/activity-logs` uses `date_range` (`today`/`last_7_days`/`last_30_days`); the admin-content.md announcements list uses `date_range` too but with `this_month` instead of `last_30_days`. A client switching between these screens can't share one "quick range" dropdown component without translating the value.

3. **`GET /admin/transactions`'s `per_page` has no upper clamp**, unlike almost every other paginated list in this API (which cap at 50–500). A caller can request an arbitrarily large page of the full transaction ledger in one response.

4. **`GET /admin/remittances` is not a real Laravel paginator** — it's a hand-assembled array with the same field names (`current_page`, `data`, `total`, …), built by merging completed `Remittance` rows with synthesized "active shift" rows in PHP, sorting the combined collection, then slicing it for the requested page. Code that introspects paginator metadata (e.g. `links()`, `path()`) rather than reading the plain fields will not work against this response the way it does against every other list endpoint.

5. **`GET /admin/monitoring/demand-zones` recomputes its entire grid from scratch on every call**, with no caching and no pagination — it scans every `commuter_locations` row updated in the trailing 5 minutes and buckets them in PHP. On a quiet pilot route this is trivial; it's worth knowing before wiring it to a tight poll interval on a larger fleet.

6. **A conductor's device-recovery block is permanent and per-device**, not per-shift — recovering shift A from `device_id` X also means X can never claim shift A again, even after a normal end-of-shift and a brand-new shift starting later (a *new* `shift_id` is unaffected; only that exact `shift_id` + `device_id` pair is blocked). See [conductor.md](conductor.md#admin-recovery-of-a-lost-device) for the exact error message this produces.
