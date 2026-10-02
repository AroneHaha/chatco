# Admin: Fleet API

Vehicles, routes (including the draft/publish geometry workflow and temporary detours), fare points, and the admin unit-QR issuer. Driver/conductor personnel are in [admin-people.md](admin-people.md); live fleet monitoring (the moving-map view) is in [admin-operations.md](admin-operations.md#monitoring).

All paths are relative to `/api/v1`. Conventions are in [README.md](README.md). **Every route here requires role `ADMIN`** (`auth:sanctum` + `role:ADMIN`), except `POST /qr/generate`, which lives outside the `/admin` prefix but carries the same `role:ADMIN` middleware directly on the route.

## Contents

- [Vehicles](#vehicles)
  - [GET /admin/vehicles](#get-adminvehicles)
  - [GET /admin/vehicles/{id}](#get-adminvehiclesid)
  - [POST /admin/vehicles](#post-adminvehicles)
  - [PUT/PATCH /admin/vehicles/{id}](#putpatch-adminvehiclesid)
  - [DELETE /admin/vehicles/{id}](#delete-adminvehiclesid)
- [Routes](#routes)
  - [The route-version lifecycle](#the-route-version-lifecycle)
  - [GET /admin/routes](#get-adminroutes)
  - [GET /admin/routes/{id}](#get-adminroutesid)
  - [POST /admin/routes](#post-adminroutes)
  - [PUT/PATCH /admin/routes/{id}](#putpatch-adminroutesid)
  - [DELETE /admin/routes/{id}](#delete-adminroutesid)
  - [PUT /admin/routes/{id}/draft](#put-adminroutesiddraft)
  - [POST /admin/routes/{id}/publish](#post-adminroutesidpublish)
  - [GET /admin/routes/{id}/versions](#get-adminroutesidversions)
- [Fare points](#fare-points)
  - [GET /admin/fare-points](#get-adminfare-points)
  - [POST /admin/fare-points](#post-adminfare-points)
  - [PUT/PATCH /admin/fare-points/{id}](#putpatch-adminfare-pointsid)
  - [DELETE /admin/fare-points/{id}](#delete-adminfare-pointsid)
  - [PUT /admin/fare-points/reorder](#put-adminfare-pointsreorder)
  - [Fare points changing a route's draft](#fare-points-changing-a-routes-draft)
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
| `unit_number`, `plate_number` | Required, max 20, unique |
| `brand`, `model` | Required, max 50 |
| `vehicle_type` | Nullable, one of `Jeepney, Bus, Van, UV Express` |
| `route_id` | Nullable UUID, must exist |
| `driver_id` | Nullable UUID, must exist in `drivers` |
| `conductor_id` | Nullable UUID, must exist in `conductor_profiles` |
| `status` | Nullable, `ACTIVE`/`MAINTENANCE`/`INACTIVE` — defaults to `ACTIVE` |
| `capacity_status` | Nullable, `AVAILABLE`/`STANDING`/`FULL` — defaults to `AVAILABLE` |

**Assignment approval is automatic, not a separate action:** if both `driver_id` and `conductor_id` are sent, `assignment_date` (today, Asia/Manila) and `assignment_approved_at` (now) are stamped in the same insert. A vehicle with only one of the two stays unapproved (`null` on both) until the other is set.

**201 Created:** the Vehicle, freshly loaded with `route`/`driver`/`conductor`. Logged as `VEHICLE`.

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

A `Route` is a named corridor (today: one route, "Malolos - Meycauayan - Calumpit"). Its rider-facing shape — the road-following polyline commuters see on the map — lives on a separate `RouteVersion` row, not on the route itself, so a route can carry a draft a planner is still shaping alongside the version riders currently see.

### The route-version lifecycle

```
PUT /routes/{id}/draft ──► DRAFT version (geometry + waypoints staged)
                             │
                             ▼
              POST /routes/{id}/publish ──► PUBLISHED version
                             │                 (effective_from → effective_until, or open-ended)
                             ▼
                    becomes the route's active_version
                    the moment "now" enters that window
```

- **A route has at most one `DRAFT` version at a time** (`RouteGeometryService::latestDraft` always edits the existing draft in place rather than creating a new one, until it's published).
- **The "active" version** (what `GET /routes/active` and the public map serve — [public.md](public.md)) is resolved live, not stored as a flag: the highest-`version` `PUBLISHED` row whose `effective_from ≤ now < effective_until` (or either bound is `null`, meaning unbounded). This is what makes a **temporary detour** work: publish a version with an `effective_until`, and the route automatically reverts to whichever published version's window covers "now" again once it lapses — no second publish needed to "undo" it.
- **Publishing sets `routes.status = 'ACTIVE'`** regardless of whether the new version is open-ended or a temporary detour.
- **Fare-point edits auto-generate a new draft** — see [Fare points changing a route's draft](#fare-points-changing-a-routes-draft). This is the main way a draft gets created outside of `PUT /routes/{id}/draft` itself.

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
  "active_version": { "id": "…", "number": 3, "status": "PUBLISHED", "geometry": [[14.86,120.77], …], "waypoints": [...], "notes": null, "effective_from": "…", "effective_until": null, "published_at": "…", "is_temporary": false },
  "draft_version": null
}
```

`vehicles_count`/`fare_points_count` come from `withCount`, not a separate query per route. `draft_version` is `null` whenever nothing is currently staged.

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

Creates the `Route` row only — this does **not** create a `RouteVersion`. A brand-new route has no `active_version` or `draft_version` until [draft](#put-adminroutesiddraft)/[publish](#post-adminroutesidpublish) run.

**201 Created:** the shaped payload. Logged as `ROUTE`.

### PUT/PATCH /admin/routes/{id}

Same fields, all `sometimes`. Only touches `name`/`status`/`waypoints` on the `Route` row itself — never the version table.

- **Limiter:** conductor-write (30/min)

### DELETE /admin/routes/{id}

**409** (plain error response, not the validation-errors shape) if the route still has any vehicles or fare points attached — move them first.

- **Limiter:** conductor-write (30/min)

**200 OK:** `data: null`, `message: "Route deleted successfully"`. Logged as `ROUTE`.

### PUT /admin/routes/{id}/draft

Stages (or re-stages) the route's map geometry for review before publishing.

- **Limiter:** conductor-write (30/min)
- **Request:** `SaveRouteDraftRequest`

**Body (JSON)**

| Field | Rules |
|---|---|
| `geometry` | Required array, 2–5000 points, each `[lat, lng]` — the full road-following polyline |
| `waypoints` | Required array, 2–100 points, each `[lat, lng]` — the fare-point markers the geometry was drawn against |
| `notes` | Nullable, max 1000 |

The route row is locked for the duration (`lockForUpdate`) so two admins drafting at once serialize rather than race. If no `DRAFT` version exists yet, one is created (`version` = current max + 1); otherwise the existing draft is overwritten in place — **a route never accumulates more than one draft**.

**200 OK:** the version payload (`{id, number, status: "DRAFT", geometry, waypoints, notes, effective_from: null, effective_until: null, published_at: null, is_temporary: false}`), `message: "Route draft saved"`.

### POST /admin/routes/{id}/publish

Promotes the current draft to `PUBLISHED`.

- **Limiter:** conductor-write (30/min)
- **Request:** `PublishRouteVersionRequest`

**Body (JSON)**

| Field | Rules |
|---|---|
| `effective_from` | Nullable date — defaults to **now** |
| `effective_until` | Nullable date, must be after `now` **and** after `effective_from` — omit entirely for a permanent publish |
| `notes` | Nullable, max 1000 — overwrites the draft's notes if sent |

**422** (shape A, with the request's own message) if `effective_until ≤ effective_from`. **422 "Save a valid route draft before publishing."** (shape B, `abort(422, ...)`) if there's no draft, or its `geometry` has fewer than 2 points.

Sets the draft's `status = PUBLISHED`, stamps `published_at`/`published_by`, and sets `routes.status = ACTIVE`. **This does not delete or demote any earlier `PUBLISHED` version** — old versions stay in the table forever, which is exactly what lets an expired detour's window lapse back to the previous permanent version automatically (see [the lifecycle](#the-route-version-lifecycle)).

**200 OK:** the version payload. `message` is `"Temporary route published"` when `effective_until` was sent, otherwise `"Route published"`. Logged as `ROUTE` with a matching distinction ("Published temporary detour for route X" vs. "Published route X").

### GET /admin/routes/{id}/versions

Every version ever created for the route (draft and published), in the model's default `orderByDesc('version')`.

- **Limiter:** conductor-read (60/min)

**200 OK:** an array of version payloads, same shape as `active_version`/`draft_version` above.

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
| `regular_fare`, `discounted_fare` | Required numeric ≥ 0 |
| `latitude` | Nullable, required if `longitude` is sent, -90..90 |
| `longitude` | Nullable, required if `latitude` is sent, -180..180 |

Creating a fare point **re-syncs the route's draft waypoints** from every fare point's coordinates — see [below](#fare-points-changing-a-routes-draft). **201 Created:** the FarePoint with `route:id,name`. `message: "Fare point created. Review and publish the updated route draft."` Logged as `FARE_POINT`.

### PUT/PATCH /admin/fare-points/{id}

Same fields, all `sometimes`.

- **Limiter:** conductor-write (30/min)

Only re-syncs the draft (both the **old** and, if changed, the **new** route) when one of `route_id`, `point_number`, `latitude`, `longitude` actually changed value — editing just the name or fare amounts does **not** touch the route's draft, since it doesn't affect the road geometry. `message` reflects which happened: `"...Review and publish the updated route draft."` vs. plain `"Fare point updated successfully"`.

### DELETE /admin/fare-points/{id}

Always re-syncs the (now shorter) route's draft.

- **Limiter:** conductor-write (30/min)

**200 OK:** `data: null`, `message: "Fare point deleted. Review and publish the updated route draft."` Logged as `FARE_POINT`.

### PUT /admin/fare-points/reorder

Rewrites `point_number` for every fare point on a route at once, from a client-supplied order.

- **Limiter:** conductor-write (30/min)

**Body (JSON)**

| Field | Rules |
|---|---|
| `route_id` | Required UUID, must exist |
| `ordered_ids` | Required array, each a distinct UUID that must exist in `fare_points` |

**422** (plain error, not per-field) if `ordered_ids` doesn't contain **every** fare point the route currently has, **exactly once** — no partial reorders, no silently dropping a stop. Rewritten in one transaction (`point_number = index + 1`), then the route's draft is re-synced. **200 OK:** the route's fare points in their new order. Logged as `FARE_POINT`.

### Fare points changing a route's draft

`RouteGeometryService::syncDraftWaypointsFromFarePoints` runs after every fare-point create/update/delete/reorder that could move a stop. It:

1. Collects every fare point's coordinates on the route (only those with both `latitude` and `longitude` set), ordered by `point_number`.
2. Writes them into the route's `DRAFT` version's `waypoints` — creating a draft if none exists.
3. **Clears the draft's `geometry` to `null`** and overwrites its `notes` to `"Fare Point coordinates changed. Generate and review the route before publishing."`

That third step is deliberate: a stale road-following line must never get republished against a changed stop list without a human regenerating and reviewing it first. **This means every fare-point edit silently discards whatever unpublished geometry a planner had drawn on the map**, even if the point they just edited has no coordinates at all (any fare-point write touches this path) — see [Known quirks](#known-quirks).

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

2. **Any fare-point write clears the route's unpublished draft geometry**, even a change that has nothing to do with the road shape (editing a fare amount, renaming a stop with no coordinates). `syncDraftWaypointsFromFarePoints` runs unconditionally from `store`/`destroy`/`reorder`, and from `update` whenever `route_id`, `point_number`, `latitude` or `longitude` changed — there's no way to edit fare points without risking a planner's in-progress map line, so publish drafts promptly rather than leaving map work staged across fare-point edits.

3. **Two unrelated "unit QR" concepts share the `/qr` prefix and look similar from the outside.** `POST /qr/generate` here issues a **signed, time-limited** token tied to one vehicle for the Feedback flow. A vehicle also has a **separate, permanent** printed QR (just its bare `vehicle_id`, no admin action needed to create it) that `POST /qr/scan-public` resolves with no signature check at all. Neither is the GCash payment QR. All three are easy to conflate when reading "QR" in isolation — see [payments.md](payments.md) for the actual fare-payment QR flow.

4. **`PUT/PATCH /admin/vehicles/{id}` blocks a crew reassignment during an active shift, but `DELETE` on that same vehicle's driver or conductor doesn't go through this guard at all** — [DELETE /admin/drivers/{id}](admin-people.md#delete-admindriversid) and [DELETE /admin/conductors/{id}](admin-people.md#delete-adminconductorsid) check the *person's* `active_shift_id` directly, which is the same underlying shift, so in practice both paths end up guarded — but they're two separate checks in two separate services that happen to agree, not one shared guard. A future change to either side should re-verify the other still refuses correctly.

5. **`POST /admin/routes` never creates a `RouteVersion`.** A freshly created route has `active_version: null` and shows nothing on the public map or `GET /routes/active` until an admin explicitly saves a draft and publishes it — creating the route alone is not enough to make it live, which is easy to miss if you're only checking that the `POST` succeeded.
