# Admin: Content & Configuration API

The generic settings store (fare/financial rules, operations rules, safety notifications, app configuration, receipt layout), vouchers, remittance options, FAQs, announcement CRUD, and Lost & Found management.

People, fleet and operations are in [admin-people.md](admin-people.md), [admin-fleet.md](admin-fleet.md) and [admin-operations.md](admin-operations.md). The commuter/conductor-facing read side of announcements and Lost & Found — the parts this doc deliberately doesn't repeat — are in [announcements.md](announcements.md) and [lost-found.md](lost-found.md).

All paths are relative to `/api/v1`. Conventions are in [README.md](README.md). **Every route here requires role `ADMIN`** (`auth:sanctum` + `role:ADMIN`).

## Contents

- [Settings](#settings)
  - [GET /admin/settings](#get-adminsettings)
  - [PUT /admin/settings/{key}](#put-adminsettingskey)
  - [Category → key map](#category--key-map)
- [Vouchers](#vouchers)
  - [GET /admin/vouchers](#get-adminvouchers)
  - [POST /admin/vouchers](#post-adminvouchers)
  - [DELETE /admin/vouchers/{id}](#delete-adminvouchersid)
- [Remittance options](#remittance-options)
- [FAQs](#faqs)
- [Announcements](#announcements)
  - [GET /admin/announcements](#get-adminannouncements)
  - [POST /admin/announcements](#post-adminannouncements)
  - [GET /admin/announcements/{id}](#get-adminannouncementsid)
  - [PUT/PATCH /admin/announcements/{id}](#putpatch-adminannouncementsid)
  - [PATCH /admin/announcements/{id}/archive](#patch-adminannouncementsidarchive)
- [Lost & Found management](#lost--found-management)
  - [The item/claim lifecycle, from the admin side](#the-itemclaim-lifecycle-from-the-admin-side)
  - [GET /admin/lost-items](#get-adminlost-items)
  - [POST /admin/lost-items](#post-adminlost-items)
  - [GET /admin/lost-items/{itemId}](#get-adminlost-itemsitemid)
  - [PATCH /admin/lost-items/{itemId}](#patch-adminlost-itemsitemid)
  - [Photos](#photos)
  - [PATCH /admin/lost-items/{itemId}/reactivate](#patch-adminlost-itemsitemidreactivate)
  - [Claims](#claims)
  - [PATCH /admin/lost-items/{itemId}/close](#patch-adminlost-itemsitemidclose)
- [Known quirks](#known-quirks)

---

## Settings

One generic key-value store (`settings` table: `key`, `value`, `category`, `updated_by`) backs five admin pages. There is no per-key schema in the database — validation and the category a key is filed under both live in `AdminSettingController`, and a handful of keys are read by other services entirely by convention (string key, no foreign-key-style enforcement that the key "exists").

### GET /admin/settings

- **Limiter:** conductor-read (60/min)

**Query:** `category` — defaults to `general` (not "all categories"; omitting it does **not** return every setting).

**200 OK:** a flat key-value object (`Setting::where('category', $category)->pluck('value', 'key')`) — every value comes back as a **string**, including booleans (`"true"`/`"false"`) and integers, since the column itself is a string. `{}` if the category has no saved rows yet (a page showing its hardcoded frontend defaults until the first save).

### PUT /admin/settings/{key}

Creates or updates one key. There's no `POST` — the first save of a brand-new key is still a `PUT`.

- **Limiter:** conductor-write (30/min)

**Body (JSON):** `value` (required unless the key has no specific rule — see below), `category` (nullable, max 50 — defaults to `general` if omitted, so **sending the wrong category silently files the key somewhere `GET /admin/settings?category=...` won't find it later**).

**`value` validation is keyed off the setting name itself** — most keys accept any nullable string; five get stricter numeric rules:

| Key | Rule |
|---|---|
| `rides_for_free_reward` | integer, 1–100 |
| `speed_limit_kmh` | integer, 10–120 |
| `max_shift_hours` | integer, 1–48 |
| `remittance_grace_minutes` | integer, 1–1440 |
| `remittance_reminder_interval_minutes` | integer, 5–10080 |

**Two keys trigger extra side effects on save:**

- **`rides_for_free_reward`** — writes inside a locked transaction and **bumps `reward_rule_version`** only when the value actually changed (not on every save of the same number). This is deliberately **non-retroactive**: a voucher or an in-progress ride-count tied to an earlier version keeps being evaluated against the threshold that was active when it started, so lowering the threshold never retroactively grants (or revokes) a reward for rides already in progress. Also clears the 5-minute `settings.reward_rule` cache.
- **`speed_limit_kmh`** — clears the `overspeed.limit_kmh` cache key, so the new limit takes effect on the very next GPS ping rather than waiting out the normal cache TTL (see [conductor.md](conductor.md#post-conductorlocation), which documents the up-to-60-second propagation delay when the cache *isn't* explicitly busted).

**200 OK:** `{key, value, category}`, `message: "Setting updated successfully"`. Logged as `SETTINGS` ("Updated setting {key} to {value}" — the raw value is written straight into the audit description, so a long template save shows up truncated at 500 characters, see [admin-operations.md](admin-operations.md#activity-logs-audit-trail)).

### Category → key map

This is the actual read/write wiring across the codebase — which admin settings page writes which key, under which category, and what (if anything) reads it back. Keys with no "Read by" entry are **saved by the admin UI but never read anywhere in the backend** — see [Known quirks](#known-quirks).

**`category=financial`** (Financial Rules page)

| Key | Read by |
|---|---|
| `rides_for_free_reward` | `Setting::ridesForFreeReward()` — the free-ride voucher cycle length ([commuter.md](commuter.md#get-commuterrewards)) |
| `regular_discount`, `student_discount`, `senior_discount`, `pwd_discount` | *(none — see Known quirks)* |

**`category=operations`** (Operations Rules page)

| Key | Read by |
|---|---|
| `speed_limit_kmh` | `LocationService` — overspeed detection threshold ([conductor.md](conductor.md#post-conductorlocation)); cached 60s |
| `max_shift_hours` | `shifts:auto-end-stale` console command — force-closes shifts older than this ([README](README.md#scheduled-jobs-that-change-api-state)) |
| `remittance_grace_minutes` | `ShiftCloseoutService` — sets a new `PENDING` remittance's `remittance_due_at` ([conductor.md](conductor.md#post-conductorremittances)) |
| `remittance_reminder_interval_minutes` | `remittances:send-reminders` console command |

**`category=safety`** (Safety Notifications page)

| Key | Read by |
|---|---|
| `emergency_hotline` | `Conductor\SosController` — returned alongside a conductor's own SOS alert ([conductor.md](conductor.md#sos)) |
| `admin_sos_email` | `SosService` — where the SOS admin-notification email is sent |
| `sos_admin_template` | `SosService` — the admin SOS email's body |
| `account_approved_template` | `AdminService::sendApprovalEmail` — see [the approve endpoint](admin-people.md#post-adminregistrationsidapprove); supports `{name}`/`{commuterName}` and `{commuter_type}`/`{commuterType}` placeholders |
| `account_rejected_template` | `AdminService::sendRejectionEmail` — see [the reject endpoint](admin-people.md#post-adminregistrationsidreject); supports `{name}`/`{commuterName}`, `{reason}`/`{rejectionReason}`, `{next_steps}`/`{nextSteps}` |
| `sender_gmail`, `ride_receipt_template` | *(none — see Known quirks)* |

**`category=app`** (App Configuration page)

| Key | Read by |
|---|---|
| `maintenance_mode` | `BlockDuringMaintenance` middleware (blocks `POST /conductor/shifts/start` with `503`) **and** `SystemStatusController` ([public.md](public.md)) |
| `maintenance_message` | `SystemStatusController` |
| `require_id_upload` | `Setting::requiresIdUpload()` — whether a `REGULAR` applicant must upload an ID at sign-up; `STUDENT`/`SENIOR`/`PWD` always need one regardless of this toggle |
| `require_phone_verification` | *(none — see Known quirks)* |

**`category=receipt`** (Receipt page)

| Key | Read by |
|---|---|
| `receipt_business_name`, `receipt_address_line`, `receipt_footer_note`, `receipt_paper_width`, `receipt_auto_print`, `receipt_show_datetime`, `receipt_show_transaction_id`, `receipt_show_route`, `receipt_show_unit`, `receipt_show_conductor`, `receipt_show_passenger`, `receipt_show_fare_breakdown` | `GET /conductor/receipt-settings` ([conductor.md](conductor.md#get-conductorreceipt-settings)) — each merged over a hardcoded default, so an unsaved key still serves a sane value |

**Read by the fare engine, but with no admin page exposing them at all — only reachable via a direct `PUT /admin/settings/{key}` call:**

| Key | Read by |
|---|---|
| `base_fare_regular` | `FareCalculationService`, `FareMatrixController` — the regular-fare floor (code default ₱15) |
| `base_fare_discounted` | `FareCalculationService`, `FareMatrixController`, `TransactionService` (voucher-fare minimum) — the discounted-fare floor (code default ₱12) |

---

## Vouchers

A `Voucher` is either admin-generated (this section) or system-issued as a free-ride reward ([commuter.md](commuter.md#get-commuterrewards)) — both share the same table and the same redemption path ([conductor.md](conductor.md#voucher-fare-a-free-ride)).

### GET /admin/vouchers

- **Limiter:** conductor-read (60/min)

**Query:** `per_page` (default 20, clamped 1–100).

**200 OK:** a Laravel paginator, newest first, raw `Voucher` models.

### POST /admin/vouchers

Generates one or more fresh voucher codes.

- **Limiter:** conductor-write (30/min)
- **Request:** `StoreVoucherRequest`

**Body (JSON)**

| Field | Rules |
|---|---|
| `type` | Required: `FREE_RIDE` or `DISCOUNT` |
| `amount` | Nullable numeric ≥ 0 |
| `quantity` | Nullable integer, 1–100 — defaults to 1 |
| `expires_at` | Nullable date, must be after now |
| `ride_origin` | Nullable, max 100 — defaults to `"Any"` |

Each code is `CHATCO-{3 random letters}-{6 random letters}`. **201 Created:** an array of the created Voucher rows, `message: "{quantity} voucher(s) generated"`. Logged as `VOUCHER`.

**These vouchers are created with `status: "Active"` — not `"AVAILABLE"`.** See [Known quirks](#known-quirks) for what that actually does to redemption.

### DELETE /admin/vouchers/{id}

- **Limiter:** conductor-write (30/min)

**200 OK:** `data: null`, `message: "Voucher deleted successfully"`. Logged as `VOUCHER`. `404` (shape B, `findOrFail`) for an unknown ID.

---

## Remittance options

A short admin-maintained picklist (`RemittanceOption`: `option_name`, `is_active`) — not itself part of the remittance *workflow* (see [admin-operations.md](admin-operations.md#finance)); this is pure reference-data CRUD, presumably for a dropdown elsewhere in the admin UI.

| Route | Body | Notes |
|---|---|---|
| `GET /admin/remittance-options` | — | All rows, ordered by `option_name` |
| `POST /admin/remittance-options` | `option_name` (required, max 100) | 201. Logged as `REMITTANCE_OPTION` |
| `PUT /admin/remittance-options/{id}` | `option_name` (sometimes, max 100), `is_active` (nullable boolean) | Logged as `REMITTANCE_OPTION` |
| `DELETE /admin/remittance-options/{id}` | — | Logged as `REMITTANCE_OPTION` |

All four: **Limiter:** conductor-read (GET) / conductor-write (others). `404` (shape B) on an unknown ID for update/delete.

---

## FAQs

Powers the public landing-page FAQ chat ([public.md](public.md)). `category` is constrained to a fixed, code-defined list (`FaqItem::CATEGORIES`) that the frontend maps to a label + emoji — there's no admin-defined category management, just these five:

```
getting-started, payments, riding, safety, rewards
```

| Route | Body | Notes |
|---|---|---|
| `GET /admin/faqs` | — | Every FAQ (active and inactive), ordered by `category` then `display_order` |
| `POST /admin/faqs` | `question` (required, max 500), `answer` (required), `category` (required, one of the five above), `display_order` (nullable integer ≥ 0 — defaults to `max(display_order) + 1`, i.e. appended last) | 201. Logged as `FAQ` |
| `PUT /admin/faqs/{id}` | Same fields, all `sometimes`, plus `is_active` (nullable boolean) | Logged as `FAQ` |
| `DELETE /admin/faqs/{id}` | — | Logged as `FAQ` |

All: **Limiter:** conductor-read (GET) / conductor-write (others). The public-facing `GET /faqs` ([public.md](public.md)) presumably filters to `is_active` — this admin listing deliberately does not, so a disabled FAQ stays visible here for the admin to re-enable.

---

## Announcements

Admin CRUD for the broadcast half of the announcement feed every signed-in role reads at `GET /announcements` ([announcements.md](announcements.md)) — this doc covers creation/editing/archiving only; the read side, the realtime broadcast, and the system-generated (targeted, non-admin) announcement types are fully documented there.

### GET /admin/announcements

Includes `ARCHIVED` rows — unlike the user-facing feed, which only ever shows `ACTIVE`.

- **Limiter:** conductor-read (60/min)

**Query:** `status` (`ACTIVE`/`ARCHIVED`), `type`, `search` (title or message), `date` (exact day, wins over `date_range`), `date_range` (`today`/`last_7_days`/`this_month` — note this is yet another date-range vocabulary, see [admin-operations.md](admin-operations.md#known-quirks)), `per_page` (default 15), `count_only` (`1`: `{total}` from a count-only query, for header totals without paying for a row fetch + `creator` eager-load).

**200 OK:** a Laravel paginator with `creator` loaded.

### POST /admin/announcements

- **Limiter:** admin-write (30/min)
- **Request:** `StoreAnnouncementRequest`

**Body (JSON):** `title` (required, max 200), `message` (required, max 5000), `type` (nullable, max 20 — free text, same as the system-generated types in [announcements.md](announcements.md#system-generated-types)), `status` (nullable, `ACTIVE`/`ARCHIVED` — defaults to `ACTIVE`).

**Broadcasting only fires for a straight-`ACTIVE` create.** An admin creating one pre-archived (`status: "ARCHIVED"` in the body) skips the `AnnouncementCreated` Pusher event entirely — nobody's live feed should flash something that's already hidden. **201 Created:** the Announcement. Logged as `ANNOUNCEMENT`.

### GET /admin/announcements/{id}

**404** `"Announcement not found"` (shape B, caught as a `\RuntimeException` and mapped to 404 in the controller — not Laravel's default `findOrFail` shape, but reads the same).

- **Limiter:** conductor-read (60/min)

### PUT/PATCH /admin/announcements/{id}

- **Limiter:** admin-write (30/min)
- **Request:** `UpdateAnnouncementRequest` — all fields `sometimes`, including `status` (so a one-shot edit can also archive/unarchive, though [archive](#patch-adminannouncementsidarchive) is the normal path for that and is the only one that stamps `archived_at`)

**This does not re-trigger the realtime broadcast** — only `create()` does. Editing a live announcement's text updates what the next poll of `GET /announcements` returns, but existing viewers don't get pushed the change.

### PATCH /admin/announcements/{id}/archive

Idempotent — archiving an already-`ARCHIVED` row is a no-op that **keeps the original `archived_at`**, so the 30-day prune clock isn't accidentally restarted by a second archive call ([announcements.md](announcements.md#archiving-and-retention)).

- **Limiter:** admin-write (30/min)

**200 OK:** the Announcement, `message: "Announcement archived"`. Logged as `ANNOUNCEMENT`.

---

## Lost & Found management

The admin side of the flow documented from the browse/claim/watchlist angle in [lost-found.md](lost-found.md). **Admins are the only ones who report items** — there is no commuter-facing "report a lost item" endpoint in the current scope; a commuter finds an admin-reported item and claims it.

### The item/claim lifecycle, from the admin side

```
POST /lost-items ──► AVAILABLE
                        │ (a commuter — or POST .../claims/manual — files a claim)
                        ▼
                     CLAIMED ──(approve)──► APPROVED ──(release)──► CLOSED
                        │                        │
                        └───(reject all)─────────┘  (reverts to AVAILABLE/CLAIMED)

                     AVAILABLE, unclaimed 30 days ──► EXPIRED ──(reactivate)──► AVAILABLE
```

Full status-transition detail (including the 3-rejection-per-commuter cap and why `RELEASED` never actually appears as an item status) is in [lost-found.md](lost-found.md#the-item-and-claim-lifecycle) — this section only adds the admin-only actions: create, edit, photos, manual claims, and the three review decisions.

### GET /admin/lost-items

Unlike the commuter/conductor browse ([lost-found.md](lost-found.md#get-lost-found)), this returns **every** status and the full claim/claimant detail — the privacy restriction that hides `claims`/`releasedTo` on the public item-detail endpoint doesn't apply to the admin-only list.

- **Limiter:** conductor-read (60/min)

**Query**

| Param | Rules |
|---|---|
| `status` | Exact match, one status |
| `statuses[]` | Repeated param, matches **any** of several statuses at once — e.g. `?statuses[]=RELEASED&statuses[]=CLOSED` powers the admin History tab without a dedicated endpoint (note `RELEASED` here is harmless-but-dead, since no item is ever actually in that status — see [Known quirks](#known-quirks)) |
| `category` | Exact match (free text — no fixed category list for Lost & Found, unlike FAQs) |
| `search` | Item name/description/plate/driver/conductor name |
| `date` | Exact day on `created_at` |
| `per_page` | Default 15, clamped 1–50 |

**200 OK:** a Laravel paginator with `vehicle`, `photos`, `claims.claimant`, `claims.reviewer`, `claims.photos` (the claimant's proof-of-ownership photos), `releasedTo`, `closedBy` all loaded.

### POST /admin/lost-items

- **Limiter:** admin-write (30/min)
- **Request:** `StoreLostItemRequest`

**Body (JSON)**

| Field | Rules |
|---|---|
| `item_name` | Required, max 200 |
| `description` | Required, max 2000 |
| `image_url` | Nullable, max 500 — a direct URL; for a file upload use [Photos](#photos) after creating |
| `plate_number`, `driver_name`, `conductor_name` | Nullable, max 20/100/100 — free text, not cross-checked against real fleet records |
| `vehicle_id` | Nullable UUID, must exist |
| `estimated_time_lost` | Nullable, max 100 — free text, not a validated timestamp |
| `category` | Nullable, max 20 — free text (no fixed enum, unlike FAQs) |

Starts `AVAILABLE`, stamped with `reported_by_id`/`reported_by_role`/`reporter_name` (the acting admin). **201 Created:** the LostItem, `message: "Lost item created"`. Logged as `LOST_FOUND`.

### GET /admin/lost-items/{itemId}

Same detail shape as one list row (minus pagination). **404** `"Item not found"` (shape A — `LostFoundException`, mapped via the substring-match convention in [lost-found.md](lost-found.md#error-mapping)).

- **Limiter:** conductor-read (60/min)

### PATCH /admin/lost-items/{itemId}

Edits descriptive fields only — never touches status, claims, or photos.

- **Limiter:** admin-write (30/min)
- **Request:** `UpdateLostItemRequest` — same shape as create minus `image_url`, but **every field is required** (not `sometimes`) despite this being a `PATCH`: the form resubmits the full descriptive block each time.

**422** `"Cannot edit a closed item"` once the item reaches `CLOSED` — a finalized historical record is immutable from this point on. Logged as `LOST_FOUND`.

### Photos

Up to **3 photos per item**, position 0 mirrored onto `lost_items.image_url` for every existing single-image read site.

**POST /admin/lost-items/{itemId}/photos** — multipart, `image` (required, jpg/jpeg/png/webp, max 5 MB). **422** `"This item already has the maximum of 3 photos"` at the cap. Appended at the next open position.

**DELETE /admin/lost-items/{itemId}/photos/{photoId}** — deletes the file and the row, then **re-compacts** the remaining photos to contiguous positions `0..n-1` and re-syncs `image_url` to whatever now sits at position 0 (`null` if the item has no photos left). Both: **Limiter:** admin-write (30/min). Logged as `LOST_FOUND` only on the add, not the delete.

### PATCH /admin/lost-items/{itemId}/reactivate

Brings an auto-`EXPIRED` item back to `AVAILABLE` — this is the **only** way an expired item becomes claimable again (`lost-items:expire` only ever moves items into `EXPIRED`, never out).

- **Limiter:** admin-write (30/min)

Resets `available_since` to now, so the reactivated item gets a **fresh** 30-day expiry window — it gets no credit for its original report date ([lost-found.md](lost-found.md#auto-expiry)). Logged as `LOST_FOUND`.

### Claims

**GET /admin/lost-items/{itemId}/claims** — every claim on the item (any status), newest first, with `claimant`/`reviewer`/`photos` loaded (`photos` = the commuter's optional proof-of-ownership images, see [lost-found.md](lost-found.md#post-lost-founditemidclaim)). Conductor-read.

**POST /admin/lost-items/{itemId}/claims/manual** — records a walk-in claimant with no CHATCO account (`claimant_id: null`). Body: `claimant_name` (required, max 100), `claimant_contact` (required without email, max 20), `claimant_email` (required without contact, valid email), `proof` (required, 10–500 chars — stored with `" [Recorded by {admin email}]"` appended, so a manual claim's audit trail is distinguishable from a real self-service one at a glance). Same item-claimability guard as the commuter claim path (`AVAILABLE`/`CLAIMED` only). admin-write.

**PATCH /admin/lost-items/{itemId}/claims/{claimId}/approve** — Stage 1 of 2. Moves this claim to `APPROVED`, the item to `APPROVED` (**not** released yet), and **auto-rejects every other `PENDING` claim on the item** in the same transaction (reason: `"Another claim was approved"`, logged to a `ClaimRejectionAudit` row). Body (`ApproveClaimRequest`): `pickup_location` (max 255), `pickup_at` (date-time, not before today, read in the app timezone), `pickup_reminder` (optional, max 500; blank falls back to `LostItemService::DEFAULT_PICKUP_REMINDER`). `pickup_location` + `pickup_at` are **required for account claimants** (they only learn the schedule through the app) and optional for walk-ins. They are stored on the claim and included in the claimant's `claim_approved` notification. Commuters who saved the item (other than the claimant) get a `saved_item_taken` notice. **422** if the claim isn't `PENDING`, the item is already `CLOSED`, or an account claim has no pickup location/time.

**PATCH /admin/lost-items/{itemId}/claims/{claimId}/release** — Stage 2. Requires the claim to be `APPROVED`. Sets the item straight to `CLOSED` (with `released_to`/`released_at`/`closed_by`/`closed_at`) and the claim to `RELEASED` — see [lost-found.md](lost-found.md#the-item-and-claim-lifecycle) for why there's no literal `RELEASED` *item* status. Notifies the claimant. If the claim isn't released by the end of its pickup day, the daily `lost-items:expire` job auto-rejects it as a no-show (`no_show_at`; see [lost-found.md](lost-found.md#auto-expiry)), after which release returns 422 and the claimant has to claim again. Returns the claim with `item` (its `closed_by_name` is the acting admin), `claimant` and `reviewer`, built from the rows already loaded rather than re-read. **422** if the claim isn't `APPROVED`, or the item is already `CLOSED` (which, per [Known quirks](#known-quirks), it immediately is after this very call succeeds — a second release attempt is always refused).

**PATCH /admin/lost-items/{itemId}/claims/{claimId}/reject** — works on **both** `PENDING` and `APPROVED` claims (the latter is a post-approval reversal, e.g. new information invalidates an already-approved claim). Body: `rejection_reason` (optional, max 1000). The item reverts to `CLAIMED` if other `PENDING` claims remain, or `AVAILABLE` if none do. Reversing an `APPROVED` claim puts the item back on the board, so its other watchers get a `saved_item_back` notice. **422** if the claim is already `REJECTED`, or the item is `RELEASED`/`CLOSED` (a completed handover can't be unwound by rejecting the claim after the fact).

All four review actions: **Limiter:** admin-write (30/min). Logged as `LOST_FOUND`.

### PATCH /admin/lost-items/{itemId}/close

Documented in the controller as closing a `RELEASED` item after handover — **but this is unreachable in the current code**, see [Known quirks](#known-quirks).

- **Limiter:** admin-write (30/min)

**422** `"Only RELEASED items can be closed (current status: {actual})"` — always, since no item ever actually reaches `RELEASED` ([release](#claims) jumps the item straight to `CLOSED` itself).

---

## Known quirks

1. **Admin-generated vouchers are created with `status: "Active"`, but the redemption check requires exactly `"AVAILABLE"`.** `AdminVoucherController::store()` hardcodes `'status' => 'Active'`; `Voucher::STATUS_AVAILABLE` is `'AVAILABLE'`, and `TransactionService` (both the single-fare voucher path and the commuter rewards redemption path) checks `$voucher->status !== Voucher::STATUS_AVAILABLE`. There's no mutator or cast on the column that would normalize the case. **Every voucher created through `POST /admin/vouchers` is therefore permanently unredeemable** — attempting to pay with one returns `409 "This voucher has already been used or is no longer available."` (per [conductor.md](conductor.md#voucher-errors)), indistinguishable from an already-used voucher. Only system-issued reward vouchers (created elsewhere with the correct `STATUS_AVAILABLE` constant) actually work. This is a real, currently-shipping bug — fixing it is a one-line change to `AdminVoucherController::store()`, scoped separately from this documentation pass.

2. **`PATCH /admin/lost-items/{itemId}/close` can never succeed.** `LostItemService::releaseClaim()` sets the item straight to `CLOSED` — it never passes through the `RELEASED` status that `close()` requires as its precondition (`ITEM_RELEASED` is defined as a constant and referenced in three guard checks, but nothing in the service ever assigns it to an item). So the moment a claim is released, the item is already `CLOSED`, and this endpoint's only reachable outcome is its own `422` guard. The frontend likely never calls it for exactly this reason — if a "Close" button exists anywhere in the admin UI expecting this to do something, it's dead.

3. **Several settings are write-only: saved by an admin page, read by nothing.** `regular_discount`, `student_discount`, `senior_discount`, `pwd_discount` (Financial Rules), `require_phone_verification` (App Configuration), and `sender_gmail`, `ride_receipt_template` (Safety Notifications) all round-trip through `PUT`/`GET /admin/settings` with no backend code reading them back anywhere. The actual per-type fare discount comes from each `FarePoint`'s own `discounted_fare` column ([admin-fleet.md](admin-fleet.md#fare-points)), not a global percentage — so changing `student_discount` here has **no effect on any fare a conductor records**. See the [category map](#category--key-map) for the full read/write picture.

4. **`base_fare_regular` and `base_fare_discounted` are live inputs to every fare calculation, but no admin screen exposes them.** They're only reachable via a raw `PUT /admin/settings/{key}` call with the right key name and `category` (anything, since nothing reads them back by category — only by key) — there's no Financial Rules field for either, despite them being exactly the kind of value that page covers.

5. **`GET /admin/lost-items?statuses[]=RELEASED` will always return nothing**, for the same reason `close()` can never succeed (#2 above) — no item is ever actually persisted with `status = 'RELEASED'`. Anyone building an admin filter that includes `RELEASED` as a distinct bucket from `CLOSED` should drop it; they're the same items.

6. **Sending the wrong (or no) `category` on `PUT /admin/settings/{key}` silently files the value where no page will ever read it back**, since `GET /admin/settings` filters by exact category match with no "show me everything" option. There's no validation that a given `key` belongs to a particular `category` — the pairing is convention-only, enforced by each frontend page always sending the same category for its own keys.
