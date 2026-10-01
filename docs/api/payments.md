# Payments and QR API

How fares get paid and bound to a commuter: GCash through PayMongo, cash receipts, vouchers, status polling, cancellation, the PayMongo webhook, and the unit QR used for feedback.

All paths are relative to `/api/v1`. Conventions are in [README.md](README.md).

**Where the code lives**

| Area | Location |
|---|---|
| Controllers | `Payment/PaymentController`, `Payment/QrController` |
| Core services | `TransactionService` (fare creation, claims, vouchers), `PaymentService` (state machine, webhook, provider calls), `RewardService` (free-ride vouchers), `QrTokenService` |
| Gateways | `app/Services/Payments/Gateways/`: `PayMongoGateway` and `FakeGateway` |
| Config | `config/payments.php`, `config/qr.php` |

The **conductor** side of these flows (recording cash, starting a GCash payment, resuming a pending one) is in [conductor.md](conductor.md#recording-fares). This doc covers it only as far as needed to explain the flow.

## Contents

- [The three ways a fare is paid](#the-three-ways-a-fare-is-paid)
- [Gateway setup and the fake gateway](#gateway-setup-and-the-fake-gateway)
- [Timing rules](#timing-rules)
- [Commuter endpoints](#commuter-endpoints)
  - [POST /commuter/payments/claim](#post-commuterpaymentsclaim)
  - [POST /commuter/payments/{id}/redeem-voucher](#post-commuterpaymentsidredeem-voucher)
  - [POST /commuter/receipts/claim](#post-commuterreceiptsclaim)
  - [GET /commuter/payments](#get-commuterpayments)
- [Shared payment endpoints](#shared-payment-endpoints)
  - [GET /payments/{id}/status](#get-paymentsidstatus)
  - [POST /payments/{id}/cancel](#post-paymentsidcancel)
  - [POST /payments/{id}/simulate](#post-paymentsidsimulate-dev-only)
  - [POST /payments/webhook](#post-paymentswebhook)
- [Unit QR (feedback)](#unit-qr-feedback)
- [Known quirks](#known-quirks)

---

## The three ways a fare is paid

All three create a row in `transactions`, keyed by `transaction_id`. A row's `payment_method` is `CASH`, `GCASH` or `VOUCHER`, and its `status` follows the state machine in [README](README.md#shared-enums).

The server **always calculates the amount** from the fare matrix, using the pickup and drop-off stops plus the passenger type. Any amounts the client sends are ignored.

### 1. GCash (QR plus PayMongo checkout)

```
Conductor app                     Laravel                               Commuter app
─────────────                     ───────                               ────────────
POST /conductor/payments/gcash/initiate
  ───────────────────────────────► PENDING txn + qr_token (32 chars)
  ◄─────────────────────────────── { transaction_id, qr_token, amount, expires_at }
shows QR = raw qr_token
                                                                        scans QR
                                   ◄── POST /commuter/payments/claim { qr_token }
                                   binds commuter, re-prices if discounted,
                                   creates PayMongo intent
                                   ──► { checkout_url, amount, voucher_available, … }
                                                                        opens checkout_url
                                                                        (GCash login + OTP)
                                   PayMongo ── POST /payments/webhook (payment.paid)
                                   PENDING → PAID, rewards issued
                                   broadcast payments.{transaction_id}
polls GET /payments/{id}/status                                         returns to /gcash/return,
or listens on Pusher                                                    polls the same status
```

Key points:

- **The QR contains only the opaque `qr_token`,** never the `transaction_id`.
- **Only one fresh `PENDING` GCash payment exists per shift.** Calling initiate again returns the same one. `GET /conductor/payments/gcash/pending` resumes it after a refresh.
- **Discounted commuters are re-priced when they claim.** A verified `STUDENT`, `SENIOR` or `PWD` commuter pays the discounted fare, and `amount` in the claim response reflects it.
- **The webhook is the source of truth.** `GET /payments/{id}/status` also asks PayMongo directly if the webhook is late (see [reconciliation](#get-paymentsidstatus)).

### 2. Cash (recorded by the conductor, claimed later by the commuter)

```
POST /conductor/transactions { payment_method: CASH, ... }   →   PAID immediately
   receipt printed with a QR = raw qr_token (only when no passenger was attached)
POST /commuter/receipts/claim { qr_token }  (within 6 h)     →   ride bound to commuter, counts toward rewards
```

### 3. Voucher (a free ride)

There are two paths:

- **Cash-style:** the commuter shows the voucher `code` and the conductor records `payment_method: VOUCHER` with `voucher_code`. The fare is recorded at ₱0.
- **GCash-style:** after claiming a GCash QR, the commuter calls `POST /commuter/payments/{id}/redeem-voucher` to cover their own seat.

Voucher rides **never** count toward the next reward.

### Group payments

The conductor can record several passengers under one payer:

| Request field | What it records |
|---|---|
| `passengers` | One transaction with a passenger breakdown |
| `group_passengers` | A `payment_groups` row plus one receipt row per passenger. Reference format: `MP-YYMMDD-XXXXXX`. |

For a group, `transaction_id` points at the payer's row, and status changes apply to **every row in the group at once**.

## Gateway setup and the fake gateway

| Env | Meaning |
|---|---|
| `PAYMENT_GATEWAY` | `paymongo` (default) or `fake` |
| `PAYMONGO_SECRET_KEY` | `sk_test_…` is sandbox; `sk_live_…` is live. The mode is inferred from the prefix. |
| `PAYMONGO_WEBHOOK_SECRET` | `whsk_…`, used to verify the `Paymongo-Signature` header |
| `PAYMENT_RETURN_URL` | Where PayMongo sends the payer afterwards. Must be the **frontend** `/gcash/return`, not Laravel. |
| `PAYMENT_ALLOW_SIMULATION` | Enables `/payments/{id}/simulate`. Defaults to `APP_DEBUG`. **Must be `false` in production.** |

**When PayMongo keys are missing, `PaymentServiceProvider` silently falls back to `FakeGateway`.** With the fake gateway:

- `checkout_url` is `null`;
- no real money moves;
- a payment only completes through `/payments/{id}/simulate`.

This is the expected local-dev setup.

**Webhook registration.** Register `{APP_URL}/api/v1/payments/webhook` in the PayMongo dashboard for these events:

- `payment.paid`
- `payment.failed`
- `payment.refunded` / `refund.updated`

To diagnose the webhook setup, run:

```
php artisan payments:verify-webhook [--test-retrieve]
```

## Timing rules

| Rule | Default | Config / env |
|---|---|---|
| GCash QR claimable for | 10 min from initiate. Covers scan, PayMongo, OTP and webhook. | `PAYMENT_GCASH_CLAIM_TTL` |
| Late-settlement grace after `EXPIRED` | 60 s. A late `payment.paid` still flips `EXPIRED → PAID`. | `PAYMENT_LATE_SETTLEMENT_GRACE` |
| Provider reconciliation throttle | Every 5 s during the first 90 s, then every 30 s, per transaction | `PAYMENT_RECONCILE_ACTIVE_TTL`, `PAYMENT_RECONCILE_ACTIVE_WINDOW`, `PAYMENT_RECONCILE_TTL` (0 disables) |
| Cash receipt claimable for | 6 h from when the fare was recorded | `PAYMENT_CASH_RECEIPT_TTL_HOURS` |
| Voucher validity | 3 days | `RewardService::VOUCHER_VALIDITY_DAYS` |
| Unit QR (signed) validity | 7 days | `QR_FEEDBACK_TTL_MINUTES` (10080) |

Stale `PENDING` GCash rows are expired in two ways:

- **Lazily:** on status polls, initiate, resume and claim.
- **By schedule:** the `payments:expire-stale` job, every minute.

So clients never see a `PENDING` row that can no longer complete.

---

## Commuter endpoints

All four require role `COMMUTER`. Each is also available under `/mobile/commuter/...`.

### POST /commuter/payments/claim

Binds the scanned GCash QR to the commuter and returns the PayMongo checkout link.

- **Limiter:** commuter-hail (10/min)
- **Service:** `TransactionService::claimGcash`

**Body:** `qr_token` (required string, max 100). This is the exact text the QR decodes to.

**What happens**

1. **The row is looked up and locked** by `qr_token`.
2. **Claimability is checked.** The row must be `PENDING` and still inside the claim TTL; an expired row is flipped to `EXPIRED`.
3. **Re-scanning is idempotent.** If this commuter already claimed it, the same response is returned again.
4. **The commuter is bound** as `passenger_id` and `payer_id`, and their name is snapshotted.
5. **Verified discounted commuters are re-priced.** A new PayMongo intent is created at the discounted amount.
6. **For a group whose payer seat was still ₱0,** the payer's own fare is added to the group total and a new intent covers it.

**200 OK**

```json
{
  "data": {
    "transaction_id": "TXN-…",
    "checkout_url": "https://pm.link/…",
    "amount": 22.8,
    "regular_amount": 28.5,
    "discount_amount": 5.7,
    "passenger_role": "STUDENT",
    "pickup_name": "Calumpit",
    "dropoff_name": "Malolos Crossing",
    "voucher_available": true,
    "is_group": false
  },
  "message": "GCash transaction claimed"
}
```

| Field | Meaning |
|---|---|
| `checkout_url` | Redirect the commuter here. It is `null` under the fake gateway. |
| `amount` | What will be charged. For a group, this is the **sum of all receipts in the group**. |
| `regular_amount`, `discount_amount` | Breakdown for display. Also summed for groups. |
| `voucher_available` | `true` when the ride is still `PENDING` and the commuter holds an unexpired `AVAILABLE` voucher. Use it to offer [redeem-voucher](#post-commuterpaymentsidredeem-voucher). |
| `is_group` | `true` means a voucher would cover only the commuter's own seat |

**Errors** (shape B unless noted)

| Status | When |
|---|---|
| 404 | `Transaction not found` (unknown token) |
| 409 | `Transaction already claimed by another commuter` |
| 410 | `Transaction is no longer claimable` (already `PAID`, `FAILED`, `CANCELLED`, …) |
| 410 | `Transaction has expired` (past the claim TTL) |
| 422 | `Commuter profile required to claim a GCash transaction` |
| 422 | Shape A validation (`qr_token` missing) |
| 502 | `Unable to prepare GCash payment. Please try again.` (PayMongo failed while re-pricing) |

### POST /commuter/payments/{id}/redeem-voucher

Uses the commuter's soonest-expiring available voucher to cover **their own seat** on a claimed, still-`PENDING` GCash ride.

- **Limiter:** commuter-hail (10/min)
- **Path:** `id` is the `transaction_id` (from the claim response)
- **Body:** none

**What happens**

- **The voucher is marked `USED`.** The ride becomes `payment_method: VOUCHER`, `final_amount: 0`, and is no longer reward-eligible.
- **A solo ride is settled immediately** (`PAID`).
- **A group ride** has the payer's share removed from the group total. A new PayMongo intent covers the companions' remainder, so the commuter still checks out for the rest.
- **The voucher is returned automatically** if that remaining charge later ends `FAILED`, `CANCELLED` or `EXPIRED`. The voucher goes back to `AVAILABLE`.

**200 OK:** the same shape as [claim](#post-commuterpaymentsclaim), recalculated. For a group, use the new `checkout_url` and `amount`.

**Errors** (shape B)

| Status | When |
|---|---|
| 404 | `Transaction not found.` |
| 403 | `This ride does not belong to you.` (claim it first) |
| 409 | `This ride can no longer be covered by a voucher.` (not `PENDING`) |
| 422 | `Only a GCash ride can be covered by a voucher this way.` |
| 422 | `No available voucher to redeem.` |
| 502 | `Unable to prepare the remaining GCash payment. Please try again.` |

### POST /commuter/receipts/claim

Binds a printed **cash** receipt to the commuter so the ride counts toward rewards.

- **Limiter:** commuter-hail (10/min)
- **Body:** `qr_token` (required, max 100). The text the receipt QR decodes to.

Receipts only carry a token when the conductor recorded the fare **without** a passenger attached. Attributed fares are already bound, and have nothing to claim.

**200 OK**

```json
{
  "data": {
    "transaction_id": "TXN-…",
    "amount": 28.5,
    "pickup_name": "Calumpit",
    "dropoff_name": "Malolos Crossing",
    "conductor_name": "Pedro Reyes",
    "unit_number": "U-07",
    "paid_at": "2026-10-01T08:15:02+08:00",
    "already_claimed": false
  },
  "message": "Receipt claimed"
}
```

Scanning your own receipt again returns `already_claimed: true` with `message: "Receipt already claimed"`. This is still `200`.

On the first claim, a free-ride voucher is issued if this ride completes a reward cycle. For a group receipt, the commuter also becomes the group's payer.

**Errors** (shape B)

| Status | When |
|---|---|
| 404 | `Receipt not recognised` |
| 409 | `This receipt has already been claimed` (by someone else) |
| 410 | `This receipt has expired` (older than 6 h) |
| 422 | `This QR is not a cash receipt` (e.g. a GCash QR was scanned here) |
| 422 | `This ride is not a completed cash payment` |
| 422 | `Commuter profile required to claim a receipt` |

### GET /commuter/payments

The commuter's full payment history, covering **every status**, newest first. It also tells the app which rides can still be rated.

- **Limiter:** conductor-read (60/min)

**Query**

| Param | Rules |
|---|---|
| `per_page` | Default 20, clamped to 1–100 |
| `page` | |
| `filter` | `all` (default), `today` (since local midnight), `week` (last 7 days), `month` (since the 1st of the month). Uses Asia/Manila time. Anything else returns `422`. |

**200 OK.** A Laravel paginator (README format 1).

Each row in `data.data` is the **full Transaction model** with these additions:

- **`payment_group`:** `null`, or `{ id, reference_number, total_amount, passenger_count, transactions: [ { transaction_id, group_id, group_position, passenger_role, final_amount, status, passenger_name } ] }`. Only the commuter's own row is ever bound to them; this shows who else the same payment covered.
- **`feedback`:** the commuter's Feedback for this ride's shift, or `null`.
- **`feedback_exists`:** boolean.
- **`can_leave_feedback`:** `true` when there is no feedback yet, the ride is `PAID` by CASH, GCASH or VOUCHER, it has a `shift_id`, and it has no reconciliation flag.

Useful transaction fields:

| Group | Fields |
|---|---|
| Identity | `transaction_id`, `shift_id` |
| Payment | `payment_method`, `status`, `final_amount`, `gross_amount`, `base_fare`, `discount_amount`, `total_passengers` |
| Trip | `pickup_name`, `dropoff_name`, `passenger_role` |
| Crew | `conductor_name`, `driver_name`, `unit_number` |
| Times | `paid_at`, `created_at` |
| Grouping and vouchers | `group_id`, `voucher_id` |
| Reconciliation | `payment_reconciliation_status`. `REFUND_REQUIRED` means PayMongo reported a payment after it was cancelled locally (see [webhook](#post-paymentswebhook)). |

Money fields are strings with two decimals (`"28.50"`).

If the account has no commuter profile, the endpoint returns `data: []`.

---

## Shared payment endpoints

These are open to any signed-in role, but the server allows only:

- the **conductor whose shift owns the transaction**, or
- the **commuter bound to it** (`passenger_id`).

Anyone else gets `403 "Forbidden"`.

### GET /payments/{id}/status

The polling fallback for both sides of a GCash payment. The conductor's QR screen and the commuter's `/gcash/return` page poll it about every 3 s. The realtime event `PaymentStatusUpdated` on the public channel `payments.{transaction_id}` usually arrives first.

- **Limiter:** conductor-read (60/min)
- **Path:** `id` is the `transaction_id`

**What happens on each call**

1. A stale `PENDING` GCash row is expired.
2. **Provider reconciliation.** If the row is `PENDING` (or `EXPIRED` inside the 60 s grace), has a `payment_reference`, and the gateway is configured, the server asks PayMongo directly. This happens at most once per throttle window per transaction, and is shared across concurrent pollers. It covers a webhook that is late or unreachable (local dev without a tunnel, a network blip). Provider errors are logged, never returned to the client.

**200 OK**

```json
{
  "data": {
    "status": "PAID",
    "paid_at": "2026-10-01T08:15:40+08:00",
    "payer_name": "Juan Dela Cruz",
    "payer_id": "9c1e…",
    "total_passengers": 1,
    "gross_amount": "28.50",
    "discount_amount": "5.70",
    "final_amount": "22.80",
    "group_id": null,
    "receipts": [ { "transaction_id": "TXN-…", "status": "PAID" } ]
  },
  "message": "Transaction status retrieved"
}
```

| Field | Notes |
|---|---|
| `receipts` | Every row in the group ordered by position, or `[thisTransaction]` for a solo ride. These are full Transaction models. |

**When to stop polling**

| Status | Action |
|---|---|
| `PAID`, `FAILED`, `CANCELLED`, `REFUNDED` | Stop |
| `EXPIRED` | Keep polling for the 60 s grace window, in case a late webhook settles it |

**Errors** (shape A): `404 "Transaction not found"`, `403 "Forbidden"`

### POST /payments/{id}/cancel

Aborts a `PENDING` GCash payment, for example when the commuter never scanned or changed their mind.

- **Limiter:** conductor-write (30/min)
- **Body:** none
- **Who may call:** the shift's conductor or the bound commuter

**What happens**

- **The PayMongo intent is cancelled first,** when the row has one.
- **If PayMongo reports the money already moved, the payment is not cancelled.** The real status wins, and the endpoint returns `409`.
- **On success, every row in the group becomes `CANCELLED`.** Their `qr_token` and `checkout_url` are cleared, `PaymentStatusUpdated` is broadcast, and any voucher applied to the ride is returned to the commuter.

**200 OK:** `data: { "status": "CANCELLED" }`, `message: "Payment cancelled"`

**Errors** (shape A)

| Status | When |
|---|---|
| 404 / 403 | Not found / not yours |
| 422 | `Only GCash transactions can be cancelled.` |
| 422 | `Cannot cancel a PAID payment. Only PENDING payments can be cancelled.` |
| 409 | `Payment was not cancelled because its current status is PAID.` (settled during the cancel) |
| 502 | `Unable to cancel the provider payment. Please try again.` |

### POST /payments/{id}/simulate (DEV ONLY)

Drives a GCash payment to `PAID` or `FAILED` **through the real webhook code path**: state machine, rewards and broadcast. Use it to demo or test GCash without PayMongo keys.

- **Enabled only when** `payments.allow_simulation` is true (`PAYMENT_ALLOW_SIMULATION`, which defaults to `APP_DEBUG`)
- **Limiter:** conductor-write (30/min)

**Body:** `status`, required, `PAID` or `FAILED`

**200 OK:** `data: { "status": "PAID" }`

**Errors:** `403 "Payment simulation is disabled."`, `404`, `403`, `422 "Only GCash transactions can be simulated."`

### POST /payments/webhook

A server-to-server call from PayMongo. It is **public**, has **no rate limit** and uses **no envelope**. Authenticity comes from the signature.

**Signature check.** The `Paymongo-Signature` header has the form `t=<ts>,te=<testSig>,li=<liveSig>`. The server computes `HMAC-SHA256(t + "." + rawBody, PAYMONGO_WEBHOOK_SECRET)` and compares it with `te` in sandbox or `li` in live mode.

**Events handled**

| PayMongo event | Becomes |
|---|---|
| `payment.paid` | `PAID` |
| `payment.failed` | `FAILED` |
| `payment.refunded`, `refund.updated` | `REFUNDED` |
| anything else | Acknowledged and ignored |

**Processing**

- **Each event is applied exactly once.** It is recorded in `payment_events` by provider event ID, so a replayed event is a no-op.
- **The transaction is matched** by `payment_reference` (the PayMongo payment-intent ID), with `metadata.transaction_id` as a fallback.
- **Transitions go through `PaymentStatus::canTransitionTo()`.** A disallowed transition (e.g. `FAILED` after `PAID`) is logged and skipped.
- **On `PAID`:** rewards are issued for bound, reward-eligible rows, and an ended shift's remittance totals are refreshed.
- **`PAID` after a local `CANCELLED`:** the rows are kept `PAID` for accurate accounting, but flagged `payment_reconciliation_status = REFUND_REQUIRED` and excluded from rewards. A later `REFUNDED` event marks them `REFUNDED`.
- **On any change,** `PaymentStatusUpdated` is broadcast.

**Responses**

| Status | Body | Meaning |
|---|---|---|
| 200 | `{"received": true}` | Processed, or no matching transaction (logged) |
| 200 | `{"received": true, "handled": false}` | Unknown or malformed event type |
| 400 | `{"error": "Invalid signature"}` | Missing or bad signature |
| 500 | `{"error": "Webhook not configured"}` | `PAYMONGO_WEBHOOK_SECRET` is unset |
| 503 | `{"error": "Temporary payment processing failure"}` | Database error. PayMongo will retry. |

---

## Unit QR (feedback)

These QR routes are **not** the GCash QR. They identify a **jeepney** so the commuter can rate today's crew.

There are two kinds of unit QR:

| Kind | What the QR contains | Endpoint | Status |
|---|---|---|---|
| **Permanent** (printed in the jeepney) | JSON: `{"chatco":"unit-qr","v":1,"vehicleId":"…","unitNumber":"U-07","plateNumber":"ABC 1234"}`. The app parses it (`parseUnitQr` in `frontend/lib/commuter/services/qr-feedback.service.ts`) and sends `vehicleId`. | `POST /qr/scan-public` | **Used by the current app** |
| **Signed** (admin-issued) | `base64url(JSON payload) + "." + hex HMAC-SHA256`, expires after 7 days | `POST /qr/generate`, `/qr/validate`, `/qr/scan` | Older flow. Routes and proxies still exist. |

**Which crew is returned.** Both scan endpoints resolve the crew from **today's latest shift** for that vehicle, active or already ended. That way a commuter can still rate the crew after the conductor remits. The returned `shift_id` is what `POST /commuter/feedback` needs ([commuter.md](commuter.md#feedback)).

### POST /qr/scan-public (COMMUTER)

- **Limiter:** commuter-write (20/min). Also available at `/mobile/commuter/qr/scan-public`.
- **Body:** `vehicle_id`, required, must exist in `vehicles`

**200 OK**

```json
{
  "data": {
    "shift_id": "SH-…",
    "vehicle_id": "c3d4…",
    "unit_number": "U-07",
    "plate_number": "ABC 1234",
    "driver_id": "…",
    "driver_name": "Jose Cruz",
    "conductor_id": "…",
    "conductor_name": "Pedro Reyes"
  },
  "message": "Crew resolved"
}
```

**Errors:** `404 "No active crew for this unit today"`, `422` validation

### POST /qr/generate (ADMIN)

Issues a signed unit QR. Nothing is stored; the token carries its own signature and expiry.

- **Limiter:** admin-write (30/min)
- **Body:** `vehicle_id` (required, must exist)

**201 Created**

```json
{
  "data": {
    "token": "eyJ2IjoxLCJ2ZWhpY2xlX2lkIjoi….3f9a…",
    "payload": {
      "v": 1,
      "vehicle_id": "c3d4…",
      "issued_at": "2026-10-01T08:00:00+08:00",
      "expires_at": "2026-10-08T08:00:00+08:00"
    },
    "signature": "3f9a…",
    "expires_at": "2026-10-08T08:00:00+08:00"
  },
  "message": "QR token issued"
}
```

The secret is `QR_FEEDBACK_SECRET`. If it is unset, the app key is used, which is acceptable in dev only.

### POST /qr/validate (COMMUTER)

Checks a signed token's signature and expiry without looking up the crew.

- **Limiter:** commuter-write (20/min)
- **Body:** `token`, required

**200 OK:** `data: { "valid": true, "vehicle_id", "issued_at", "expires_at" }`

**Errors:** `422` with message `Malformed token`, `Malformed payload`, `Invalid signature`, `Invalid payload` or `Token expired`

### POST /qr/scan (COMMUTER)

Validates a signed token **and** resolves the crew.

- **Limiter:** commuter-write (20/min)
- **Body:** `token`, required

**200 OK:** the same shape as [scan-public](#post-qrscan-public-commuter)

**Errors:** `422` for the token errors above, `404 "No active crew for this unit today"`

---

## Known quirks

1. **Transaction rows are returned unfiltered.** The `Transaction` model has no `$hidden`, so `GET /commuter/payments` and the `receipts` in `GET /payments/{id}/status` include internal columns: `qr_token`, `idempotency_key`, `source_device_id`, `payment_metadata`, `payment_checkout_url`, and so on.
   - A commuter only ever sees their own row's token, and sibling group rows have no token. So nothing belonging to another user leaks today.
   - Still, `qr_token` on a `PAID` cash row is a bearer token for receipt claims. These fields should not be relied on by clients and are candidates for hiding.
2. **The cancel comment and code disagree.** A comment in `PaymentController::cancel` says only the conductor may cancel, but the ownership check also lets the **bound commuter** cancel. The code's behaviour is what this doc describes.
3. **`PAYMENT_ALLOW_SIMULATION=true` is the value in `.env.example`.** Anyone copying it to a production `.env` exposes `/payments/{id}/simulate`, which lets a transaction's own conductor or commuter mark it `PAID` without paying. Set it to `false` in production.
