# Commuter API

Endpoints the commuter app calls: profile, password change, trip history, rewards, live location, Share My Ride, hailing, feedback, SOS, and the commuter's own Lost & Found lists.

Money endpoints are documented in [payments.md](payments.md):

- `/commuter/payments/*`
- `/commuter/receipts/claim`
- `/qr/*`

All paths are relative to `/api/v1`. Conventions are in [README.md](README.md).

**Every route here requires role `COMMUTER`** (`auth:sanctum` + `role:COMMUTER`). Each one also exists under `/mobile/commuter/...` with the same controller, rules and response. The mobile prefix exists so mobile-only behaviour can diverge later. Today it is identical.

> **IDs.** A commuter's `commuter_profiles.id` is the same UUID as their `users.id`. Fields such as `passenger_id`, `commuter_id` and `claimant_id` hold that UUID.

## Contents

- [Profile](#profile)
  - [GET /commuter/profile](#get-commuterprofile)
  - [PUT /commuter/profile](#put-commuterprofile)
  - [POST /commuter/change-password/request-code](#post-commuterchange-passwordrequest-code)
  - [POST /commuter/change-password/confirm](#post-commuterchange-passwordconfirm)
- [Rides and rewards](#rides-and-rewards)
  - [GET /commuter/trips](#get-commutertrips)
  - [GET /commuter/rewards](#get-commuterrewards)
- [Location and Share My Ride](#location-and-share-my-ride)
  - [POST /commuter/location](#post-commuterlocation)
  - [POST /commuter/share-ride](#post-commutershare-ride)
  - [DELETE /commuter/share-ride](#delete-commutershare-ride)
- [Hailing (Pick Me Up)](#hailing-pick-me-up)
  - [POST /commuter/hail](#post-commuterhail)
  - [DELETE /commuter/hail/{id}](#delete-commuterhailid)
- [Feedback](#feedback)
  - [POST /commuter/feedback](#post-commuterfeedback)
  - [GET /commuter/feedback](#get-commuterfeedback)
- [SOS](#sos)
  - [POST /commuter/sos](#post-commutersos)
  - [GET /commuter/sos/{id}](#get-commutersosid)
- [Lost & Found lists](#lost--found-lists)
  - [GET /commuter/watchlist](#get-commuterwatchlist)
  - [GET /commuter/claims](#get-commuterclaims)

---

## Profile

### GET /commuter/profile

- **Limiter:** conductor-read (60/min)
- **Controller:** `CommuterController@profile` → `CommuterService::getProfile`

**200 OK**

```json
{
  "data": {
    "user": { "id": "9c1e…", "email": "juan@gmail.com", "role": "COMMUTER", "name": "Juan Dela Cruz" },
    "profile": {
      "first_name": "Juan",
      "middle_name": "Santos",
      "surname": "Dela Cruz",
      "birthdate": "2001-05-14",
      "gender": "Male",
      "contact_number": "09171234567",
      "commuter_type": "STUDENT",
      "applied_type": "STUDENT",
      "username": "juandc",
      "language_preference": "English",
      "account_status": "APPROVED",
      "id_image_url": "ids/commuters/9c1e…/….jpg",
      "verified_at": "2026-09-02T10:00:00+08:00",
      "rejection_reason": null,
      "created_at": "2026-09-01T18:30:00+08:00"
    }
  },
  "message": "Profile retrieved"
}
```

| Field | Notes |
|---|---|
| `commuter_type` | The type the fare logic uses. An admin may approve a different type than requested. |
| `applied_type` | What the commuter asked for at sign-up |
| `id_image_url` | A storage path in the private bucket, **not** a public URL |

**Errors:** `404 "Commuter profile not found"`

### PUT /commuter/profile

Only two fields are editable. Name, email, type and username are fixed and can only be changed by an admin.

- **Limiter:** conductor-write (30/min)

**Body (JSON).** Send only what changes:

| Field | Rules |
|---|---|
| `contact_number` | `09XXXXXXXXX` |
| `language_preference` | String, max 20. The product is English-only and the app no longer sends this; it is kept for backend compatibility. |

Any other fields are ignored.

**200 OK:** the same shape as `GET /commuter/profile`, with `message: "Profile updated"`. If nothing actually changed, no write happens.

**Errors:** `422` validation, `404` profile missing

### Password change (two steps)

The password only changes after the commuter proves they still control their registered inbox. A stolen session alone cannot complete it.

```
1. POST /commuter/change-password/request-code   { current_password, password, password_confirmation }
2. POST /commuter/change-password/confirm        { current_password, password, password_confirmation, code }
```

- **Code timing:** same as sign-up. 15 min lifetime, 60 s resend cooldown, 5 wrong attempts.
- **Where the code goes:** always the account's own email, never an address from the request.

### POST /commuter/change-password/request-code

- **Limiter:** conductor-write (30/min)

**Body (JSON)**

| Field | Rules |
|---|---|
| `current_password` | Required |
| `password` | Required. Strong-password policy (see [README](README.md#request-conventions)). |
| `password_confirmation` | Required. Must match `password`. |

The password is **not** changed in this step. Both passwords are checked first, so a typo is caught before an email is sent.

**200 OK**

```json
{
  "data": { "expires_in_minutes": 15, "resend_in_seconds": 60 },
  "message": "We sent a 6-digit code to your registered email. It expires in 15 minutes."
}
```

**Errors**

| Status | When |
|---|---|
| 422 | `errors.current_password = ["The provided current password is incorrect."]` |
| 422 | `errors.password = ["The new password must be different from your current password."]`, or a policy/confirmation failure |
| 429 | Requested again within 60 s: `"You just requested a code. Please wait N seconds..."` |
| 502 | Mail delivery failed |

### POST /commuter/change-password/confirm

- **Limiter:** conductor-write (30/min)

**Body (JSON).** The same three fields as request-code, plus `code` (required).

**200 OK:** `data: null`, `message: "Password updated successfully"`

**Side effects**

- The password is updated.
- The verification code is consumed.
- **Every other session is revoked**, including the commuter's session on the other platform. The token that made this request stays valid.

**Errors**

| Status | When |
|---|---|
| 422 | `errors.current_password` or `errors.password`, the same checks as step 1 |
| 422 | `errors.code`: a wrong code (says how many attempts are left), an expired code, or too many attempts |

---

## Rides and rewards

### GET /commuter/trips

The commuter's **completed** rides: `PAID` transactions bound to them, newest first.

- **Limiter:** conductor-read (60/min)

**Query**

| Param | Rules |
|---|---|
| `per_page` | Default 20, clamped to 1–100 |
| `page` | Default 1 |

**200 OK.** A Laravel paginator (README format 1). Each row in `data.data` uses **camelCase**:

```json
{
  "id": "TXN-…",
  "pickup": "Calumpit",
  "dropoff": "Malolos Crossing",
  "paymentMethod": "GCASH",
  "amount": 28.5,
  "passengerRole": "STUDENT",
  "conductorName": "Pedro Reyes",
  "driverName": "Jose Cruz",
  "unitNumber": "U-07",
  "paidAt": "2026-10-01T08:15:02+08:00",
  "createdAt": "2026-10-01T08:12:40+08:00",
  "multiplePaymentReference": "MP-261001-AB12CD"
}
```

| Field | Notes |
|---|---|
| `id` | The `transaction_id` |
| `multiplePaymentReference` | Set only when this ride was part of a group payment |

If the account has no commuter profile, the endpoint returns `data: []`, **not** a paginator.

> `GET /commuter/payments` ([payments.md](payments.md#get-commuterpayments)) is the richer history: every status, group receipts and feedback state. `trips` is the lightweight list of completed rides.

### GET /commuter/rewards

Progress toward the next free ride, plus the commuter's vouchers.

- **Limiter:** conductor-read (60/min)

**How rewards work**

- **Every N rewardable rides earns one free-ride voucher.** `N` is the admin setting `rides_for_free_reward`, default 10.
- **A ride is rewardable when all of these hold:** it is `PAID`, bound to this commuter, paid by `CASH` or `GCASH` (not `VOUCHER`), marked `reward_eligible`, and has no open payment reconciliation.
- **Vouchers are issued when the payment settles,** not when this endpoint is read. That happens on a cash fare recorded against the commuter, a receipt claim, or a GCash webhook. Issuance is idempotent per cycle.
- **A voucher expires 3 days after the ride that completed its cycle** (`RewardService::VOUCHER_VALIDITY_DAYS`). Treat this as a tuned operating value, not a constant.
- **Changing `N` is not retroactive.** It starts a new "rule version": progress under the new rule starts at zero, while lifetime totals and issued vouchers are kept.
- **This read does minor upkeep.** It flips past-expiry `AVAILABLE` vouchers to `EXPIRED`, and restores any legacy soft-deleted earned vouchers. It never creates a voucher.

**200 OK**

```json
{
  "data": {
    "totalRides": 23,
    "ridesNeeded": 10,
    "currentCycleRides": 3,
    "availableVoucherCount": 1,
    "archivedVoucherCount": 0,
    "vouchers": [
      {
        "id": "…",
        "code": "FREE-8K2Q…",
        "status": "AVAILABLE",
        "expiresAt": "2026-10-04T08:15:02+08:00",
        "rideOrigin": "Reward"
      }
    ]
  },
  "message": "Rewards retrieved"
}
```

| Field | Meaning |
|---|---|
| `totalRides` | Lifetime rewardable rides, across all rule versions |
| `ridesNeeded` | The current threshold `N` |
| `currentCycleRides` | Progress in the current cycle, from 0 to `N-1`. "Rides remaining" is `ridesNeeded - currentCycleRides`. |
| `vouchers` | Every `AVAILABLE` voucher, plus the 50 most recent `USED`/`EXPIRED` ones, newest first |
| `archivedVoucherCount` | Older history vouchers left out of the list |
| `rideOrigin` | `"Reward"` for earned vouchers. Admin-issued vouchers may carry a custom label. |

**How a voucher gets used**

- **For cash:** the commuter shows the `code` to the conductor, who records a `VOUCHER` fare ([conductor.md](conductor.md#voucher-fare-a-free-ride)).
- **For GCash:** the commuter calls `POST /commuter/payments/{id}/redeem-voucher` ([payments.md](payments.md#post-commuterpaymentsidredeem-voucher)).

**Errors:** `422 "Commuter profile required."`

---

## Location and Share My Ride

### POST /commuter/location

Stores the commuter's latest position. It is **upserted**: one row per commuter in `commuter_locations`.

Its only consumer today is the admin **demand-zones** heatmap (`GET /admin/monitoring/demand-zones`), which counts positions updated in the last 5 minutes. It is **not** broadcast and is **not** visible to conductors.

- **Limiter:** commuter-hail (10/min). Send at most every ~10 s.

**Body (JSON)**

| Field | Rules |
|---|---|
| `latitude` | Required, -90 to 90 |
| `longitude` | Required, -180 to 180 |
| `accuracy` | Optional, metres, 0 to 10000 |

**200 OK:** `data: { "updatedAt": "2026-10-01T08:15:02+08:00" }`

**Errors:** `422` validation, `422 "Commuter profile required."`

### POST /commuter/share-ride

Creates a tracking link, or pushes a new position to the current link, for the **public** page `GET /share/{token}` ([public.md](public.md#get-sharetoken)).

- **Limiter:** commuter-hail (10/min)

**Body (JSON)**

| Field | Rules |
|---|---|
| `lat`, `lng` | Optional numbers. The current position. |
| `rotate` | Optional boolean. **`true` = "Start sharing":** deactivates every existing link and always mints a new token, so previously shared URLs stop working. **`false` or omitted = position update:** reuses the active link and updates its position. |

Links last **30 minutes** from creation.

Typical client flow:

1. Call once with `rotate: true` when the user taps Share. Send that URL to family.
2. Call with `lat`/`lng` (no `rotate`) as the position changes.
3. Call `DELETE` to stop.

**Response**

| Status | When | `message` |
|---|---|---|
| 201 | A new link was created | `Share link created` |
| 200 | The existing link was reused and its position updated | `Share link retrieved` |

```json
{
  "data": {
    "token": "q8Zr…",
    "expires_at": "2026-10-01T08:42:40+08:00",
    "share_url": "https://<APP_URL>/share/q8Zr…"
  }
}
```

> `share_url` is built from the **backend's** `APP_URL`, so it points at Laravel, not at the tracking page. The public tracking page lives on the frontend at `/share/{token}`. Build the link from the frontend origin and `token`, which is what the web app does: it never reads `share_url`.

Concurrent calls are serialized with a lock on the commuter's profile row, so a double-tap cannot leave two active links.

**Errors:** `422` validation, `422 "Commuter profile required."`

### DELETE /commuter/share-ride

Stops sharing by deactivating every active link for this commuter. The public page then shows "expired".

- **Limiter:** commuter-hail (10/min)

**200 OK:** `data: null`, `message: "Share link deactivated"`. Safe to call when nothing is active.

---

## Hailing (Pick Me Up)

A hail tells the conductor of one specific jeepney that the commuter is waiting.

**Lifecycle**

```
PENDING ──(conductor accepts)──► ACCEPTED
   │──(conductor rejects)──────► REJECTED
   │──(commuter cancels)───────► CANCELLED
   └──(3 min pass)─────────────► EXPIRED   (hails:expire job, every minute)
```

When a shift ends, its open `PENDING` and `ACCEPTED` hails are cancelled.

**Realtime**

- **Conductor:** a new hail arrives on `private-vehicle.{vehicleId}.hails` as `HailCreated`.
- **Commuter:** every status change arrives on `private-commuter.{commuterId}.hails` as `HailStatusChanged`.

See [README](README.md#realtime-pusher). The conductor side of the flow (list, accept, reject) is in [conductor.md](conductor.md#hails).

### POST /commuter/hail

- **Limiter:** commuter-hail (10/min)
- **Service:** `HailService::createHail`

**Body (JSON)**

| Field | Rules |
|---|---|
| `vehicle_id` | Required UUID of an existing vehicle |
| `commuter_lat` | Required, -90 to 90 |
| `commuter_lng` | Required, -180 to 180 |

**Server checks, in order.** The first failure wins:

1. **The commuter has no other `PENDING` hail.** Only one open hail is allowed per commuter, and checks are serialized per commuter.
2. **The vehicle has an active shift that is not on break.**
3. **The vehicle has a GPS fix** from this shift that is under 10 minutes old.
4. **The commuter is within 1,000 m of the vehicle** (Haversine distance, `GeoHelper::HAIL_RADIUS_M`).
5. **The commuter is within 1,000 m of the active route line,** when the route has published geometry.

**201 Created.** The Hail model, with `commuter` (a User) and `vehicle` loaded:

```json
{
  "data": {
    "id": "h1…",
    "commuter_id": "9c1e…",
    "vehicle_id": "c3d4…",
    "conductor_id": null,
    "commuter_lat": "14.8433120",
    "commuter_lng": "120.8115400",
    "distance_m": "412.37",
    "status": "PENDING",
    "expires_at": "2026-10-01T00:18:02.000000Z",
    "created_at": "…",
    "updated_at": "…",
    "commuter": { "id": "9c1e…", "email": "…", "role": "COMMUTER" },
    "vehicle": { "id": "c3d4…", "unit_number": "U-07", "plate_number": "ABC 1234" }
  },
  "message": "Hail created"
}
```

Decimals come back as strings. Model timestamps use Laravel's default UTC format (`…Z`).

**Errors**

| Status | Body shape | When |
|---|---|---|
| 409 | B | `Duplicate pending hail` |
| 422 | B | `Vehicle not on duty` or `Vehicle is currently on break` |
| 422 | B | `Vehicle position is unavailable or stale` |
| 422 | **custom** | `{"error": "outside_radius", "distance_m": 1534.2}`. **No envelope.** Branch on `error`. |
| 422 | B | `Pickup point is outside the active route coverage.` |
| 422 | A | Validation (`errors.vehicle_id`, …) |

### DELETE /commuter/hail/{id}

Cancels the commuter's own `PENDING` hail. This broadcasts `HailStatusChanged` to both the commuter's and the vehicle's channels.

- **Limiter:** commuter-hail (10/min)

**200 OK:** the updated Hail model (`status: "CANCELLED"`), `message: "Hail cancelled"`

**Errors** (all shape B)

| Status | When |
|---|---|
| 404 | Unknown hail ID |
| 403 | The hail belongs to someone else |
| 409 | `Hail is no longer pending` (already accepted, rejected, expired or cancelled). Refresh state rather than retrying. |

---

## Feedback

Commuters rate the **driver** and the **conductor** of a shift they actually rode on, once per shift.

**Getting a `shift_id`.** Either route works:

- **From ride history:** `GET /commuter/payments` rows carry `shift_id`, `feedback_exists` and `can_leave_feedback`.
- **By scanning the unit QR inside the jeepney:** `POST /qr/scan-public` returns the `shift_id` ([payments.md](payments.md#unit-qr-feedback)).

### POST /commuter/feedback

- **Limiter:** commuter-feedback (**5/min**, its own bucket, so retries cannot block hailing or payments)
- **Service:** `FeedbackService::submit`

**Body (JSON)**

| Field | Rules |
|---|---|
| `shift_id` | Required. Must exist in `shift_logs`. |
| `rating` | Required integer 1–5. The **driver** rating. |
| `category` | Optional, max 50. The driver category. |
| `comment` | Optional, max 2000. The driver comment. |
| `conductor_rating` | Required integer 1–5 |
| `conductor_category` | Optional, max 50 |
| `conductor_comment` | Optional, max 2000 |

**Eligibility.** The commuter must have a `PAID` ride (CASH, GCASH or VOUCHER) on that shift that is bound to them and has no reconciliation flag.

The driver, conductor and vehicle IDs are **taken from that ride's shift**. The client never sends them.

**201 Created.** The Feedback model:

```json
{
  "data": {
    "id": "…",
    "shift_id": "SH-…",
    "vehicle_id": "…",
    "driver_id": "…",
    "conductor_id": "…",
    "commuter_id": "…",
    "rating": 5,
    "category": "Safe driving",
    "comment": "…",
    "conductor_rating": 4,
    "conductor_category": null,
    "conductor_comment": null,
    "created_at": "…",
    "updated_at": "…"
  },
  "message": "Feedback submitted"
}
```

**Errors** (all shape A)

| Status | When |
|---|---|
| 409 | `You have already submitted feedback for this shift` (also enforced by a unique index) |
| 422 | `Feedback is only available after your completed ride on this shift` |
| 422 | `The verified ride no longer has an associated shift` |
| 422 | Validation (`errors.shift_id` "The selected shift does not exist", …) |

### GET /commuter/feedback

The commuter's own feedback, newest first. The commuter is always taken from the token, never from a query param.

- **Limiter:** conductor-read (60/min)

**Query:** `per_page` (default 20, 1–100), `page`

**200 OK.** Uses README pagination format 2:

```json
{
  "data": {
    "feedback": [ { "id": "…", "shift_id": "…", "rating": 5 } ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 4,
      "last_page": 1,
      "from": 1,
      "to": 4
    }
  },
  "message": "Feedback history retrieved"
}
```

Rows are raw Feedback models with no staff names. The ride row already carries `conductor_name` and `unit_number`.

---

## SOS

An emergency alert sent with the commuter's coordinates. It goes to admins:

- through an email to the `admin_sos_email` setting, when one is configured;
- through an admin notification.

**Only admins can acknowledge or resolve an alert.** The commuter cannot cancel it.

```
ACTIVE ──(admin acknowledges)──► ACKNOWLEDGED ──(admin resolves)──► RESOLVED
   └───────────────(admin resolves directly)─────────────────────────┘
```

### POST /commuter/sos

- **Limiter:** `sos`, **1 per minute** per commuter. A second tap within the minute gets `429`. The UI should show "alert already sent" rather than an error.

**Body (JSON)**

| Field | Rules |
|---|---|
| `lat` | Required, -90 to 90 |
| `lng` | Required, -180 to 180 |
| `note` | Optional, max 500 |

**201 Created.** The SosAlert model, with `commuter` (the CommuterProfile) loaded:

```json
{
  "data": {
    "id": "s1…",
    "sender_role": "COMMUTER",
    "commuter_id": "9c1e…",
    "lat": "14.8433120",
    "lng": "120.8115400",
    "note": "Suspicious passenger",
    "status": "ACTIVE",
    "created_at": "…",
    "updated_at": "…",
    "commuter": { "id": "9c1e…", "first_name": "Juan", "surname": "Dela Cruz" }
  },
  "message": "SOS alert triggered"
}
```

**Errors:** `422` validation, `422 "Commuter profile not found"`, `429` within the 1-minute window

### GET /commuter/sos/{id}

Poll this to show "Help is on the way" once an admin acknowledges. The app polls about every 3 s.

- **Limiter:** conductor-read (60/min)

**200 OK.** The same SosAlert shape. Watch `status`, `acknowledged_at` and `resolved_at`.

**Errors:** `404 "SOS alert not found"`. This includes another commuter's alert, so other users' alerts are never revealed.

---

## Lost & Found lists

The commuter's own Lost & Found data. These are covered here because they live under `/commuter`. Browsing items, claiming, cancelling a claim and toggling the watchlist live under `/lost-found` ([lost-found.md](lost-found.md)).

### GET /commuter/watchlist

Items the commuter bookmarked. Only items still `AVAILABLE` or `CLAIMED` are included.

- **Limiter:** conductor-read (60/min)

**Query**

| Param | Rules |
|---|---|
| `per_page` | Default 15, clamped to 1–50 |
| `page` | |
| `date` | `YYYY-MM-DD`. The day the item was logged. |
| `search` | Matches item name, description, plate, driver name or conductor name |

**200 OK.** A Laravel paginator of watchlist rows, each with `item` and `item.vehicle` loaded:

```json
{ "id": "…", "item_id": "…", "commuter_id": "…", "created_at": "…", "item": { "id": "…", "item_name": "Black umbrella", "status": "AVAILABLE", "vehicle": { } } }
```

### GET /commuter/claims

Claims the commuter has filed. This drives the "My Claims" tab and the claim badges on item cards.

- **Limiter:** conductor-read (60/min)

**Query**

| Param | Rules |
|---|---|
| `per_page` | Default 10, clamped to 1–50 |
| `page` | |
| `status` | `PENDING`, `APPROVED`, `REJECTED` or `RELEASED`. Anything else returns `422 "Invalid claim status filter"`. |
| `date` | `YYYY-MM-DD`. The day the **item** was logged. |
| `search` | Same item fields as the watchlist |

**200 OK.** A Laravel paginator of Claim models with `item` and `item.vehicle` loaded. Each claim includes `status`, `proof`, `rejection_reason`, `reviewed_at`, `approved_at`, `released_at` and `reviewed_by_name`.
