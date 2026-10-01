# Conductor API

Endpoints the conductor app calls during a shift: reference lists, shift start, device ownership, GPS and status, fare recording, GCash initiation, transaction history, earnings, remittance (which ends the shift), hails and SOS. It also covers the `/mobile/conductor/*` namespace and offline cash sync.

The commuter side of payments (claiming a GCash QR, claiming a cash receipt, status polling, cancel, webhook) is in [payments.md](payments.md). This doc links there instead of repeating it.

All paths are relative to `/api/v1`. Conventions are in [README.md](README.md).

**Every route here requires role `CONDUCTOR`** (`auth:sanctum` + `role:CONDUCTOR`). Each one also exists under `/mobile/conductor/...`. See [Mobile namespace](#mobile-namespace) for the three places they differ.

> **IDs.** A conductor's `conductor_profiles.id` is the same UUID as their `users.id`. Fields such as `conductor_id` on shifts, remittances, hails and feedback hold that UUID. Shifts are keyed by `shift_id` (`SHF-` plus 14 characters), not a UUID.

## Contents

- [The shift lifecycle](#the-shift-lifecycle)
- [Reference lists](#reference-lists)
  - [GET /conductor/profile](#get-conductorprofile)
  - [GET /conductor/units](#get-conductorunits)
  - [GET /conductor/drivers](#get-conductordrivers)
  - [GET /conductor/receipt-settings](#get-conductorreceipt-settings)
- [Shifts](#shifts)
  - [POST /conductor/shifts/start](#post-conductorshiftsstart)
  - [GET /conductor/shift](#get-conductorshift)
  - [GET /conductor/shift-logs](#get-conductorshift-logs)
  - [GET /conductor/ratings](#get-conductorratings)
- [Device ownership](#device-ownership)
  - [POST /conductor/shifts/device/claim](#post-conductorshiftsdeviceclaim)
  - [POST /conductor/shifts/device/release](#post-conductorshiftsdevicerelease)
  - [Admin recovery of a lost device](#admin-recovery-of-a-lost-device)
- [GPS and vehicle status](#gps-and-vehicle-status)
  - [POST /conductor/location](#post-conductorlocation)
  - [POST /conductor/capacity-status](#post-conductorcapacity-status)
  - [POST /conductor/break-status](#post-conductorbreak-status)
- [Recording fares](#recording-fares)
  - [How the fare is calculated](#how-the-fare-is-calculated)
  - [POST /conductor/transactions](#post-conductortransactions)
- [GCash](#gcash)
  - [POST /conductor/payments/gcash/initiate](#post-conductorpaymentsgcashinitiate)
  - [GET /conductor/payments/gcash/pending](#get-conductorpaymentsgcashpending)
- [History and earnings](#history-and-earnings)
  - [GET /conductor/transactions](#get-conductortransactions)
  - [GET /conductor/earnings](#get-conductorearnings)
- [Remittance (ending a shift)](#remittance-ending-a-shift)
  - [POST /conductor/remittances](#post-conductorremittances)
  - [GET /conductor/remittances](#get-conductorremittances)
- [Hails](#hails)
  - [GET /conductor/hails](#get-conductorhails)
  - [POST /conductor/hails/{id}/accept](#post-conductorhailsidaccept)
  - [POST /conductor/hails/{id}/reject](#post-conductorhailsidreject)
- [SOS](#sos)
- [Mobile namespace](#mobile-namespace)
  - [POST /mobile/conductor/transactions/sync](#post-mobileconductortransactionssync)
- [Known quirks](#known-quirks)

---

## The shift lifecycle

```
GET /units + /drivers ──► POST /shifts/start ──► ACTIVE shift
                                                   │  GPS pings, fares, GCash, hails, breaks
                                                   ▼
                                     POST /remittances ──► ENDED + remittance row
                                                              (PENDING until an admin counts the cash)
```

- **A conductor has at most one `ACTIVE` shift.** So do the vehicle and the driver.
- **`POST /conductor/remittances` is the only way a conductor ends a shift.** The Next.js route `/api/conductor/shifts/end` is a mock that never reaches Laravel (README [Known quirks](README.md#known-quirks)).
- **Shifts also end without the conductor.** The scheduler closes shifts that are too old or from a previous day (`shifts:auto-end-stale`, `vehicles:reset-daily-assignments`; see [README](README.md#scheduled-jobs-that-change-api-state)). Those closes go through the same closeout code, so the side effects in [POST /conductor/remittances](#post-conductorremittances) apply to them too.
- **Most shift writes check device ownership.** See [Device ownership](#device-ownership).

Every shift write locks the `shift_logs` row first. Fares, hails, GPS, breaks and closeout therefore serialize per shift, and a fare can never land on a shift that is being closed.

---

## Reference lists

### GET /conductor/profile

- **Limiter:** conductor-read (60/min)

**200 OK**

```json
{
  "data": {
    "id": "7b2f…",
    "name": "Pedro Reyes",
    "email": "pedro@chatco.online",
    "role": "CONDUCTOR",
    "username": "preyes01"
  },
  "message": "Conductor profile retrieved"
}
```

`name` is `null` if the profile row is missing. `username` is the admin-generated login name.

### GET /conductor/units

Vehicles for the Unit Verification screen.

- **Limiter:** conductor-read (60/min)

**Query**

| Param | Effect |
|---|---|
| (none) | Only vehicles this conductor can start a shift on: `status = ACTIVE`, no active shift, and either unassigned or assigned to this conductor |
| `include_unavailable=1` | **Every** vehicle, each with an `unavailable_reason`. Usable vehicles come first. |

`unavailable_reason` uses the same wording `POST /conductor/shifts/start` would refuse with:

| Reason | When |
|---|---|
| `null` | Usable |
| `Vehicle already on active shift` | `active_shift_id` is set |
| `The assigned vehicle and driver must both be active.` | Vehicle `status` is not `ACTIVE` |
| `Vehicle is assigned to another conductor.` | Its `conductor_id` is someone else |

**200 OK:** an array of Vehicle models with `route` loaded. `message` is `"Available vehicles retrieved"`, or `"Vehicles retrieved"` with `include_unavailable`.

### GET /conductor/drivers

Drivers for the Unit Verification screen.

- **Limiter:** conductor-read (60/min)

**Query.** The same `include_unavailable=1` switch as units.

| Mode | Drivers returned |
|---|---|
| Default | `status = ACTIVE`, no active shift, and not the assigned driver of a vehicle that belongs to another conductor |
| `include_unavailable=1` | Every driver, ordered by first name, usable ones first, each with `unavailable_reason` |

| Reason | When |
|---|---|
| `null` | Usable |
| `Driver already on active shift` | `active_shift_id` is set |
| `The assigned vehicle and driver must both be active.` | Driver `status` is not `ACTIVE` |
| `Driver is assigned to another conductor.` | The driver is on a vehicle assigned to another conductor |

**200 OK:** an array of Driver models.

### GET /conductor/receipt-settings

Read-only receipt layout for the printed fare receipt. Admins edit these in Settings. Every value is a **string**, including the booleans.

- **Limiter:** conductor-read (60/min)

**200 OK.** Saved values override these defaults:

```json
{
  "data": {
    "receipt_business_name": "CHATCO",
    "receipt_address_line": "",
    "receipt_footer_note": "Thank you for riding with Chatco!",
    "receipt_paper_width": "58",
    "receipt_auto_print": "true",
    "receipt_show_datetime": "true",
    "receipt_show_transaction_id": "true",
    "receipt_show_route": "true",
    "receipt_show_unit": "true",
    "receipt_show_conductor": "true",
    "receipt_show_passenger": "true",
    "receipt_show_fare_breakdown": "true"
  },
  "message": "Receipt settings retrieved"
}
```

---

## Shifts

### POST /conductor/shifts/start

- **Limiter:** conductor-mutation (10/min), plus the `maintenance` middleware
- **Request:** `StartShiftRequest` → `ShiftService::startShift`

**Body (JSON)**

| Field | Rules |
|---|---|
| `vehicle_id` | Required UUID of an existing vehicle |
| `driver_id` | Required UUID of an existing driver |
| `route_id` | Optional UUID of an existing route. Defaults to the vehicle's route. |
| `device_id` | Optional. See [Device ownership](#device-ownership). When sent, this device owns the new shift. |
| `device_type` | `WEB` or `MOBILE`. Required with `device_id`. |

**Server checks, in order.** The first failure wins. All run inside one transaction that locks the conductor profile, vehicle and driver, so two simultaneous starts cannot both succeed.

| Status | Shape | Message |
|---|---|---|
| 503 | A | `CHATCO is under maintenance right now. You can't start a shift until maintenance is complete.` (admin setting `maintenance_mode = "true"`) |
| 422 | A | Validation: `Vehicle is required`, `Vehicle not found`, `Driver not found`, `Route not found`, … |
| 422 | B | `Conductor profile required` |
| 409 | B | `Already on active shift` |
| 409 | B | `Driver already on active shift` |
| 409 | B | `Vehicle already on active shift` |
| 422 | B | `The assigned vehicle and driver must both be active.` |
| 403 | B | `Vehicle is assigned to another conductor.` |
| 403 | B | `Vehicle is assigned to another driver.` |
| 403 | B | `Driver is assigned to another conductor.` |
| 422 | B | `The selected route does not match the approved vehicle assignment.` |

**201 Created.** The ShiftLog model with `vehicle`, `driver` and `route` loaded:

```json
{
  "data": {
    "shift_id": "SHF-K3M9Q2XW7PL0AB",
    "conductor_id": "7b2f…",
    "driver_id": "d1…",
    "vehicle_id": "c3d4…",
    "route_id": "r1…",
    "conductor_name": "Pedro Reyes",
    "driver_name": "Jose Cruz",
    "unit_number": "U-07",
    "plate_number": "ABC 1234",
    "time_in": "2026-10-01T22:05:11.000000Z",
    "time_out": null,
    "is_active": true,
    "status": "ACTIVE",
    "operating_device_id": "web-4f1c…",
    "operating_device_type": "WEB",
    "operating_device_claimed_at": "2026-10-01T22:05:11.000000Z",
    "vehicle": { }, "driver": { }, "route": { }
  },
  "message": "Shift started"
}
```

Model timestamps use Laravel's default UTC format (`…Z`).

**Side effects**

- The vehicle records today's assignment: `active_shift_id`, `driver_id`, `conductor_id`, `assignment_date` (today in Asia/Manila) and `assignment_approved_at`.
- The driver's `active_shift_id` is set.
- Admins get a `SHIFT_STARTED` notification.

### GET /conductor/shift

The conductor's active shift, or nothing.

- **Limiter:** conductor-read (60/min)

**200 OK**

- **With an active shift:** the ShiftLog with `vehicle`, `driver`, `route` and `latestDeviceRecovery` loaded. `message: "Active shift retrieved"`.
- **Without one:** `data: null`, `message: "No active shift"`.

`latestDeviceRecovery` is the most recent [admin recovery](#admin-recovery-of-a-lost-device) for this shift, or `null`. A client can use it to explain why the shift suddenly has no operating device.

### GET /conductor/shift-logs

The conductor's shifts, newest `time_in` first, each with `vehicle`, `driver` and `route`.

- **Limiter:** conductor-read (60/min)

**Query:** `per_page` (default 15, **not clamped**), `page`

**200 OK:** a Laravel paginator (README format 1).

### GET /conductor/ratings

Commuter feedback for one of the conductor's shifts. Powers the metrics page.

- **Limiter:** conductor-read (60/min)

**Query:** `shift_id` (required)

**200 OK.** An array, newest first. Each row carries **both** ratings: the driver rating (`rating`, `category`, `comment`) and the conductor rating (`conductor_*`). The web client splits each row into a DRIVER and a CONDUCTOR entry.

```json
{
  "id": "…",
  "shift_id": "SHF-…",
  "vehicle_id": "…",
  "driver_id": "…",
  "conductor_id": "7b2f…",
  "commuter_id": "…",
  "commuter_name": "Juan Dela Cruz",
  "rating": 5,
  "category": "Safe driving",
  "comment": "…",
  "conductor_rating": 4,
  "conductor_category": null,
  "conductor_comment": null,
  "created_at": "2026-10-01T08:15:02+08:00"
}
```

Rows are filtered to `conductor_id` = the caller, so another conductor's `shift_id` returns `[]`, not `403`.

**Errors:** `422 "shift_id query parameter is required."` (shape A)

---

## Device ownership

A conductor can be signed in on web and mobile at the same time ([auth.md](auth.md#session-rules)), but only **one device operates an active shift**. That device is stored on the shift as `operating_device_id` and `operating_device_type`. Cash can be recorded offline on a phone, so this rule keeps a second device from ending or changing a shift while the first still holds unsynced fares.

**Fields.** Conductor write endpoints accept:

| Field | Rule |
|---|---|
| `device_id` | 16–100 characters, `[A-Za-z0-9._:-]`, stable per install or browser |
| `device_type` | `WEB` or `MOBILE`. Required when `device_id` is sent. |

**The ownership check** (`ShiftDeviceService::assertCanOperate`):

| Shift state | Request | Result |
|---|---|---|
| No operating device | `device_id` that an admin previously recovered from this shift | `409` (recovered-device message below) |
| No operating device | Any other `device_id` | **This device claims the shift**, then the action runs |
| No operating device | No `device_id` | Allowed (legacy clients) |
| Has an operating device | Same `device_id` | Allowed |
| Has an operating device | Different `device_id` | `409` |
| Has an operating device | No `device_id` | `409`, **except** on the web `POST /conductor/transactions`, which lets it through ([Known quirks](#known-quirks)) |

The `409` message for a mismatch is:

> This shift is active on another device. Finish syncing and release that device before performing shift actions here.

**Endpoints that run the check:** `/location`, `/capacity-status`, `/break-status`, `/transactions` (POST), `/payments/gcash/initiate`, `/hails/{id}/accept`, `/hails/{id}/reject` and `/remittances` (POST). Shift start sets the owner directly. SOS and every GET skip the check.

**Moving a shift to another device**, in order of preference:

1. **Planned handoff:** the current device calls [release](#post-conductorshiftsdevicerelease), then the new device calls [claim](#post-conductorshiftsdeviceclaim).
2. **Log in on the new device with a `device_id`.** Login moves the active shift to that device and logs the handoff ([auth.md](auth.md#session-rules)). A login that omits `device_id` while another device owns the shift gets `409 "Update this conductor client before moving an active shift from another device."`
3. **The old device is lost:** an admin [recovers](#admin-recovery-of-a-lost-device) the shift, then the new device claims it.

### POST /conductor/shifts/device/claim

Makes this device the operating device of the conductor's active shift.

- **Limiter:** conductor-mutation (10/min)
- **Request:** `ShiftDeviceRequest`

**Body (JSON)**

| Field | Rules |
|---|---|
| `shift_id` | Required. Must exist in `shift_logs`. |
| `device_id` | **Required** (same format as above) |
| `device_type` | **Required**, `WEB` or `MOBILE` |

Claiming a shift this device already owns succeeds and keeps the original `operating_device_claimed_at`.

**200 OK:** the ShiftLog with `vehicle`, `driver`, `route` and `latestDeviceRecovery`, `message: "This device can now operate the shift."`

**Errors**

| Status | Shape | When |
|---|---|---|
| 422 | A | Validation, including an unknown `shift_id` (`exists` rule) |
| 403 | B | `Forbidden`: the shift belongs to another conductor |
| 409 | B | `Only an active shift can claim an operating device.` |
| 409 | B | `An administrator released this device from the shift. Use a different device or ask the administrator to review the recovery.` |
| 409 | B | `Another device still owns this shift. Release it there before claiming this device.` |

### POST /conductor/shifts/device/release

Gives up ownership so another device can claim the shift. Call it only after this device has synced every offline fare.

- **Limiter:** conductor-mutation (10/min)
- **Request:** `ShiftDeviceRequest` (same body as claim; `device_type` is required but not used)

**200 OK:** the ShiftLog with ownership cleared, `message: "The shift is ready to be claimed by another device."`

**Errors**

| Status | Shape | When |
|---|---|---|
| 422 | A | Validation, including an unknown `shift_id` |
| 403 | B | `Forbidden` |
| 409 | B | `Only an active shift can release its operating device.` |
| 409 | B | `Only the current operating device can release this shift.` (also when the shift has no owner) |

### Admin recovery of a lost device

`POST /admin/shifts/{shift}/device/recover` (role `ADMIN`, limiter `admin-write`). Full admin docs come in phase 5. It is described here because it changes what conductor devices can do.

**Body (JSON)**

| Field | Rules |
|---|---|
| `reason` | Required, 10–500 characters |
| `acknowledge_unsynced_cash_risk` | Required, must be accepted (`true`) |

**What it does**

- Records a `shift_device_recoveries` row (previous device, who recovered it, reason) and an activity-log entry.
- Clears the shift's operating device.
- **Blocks the recovered device from this shift permanently.** Any later claim or write from that `device_id` on this shift gets the `409` "An administrator released this device…" message.
- Changes **no** shift, transaction or remittance data. The lost phone may still hold unsynced cash, which is why the admin must acknowledge the risk.

`message: "The lost operating device was released. A conductor device must explicitly claim the shift before collecting fares."`

**Errors:** `409 "Only an active shift can recover an operating device."`, `409 "This shift no longer has an operating device to recover."`, `404` unknown shift (shape B)

---

## GPS and vehicle status

### POST /conductor/location

A GPS ping for the vehicle on the conductor's active shift. The app sends one about every 5 s.

- **Limiter:** conductor-gps (30/min)
- **Request:** `UpdateLocationRequest` → `LocationService::updateLocation`

**Body (JSON)**

| Field | Rules |
|---|---|
| `lat` | Required, -90 to 90 |
| `lng` | Required, -180 to 180 |
| `speed` | Optional, km/h, **0–160** |
| `heading` | Optional, degrees, 0–360 |
| `accuracy` | Optional, metres, 0–1000 |
| `fix_timestamp` | Optional ISO-8601 time the fix was taken (browser `position.timestamp`). Defaults to now. |
| `capacity_status` | Optional `AVAILABLE`, `STANDING` or `FULL` |
| `device_id`, `device_type` | [Device ownership](#device-ownership) |

**Server checks, in order**

| Status | Message | Rule |
|---|---|---|
| 422 | `The GPS sample is stale or has an invalid timestamp.` | `fix_timestamp` must be no older than **2 minutes** and no more than 1 minute in the future |
| 422 | `No active shift` | |
| 409 | device mismatch | [Device ownership](#device-ownership) |
| 409 | `The vehicle is no longer assigned to this shift.` | The vehicle's `active_shift_id` points elsewhere |
| 422 | `The GPS sample is older than the latest accepted fix.` | Samples must arrive in order within a shift |
| 422 | `The GPS sample represents an impossible location jump.` | The speed implied by the distance from the last fix is over **180 km/h** **and** `accuracy` is reported and ≤ 50 m |

Validation errors (`422`, shape A) come first. The rest are shape B.

**What gets stored.** One live row per vehicle in `vehicle_locations`, overwritten on each ping. It is a snapshot, not history.

- **Speed:** the reported `speed`. If omitted, the speed derived from the last fix is used instead.
- **Capacity:** the sent `capacity_status`. On the first ping of a shift without one, it resets to `AVAILABLE`.

**Overspeed episodes.** These are recorded only when the fix has no `accuracy` or `accuracy` ≤ 50 m:

- **The limit** is the admin setting `speed_limit_kmh` (default 50). It is cached for 60 s, so a change takes up to a minute to apply. A value outside 1–120 turns detection off.
- **Above the limit**, a ping opens an episode for the shift, or extends the open one. The episode keeps the top speed and the location where it happened.
- **Admins are notified once per episode,** when it starts (`OVERSPEED_FLAGGED`), not on every ping.
- **A ping at or under the limit** closes the open episode.
- Admins read episodes at `GET /admin/monitoring/overspeed`.

**Broadcast.** After commit, `VehicleLocationUpdated` goes out on the public `vehicles` channel ([README](README.md#realtime-pusher)) to every client except the sender.

**200 OK:** the VehicleLocation model, `message: "Location updated"`. Decimals come back as strings.

### POST /conductor/capacity-status

Sets how full the jeepney is, without a GPS fix.

- **Limiter:** conductor-write (30/min)

**Body (JSON):** `capacity_status` (required, `AVAILABLE` / `STANDING` / `FULL`), plus `device_id` / `device_type`

If the shift has no GPS snapshot yet, a row is created with `null` coordinates. It shows on the live map only after the first GPS ping. The change is broadcast like a GPS ping.

**200 OK:** the VehicleLocation model, `message: "Capacity status updated"`

**Errors:** `422 "No active shift"`, `409` device mismatch, `409 "The vehicle is no longer assigned to this shift."`, `422` validation

### POST /conductor/break-status

- **Limiter:** conductor-write (30/min)

**Body (JSON):** `is_on_break` (required boolean), plus `device_id` / `device_type`

- **While on break,** commuters cannot hail the vehicle (`422 "Vehicle is currently on break"`).
- **Starting a break** keeps any existing `break_started_at`. **Ending it** clears `break_started_at`.

**200 OK:** the ShiftLog with `vehicle`, `driver` and `route`. `message` is `"Break started"` or `"Break ended"`.

**Errors:** `422 "No active shift"`, `409` device mismatch, `422` validation

---

## Recording fares

`POST /conductor/transactions` records **cash** and **voucher** fares, which are paid on the spot. GCash goes through [initiate](#post-conductorpaymentsgcashinitiate) instead. How the three payment types fit together is explained in [payments.md](payments.md#the-three-ways-a-fare-is-paid).

### How the fare is calculated

**The server always computes the fare.** `final_amount`, `base_fare`, `distance` and `discount_amount` are still accepted for older clients but are ignored.

**1. Find the two stops** (`FareCalculationService::resolvePoint`), each one separately:

- **By ID (preferred):** `pickup_stop_id` / `dropoff_stop_id`, a fare-point UUID. If a name is also sent, it must be one of that point's names.
- **By name:** `pickup_name` / `dropoff_name`, matched case-insensitively against the point's name, its `sub_stops`, its `landmarks`, or `"Point · Sub-stop"`.
- **Either way,** the point must belong to the shift's route.

The stored `pickup_name` / `dropoff_name` is the canonical spelling of whichever name matched.

**2. Price it:**

- **Regular fare** = `|pickup.regular_fare − dropoff.regular_fare|`, but at least the `base_fare_regular` setting (default ₱15).
- **Discounted fare** = the same calculation on the `discounted_fare` column, at least `base_fare_discounted` (default ₱12).
- **`STUDENT`, `SENIOR` and `PWD`** pay the discounted fare. `REGULAR` pays the regular fare.

**Errors.** All are `422`, shape B. `{Label}` is `Pickup` or `Drop-off`.

| Message | When |
|---|---|
| `{Label} point was not found.` | Unknown stop ID |
| `{Label} point does not belong to the active route.` | The stop ID is on another route |
| `{Label} point is required.` | Neither ID nor name sent |
| `{Label} point was not found in the active fare matrix.` | No name matched |
| `{Label} point is ambiguous. Refresh the fare matrix and try again.` | The name matched more than one point |
| `{Label} sub-area does not belong to the selected point.` | The name sent with an ID is not one of that point's names |
| `Pickup and drop-off must belong to the same route.` | |
| `Each passenger quantity must be between 1 and 50.` | |
| `Total passengers must be between 1 and 50.` | |

### POST /conductor/transactions

- **Limiter:** conductor-write (30/min)
- **Request:** `RecordCashRequest` → `TransactionService`

**The body picks one of three modes:**

| Mode | Trigger | Creates |
|---|---|---|
| **Single** | Neither `passengers` nor `group_passengers` | One transaction for one passenger. `payment_method` may be `CASH` or `VOUCHER`. |
| **Multi-passenger** | `passengers` present | **One** CASH transaction covering everyone, with a `passenger_breakdown` per type |
| **Group** | `group_passengers` present | A `PaymentGroup` plus **one CASH transaction per passenger**, all sharing a `multiple_payment_reference` |

**Body (JSON)**

| Field | Rules |
|---|---|
| `payment_method` | Required. `CASH` or `VOUCHER`. |
| `pickup_stop_id`, `dropoff_stop_id` | Fare-point UUIDs. Required with `passengers`. |
| `pickup_name`, `dropoff_name` | Max 100. Required unless `passengers` is sent. |
| `passenger_role` | Single mode. `REGULAR`, `STUDENT`, `SENIOR`, `SENIOR_CITIZEN` or `PWD`. Defaults to `REGULAR`. |
| `passenger_name` | Single mode, optional display name |
| `passenger_id` | Single mode, optional commuter UUID. Binds the ride to that commuter. |
| `voucher_code` | Required when `payment_method` is `VOUCHER` |
| `passengers` | 1–4 entries of `{ passenger_type, quantity }`, quantity 1–50 |
| `group_passengers` | 1–50 entries of `{ type, quantity }`. `type` is `REGULAR`, `SENIOR_CITIZEN`, `STUDENT` or `PWD`. |
| `idempotency_key` | Optional, max 100. Send a fresh UUID per "record fare" tap. |
| `shift_id` | Optional. Targets a specific shift the conductor owns. Used by offline retries. Without it, the active shift is used. |
| `offline_created_at` | Optional ISO time the fare happened offline. Switches on [offline replay rules](#offline-replay-rules). |
| `device_id`, `device_type` | [Device ownership](#device-ownership) |

#### Single cash fare

- **Passenger type.** With `passenger_id`, the commuter's **stored** type wins over `passenger_role`, and their name replaces `passenger_name`. Without it, `passenger_role` is trusted, because no account exists to check it.
- **Bound to a commuter** (`passenger_id` sent): the ride counts toward their rewards at once, and a free-ride voucher is issued if this ride completes a cycle ([commuter.md](commuter.md#get-commuterrewards)). No receipt token is created.
- **Anonymous** (no `passenger_id`): the transaction gets a **cash receipt token**, stored in `qr_token`. Print it as a QR on the receipt. The commuter can later scan it with `POST /commuter/receipts/claim` to bind the ride to their account, within `PAYMENT_CASH_RECEIPT_TTL_HOURS` (default 6). See [payments.md](payments.md#post-commuterreceiptsclaim).

**201 Created.** The Transaction model (`status: "PAID"`, `paid_at` set), `message: "Cash fare recorded"`.

#### Multi-passenger cash fare

- **One row, one receipt token.** `passenger_name` is `"Multiple passengers"`, `total_passengers` is the head count, and the per-type lines are in `passenger_breakdown`.
- **Rewards.** The row is `reward_eligible` only when it covers a single passenger. One receipt for several riders should not give one person a reward.

**201 Created.** The Transaction with `passengerBreakdown`, `message: "Multi-passenger cash fare recorded"`.

#### Group cash fare

- **Expansion.** `group_passengers` expands to one PAID transaction per passenger, numbered by `group_position` from 1.
- **Receipt and rewards.** Only position 1 gets a receipt token and is `reward_eligible`. That is the payer's own ride.

**201 Created**

```json
{
  "data": {
    "group_id": "…",
    "multiple_payment_reference": "MP-261001-AB12CD",
    "payer_name": null,
    "total_amount": 54.0,
    "passenger_count": 3,
    "transactions": [ { "transaction_id": "TXN-…", "group_position": 1, "qr_token": "…" } ]
  },
  "message": "Group cash fare recorded"
}
```

#### Voucher fare (a free ride)

Single mode with `payment_method: "VOUCHER"` and the `voucher_code` the commuter shows ([commuter.md](commuter.md#get-commuterrewards)).

- **Atomic.** The voucher row is locked. Marking it `USED` and inserting the transaction commit together.
- **Free ride.** The ride is bound to the voucher's owner, at their stored passenger type. `final_amount` is `0`, and `discount_amount` equals the full fare.
- **No receipt token,** and the ride never earns a reward.
- **Always active shift and device check.** A voucher fare always runs the device-ownership check and always needs an **active** shift, even with `offline_created_at` set.
- **`passenger_id` as a guard.** If it is sent, it must match the voucher's owner.

**Voucher errors** (shape B)

| Status | Message |
|---|---|
| 422 | `Voucher code is required for voucher payments.` |
| 422 | `Voucher code not found.` |
| 422 | `This voucher is not assigned to a commuter.` |
| 422 | `This voucher does not belong to the selected commuter.` |
| 422 | `This voucher has expired.` (an `AVAILABLE` voucher past `expires_at` is flipped to `EXPIRED` first) |
| 409 | `This voucher has already been used or is no longer available.` |
| 409 | `This voucher has already been redeemed.` |
| 409 | `The idempotency key has already been used for another transaction.` |
| 422 | `The commuter assigned to this voucher no longer exists.` |

#### Idempotency

- **Duplicate key, any mode:** if a transaction (single or multi) or a payment group (group) with the same `idempotency_key` exists, it is returned with `201`. Nothing new is created, even if the rest of the body differs.
- **Voucher fares** check the key inside the voucher lock. The same key with the same voucher returns the original; with a different voucher it is `409`.
- **Without a key,** every request records a new fare. There is deliberately no deduplication on "same amount, same stops", because several passengers often pay the same fare seconds apart.

#### Offline replay rules

When `offline_created_at` is sent (with `shift_id`), the fare may land on a shift that has already ended. This is `ShiftCloseoutService::lockOfflineCashShift`:

| Shift | Result |
|---|---|
| Still active | Recorded normally |
| Ended, remittance still `PENDING` | Recorded **only if** `offline_created_at` is between `time_in − 5 min` and `time_out + 5 min`. The remittance totals are then recalculated. |
| Ended, remittance `COMPLETE` / `SHORTAGE` / `OVERAGE` | `409 "This ended shift has already been remitted; its offline cash queue requires administrator review."` |

`offline_created_at` and `device_id` are stored on the row, along with `synced_at`.

#### Errors

| Status | Shape | When |
|---|---|---|
| 422 | A | Validation |
| 422 | B | `No active shift` (no `shift_id` sent and no active shift), `Conductor profile required` |
| 403 / 404 | B | `shift_id` belongs to another conductor / does not exist |
| 409 | B | `The shift has already ended; no new transaction can be recorded.` |
| 409 | B | Device mismatch, or the offline rules above |
| 422 | B | `The offline fare timestamp is outside the originating shift.` |
| 422 | B | `Passenger profile was not found.`, `Passenger type is invalid.` |
| 422 | B | A [fare calculation error](#how-the-fare-is-calculated) |

---

## GCash

The full GCash flow (commuter claim, PayMongo checkout, webhook, status polling, cancel, late settlement) is in [payments.md](payments.md#1-gcash-qr-plus-paymongo-checkout). This section covers only the two conductor endpoints.

### POST /conductor/payments/gcash/initiate

Creates a `PENDING` GCash transaction and returns the **binding QR** the conductor shows to the commuter.

- **Limiter:** conductor-write (30/min)
- **Request:** `InitiateGcashRequest` → `TransactionService::initiateGcashFare`

**Body (JSON).** The same stop and mode fields as [cash](#post-conductortransactions), with these differences:

- **`payment_method`** must be `GCASH`.
- **No passenger fields.** There is no `passenger_role`, `passenger_id`, `voucher_code`, `idempotency_key`, `shift_id` or `offline_created_at`.
- **Single mode always charges the `REGULAR` fare.** A discounted commuter's type is applied when they claim the QR ([payments.md](payments.md#post-commuterpaymentsclaim)).
- **Group mode** prices the companions from `group_passengers` and adds a placeholder payer row at ₱0. The payer's own fare is added when they claim.

**One pending GCash payment per shift.** If the shift already has a `PENDING` GCash payment still inside the claim window (default 10 min), that one is returned, with its original amount and QR. **No new payment is created, even if this request asked for a different fare.** Cancel it first ([payments.md](payments.md#post-paymentsidcancel)) to start a different one. A pending payment past its window is expired on the spot, and a new one is created.

**201 Created**

```json
{
  "data": {
    "transaction_id": "TXN-…",
    "qr_token": "q8Zr…",
    "checkout_url": "https://pm.link/…",
    "amount": 28.5,
    "expires_at": "2026-10-01T08:25:02+08:00",
    "group_id": null,
    "multiple_payment_reference": null,
    "receipts": [ { "transaction_id": "TXN-…" } ]
  },
  "message": "GCash fare initiated"
}
```

| Field | Notes |
|---|---|
| `qr_token` | Encode this in the QR the commuter scans. It is **not** the `transaction_id`. |
| `checkout_url` | PayMongo hosted page. `null` with the fake gateway ([payments.md](payments.md#gateway-setup-and-the-fake-gateway)). |
| `amount` | For a group, the group total |
| `expires_at` | `created_at` + claim TTL. The same clock the claim endpoint checks. |
| `receipts` | Every transaction row in the payment: one row, or every group row in `group_position` order |

**Errors**

| Status | Shape | When |
|---|---|---|
| 422 | A | Validation (`Payment method must be GCASH for this endpoint`, …) |
| 422 | B | `No active shift`, `Conductor profile required`, or a [fare calculation error](#how-the-fare-is-calculated) |
| 409 | B | Device mismatch, or the shift ended mid-request |
| 502 | B | `Unable to initiate GCash payment. Please try again.` The gateway failed and the pending row was deleted. |

Then poll `GET /payments/{transaction_id}/status`, or listen on `payments.{transactionId}` ([payments.md](payments.md#get-paymentsidstatus)).

### GET /conductor/payments/gcash/pending

Returns the shift's resumable pending GCash payment, so the conductor app can show the **same** QR again after a refresh or navigation instead of creating a duplicate.

- **Limiter:** conductor-read (60/min)

**200 OK**

- **One exists:** the same keys as initiate, plus `pickup_name` and `dropoff_name`. `message: "Pending GCash payment found"`.
- **None:** `data: null`, `message: "No pending GCash payment"`. This covers no active shift, no pending payment, or one that just expired.

A pending payment past its claim window is expired during this read, so an unclaimable QR is never offered.

---

## History and earnings

### GET /conductor/transactions

The transactions of one of the conductor's shifts, newest first, each with `passengerBreakdown` and `paymentGroup` (`id`, `reference_number`) loaded.

- **Limiter:** conductor-read (60/min)

**Query**

| Param | Rules |
|---|---|
| `shift_id` | Required |
| `page`, `per_page` | `per_page` default 25, clamped to 1–100 |
| `payment_method` | `CASH`, `GCASH` or `VOUCHER`. Other values are ignored. |
| `date_from`, `date_to` | `YYYY-MM-DD`, inclusive, on `created_at` |

**The response format depends on the query.**

**Without** any of `page`, `per_page`, `payment_method`, `date_from` or `date_to`, `data` is a plain array of **every** transaction on the shift:

```json
{ "data": [ { "transaction_id": "TXN-…", "status": "PAID" } ], "message": "Shift transactions retrieved" }
```

**With any of them,** `data` is a trimmed paginator plus a total (README pagination format 3):

```json
{
  "data": {
    "data": [ { } ],
    "current_page": 1,
    "per_page": 25,
    "total": 61,
    "last_page": 3,
    "total_amount": 1432.5
  }
}
```

`total_amount` sums `final_amount` over every row that matches the filters, **whatever its status**. PENDING, FAILED and EXPIRED GCash rows are included. For money actually collected, use [earnings](#get-conductorearnings).

Rows are full Transaction models, including internal columns such as `qr_token`. For an anonymous cash fare, `qr_token` is the printable receipt token.

**Errors:** `422 "shift_id query parameter is required"` (shape A), `403 "Forbidden"` (another conductor's shift), `404 "Shift not found"` (shape B)

### GET /conductor/earnings

- **Limiter:** conductor-read (60/min)

**Query:** `shift_id` (required)

**200 OK**

```json
{ "data": { "cash_total": 820.0, "gcash_total": 312.5, "total": 1132.5 }, "message": "Shift earnings retrieved" }
```

| Field | Meaning |
|---|---|
| `cash_total` | Sum of `PAID` CASH fares. This is the cash the conductor must hand over. |
| `gcash_total` | Sum of `PAID` GCash fares. Record-only: the money is already with the operator, so it is not physically remitted. |
| `total` | `cash_total + gcash_total` |

PENDING GCash is excluded because it may still fail. Voucher rides are ₱0 and add nothing.

**Errors:** the same as `GET /conductor/transactions`

---

## Remittance (ending a shift)

### POST /conductor/remittances

Ends the conductor's shift and creates its remittance record. **This is the only way a conductor ends a shift.**

- **Limiter:** conductor-mutation (10/min)
- **Request:** `SubmitRemittanceRequest` → `ShiftService::endShiftViaRemittance` → `ShiftCloseoutService::close`

**Body (JSON)**

| Field | Rules |
|---|---|
| `shift_id` | Required |
| `total_collected` | Required number ≥ 0. **Validated but not used** (see below). |
| `cash_total`, `gcash_total` | Optional. **Ignored.** |
| `device_id`, `device_type` | [Device ownership](#device-ownership). Only the operating device can end the shift. |

**The conductor does not declare cash.** The server discards `total_collected` and closes the shift with "no cash handed over yet". The physical cash count is an **admin** action: `POST /admin/remittances/{shiftId}/cash-declaration` (phase 5) resolves the remittance.

**How the remittance is set up**

- **Expected cash** is the sum of `PAID` CASH fares. GCash totals are stored for the record only.
- **Cash owed** (expected cash > 0): the remittance is `PENDING`, with `remitted_amount` 0 and a `remittance_due_at` of `time_out` + the `remittance_grace_minutes` setting (default 30, clamped to 1–1440). Reminders go out to conductors with `PENDING` remittances ([README](README.md#scheduled-jobs-that-change-api-state)).
- **No cash owed:** the remittance is `COMPLETE` at once, and admins get a `REMITTANCE_COMPLETED` notification.

**The admin's count later decides the final status:**

| Admin count vs expected cash | Status |
|---|---|
| Equal | `COMPLETE` |
| Less | `SHORTAGE` (`shortage` = the difference) |
| More | `OVERAGE` (`overage` = the difference) |

> **Column naming.** On the remittance row, `total_collected` and `cash_total` both hold the **expected** system cash. `remitted_amount` is what was physically counted. The request field `total_collected` is unrelated to the column of the same name.

**Side effects when the shift ends.** The same effects apply when the scheduler ends a shift.

- The shift becomes `ENDED`, with `is_active: false` and `time_out` set.
- **The vehicle is freed:** `active_shift_id`, `driver_id`, `conductor_id`, `assignment_date` and `assignment_approved_at` are cleared. It shows up in `GET /conductor/units` again.
- **The driver is freed:** `active_shift_id` is cleared.
- **The live GPS snapshot is deleted,** so the vehicle disappears from the map and from `GET /vehicles/locations`.
- **Open hails are cancelled.** Every `PENDING` and `ACCEPTED` hail for the vehicle becomes `CANCELLED`, and `HailStatusChanged` is broadcast to each commuter.
- Fares can no longer be recorded on the shift, apart from [offline replays](#offline-replay-rules) while the remittance is `PENDING`.

**200 OK.** The ShiftLog with `vehicle`, `driver`, `route` and `remittance`, `message: "Shift ended via remittance"`.

**Errors**

| Status | Shape | When |
|---|---|---|
| 422 | A | Validation |
| 422 | B | `Conductor profile required` |
| 404 | B | Unknown `shift_id` (`No query results for model [App\Models\ShiftLog] …`) |
| 403 | B | `Forbidden`: another conductor's shift |
| 409 | B | Device mismatch |
| 409 | B | `Shift has already ended.` The shift is ended and its remittance is no longer `PENDING`. |

> **Do not submit twice.** If the shift is already ended and its remittance is still `PENDING`, a second submit returns **200**, records ₱0 as remitted, and sets the status to `SHORTAGE` for the full expected cash. After that, the admin cash declaration is refused with `409`. Disable the submit button after the first success, and treat a retry after a timeout as suspect. See [Known quirks](#known-quirks).

### GET /conductor/remittances

The conductor's own remittances, newest `date` then `time_in` first.

- **Limiter:** conductor-read (60/min)

**Query:** `per_page` (default 15, clamped to 1–100), `page`

**200 OK.** A Laravel paginator of Remittance models, each with these relations:

- `shift` (`shift_id`, `time_in`, `time_out`, `status`, …)
- `vehicle` (`unit_number`, `plate_number`) and `vehicle.route` (`name`)
- `driver` (`first_name`, `last_name`)

Each row also has a computed `is_overdue`: `true` when the remittance is `PENDING` and past `remittance_due_at`.

---

## Hails

A commuter hails a specific jeepney ([commuter.md](commuter.md#hailing-pick-me-up)), and the conductor of that jeepney's active shift answers it.

**Realtime.** New hails arrive on `private-vehicle.{vehicleId}.hails` as `HailCreated`. Status changes arrive as `HailStatusChanged`. Only the conductor with an active shift on that vehicle can subscribe ([README](README.md#realtime-pusher)). Use `GET /conductor/hails` as the source of truth after reconnecting.

### GET /conductor/hails

- **Limiter:** conductor-read (60/min)

**200 OK**

- **With an active shift:** the vehicle's `PENDING` hails that have not reached `expires_at`, newest first, each with `commuter` (the User) loaded. `message: "Pending hails retrieved"`.
- **Without one:** `data: null`, `message: "No active shift"`.

### POST /conductor/hails/{id}/accept

- **Limiter:** conductor-write (30/min)

**Body (JSON):** optional `device_id` / `device_type`

The hail's `conductor_id` is set to the caller, and `HailStatusChanged` is broadcast to the vehicle and commuter channels.

**200 OK:** the Hail with `commuter`, `vehicle` and `conductor`, `status: "ACCEPTED"`, `message: "Hail accepted"`

**Errors** (shape B, checked in this order)

| Status | When |
|---|---|
| 404 | Unknown hail ID |
| 403 | `Forbidden`: the vehicle has no active shift, or it is not the caller's |
| 409 | Device mismatch |
| 409 | `Hail is no longer pending`: already accepted, rejected, cancelled or expired by the scheduler |
| 409 | `Hail has expired`: still `PENDING` but past its 3-minute `expires_at` |

### POST /conductor/hails/{id}/reject

Same as accept, with these differences:

- **The result** is `REJECTED`, `message: "Hail rejected"`.
- **The response** loads `commuter` and `vehicle`.
- **No expiry check:** a `PENDING` hail can be rejected even after `expires_at`.

---

## SOS

`POST /conductor/sos` and `GET /conductor/sos/{id}` work like the commuter SOS ([commuter.md](commuter.md#sos)), with these differences:

| | Conductor | Commuter |
|---|---|---|
| Stored as | `sender_role: "CONDUCTOR"`, `conductor_id` set | `sender_role: "COMMUTER"`, `commuter_id` set |
| Limiter | conductor-mutation (**10/min**) | `sos` (1/min) |
| Loaded relation | `conductor` (the ConductorProfile) | `commuter` |
| Extra response field | `emergency_hotline`: the admin setting, or `null` | none |
| Device check | none | n/a |

**Body (JSON):** `lat` (required, -90 to 90), `lng` (required, -180 to 180), `note` (optional, max 500)

Admins get the same email (when `admin_sos_email` is set) and notification. Only admins can acknowledge or resolve. The conductor polls `GET /conductor/sos/{id}` for `status`.

**Errors** (shape A): `422 "Conductor profile not found"`, `422` validation; on GET, `404 "SOS alert not found"` (including another conductor's alert)

---

## Mobile namespace

Every route above also exists under `/mobile/conductor/*` with the same rules and responses, except for three differences:

| Route | Difference |
|---|---|
| `GET /mobile/conductor/transactions` | Served by `MobileTransactionController@index`. Behaves exactly like the web route, including both response formats. |
| `POST /mobile/conductor/transactions` | Served by `MobileTransactionController@store`. **Enforces the device check strictly:** when another device owns the shift, omitting `device_id` gets `409`. |
| `POST /mobile/conductor/transactions/sync` | Mobile only. Batch upload of an offline cash queue. |

### POST /mobile/conductor/transactions/sync

Uploads up to 50 queued offline fares in one call. Each item runs on its own: a failure is reported per item and never undoes the others.

- **Limiter:** conductor-write (30/min)

**Body (JSON)**

```json
{
  "transactions": [
    {
      "shift_id": "SHF-…",
      "payment_method": "CASH",
      "pickup_name": "Calumpit",
      "dropoff_name": "Malolos Crossing",
      "idempotency_key": "6f1d…",
      "offline_created_at": "2026-10-01T08:12:40+08:00",
      "device_id": "android-9a2e…",
      "device_type": "MOBILE"
    }
  ]
}
```

| Item field | Rules |
|---|---|
| `shift_id` | Required, max 20 |
| `payment_method` | Required, `CASH` or `VOUCHER` |
| `pickup_name`, `dropoff_name` | **Required**, max 100. Stops are matched by name only. |
| `idempotency_key` | **Required**, max 100. Makes retries of the whole batch safe. |
| `offline_created_at` | **Required** date. Each item follows the [offline replay rules](#offline-replay-rules). |
| `device_id`, `device_type` | Optional. Strict device check as above. |
| `passengers`, `group_passengers` | Optional arrays that switch the item's mode, as in [POST /conductor/transactions](#post-conductortransactions) |
| `final_amount` | Optional, ignored |

**Only the fields above are passed through.** Fields such as `pickup_stop_id`, `passenger_id`, `passenger_role` and `voucher_code` are dropped. So every synced fare is anonymous `REGULAR`-type unless it uses a mode array, and `VOUCHER` items always fail ([Known quirks](#known-quirks)).

**200 OK.** Returned even when some items fail:

```json
{
  "data": {
    "synced_count": 1,
    "failed_count": 1,
    "items": [
      { "idempotency_key": "6f1d…", "status": "synced", "transaction_id": "TXN-…" },
      { "idempotency_key": "a03c…", "status": "failed", "error": "The offline fare timestamp is outside the originating shift." }
    ]
  },
  "message": "Batch offline cash synchronization processed"
}
```

- **Group items:** `transaction_id` is the group's `multiple_payment_reference`.
- **Already-recorded items** (same `idempotency_key`) come back as `synced` with the existing ID, so the queue can be cleared safely.
- **A failed item** carries only the exception message, not a status code. Keep failed items queued and show the message.

**Errors for the whole request:** `422` validation of the batch shape (shape A)

---

## Known quirks

These are current behaviours, verified against the code. None of them are fixed by this doc. The cross-cutting ones are also listed in the [README](README.md#known-quirks).

1. **Submitting a remittance twice marks the cash as short.** The second `POST /conductor/remittances` on an ended shift with a `PENDING` remittance returns `200`, sets `remitted_amount` to 0 and the status to `SHORTAGE` for the full expected cash. After that, the admin cash declaration is refused with `409`. Confirmed with a probe test: first call `PENDING` (₱0 remitted), second call `SHORTAGE` (₱100 short). The cause is that `endShiftViaRemittance` always passes a `null` amount, and the resolve-a-pending-remittance branch in `ShiftCloseoutService::close` turns that into ₱0.
2. **`total_collected` is required but ignored.** The conductor's cash figure never reaches the remittance. The admin cash declaration is the only cash count.
3. **A web fare without `device_id` skips the device check.** `ConductorController@storeTransaction` passes `enforceDeviceLock = false`, so a cash, multi or group fare sent with no `device_id` is recorded even when another device owns the shift. A **different** `device_id` is still refused, voucher fares are always checked, and the mobile route is strict. The web client normally sends its `device_id`, so this mainly affects older or third-party callers.
4. **`payment_method: "VOUCHER"` is ignored in multi-passenger and group modes.** With `passengers` or `group_passengers`, the fare is recorded as CASH, even though validation still demands a `voucher_code`.
5. **The offline sync endpoint drops most item fields.** Its own validation rules omit `voucher_code`, `passenger_id`, `passenger_role` and the stop IDs, so `VOUCHER` items always fail with `Voucher code is required for voucher payments.`, and synced fares are never bound to a commuter. Item errors expose the raw exception message, which may include database error text.
6. **Paged `total_amount` counts every status.** In `GET /conductor/transactions`, `total_amount` includes PENDING, FAILED and EXPIRED GCash rows.
7. **GCash initiate can return a different fare than requested.** While a pending payment is within its claim window, initiate returns that payment (with its amount) and `201`, whatever the new body says.
8. **The impossible-jump check needs `accuracy`.** A jump over 180 km/h is rejected only when `accuracy` is reported and ≤ 50 m. Without `accuracy`, the jump is accepted. If `speed` is also omitted, the derived speed (possibly over 160 km/h) is stored and counted toward overspeed.
9. **Simultaneous retries with the same `idempotency_key` can fail with `500`.** For cash fares, the key is checked before the transaction starts, and the unique-index violation from a near-simultaneous duplicate is not caught. Sequential retries are safe. Voucher fares do catch the violation.
10. **`GET /conductor/shift-logs` does not clamp `per_page`.**
11. **Docblocks disagree with the code** in `ConductorHailController` (it names the `conductor-mutation` limiter and `422` errors; the routes use `conductor-write`, and the service returns `409`) and in `RecordCashRequest` (its message says the method "must be CASH", but `VOUCHER` is accepted).
