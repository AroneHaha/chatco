# CHATCO API

Reference for the Laravel backend in `backend/`. Start here: this page covers the conventions every endpoint shares, then indexes every route and links to the per-area docs.

The source of truth is always the code. Routes live in `backend/routes/api.php`, request rules in `backend/app/Http/Requests/`, and response shapes in the controllers and services. When you change one of those, update the matching doc.

## Contents

- [Architecture: how a request reaches Laravel](#architecture-how-a-request-reaches-laravel)
- [Base URL and versioning](#base-url-and-versioning)
- [Authentication](#authentication)
- [Request conventions](#request-conventions)
- [Response envelope](#response-envelope)
- [Error responses](#error-responses)
- [Pagination](#pagination)
- [Rate limits](#rate-limits)
- [Conductor device ownership](#conductor-device-ownership)
- [Realtime (Pusher)](#realtime-pusher)
- [Scheduled jobs that change API state](#scheduled-jobs-that-change-api-state)
- [Shared enums](#shared-enums)
- [Endpoint index](#endpoint-index)
- [Known quirks](#known-quirks)

Per-area docs:

| Doc | Covers | Status |
|---|---|---|
| [auth.md](auth.md) | Login, logout, current user, sign-up with email verification, password reset | Done |
| [public.md](public.md) | Fare matrix, route geometry, FAQs, system status, share-ride tracking, live vehicle locations | Done |
| [commuter.md](commuter.md) | Commuter profile, password change, trips, rewards, location, Share My Ride, hailing, feedback, SOS, own Lost & Found lists | Done |
| [payments.md](payments.md) | GCash, cash receipts, vouchers, payment history, status polling, cancel, simulate, webhook, unit QR | Done |
| [conductor.md](conductor.md) | Shifts, devices, fares, remittance, hails, mobile namespace | Done |
| [lost-found.md](lost-found.md) | Lost & Found browse, claims, watchlist | Done |
| [announcements.md](announcements.md) | Notification feed and read state | Done |
| [admin-people.md](admin-people.md) | Users, registrations (+ rejection cooldown), personnel, terminated personnel, drivers, conductors | Done |
| [admin-fleet.md](admin-fleet.md) | Vehicles, routes (draft/publish/versions, detours), fare points, unit-QR issuance | Done |
| [admin-operations.md](admin-operations.md) | Dashboard/analytics, monitoring, overspeed, demand zones, shift logs, device recovery, transactions, remittances, SOS, feedback, activity logs | Done |
| [admin-content.md](admin-content.md) | Settings, vouchers, remittance options, FAQs, announcements CRUD, Lost & Found management | Done |

---

## Architecture: how a request reaches Laravel

The web app never calls Laravel from the browser. Every call makes two hops:

```
Browser ──► Next.js route handler (frontend/app/api/**/route.ts) ──► Laravel /api/v1/**
            reads httpOnly cookie `chatco_session`,                    auth:sanctum + role middleware
            adds `Authorization: Bearer <token>`
```

- **The browser calls `/api/...` on the Next.js origin.** The paths are unversioned and sometimes renamed: `/api/conductor/shifts/active` maps to Laravel `/api/v1/conductor/shift`, for example.
- **Next.js forwards to `${API_URL}/api/v1/...`.** Most handlers use `proxyToLaravel()` in `frontend/lib/conductor/server/proxy.ts`. It is not conductor-specific despite the folder name.
- **The token lives only in the `chatco_session` httpOnly cookie,** set by `frontend/app/api/auth/login/route.ts`. Client JavaScript cannot read it.
- **Mobile apps and other direct clients** call Laravel directly with a Bearer token and skip the Next.js layer.

When this doc gives a path, it is the **Laravel** path. To find the Next.js handler for a Laravel route, search `frontend/app/api` for the Laravel path string.

### Client IP forwarding

All traffic reaches Laravel from the Next.js host, so per-IP rate limits would otherwise put every user in one bucket. The frontend sends two headers to fix this:

| Header | Value |
|---|---|
| `X-Chatco-Client-IP` | The real browser IP |
| `X-Chatco-Proxy-Secret` | Must equal `FRONTEND_PROXY_SECRET` in both `.env` files |

`ResolveProxiedClientIp` middleware trusts the IP only when the secret matches. With the secret unset, the headers are ignored. See `frontend/lib/auth/server/client-ip.ts`.

## Base URL and versioning

| Environment | Base URL |
|---|---|
| Local | `http://localhost:8000/api/v1` |
| Deployed | `${APP_URL}/api/v1` |

The `v1` prefix is set once in `backend/bootstrap/app.php` (`apiPrefix: 'api/v1'`). The route file itself has no prefix, so `Route::get('/fare-matrix')` is served at `/api/v1/fare-matrix`.

Two routes sit outside the prefix:

| Route | Purpose |
|---|---|
| `GET /up` | Laravel health check (HTML 200) |
| `GET /` | Returns `{"Laravel": "<version>"}` (from `routes/web.php`) |

## Authentication

The API uses **Laravel Sanctum personal access tokens** (Bearer tokens).

1. `POST /auth/login` returns `data.token`.
2. Send it on every protected call as `Authorization: Bearer <token>`.
3. `POST /auth/logout` revokes the token used for that request.

Tokens **never expire on their own** (`sanctum.expiration = null`). A token stops working when one of these happens:

- **Logout** revokes the token that made the call.
- **A new login** revokes older tokens (see the session rules in [auth.md](auth.md#session-rules)).
- **A password reset** revokes every token for the account.
- **An admin disables a conductor.**

A revoked token gets `401`. The web client reacts by redirecting to `/login?reason=session_ended`.

### Roles

Each protected route group requires a role through the `role:` middleware (`EnsureUserRole`):

| Role | Route prefixes |
|---|---|
| `COMMUTER` | `/commuter/*`, `/mobile/commuter/*`, claim/watchlist actions in `/lost-found`, consumer actions in `/qr` |
| `CONDUCTOR` | `/conductor/*`, `/mobile/conductor/*` |
| `ADMIN` | `/admin/*`, `POST /qr/generate` |
| Any signed-in role | `/user`, `/vehicles/locations`, `/payments/{id}/*`, `/lost-found` browse, `/announcements/*` |

A wrong role gets `403 {"success": false, "message": "Forbidden", ...}`.

## Request conventions

- **Always send `Accept: application/json`.** Without it, Laravel may treat validation and auth failures as browser requests (a redirect or HTML page) instead of returning JSON.
- **Send `Content-Type: application/json`** for JSON bodies. For file uploads (`id_image`, lost-item photos, driver licence images), use `multipart/form-data`.
  - PHP does not parse multipart bodies on `PUT`/`PATCH`. Send those as `POST` with a `_method=PUT` (or `PATCH`) form field.
- **IDs are UUID strings,** with two exceptions:
  - Shifts use `shift_id`, a short string key.
  - Transactions use `transaction_id`, a generated string key.
- **Timestamps in responses are ISO-8601.** The app timezone is `Asia/Manila`. Day boundaries such as "today" and "this month" are computed in that zone.
- **Money is in pesos as decimals** (`15.00`), not centavos. Only the payment gateway layer uses centavos internally.
- **Decimal columns can arrive as strings.** Money, coordinates and speed may come back as `"15.00"` or `"14.8433120"` when an endpoint returns a model or a raw query row directly. Endpoints that shape their own payload (fare matrix, earnings, trips) cast to numbers. Clients should convert defensively with `Number()`.
- **Phone numbers** must match `09XXXXXXXXX` (11 digits, see `App\Rules\PhilippineMobileNumber`).
- **Passwords** (sign-up, reset, change) must have 8–128 characters with at least one uppercase letter, one digit and one symbol (`App\Rules\StrongPassword`). Login only checks `min:6` so that older accounts can still sign in.

## Response envelope

Almost every endpoint returns this shape (`App\Traits\ApiResponse`):

```json
{
  "success": true,
  "data": { },
  "message": "Human-readable summary",
  "errors": null,
  "meta": null
}
```

| Field | Meaning |
|---|---|
| `success` | `true` for 2xx, `false` otherwise |
| `data` | The payload: an object, an array, a paginator, or `null` |
| `message` | Always present. Safe to show to users on errors. |
| `errors` | Field errors on `422` validation failures, otherwise `null` |
| `meta` | Reserved and always `null`. Pagination lives inside `data`, not here (see [Pagination](#pagination)). |

The docs for each endpoint describe only the contents of `data`, unless the endpoint breaks this envelope.

## Error responses

Errors come back in **two different shapes**. Client code must handle both.

### Shape A: the envelope

This shape is used for:

- errors a controller returns itself through `errorResponse()`;
- validation failures (`422`);
- unauthenticated requests (`401`);
- rate-limit rejections (`429`).

```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": { "email": ["That email is already in use."] },
  "meta": null
}
```

### Shape B: bare `message`

When a service calls `abort(409, '...')`, throws an `HttpException`, or a `findOrFail` misses, Laravel's default JSON renderer runs instead:

```json
{ "message": "This shift is active on another device. ..." }
```

Shape B errors usually come from deep business rules (shift, payment and hail state machines). With `APP_DEBUG=true` they also include `exception`, `file`, `line` and `trace`. A missing model comes back as `404 {"message": "No query results for model [App\\Models\\ShiftLog] ..."}`.

**Read `body.message` in both cases.** `proxyToLaravel()` already does this, so Next.js handlers get `result.message` either way.

### Endpoints with a custom error body

| Endpoint | Body |
|---|---|
| `POST /commuter/hail` when out of range | `422 {"error": "outside_radius", "distance_m": 1234.5}` (no envelope, so the UI can branch on `error`) |
| `POST /payments/webhook` | `{"received": true}`, `{"error": "..."}`, etc. It is server-to-server and has no envelope. |

### Status codes used across the API

| Code | Meaning in this codebase |
|---|---|
| `200` | Success |
| `201` | Created: registration, shift start, fare recorded, hail, SOS, feedback, GCash initiate |
| `400` | Wrong or expired verification or reset code |
| `401` | Missing or revoked token, or wrong login credentials |
| `403` | Wrong role, not the owner, or account suspended/pending/rejected/disabled at login |
| `404` | Record not found |
| `409` | State conflict: already on shift, device mismatch, already claimed, duplicate hail, already resolved |
| `410` | Expired claimable thing: GCash QR, cash receipt |
| `422` | Validation failed, or a business rule refused the input |
| `429` | Rate limited, a code requested too soon, or too many wrong code attempts |
| `502` | Upstream failure: email delivery or the payment gateway |
| `503` | Maintenance mode is on (`POST .../shifts/start` only) |

## Pagination

There is **no single pagination format**. Each endpoint doc says which one it uses. Three appear in the codebase.

**1. Laravel paginator (most list endpoints).** `data` is the serialized `LengthAwarePaginator`:

```json
"data": {
  "current_page": 1,
  "data": [ ... ],
  "per_page": 20,
  "total": 134,
  "last_page": 7,
  "from": 1,
  "to": 20,
  "first_page_url": "...", "last_page_url": "...",
  "next_page_url": "...", "prev_page_url": null,
  "links": [ ... ], "path": "..."
}
```

Rows are at `data.data`. Request pages with `?page=N&per_page=M`. Most endpoints clamp `per_page` to 1–100.

**2. Named list plus a `pagination` object.** For example, `GET /commuter/feedback` returns `{"feedback": [...], "pagination": {...}}`.

**3. Trimmed paginator plus extra totals.** For example, `GET /conductor/transactions` returns `{"data": [...], "current_page", "per_page", "total", "last_page", "total_amount"}`.

## Rate limits

Every limit is a named limiter defined in `backend/app/Providers/AppServiceProvider.php`. Rejections return `429` in the envelope with the message `"Too many requests. Please slow down."`.

Limits are keyed by user ID when the caller is signed in, and by client IP otherwise (see [Client IP forwarding](#client-ip-forwarding)).

| Limiter | Limit | Keyed by | Typical use |
|---|---|---|---|
| `auth` | 10/min | IP | Login, register, codes, password reset |
| `public-read` | 60/min | user, else IP | Fare matrix, active route |
| `share-ride-track` | 30/min | IP + token | Public share-ride page (polls every 5 s) |
| `vehicle-locations` | 60/min | user, else IP | Live vehicle list |
| `conductor-read` | 60/min | user, else IP | Most GET endpoints for **all** roles, not just conductors |
| `conductor-write` | 30/min | user, else IP | Most writes for all roles |
| `conductor-gps` | 30/min | user | Conductor GPS pings (5 s cadence) |
| `conductor-mutation` | 10/min | user | Shift start, device claim/release, remittance, conductor SOS |
| `commuter-hail` | 10/min | user, else IP | Hail, location, share-ride, payment claims, **and** public `/faqs` + `/system-status` |
| `commuter-read` | 60/min | user | Lost & Found browse, announcements |
| `commuter-write` | 20/min | user | Lost & Found claims, watchlist, announcement read state, QR scans |
| `commuter-feedback` | 5/min | user | Feedback submission |
| `sos` | 1/min | user | Commuter SOS trigger |
| `admin-write` | 30/min | user | Sensitive admin writes: suspend, announcements, lost & found, SOS, cash declaration |
| `admin-read`, `commuter-security` | 60/min, 6/min | user | Defined but **not used** by any route |

> The limiter names are historical. `conductor-read` and `conductor-write` are general-purpose buckets used by commuter and admin routes too. Read the name as "standard read" and "standard write". Because the buckets are shared per user, a burst on one screen can throttle another screen that uses the same limiter.

`GET /admin/dashboard` and `POST /payments/webhook` have no throttle.

## Conductor device ownership

A conductor can be signed in on web and mobile at the same time, but only **one device operates an active shift**. That device ID is stored on the shift (`shift_logs.operating_device_id`).

Conductor write endpoints accept two optional fields:

| Field | Rule |
|---|---|
| `device_id` | 16–100 characters, `[A-Za-z0-9._:-]`, stable per install/browser |
| `device_type` | `WEB` or `MOBILE`. Required when `device_id` is sent. |

`ShiftDeviceService::assertCanOperate` applies these rules:

| Situation | Result |
|---|---|
| The shift has no operating device and the request has a `device_id` | That device claims the shift |
| The shift has an operating device and the request omits `device_id` | `409` (except the web `POST /conductor/transactions`, see [Known quirks](#known-quirks)) |
| The shift has an operating device and the request's `device_id` differs | `409 "This shift is active on another device..."` |
| The device was force-released by an admin recovery | `409` for that device on that shift, permanently |

To hand off between devices:

1. The current device calls `POST /conductor/shifts/device/release`.
2. The new device calls `POST /conductor/shifts/device/claim`.

If the operating device is lost, an admin calls `POST /admin/shifts/{shift}/device/recover`. Logging in on a new device with a `device_id` also moves the active shift to it. Full rules and error messages are in [conductor.md](conductor.md#device-ownership).

## Realtime (Pusher)

Broadcasting uses Pusher (`BROADCAST_CONNECTION=pusher`). Private channels authenticate at `POST /api/v1/broadcasting/auth` with the same Bearer token. The web app proxies this through `frontend/app/api/broadcasting/auth/route.ts`. Channel rules are in `backend/routes/channels.php`.

| Channel | Type | Event (`broadcastAs`) | Payload | Fired when |
|---|---|---|---|---|
| `vehicles` | public | `VehicleLocationUpdated` | `vehicle_id, plate_number, vehicle_type, lat, lng, speed, heading, capacity_status, route_name, updated_at` | A conductor GPS ping is accepted |
| `announcements` | public | `AnnouncementCreated` | `id, type, title, message, status, created_at` | An admin publishes a broadcast announcement (not targeted ones) |
| `payments.{transactionId}` | public | `PaymentStatusUpdated` | `transaction_id, status, paid_at` | A webhook or reconciliation changes a payment status |
| `private-vehicle.{vehicleId}.hails` | private | `HailCreated` | `hail_id, commuter_name, commuter_lat, commuter_lng, distance_m, expires_at` | A commuter hails this vehicle |
| `private-vehicle.{vehicleId}.hails` | private | `HailStatusChanged` | `hail_id, status` | A hail is accepted, rejected, cancelled or expired |
| `private-commuter.{commuterId}.hails` | private | `HailStatusChanged` | `hail_id, status` | Same as above, sent to the commuter who owns the hail |

Authorization rules:

- **`vehicle.{id}.hails`** is open only to the conductor with an active shift on that vehicle.
- **`commuter.{id}.hails`** is open only to that commuter.

Every realtime feed has a polling fallback: `GET /vehicles/locations`, `GET /payments/{id}/status`, `GET /conductor/hails` and `GET /announcements`. Clients should treat events as hints and the REST endpoints as the source of truth.

## Scheduled jobs that change API state

These jobs run from `backend/routes/console.php` (`php artisan schedule:run` every minute). They explain state that changes with no API call, for example a hail going to `EXPIRED` by itself.

| Command | When (Asia/Manila) | Effect |
|---|---|---|
| `hails:expire` | every minute | `PENDING` hails past `expires_at` (3 min) become `EXPIRED` and broadcast |
| `payments:expire-stale` | every minute | `PENDING` GCash past the claim TTL (default 10 min) becomes `EXPIRED` |
| `shifts:auto-end-stale` | every 10 min | Closes active shifts older than the `max_shift_hours` setting (default 12) or started before today |
| `shifts:auto-end-stale --all` | 00:00 | Closes every active shift that started before today |
| `vehicles:reset-daily-assignments` | 00:00 | Closes previous-day shifts and clears previous-day vehicle/driver/conductor assignments |
| `remittances:send-reminders` | 00:05 | Reminds conductors with `PENDING` remittances |
| `lost-items:expire` | 01:00 | Archives `AVAILABLE` lost items unclaimed past the expiry window |
| `announcements:prune-archived` | 02:00 | Soft-deletes `ARCHIVED` announcements older than 30 days |
| `queue:work` (short run) | every minute | Only when `QUEUE_CONNECTION=database`. Shared hosting has no long-lived worker. |

Payments and hails also expire **lazily**: status polls and resume lookups apply the TTL on read, so the API stays correct even if the scheduler is down.

## Shared enums

| Enum | Values |
|---|---|
| `UserRole` | `ADMIN`, `CONDUCTOR`, `COMMUTER` |
| `PaymentMethod` | `CASH`, `GCASH`, `VOUCHER` |
| `PaymentStatus` | `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `CANCELLED`, `EXPIRED`, `REFUNDED` |
| `HailStatus` | `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `EXPIRED` |
| `ShiftStatus` | `ACTIVE`, `ENDED` |
| `CapacityStatus` | `AVAILABLE`, `STANDING`, `FULL` |
| `PassengerType` | `REGULAR`, `STUDENT`, `SENIOR`, `PWD` (input also accepts `SENIOR_CITIZEN`, normalized to `SENIOR`) |
| Commuter `account_status` | `PENDING` (signed up, awaiting review), `APPROVED` (approved by admin), `ACTIVE` (set when an admin unsuspends), `SUSPENDED`, `REJECTED`. Only `APPROVED` and `ACTIVE` can log in. |
| Remittance status | `PENDING`, `COMPLETE`, `SHORTAGE`, `OVERAGE` |
| SOS status | `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED` |
| Vehicle status | `ACTIVE`, `MAINTENANCE`, `INACTIVE` |
| Route version status | `DRAFT`, `PUBLISHED` |

Payment status transitions are guarded by `PaymentStatus::canTransitionTo()`:

```
PENDING ──► PROCESSING ──► PAID ──► REFUNDED
   │            ├──► FAILED
   ├──► FAILED  ├──► CANCELLED
   ├──► CANCELLED
   └──► EXPIRED ──► PAID   (a late webhook may still settle an expired QR)
```

---

## Endpoint index

Auth key:

- `—` is public (no token).
- `any` is any signed-in role.
- `C` is commuter, `D` is conductor, `A` is admin.

Paths are relative to `/api/v1`.

### Auth: [auth.md](auth.md)

| Method | Path | Auth | Limiter |
|---|---|---|---|
| POST | `/auth/login` | — | auth |
| POST | `/auth/logout` | any | — |
| GET | `/user` | any | — |
| POST | `/auth/register/send-code` | — | auth |
| POST | `/auth/register/verify-code` | — | auth |
| POST | `/auth/register` | — | auth |
| POST | `/auth/forgot-password` | — | auth |
| POST | `/auth/verify-reset-code` | — | auth |
| POST | `/auth/reset-password` | — | auth |

### Public and shared reads: [public.md](public.md)

| Method | Path | Auth | Limiter |
|---|---|---|---|
| GET | `/fare-matrix` | — | public-read |
| GET | `/routes/active` | — | public-read |
| GET | `/faqs` | — | commuter-hail |
| GET | `/system-status` | — | commuter-hail |
| GET | `/share/{token}` | — | share-ride-track |
| GET | `/vehicles/locations` | any | vehicle-locations |

### Commuter: [commuter.md](commuter.md), money routes in [payments.md](payments.md)

Every route below also exists under `/mobile/commuter/*` with the same controller and behaviour. The mobile prefix additionally exposes `/qr/*`, `/vehicles/locations` and `/announcements/*` under itself.

| Method | Path | Limiter |
|---|---|---|
| GET | `/commuter/profile` | conductor-read |
| PUT | `/commuter/profile` | conductor-write |
| POST | `/commuter/change-password/request-code` | conductor-write |
| POST | `/commuter/change-password/confirm` | conductor-write |
| GET | `/commuter/trips` | conductor-read |
| GET | `/commuter/rewards` | conductor-read |
| POST | `/commuter/location` | commuter-hail |
| POST | `/commuter/share-ride` | commuter-hail |
| DELETE | `/commuter/share-ride` | commuter-hail |
| POST | `/commuter/hail` | commuter-hail |
| DELETE | `/commuter/hail/{id}` | commuter-hail |
| POST | `/commuter/payments/claim` | commuter-hail |
| GET | `/commuter/payments` | conductor-read |
| POST | `/commuter/receipts/claim` | commuter-hail |
| POST | `/commuter/payments/{id}/redeem-voucher` | commuter-hail |
| POST | `/commuter/feedback` | commuter-feedback |
| GET | `/commuter/feedback` | conductor-read |
| POST | `/commuter/sos` | sos |
| GET | `/commuter/sos/{id}` | conductor-read |
| GET | `/commuter/watchlist` | conductor-read |
| GET | `/commuter/claims` | conductor-read |

### Payments and QR: [payments.md](payments.md)

| Method | Path | Auth | Limiter |
|---|---|---|---|
| GET | `/payments/{id}/status` | any (shift conductor or bound commuter) | conductor-read |
| POST | `/payments/{id}/cancel` | any (shift conductor or bound commuter) | conductor-write |
| POST | `/payments/{id}/simulate` | any, **dev only** | conductor-write |
| POST | `/payments/webhook` | — (PayMongo signature) | — |
| POST | `/qr/generate` | A | admin-write |
| POST | `/qr/validate` | C | commuter-write |
| POST | `/qr/scan` | C | commuter-write |
| POST | `/qr/scan-public` | C | commuter-write |

### Conductor: [conductor.md](conductor.md)

Every route below also exists under `/mobile/conductor/*`. One difference: the mobile `GET`/`POST /transactions` use `MobileTransactionController`, and the mobile prefix adds `POST /mobile/conductor/transactions/sync` for offline batch upload.

| Method | Path | Limiter |
|---|---|---|
| GET | `/conductor/shift` | conductor-read |
| GET | `/conductor/shift-logs` | conductor-read |
| GET | `/conductor/profile` | conductor-read |
| GET | `/conductor/units` | conductor-read |
| GET | `/conductor/drivers` | conductor-read |
| GET | `/conductor/receipt-settings` | conductor-read |
| GET | `/conductor/ratings` | conductor-read |
| POST | `/conductor/shifts/start` | conductor-mutation (+ maintenance check) |
| POST | `/conductor/shifts/device/claim` | conductor-mutation |
| POST | `/conductor/shifts/device/release` | conductor-mutation |
| POST | `/conductor/remittances` | conductor-mutation |
| GET | `/conductor/remittances` | conductor-read |
| POST | `/conductor/sos` | conductor-mutation |
| GET | `/conductor/sos/{id}` | conductor-read |
| POST | `/conductor/location` | conductor-gps |
| POST | `/conductor/capacity-status` | conductor-write |
| POST | `/conductor/break-status` | conductor-write |
| GET | `/conductor/transactions` | conductor-read |
| POST | `/conductor/transactions` | conductor-write |
| POST | `/conductor/payments/gcash/initiate` | conductor-write |
| GET | `/conductor/payments/gcash/pending` | conductor-read |
| GET | `/conductor/earnings` | conductor-read |
| GET | `/conductor/hails` | conductor-read |
| POST | `/conductor/hails/{id}/accept` | conductor-write |
| POST | `/conductor/hails/{id}/reject` | conductor-write |

### Lost & Found: [lost-found.md](lost-found.md), and announcements: [announcements.md](announcements.md)

| Method | Path | Auth | Limiter |
|---|---|---|---|
| GET | `/lost-found` | any | commuter-read |
| GET | `/lost-found/{itemId}` | any | commuter-read |
| POST | `/lost-found/{itemId}/claim` | C | commuter-write |
| DELETE | `/lost-found/claims/{claimId}` | C | commuter-write |
| POST | `/lost-found/{itemId}/watchlist` | C | commuter-write |
| DELETE | `/lost-found/{itemId}/watchlist` | C | commuter-write |
| GET | `/announcements` | any | commuter-read |
| GET | `/announcements/unread-count` | any | commuter-read |
| POST | `/announcements/mark-all-read` | any | commuter-write |
| POST | `/announcements/{id}/read` | any | commuter-write |

### Admin

Everything here requires role `A`. Rows marked `PUT/PATCH` accept either method. The limiter is `conductor-read` for GETs and `conductor-write` for writes unless noted. Full docs are split across four files by area — see each row's link.

| Area | Method | Path | Notes | Docs |
|---|---|---|---|---|
| Dashboard | GET | `/admin/dashboard` | **no throttle** | [admin-operations.md](admin-operations.md#get-admindashboard) |
| Analytics | GET | `/admin/analytics` | | [admin-operations.md](admin-operations.md#get-adminanalytics) |
| Monitoring | GET | `/admin/monitoring` | | [admin-operations.md](admin-operations.md#get-adminmonitoring) |
| | GET | `/admin/monitoring/overspeed` | | [admin-operations.md](admin-operations.md#get-adminmonitoringoverspeed) |
| | GET | `/admin/monitoring/demand-zones` | | [admin-operations.md](admin-operations.md#get-adminmonitoringdemand-zones) |
| Users | GET | `/admin/users` | | [admin-people.md](admin-people.md#get-adminusers) |
| | GET | `/admin/users/{id}` | | [admin-people.md](admin-people.md#get-adminusersid) |
| | PUT/PATCH | `/admin/users/{id}` | | [admin-people.md](admin-people.md#putpatch-adminusersid) |
| | DELETE | `/admin/users/{id}` | | [admin-people.md](admin-people.md#delete-adminusersid) |
| | POST | `/admin/users/{id}/suspend` | admin-write | [admin-people.md](admin-people.md#post-adminusersidsuspend) |
| | POST | `/admin/users/{id}/unsuspend` | admin-write | [admin-people.md](admin-people.md#post-adminusersidunsuspend) |
| | GET | `/admin/users/{id}/suspensions` | | [admin-people.md](admin-people.md#get-adminusersidsuspensions) |
| | GET | `/admin/users/{id}/activity` | | [admin-people.md](admin-people.md#get-adminusersidactivity) |
| Registrations | GET | `/admin/registrations` | pending | [admin-people.md](admin-people.md#get-adminregistrations) |
| | GET | `/admin/registrations/rejected` | | [admin-people.md](admin-people.md#get-adminregistrationsrejected) |
| | POST | `/admin/registrations` | onsite registration | [admin-people.md](admin-people.md#post-adminregistrations-onsite) |
| | POST | `/admin/registrations/{id}/approve` | | [admin-people.md](admin-people.md#post-adminregistrationsidapprove) |
| | POST | `/admin/registrations/{id}/reject` | | [admin-people.md](admin-people.md#post-adminregistrationsidreject) |
| Personnel | GET | `/admin/personnel` | | [admin-people.md](admin-people.md#get-adminpersonnel) |
| | GET | `/admin/terminated-personnel` | | [admin-people.md](admin-people.md#get-adminterminated-personnel) |
| Drivers | GET, POST | `/admin/drivers` | | [admin-people.md](admin-people.md#drivers) |
| | GET, PUT/PATCH, DELETE | `/admin/drivers/{id}` | | [admin-people.md](admin-people.md#drivers) |
| | POST | `/admin/drivers/{id}/license-images` | multipart | [admin-people.md](admin-people.md#license-images) |
| | GET, DELETE | `/admin/drivers/{id}/license-images/{side}` | | [admin-people.md](admin-people.md#license-images) |
| | GET | `/admin/drivers/{id}/shift-logs` | | [admin-people.md](admin-people.md#get-admindriversidshift-logs) |
| Conductors | GET, POST | `/admin/conductors` | | [admin-people.md](admin-people.md#conductors) |
| | GET, PUT/PATCH, DELETE | `/admin/conductors/{id}` | | [admin-people.md](admin-people.md#conductors) |
| | GET | `/admin/conductors/{id}/shift-logs` | | [admin-people.md](admin-people.md#get-adminconductorsidshift-logs) |
| | POST | `/admin/conductors/{id}/disable` | | [admin-people.md](admin-people.md#post-adminconductorsiddisable) |
| | POST | `/admin/conductors/{id}/reset-credentials` | | [admin-people.md](admin-people.md#post-adminconductorsidreset-credentials) |
| Vehicles | GET, POST | `/admin/vehicles` | | [admin-fleet.md](admin-fleet.md#vehicles) |
| | GET, PUT/PATCH, DELETE | `/admin/vehicles/{id}` | | [admin-fleet.md](admin-fleet.md#vehicles) |
| Routes | GET, POST | `/admin/routes` | | [admin-fleet.md](admin-fleet.md#routes) |
| | GET, PUT/PATCH, DELETE | `/admin/routes/{id}` | | [admin-fleet.md](admin-fleet.md#routes) |
| | PUT | `/admin/routes/{id}/draft` | | [admin-fleet.md](admin-fleet.md#put-adminroutesiddraft) |
| | POST | `/admin/routes/{id}/publish` | | [admin-fleet.md](admin-fleet.md#post-adminroutesidpublish) |
| | GET | `/admin/routes/{id}/versions` | | [admin-fleet.md](admin-fleet.md#get-adminroutesidversions) |
| Fare points | GET, POST | `/admin/fare-points` | | [admin-fleet.md](admin-fleet.md#fare-points) |
| | PUT | `/admin/fare-points/reorder` | | [admin-fleet.md](admin-fleet.md#put-adminfare-pointsreorder) |
| | PUT/PATCH, DELETE | `/admin/fare-points/{id}` | | [admin-fleet.md](admin-fleet.md#fare-points) |
| Unit QR | POST | `/qr/generate` | admin-write, outside `/admin` prefix | [admin-fleet.md](admin-fleet.md#post-qrgenerate) |
| Settings | GET | `/admin/settings` | | [admin-content.md](admin-content.md#settings) |
| | PUT | `/admin/settings/{key}` | | [admin-content.md](admin-content.md#put-adminsettingskey) |
| Vouchers | GET, POST | `/admin/vouchers` | | [admin-content.md](admin-content.md#vouchers) |
| | DELETE | `/admin/vouchers/{id}` | | [admin-content.md](admin-content.md#vouchers) |
| Remittance options | GET, POST | `/admin/remittance-options` | | [admin-content.md](admin-content.md#remittance-options) |
| | PUT, DELETE | `/admin/remittance-options/{id}` | | [admin-content.md](admin-content.md#remittance-options) |
| FAQs | GET, POST | `/admin/faqs` | | [admin-content.md](admin-content.md#faqs) |
| | PUT, DELETE | `/admin/faqs/{id}` | | [admin-content.md](admin-content.md#faqs) |
| Finance | GET | `/admin/transactions` | | [admin-operations.md](admin-operations.md#get-admintransactions) |
| | GET | `/admin/remittances` | | [admin-operations.md](admin-operations.md#get-adminremittances) |
| | POST | `/admin/remittances/{shiftId}/cash-declaration` | admin-write | [admin-operations.md](admin-operations.md#post-adminremittancesshiftidcash-declaration) |
| Shifts | GET | `/admin/shift-logs` | | [admin-operations.md](admin-operations.md#get-adminshift-logs) |
| | POST | `/admin/shifts/{shift}/device/recover` | admin-write | [admin-operations.md](admin-operations.md#post-adminshiftsshiftdevicerecover) |
| Announcements | GET, POST | `/admin/announcements` | POST: admin-write | [admin-content.md](admin-content.md#announcements) |
| | GET, PUT/PATCH | `/admin/announcements/{id}` | writes: admin-write | [admin-content.md](admin-content.md#announcements) |
| | PATCH | `/admin/announcements/{id}/archive` | admin-write | [admin-content.md](admin-content.md#patch-adminannouncementsidarchive) |
| Lost & Found | GET, POST | `/admin/lost-items` | writes: admin-write | [admin-content.md](admin-content.md#lost--found-management) |
| | GET, PATCH | `/admin/lost-items/{itemId}` | | [admin-content.md](admin-content.md#lost--found-management) |
| | POST | `/admin/lost-items/{itemId}/photos` | multipart | [admin-content.md](admin-content.md#photos) |
| | DELETE | `/admin/lost-items/{itemId}/photos/{photoId}` | | [admin-content.md](admin-content.md#photos) |
| | PATCH | `/admin/lost-items/{itemId}/reactivate` | | [admin-content.md](admin-content.md#patch-adminlost-itemsitemidreactivate) |
| | PATCH | `/admin/lost-items/{itemId}/close` | **unreachable — see quirks** | [admin-content.md](admin-content.md#patch-adminlost-itemsitemidclose) |
| | GET | `/admin/lost-items/{itemId}/claims` | | [admin-content.md](admin-content.md#claims) |
| | POST | `/admin/lost-items/{itemId}/claims/manual` | | [admin-content.md](admin-content.md#claims) |
| | PATCH | `/admin/lost-items/{itemId}/claims/{claimId}/approve` | | [admin-content.md](admin-content.md#claims) |
| | PATCH | `/admin/lost-items/{itemId}/claims/{claimId}/release` | | [admin-content.md](admin-content.md#claims) |
| | PATCH | `/admin/lost-items/{itemId}/claims/{claimId}/reject` | | [admin-content.md](admin-content.md#claims) |
| SOS | GET | `/admin/sos` | | [admin-operations.md](admin-operations.md#get-adminsos) |
| | PATCH | `/admin/sos/{id}/acknowledge` | admin-write | [admin-operations.md](admin-operations.md#patch-adminsosidacknowledge) |
| | PATCH | `/admin/sos/{id}/resolve` | admin-write | [admin-operations.md](admin-operations.md#patch-adminsosidresolve) |
| Feedback | GET | `/admin/feedback` | `?conductor_id=` or `?driver_id=` | [admin-operations.md](admin-operations.md#get-adminfeedback) |
| Audit | GET | `/admin/activity-logs` | | [admin-operations.md](admin-operations.md#get-adminactivity-logs) |

---

## Known quirks

These are current behaviours, documented so nobody is surprised by them. None of them are fixed by these docs.

1. **The two error shapes** described in [Error responses](#error-responses). Clients must read `message` from either shape.
2. **Two `ApiResponse` traits exist,** `App\Http\ApiResponse` and `App\Traits\ApiResponse`, with identical output. Controllers use one or the other.
3. **`/api/conductor/shifts/end` in the Next.js layer never reaches Laravel.** `frontend/app/api/conductor/shifts/end/route.ts` writes to a local in-memory mock store. The only real way to end a shift is `POST /conductor/remittances`.
4. **Limiter names do not match their users.** Commuter and admin routes run on `conductor-read`/`conductor-write`, and the public `/faqs` and `/system-status` share the 10/min `commuter-hail` bucket. `admin-read` and `commuter-security` are defined but unused.
5. **`POST /conductor/remittances` ignores every amount in the body,** including the required `total_collected`. The server computes expected cash from PAID CASH fares and leaves the remittance `PENDING` until an admin declares the cash count. See [conductor.md](conductor.md#post-conductorremittances).
6. **`channels.php` defines callbacks for `vehicles` and `announcements`,** but those events broadcast on public channels, so the callbacks never run.
7. **Payment-specific quirks** are in [payments.md](payments.md#known-quirks):
   - Transaction rows are returned with internal columns, including `qr_token`.
   - The cancel docblock disagrees with the code about who may cancel.
   - `.env.example` ships with `PAYMENT_ALLOW_SIMULATION=true`.
8. **Submitting a conductor remittance twice marks the cash as short.** A second `POST /conductor/remittances` for an ended shift whose remittance is still `PENDING` returns `200`, records ₱0 remitted and sets `SHORTAGE` for the full expected cash. The admin cash declaration is then refused with `409`. Confirmed with a probe test.
9. **The web `POST /conductor/transactions` skips the device check when `device_id` is omitted** (`enforceDeviceLock = false`). Another device's shift can then receive cash fares. A different `device_id` is still refused, and the mobile route is strict.
10. **Conductor-specific quirks** are in [conductor.md](conductor.md#known-quirks):
   - `payment_method: "VOUCHER"` with `passengers`/`group_passengers` is recorded as CASH.
   - The mobile offline sync drops `voucher_code`, `passenger_id` and stop IDs, so voucher items always fail.
   - Paged `total_amount` counts every payment status.
   - GCash initiate returns the existing pending payment, whatever fare was requested.
   - The GPS impossible-jump check only runs when `accuracy` is sent.
   - Simultaneous cash retries with the same `idempotency_key` can return `500`.
11. **`POST /announcements/{id}/read` returns `200`, not `204`.** The route file's comment block and the controller's own docblock both say `204`; the code and its test assert `200`. This README's status-codes table has been corrected; the source comments have not. See [announcements.md](announcements.md#known-quirks).
12. **Lost & Found and announcements quirks** are in their own docs:
   - [lost-found.md](lost-found.md#known-quirks): error status is decided by substring-matching the message text for "not found"; `lost_items.claimed_by` is a dead column; `category` has no fixed value set.
   - [announcements.md](announcements.md#known-quirks): `markRead` can mark an `ARCHIVED` row as read despite its comment; `GET /announcements` does not clamp `per_page`.
13. **`GET /admin/dashboard` has no rate limit.** Confirmed directly in `routes/api.php` — every other admin route carries a `throttle:` middleware; this one, which runs the full analytics aggregation, has none. See [admin-operations.md](admin-operations.md#known-quirks).
14. **`ConductorProfile.generated_password` has no `$hidden` array**, so several admin endpoints that serialize a raw conductor (or a vehicle with its conductor relation eager-loaded) leak the conductor's plaintext-equivalent login password where only the create/reset-credentials endpoints should ever return it: `GET /admin/conductors`, `PUT/PATCH /admin/conductors/{id}`, and every `GET`/`POST`/`PUT`/`PATCH /admin/vehicles*` response that includes an assigned conductor. See [admin-people.md](admin-people.md#known-quirks) and [admin-fleet.md](admin-fleet.md#known-quirks).
15. **Admin-content quirks** are in [admin-content.md](admin-content.md#known-quirks): admin-generated vouchers (`POST /admin/vouchers`) are created with `status: "Active"` instead of the `"AVAILABLE"` constant the redemption check requires, so they can never be redeemed; `PATCH /admin/lost-items/{itemId}/close` can never succeed, because `releaseClaim()` sets the item straight to `CLOSED` and never passes through the `RELEASED` status `close()` requires; several Settings keys (`regular_discount`, `student_discount`, `senior_discount`, `pwd_discount`, `require_phone_verification`, `sender_gmail`, `ride_receipt_template`) are saved by an admin page but read by nothing; `base_fare_regular`/`base_fare_discounted` are live fare-calculation inputs with no admin page exposing them at all.
16. **Admin-fleet and admin-people quirks** are in their own docs: [admin-fleet.md](admin-fleet.md#known-quirks) covers the route-draft geometry being silently cleared by unrelated fare-point edits and the overlapping "unit QR" concepts sharing the `/qr` prefix; [admin-people.md](admin-people.md#known-quirks) covers `DELETE /admin/users/{id}` bypassing the active-shift guard and termination record that `DELETE /admin/conductors/{id}` enforces, and the two independent ways a commuter's "suspended" state can be set.
