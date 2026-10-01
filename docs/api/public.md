# Public and Shared Read API

Reference data and tracking endpoints used by the landing page, the maps and the fare calculators.

- The first five endpoints need **no token**.
- `GET /vehicles/locations` needs a token but works for **any role**.

All paths are relative to `/api/v1`. Conventions are in [README.md](README.md).

| Method | Path | Auth | Limiter | Used by |
|---|---|---|---|---|
| GET | [`/fare-matrix`](#get-fare-matrix) | — | public-read (60/min) | Commuter fare calculator, conductor fare modal |
| GET | [`/routes/active`](#get-routesactive) | — | public-read (60/min) | Every tracking map, route coverage checks |
| GET | [`/faqs`](#get-faqs) | — | commuter-hail (10/min) | Landing-page FAQ chat bubble |
| GET | [`/system-status`](#get-system-status) | — | commuter-hail (10/min) | Maintenance gate, sign-up form |
| GET | [`/share/{token}`](#get-sharetoken) | — | share-ride-track (30/min per IP+token) | Public "Share My Ride" page |
| GET | [`/vehicles/locations`](#get-vehicleslocations) | any | vehicle-locations (60/min) | Live jeepney map (initial load and fallback) |

---

## GET /fare-matrix

The **single source of truth for fares**: the commuter fare calculator, the conductor fare modal and server-side fare calculation all read the same `fare_points` rows.

- **Controller:** `FareMatrixController@index`
- **Edited by:** admin `/admin/fare-points` (fare points) and `/admin/settings` (fare config). Changes show up on the next fetch; there is no cache.

**Query**

| Param | Rules |
|---|---|
| `route_id` | Optional UUID. If omitted, the server uses the oldest `ACTIVE` route that has a currently effective published geometry, falling back to the oldest `ACTIVE` route. |

**200 OK.** Note the **camelCase** keys:

```json
{
  "data": {
    "route": { "id": "a1b2…", "name": "Calumpit – Meycauayan" },
    "points": [
      {
        "id": "f0e1…",
        "pointNumber": 1,
        "code": "CAL",
        "name": "Calumpit",
        "landmarks": ["Public Market", "Municipal Hall"],
        "subStops": ["Poblacion"],
        "regularFare": 15.0,
        "discountedFare": 12.0,
        "latitude": 14.9156,
        "longitude": 120.7653,
        "route": "Calumpit – Meycauayan"
      }
    ],
    "config": {
      "baseBarangayCount": 4,
      "baseFareRegular": 15.0,
      "baseFareDiscounted": 12.0,
      "succeedingFareRegular": 2.25,
      "succeedingFareDiscounted": 1.75,
      "totalPoints": 23
    }
  },
  "message": "Fare matrix retrieved"
}
```

| Field | Notes |
|---|---|
| `points` | Ordered by `pointNumber` ascending |
| `landmarks`, `subStops` | Always arrays. The database stores them as JSON or comma-separated text; the API normalizes both. |
| `latitude`, `longitude` | `null` when the admin has not pinned the stop |
| `config` | Comes from the `settings` table, with the defaults shown above when unset. `totalPoints` is the number of points on this route. |

**Errors**

| Status | When |
|---|---|
| 404 | No route matches (bad `route_id`, or no `ACTIVE` route): `"No active route is available."` |

> Fare-recording endpoints send `pickup_stop_id` and `dropoff_stop_id`, which are the point `id`s from here. A client that falls back to a hard-coded local fare list has no IDs and will fail stop resolution on the server. Always load this endpoint first. (This is why it has its own 60/min limiter.)

## GET /routes/active

The published route line to draw on maps.

- **Controller:** `RouteGeometryController@active`
- **Edited by:** admin `/admin/routes/{id}/draft` and `/admin/routes/{id}/publish`

**Query**

| Param | Rules |
|---|---|
| `route_id` | Optional UUID. Restricts the search to that route (it must still be `ACTIVE`). |

**Which version is chosen.** The server picks the first `ACTIVE` route, oldest first, that has a **currently effective** `PUBLISHED` version:

- `effective_from` is null or in the past, and
- `effective_until` is null or in the future.

When several versions qualify, the most recently published wins. This is how a **temporary detour** works: it is published with an `effective_until` and overrides the permanent line until it lapses.

**200 OK**

```json
{
  "data": {
    "id": "a1b2…",
    "name": "Calumpit – Meycauayan",
    "status": "ACTIVE",
    "coordinates": [[14.9156, 120.7653], [14.9150, 120.7660]],
    "bounds": { "south": 14.73, "west": 120.75, "north": 14.92, "east": 120.96 },
    "version": {
      "id": "v9…",
      "number": 4,
      "status": "PUBLISHED",
      "geometry": [[14.9156, 120.7653], [14.9150, 120.7660]],
      "waypoints": [[14.9156, 120.7653], [14.7342, 120.9571]],
      "notes": "Detour via MacArthur Hwy",
      "effective_from": "2026-10-01T06:00:00+08:00",
      "effective_until": "2026-10-03T22:00:00+08:00",
      "published_at": "2026-09-30T18:12:00+08:00",
      "is_temporary": true
    }
  },
  "message": "Active route geometry retrieved"
}
```

| Field | Notes |
|---|---|
| `coordinates`, `geometry` | Arrays of `[lat, lng]`. Latitude comes **first**, which is the order Leaflet uses. GeoJSON uses `[lng, lat]`, so convert if you need that format. |
| `waypoints` | The admin's control points. `geometry` is the full snapped line. |
| `bounds` | `null` when the line has fewer than 2 points |
| `is_temporary` | `true` when `effective_until` is set (a detour) |

**Errors**

| Status | When |
|---|---|
| 404 | `"No published route geometry is currently active."` |

> The server also uses this geometry. `POST /commuter/hail` refuses a pickup more than 1 km from the active line ("Pickup point is outside the active route coverage.").

## GET /faqs

Active FAQ entries for the landing-page chat bubble.

- **Controller:** `FaqController@index`
- **Edited by:** admin `/admin/faqs`

**200 OK.** A flat array, sorted by `category`, then `display_order`:

```json
{
  "data": [
    {
      "id": "…",
      "question": "How do I pay with GCash?",
      "answer": "…",
      "category": "Payments",
      "display_order": 1
    }
  ],
  "message": "FAQ items retrieved"
}
```

Inactive items (`is_active = false`) are left out. Group by `category` on the client.

## GET /system-status

Global flags that the public and signed-in apps check on load.

- **Controller:** `SystemStatusController@index`
- **Edited by:** admin `/admin/settings` (App Configuration page)

**200 OK**

```json
{
  "data": {
    "maintenance_mode": false,
    "maintenance_message": "CHATCO is currently undergoing scheduled maintenance. …",
    "require_id_upload": true
  },
  "message": "System status retrieved"
}
```

| Field | Meaning |
|---|---|
| `maintenance_mode` | `true` makes the commuter and conductor apps show the maintenance screen. The server also enforces it on `POST /conductor/shifts/start` (returns `503`). Admins are never blocked. |
| `maintenance_message` | The admin's custom text, or the default shown above when blank |
| `require_id_upload` | Whether a `REGULAR` commuter must upload an ID at sign-up. Discounted types always must. Defaults to `true`. |

> This endpoint shares the 10/min `commuter-hail` bucket with hailing and payment claims. Fetch it once per app load, not on an interval.

## GET /share/{token}

The public page a commuter sends to family through **Share My Ride**. It is polled about every 5 seconds.

- **Controller:** `ShareRideController@show`
- **Link created by:** [`POST /commuter/share-ride`](commuter.md#post-commutershare-ride)
- **Link lifetime:** 30 minutes from creation
- **Link ends when:** the commuter calls `DELETE /commuter/share-ride`, or rotates the link (which makes older links read as expired)

**Path:** `token` is the opaque token from the share URL.

**200 OK, link active**

```json
{
  "data": {
    "active": true,
    "expired": false,
    "commuter_name": "Juan Dela Cruz",
    "lat": 14.8433,
    "lng": 120.8115,
    "last_updated": "2026-10-01T08:15:02+08:00",
    "expires_at": "2026-10-01T08:42:40+08:00"
  },
  "message": "Tracking data retrieved"
}
```

`lat` and `lng` are `null` until the commuter's app pushes a first position.

**200 OK, link stopped or expired.** This is still `200`, so the page can show a friendly "sharing has ended" state:

```json
{
  "data": { "active": false, "expired": true, "commuter_name": "Juan Dela Cruz" },
  "message": "Tracking link expired"
}
```

**Errors**

| Status | When |
|---|---|
| 404 | Unknown token: `"Tracking link not found."` |
| 429 | More than 30 requests/min for this token from one IP |

Only the commuter's first name and surname are exposed. No IDs or contact details.

## GET /vehicles/locations

Every jeepney currently on duty with a recent GPS fix. Use it for the **first paint** of the live map, then switch to the `vehicles` Pusher channel (`VehicleLocationUpdated`, see [README](README.md#realtime-pusher)). Poll it only as a fallback when realtime is down.

- **Auth:** any signed-in role. Also exposed as `GET /mobile/commuter/vehicles/locations`.
- **Controller:** `Commuter\VehicleLocationController@index` → `LocationService::getAllActiveLocations()`

**A vehicle is included only when all of these hold:**

- it has an active shift (`vehicles.active_shift_id` is set);
- its location row belongs to **that** shift and has a non-null `lat` and `lng`;
- the shift is **not on break**;
- the fix arrived after the shift started, **and** within the last 10 minutes.

There is no distance filter: every qualifying vehicle is returned.

**200 OK.** An array ordered by most recent update first:

```json
{
  "data": [
    {
      "vehicle_id": "c3d4…",
      "plate_number": "ABC 1234",
      "vehicle_type": "Jeepney",
      "unit_number": "U-07",
      "vehicle_capacity_status": "AVAILABLE",
      "lat": "14.8433120",
      "lng": "120.8115400",
      "speed": "32.50",
      "heading": "180.00",
      "capacity_status": "STANDING",
      "route_name": "Calumpit – Meycauayan",
      "updated_at": "2026-10-01 08:15:02"
    }
  ],
  "message": "Vehicle locations retrieved"
}
```

Format traps:

| Field | Trap |
|---|---|
| `lat`, `lng`, `speed`, `heading` | **Strings**, because these are raw query-builder rows over `DECIMAL` columns. Convert with `Number()` / `parseFloat`. |
| `updated_at` | A database datetime string in Asia/Manila time, **not** ISO-8601 |
| `capacity_status` vs `vehicle_capacity_status` | `capacity_status` is the live per-shift value the conductor sets. Prefer it. `vehicle_capacity_status` is the vehicle record's stored value. |
| Broadcast payload | `VehicleLocationUpdated` has the same fields **minus** `unit_number` and `vehicle_capacity_status` |

An empty array means no vehicle is on duty. This is not an error.
