# Admin: Fleet API

Vehicles, routes (including saving the route line), fare points, and the admin unit-QR issuer. Driver/conductor personnel are in [admin-people.md](admin-people.md); live fleet monitoring (the moving-map view) is in [admin-operations.md](admin-operations.md#monitoring).

All paths are relative to `/api/v1`. Conventions are in [README.md](README.md). **Every route here requires role `ADMIN`** (`auth:sanctum` + `role:ADMIN`), except `POST /qr/generate`, which lives outside the `/admin` prefix but carries the same `role:ADMIN` middleware directly on the route.

## Contents

- [Vehicles](#vehicles)
  - [GET /admin/vehicles](#get-adminvehicles)
  - [GET /admin/vehicles/{id}](#get-adminvehiclesid)
  - [POST /admin/vehicles](#post-adminvehicles)
  - [PUT/PATCH /admin/vehicles/{id}](#putpatch-adminvehiclesid)
  - [DELETE /admin/vehicles/{id}](#delete-adminvehiclesid)
- [Routes](#routes)
  - [GET /admin/routes](#get-adminroutes)
  - [GET /admin/routes/{id}](#get-adminroutesid)
  - [POST /admin/routes](#post-adminroutes)
  - [PUT/PATCH /admin/routes/{id}](#putpatch-adminroutesid)
  - [DELETE /admin/routes/{id}](#delete-adminroutesid)
  - [PUT /admin/routes/{id}/geometry](#put-adminroutesidgeometry)
- [Fare points](#fare-points)
  - [GET /admin/fare-points](#get-adminfare-points)
  - [POST /admin/fare-points](#post-adminfare-points)
  - [PUT/PATCH /admin/fare-points/{id}](#putpatch-adminfare-pointsid)
  - [DELETE /admin/fare-points/{id}](#delete-adminfare-pointsid)
  - [PUT /admin/fare-points/reorder](#put-adminfare-pointsreorder)
  - [Fare points and the route line](#fare-points-and-the-route-line)
- [POST /qr/generate](#post-qrgenerate)
- [Known quirks](#known-quirks)

---

## Vehicles

A vehicle (`Vehicle` model) is the jeepney unit: plate/unit number, type, status, an optional `route_id`, and the driver/conductor **approved assignment** (`driver_id`/`conductor_id`, distinct from who is actually on an active shift right now — see [conductor.md](conductor.md#the-shift-lifecycle)).

### GET /admin/vehicles

- **Limiter:** conductor-read (60/min)
- **Service:** `AdminService::listVehicles`

**Query**

| Param | Rules |
|---|---|
| `status` | Exact match: `ACTIVE`, `MAINTENANCE`, `INACTIVE` |
| `route_id` | Exact match |
| `search` | `LIKE` on `plate_number` or `unit_number` |
| `per_page` | Default 15, clamped to 1–100 |
| `page` | |
| `count_only` | `1`: returns only `{total}` from a count-only query (no eager-loads, no row fetch) |
| `next_unit_number` | `1`: returns only `{unit_number}` for the Add New Vehicle preview; does not reserve a number |

**200 OK:** a Laravel paginator of raw `Vehicle` models, each with `route`, `driver` and `conductor` eager-loaded in full — see [Known quirks](#known-quirks) for what that means when a conductor is assigned.

### GET /admin/vehicles/{id}

Same relations as the list. `404` (shape B, `findOrFail`) if the ID doesn't exist.

- **Limiter:** conductor-read (60/min)

### POST /admin/vehicles

- **Limiter:** conductor-write (30/min)
- **Request:** `StoreVehicleRequest`

**Body (JSON)**

| Field | Rules |
|---|---|
| `plate_number` | Required, max 20, unique |
| `unit_number` | Server-generated; prohibited in the create request |
| `brand`, `model` | Required, max 50 |
| `route_id` | Nullable UUID, must exist |
| `driver_id` | Nullable UUID, must exist in `drivers` |
| `conductor_id` | Nullable UUID, must exist in `conductor_profiles` |
| `status` | Nullable, `ACTIVE`/`MAINTENANCE`/`INACTIVE` — defaults to `ACTIVE` |
| `capacity_status` | Nullable, `AVAILABLE`/`STANDING`/`FULL` — defaults to `AVAILABLE` |

**Assignment approval is automatic, not a separate action:** if both `driver_id` and `conductor_id` are sent, `assignment_date` (today, Asia/Manila) and `assignment_approved_at` (now) are stamped in the same insert. A vehicle with only one of the two stays unapproved (`null` on both) until the other is set.

**201 Created:** the Vehicle, freshly loaded with `route`/`driver`/`conductor`. Logged as `VEHICLE`.

Unit numbers use `UNIT-1`, `UNIT-2`, and so on. The first allocation continues
after the highest existing numeric unit, including padded names such as
`UNIT-010`, spaced dash variants, and soft-deleted vehicles. A shared counter
row is locked and incremented in the same transaction as the vehicle insert,
so concurrent additions receive distinct numbers and failed inserts do not
consume a number. Existing unit-name edits advance this counter when needed;
deleted or renamed units never move it backwards. The existing unique index
on `vehicles.unit_number` remains the final database constraint.

### PUT/PATCH /admin/vehicles/{id}

- **Limiter:** conductor-write (30/min)
- **Request:** `UpdateVehicleRequest` → `AdminService::updateVehicle`

Same fields as create, all `sometimes` (partial update), uniqueness checks excluding this vehicle's own ID. The row is locked (`lockForUpdate`, retried up to 3 times on a deadlock) for the duration of the update.

**If `driver_id` or `conductor_id` is in the request at all** (even to the same value):

- **409-equivalent guard:** if the vehicle has an `active_shift_id`, the update is refused — `422 "End the active shift before changing its approved crew assignment."` (shape B, `ValidationException`). A crew reassignment can't happen out from under a live shift.
- Otherwise, `assignment_date`/`assignment_approved_at` are recomputed from whichever driver/conductor IDs end up set (existing + incoming merged) — approved only when **both** are now non-null, cleared otherwise.

**200 OK:** the Vehicle, freshly loaded with relations. Logged as `VEHICLE`.

### DELETE /admin/vehicles/{id}

- **Limiter:** conductor-write (30/min)

**409 Conflict** (custom envelope, `errors.vehicle`) if the vehicle has an `active_shift_id` — never orphan a conductor's active shift by deleting the vehicle under them.

**200 OK:** `data: null`, `message: "Vehicle deleted successfully"`. Logged as `VEHICLE` (the plate number is read **before** the delete call so the log entry can still name it even though the row is about to be gone — a soft-delete, so it's still in the DB, but captured defensively regardless).

---

## Routes

A `Route` is a named corridor (today: one route, "Malolos - Meycauayan - Calumpit"). Its rider-facing shape, the road-following polyline commuters see on the map, is stored on the route itself in `routes.geometry`, with the editor's control points in `routes.waypoints`.

A route has **one live line and no history**. [PUT /admin/routes/{id}/geometry](#put-adminroutesidgeometry) replaces it in place and it is live on the next map fetch. There are no drafts, versions or temporary detours (the `route_versions` table was dropped in `2026_11_04_000001`, which copied each route's then-live line onto `routes.geometry` first).

### GET /admin/routes

- **Limiter:** conductor-read (60/min)

**200 OK:** an array, ordered by name, each shaped as:

```json
{
  "id": "…",
  "name": "Malolos - Meycauayan - Calumpit",
  "status": "ACTIVE",
  "vehicles_count": 12,
  "fare_points_count": 9,
  "geometry": [[14.86,120.77], …],
  "waypoints": [[14.86,120.77], …],
  "updated_at": "…"
}
```

`vehicles_count`/`fare_points_count` come from `withCount`, not a separate query per route. `geometry` is `[]` until a line is saved. `waypoints` only contains `[lat, lng]` pairs; older `{lat, lng, name}` entries are left out so the editor falls back to `geometry`.

### GET /admin/routes/{id}

Same shape as one list row. `404` (shape B) for an unknown ID.

- **Limiter:** conductor-read (60/min)

### POST /admin/routes

- **Limiter:** conductor-write (30/min)
- **Request:** `StoreRouteRequest`

**Body (JSON)**

| Field | Rules |
|---|---|
| `name` | Required, max 100 |
| `status` | Nullable, `ACTIVE`/`INACTIVE` — defaults to `INACTIVE` |
| `waypoints` | Nullable array, max 100 entries, each `[lat, lng]` with `lat` -90..90, `lng` -180..180 |

Creates the `Route` row only, with no line. It shows nothing on the maps until a line is saved with [PUT /admin/routes/{id}/geometry](#put-adminroutesidgeometry).

**201 Created:** the shaped payload. Logged as `ROUTE`.

### PUT/PATCH /admin/routes/{id}

Same fields, all `sometimes`. Only touches `name`/`status`/`waypoints`; the line (`geometry`) is only written by [PUT /admin/routes/{id}/geometry](#put-adminroutesidgeometry).

- **Limiter:** conductor-write (30/min)

### DELETE /admin/routes/{id}

**409** (plain error response, not the validation-errors shape) if the route still has any vehicles or fare points attached — move them first.

- **Limiter:** conductor-write (30/min)

**200 OK:** `data: null`, `message: "Route deleted successfully"`. Logged as `ROUTE`.

### PUT /admin/routes/{id}/geometry

Replaces the route's line. It is live on every map and in hail coverage on the next fetch; the previous line is not kept.

- **Limiter:** conductor-write (30/min)
- **Request:** `SaveRouteGeometryRequest`

**Body (JSON)**

| Field | Rules |
|---|---|
| `geometry` | Required array, 2–5000 points, each `[lat, lng]`: the full road-following polyline |
| `waypoints` | Required array, 2–100 points, each `[lat, lng]`: the control points the geometry was generated from |

Writes `geometry` and `waypoints` onto the route and sets `routes.status = ACTIVE`.

**200 OK:** the route payload (same shape as [GET /admin/routes](#get-adminroutes)), `message: "Route saved"`. Logged as `ROUTE` ("Updated the route line of X").

---

## Fare points

A `FarePoint` is one stop on a route: a code, a display name, optional `landmarks`/`sub_stops` (both stored as JSON arrays, matched case-insensitively by the fare calculator — see [conductor.md](conductor.md#how-the-fare-is-calculated)), per-type fares, and optional coordinates.

### GET /admin/fare-points

- **Limiter:** conductor-read (60/min)

**Query:** `route_id` — filters to one route.

**200 OK:** an array ordered by `point_number`, each with `route:id,name` loaded.

### POST /admin/fare-points

- **Limiter:** conductor-write (30/min)
- **Request:** `StoreFarePointRequest`

**Body (JSON)**

| Field | Rules |
|---|---|
| `route_id` | Required UUID, must exist |
| `point_number` | Required integer ≥ 1 — the stop's order on the route |
| `code` | Required, max 10 |
| `name` | Required, max 100 |
| `landmarks`, `sub_stops` | Nullable string, max 500 (stored/matched as structured data — see [conductor.md](conductor.md#how-the-fare-is-calculated)) |
| *(no fare fields)* | A stop's `regular_fare` / `discounted_fare` are its fare from stop 1, set by the server from the Financial Rules. Any fare fields sent are ignored. Deleting a stop moves later stops up one and re-prices them |
| `latitude` | Nullable, required if `longitude` is sent, -90..90 |
| `longitude` | Nullable, required if `latitude` is sent, -180..180 |

Creating a fare point does not change the route line; see [below](#fare-points-and-the-route-line). **201 Created:** the FarePoint with `route:id,name`. `message: "Fare point created. The route line on the maps is unchanged."` Logged as `FARE_POINT`.

### PUT/PATCH /admin/fare-points/{id}

Same fields, all `sometimes`.

- **Limiter:** conductor-write (30/min)

Never changes the route line. When one of `route_id`, `point_number`, `latitude`, `longitude` actually changed value, `message` says the line was not changed: `"Fare point updated. The route line on the maps is unchanged."`; otherwise plain `"Fare point updated successfully"`.

### DELETE /admin/fare-points/{id}

Does not change the route line.

- **Limiter:** conductor-write (30/min)

**200 OK:** `data: null`, `message: "Fare point deleted. The route line on the maps is unchanged."` Logged as `FARE_POINT`.

### PUT /admin/fare-points/reorder

Rewrites `point_number` for every fare point on a route at once, from a client-supplied order.

- **Limiter:** conductor-write (30/min)

**Body (JSON)**

| Field | Rules |
|---|---|
| `route_id` | Required UUID, must exist |
| `ordered_ids` | Required array, each a distinct UUID that must exist in `fare_points` |

**422** (plain error, not per-field) if `ordered_ids` doesn't contain **every** fare point the route currently has, **exactly once** — no partial reorders, no silently dropping a stop. Rewritten in one transaction (`point_number = index + 1`); the route line is not changed. **200 OK:** the route's fare points in their new order. Logged as `FARE_POINT`.

### Fare points and the route line

No fare-point write touches `routes.geometry`. The live line stays exactly as it was, so maps and hail coverage never lose their route. The line is only written by [PUT /admin/routes/{id}/geometry](#put-adminroutesidgeometry). Its admin UI (`components/admin/routes/route-editor.tsx`) is currently not shown on any page, so the line is effectively fixed until that editor is mounted again.

---

## POST /qr/generate

Issues a signed, stateless **unit-QR** token for a vehicle — printed and stuck inside the jeepney for the Feedback flow. This is **not** the GCash payment QR (that's [conductor.md](conductor.md#gcash)); it has nothing to do with fares.

- **Role:** `ADMIN` (route-level middleware, not the `/admin` prefix — this route lives under `/qr`)
- **Limiter:** admin-write (30/min)
- **Request:** `GenerateQrRequest` → `QrTokenService::issue`

**Body (JSON):** `vehicle_id` (required, must exist in `vehicles`).

**Token format:** `base64url(JSON payload) + '.' + hex(HMAC-SHA256 signature)`. The payload is `{v: 1, vehicle_id, issued_at, expires_at}`. No DB row is created — the token is fully self-contained; the only way to revoke every outstanding QR at once is rotating the signing secret (`QR_FEEDBACK_SECRET`, falling back to `APP_KEY` if unset — set it explicitly in production).

**TTL:** `qr.feedback_ttl_minutes`, default **10080** minutes (7 days) — long-lived by design, since this is a QR glued inside a vehicle, not a per-ride code.

**201 Created**

```json
{
  "data": {
    "token": "eyJ2IjoxLCJ2ZWhpY2xlX2lkIjoiLi4uIn0.9f2a…",
    "payload": { "v": 1, "vehicle_id": "…", "issued_at": "2026-10-01T00:00:00+00:00", "expires_at": "2026-10-08T00:00:00+00:00" },
    "signature": "9f2a…",
    "expires_at": "2026-10-08T00:00:00+00:00"
  },
  "message": "QR token issued"
}
```

A commuter later resolves this token via `POST /qr/validate` or `POST /qr/scan` (both `COMMUTER`-only — see [commuter.md](commuter.md)), or the vehicle's **separate, permanent** unit-QR via `POST /qr/scan-public` resolves straight from a bare `vehicle_id` with no signature at all. The two QR types exist side by side on purpose — see [Known quirks](#known-quirks).

---

## Known quirks

1. **`generated_password` leaks through every vehicle endpoint that returns an assigned conductor.** `AdminService::listVehicles`/`getVehicle`/`createVehicle`/`updateVehicle` all eager-load the `conductor` relation with no column restriction, and `ConductorProfile` has no `$hidden` array (see [admin-people.md](admin-people.md#known-quirks) for the full picture, which also covers `GET`/`PUT /admin/conductors*`). Any `GET /admin/vehicles`, `GET /admin/vehicles/{id}`, or a create/update response for a vehicle with a conductor assigned carries that conductor's plaintext-equivalent login password in the JSON.

2. **Moving or reordering fare points does not move the route line.** The map line and hail coverage keep following the saved line, not the moved stops. The fare-point responses say so in their `message`.

3. **Two unrelated "unit QR" concepts share the `/qr` prefix and look similar from the outside.** `POST /qr/generate` here issues a **signed, time-limited** token tied to one vehicle for the Feedback flow. A vehicle also has a **separate, permanent** printed QR (just its bare `vehicle_id`, no admin action needed to create it) that `POST /qr/scan-public` resolves with no signature check at all. Neither is the GCash payment QR. All three are easy to conflate when reading "QR" in isolation — see [payments.md](payments.md) for the actual fare-payment QR flow.

4. **`PUT/PATCH /admin/vehicles/{id}` blocks a crew reassignment during an active shift, but `DELETE` on that same vehicle's driver or conductor doesn't go through this guard at all** — [DELETE /admin/drivers/{id}](admin-people.md#delete-admindriversid) and [DELETE /admin/conductors/{id}](admin-people.md#delete-adminconductorsid) check the *person's* `active_shift_id` directly, which is the same underlying shift, so in practice both paths end up guarded — but they're two separate checks in two separate services that happen to agree, not one shared guard. A future change to either side should re-verify the other still refuses correctly.

5. **`POST /admin/routes` does not create a line.** A freshly created route has `geometry: []` and shows nothing on the public map or `GET /routes/active` until an admin saves a line with `PUT /admin/routes/{id}/geometry`. Creating the route alone is not enough to make it live, which is easy to miss if you're only checking that the `POST` succeeded.
