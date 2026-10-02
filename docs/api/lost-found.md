# Lost & Found API

Browsing reported items, claiming one, cancelling a claim, and the watchlist. Any signed-in role can browse; claiming and the watchlist are commuter-only.

Admin management — reporting an item, uploading photos, reviewing claims (approve/reject/release), closing, and reactivating an expired item — is `AdminLostItemController` under `/admin/lost-items/*` (phase 5). This doc links there instead of repeating it.

The commuter's own claim and watchlist **lists** (`GET /commuter/claims`, `GET /commuter/watchlist`) are documented in [commuter.md](commuter.md#lost--found-lists), because they live under `/commuter`, not `/lost-found`. This doc covers the lifecycle those lists report on.

All paths are relative to `/api/v1`. Conventions are in [README.md](README.md).

> **IDs.** `LostItem.id` and `Claim.id` are UUIDs. A claim's `claimant_id` is a `commuter_profiles.id`, the same UUID as the claimant's `users.id`.

## Contents

- [The item and claim lifecycle](#the-item-and-claim-lifecycle)
- [GET /lost-found](#get-lost-found)
- [GET /lost-found/{itemId}](#get-lost-founditemid)
- [POST /lost-found/{itemId}/claim](#post-lost-founditemidclaim)
- [DELETE /lost-found/claims/{claimId}](#delete-lost-foundclaimsclaimid)
- [Watchlist](#watchlist)
  - [POST /lost-found/{itemId}/watchlist](#post-lost-founditemidwatchlist)
  - [DELETE /lost-found/{itemId}/watchlist](#delete-lost-founditemidwatchlist)
- [Auto-expiry](#auto-expiry)
- [Error mapping](#error-mapping)
- [Known quirks](#known-quirks)

---

## The item and claim lifecycle

```
Item:  AVAILABLE ──(a claim arrives)──► CLAIMED ──(admin approves one)──► APPROVED ──(admin releases)──► CLOSED
          │                                │                                  │
          │                                └──(all claims rejected/cancelled)─┘ back to AVAILABLE
          └──(30 days, still AVAILABLE)──► EXPIRED ──(admin reactivates)──► AVAILABLE

Claim: PENDING ──(admin approves)──► APPROVED ──(admin releases)──► RELEASED
          │              │
          │              └──(admin reverses the approval)──► REJECTED
          └──(admin rejects, or auto-rejected when another claim is approved)──► REJECTED
          └──(commuter cancels, PENDING only)──► deleted, no REJECTED row
```

- **An item can carry several `PENDING` claims at once.** It becomes `CLAIMED` on the first one. Approving one claim auto-rejects every other `PENDING` claim on that item in the same request.
- **`RELEASED` is set directly on the item as `CLOSED`.** The admin release action (phase 5) sets the item straight to `CLOSED` with `released_to` and `released_at`, and the claim itself to `RELEASED`. There is no item status literally named `RELEASED` — only the claim has one.
- **Rejection is reversible by a new claim, up to a limit.** A commuter whose claim was rejected can submit a new claim on the same item, up to **3** rejected claims per commuter per item (`LostItemService::MAX_REJECTIONS_PER_COMMUTER_ITEM`). The 4th attempt is refused.
- **The claimant is notified** (an [announcement](announcements.md), type `claim_approved` / `claim_rejected` / `claim_released`) on every admin review decision, unless the claim has no `claimant_id` (an admin-recorded walk-in claim). An approved claim carries `pickup_location`, `pickup_at` and `pickup_reminder`: where and when to collect the item, set by the admin at approval and repeated in the `claim_approved` message.
- **Each item reports `claimable_until`.** For an `AVAILABLE` item it's the moment it becomes eligible for auto-expiry (`COALESCE(available_since, created_at)` + 30 days); for every other status it's `null`, because only unclaimed items run that clock.
- **Browsing only ever shows `AVAILABLE` and `CLAIMED` items.** `APPROVED`, `CLOSED` and `EXPIRED` items drop out of the commuter/conductor feed — there is nothing left to do with them. Admins see every status (phase 5).

---

## GET /lost-found

Paginated browse, open to any signed-in role.

- **Limiter:** commuter-read (60/min)
- **Service:** `LostItemService::listItems`

**Query**

| Param | Rules |
|---|---|
| `status` | Optional exact match. Combined with the fixed `AVAILABLE`/`CLAIMED` visibility — `status=APPROVED` returns an empty page, not an error. |
| `category` | Optional exact match. Free text set by the admin when reporting the item (no fixed enum). |
| `date` | `YYYY-MM-DD`. The day the item was **reported** (`created_at`). |
| `range` | Optional. `today`, `week`, `month` or `year`: items reported within a rolling window ending now (`today` = since midnight, `week` = last 7 days, `month` = last 30, `year` = last 365, all in the app timezone). Anything else returns `422 "Invalid time range filter"`. Can be combined with `date`, but the commuter app sends one or the other. |
| `search` | Matches item name, description, plate number, driver name or conductor name |
| `per_page` | Default 15, clamped to 1–50 |
| `page` | |

**200 OK.** A Laravel paginator (README format 1) of LostItem models, each with `vehicle` and `photos` (ordered by `position`, 0 is the thumbnail) loaded:

```json
{
  "id": "…",
  "item_name": "Black umbrella",
  "description": "Left under the seat near the back door",
  "image_url": "https://…/lost-and-found/…/0.jpg",
  "plate_number": "ABC 1234",
  "driver_name": "Jose Cruz",
  "conductor_name": "Pedro Reyes",
  "vehicle_id": "…",
  "category": "Accessories",
  "estimated_time_lost": "2026-09-30T18:40:00+08:00",
  "status": "AVAILABLE",
  "created_at": "2026-09-30T19:05:00+08:00",
  "vehicle": { "id": "…", "unit_number": "U-07", "plate_number": "ABC 1234" },
  "photos": [ { "id": "…", "url": "https://…/0.jpg", "position": 0 } ]
}
```

No claim or claimant data is included here — see [Privacy](#error-mapping) below.

## GET /lost-found/{itemId}

Item detail, any signed-in role.

- **Limiter:** commuter-read (60/min)

**200 OK.** The LostItem with `vehicle`, `photos` and `closedBy` loaded. Available for **every** status, not just `AVAILABLE`/`CLAIMED` — a commuter who claimed an item can still open it after it moves to `APPROVED` or `CLOSED`.

> **Privacy.** This endpoint deliberately never loads `claims` or `releasedTo`. Both relate to `CommuterProfile`, which has no hidden-field list, so loading them here would leak another commuter's contact details, email and claim proof to anyone who can guess or discover the item ID. Only the admin-only paths (`listForAdmin`, `claimsForItem`, phase 5) load claim and claimant detail.

**Errors:** `404 "Item not found"` (shape A)

## POST /lost-found/{itemId}/claim

Submit a claim. **COMMUTER only.**

- **Limiter:** commuter-write (20/min)
- **Request:** `ClaimLostItemRequest` → `LostItemService::claim`

**Body (JSON, or `multipart/form-data` when attaching photos — the web app always sends multipart)**

| Field | Rules |
|---|---|
| `proof` | Required, max 1000. Identifying details only the real owner would know. |
| `claimant_contact` | Optional. `09XXXXXXXXX`. Defaults to the commuter's profile number. |
| `claimant_email` | Optional, email, max 255. Defaults to the commuter's account email, then their profile email. |
| `images[]` | Optional, up to 3 files. Each jpg/jpeg/png/webp, max 5 MB — the same rules as admin item photos. Stored on the public media disk under `lost-and-found/{itemId}/claims/` via `MediaStorageService`, and saved as `claim_photos` rows in the same transaction as the claim. Uploaded files are deleted again if the claim fails to save. |

`claimant_name` is always the commuter's own profile name — never accepted from the body.

**Server checks, in order**

1. The item must be `AVAILABLE` or `CLAIMED`. Anything else (including `EXPIRED`) is not claimable.
2. The caller must have a commuter profile.
3. The commuter must have fewer than 3 `REJECTED` claims on this item.

**201 Created.** The Claim with `item` loaded, `status: "PENDING"`:

```json
{
  "data": {
    "id": "…",
    "item_id": "…",
    "claimant_id": "9c1e…",
    "claimant_name": "Juan Dela Cruz",
    "claimant_contact": "09171234567",
    "claimant_email": "juan@gmail.com",
    "status": "PENDING",
    "proof": "It has a small tear near the handle and my initials on the strap.",
    "reviewed_by_name": null,
    "created_at": "…",
    "item": { "id": "…", "status": "CLAIMED" },
    "photos": [ { "id": "…", "claim_id": "…", "url": "https://…/lost-and-found/…/claims/….jpg", "position": 0 } ]
  },
  "message": "Claim submitted"
}
```

**Side effect.** If the item was `AVAILABLE`, it flips to `CLAIMED` in the same transaction.

**Errors** (shape A, `404` when the message contains "not found", else `422`)

| Status | Message |
|---|---|
| 404 | `Item not found` |
| 422 | `This item is {STATUS} and cannot be claimed` |
| 404 | `Commuter profile not found` |
| 422 | `You have reached the maximum number of rejected claims for this item` |
| 422 | Validation (`proof` required, `claimant_contact` phone format, …) |

## DELETE /lost-found/claims/{claimId}

Withdraw your own `PENDING` claim. **COMMUTER only.**

- **Limiter:** commuter-write (20/min)
- **Service:** `LostItemService::cancelClaim`

This **deletes** the claim row — it is a withdrawal, not a review, so no `REJECTED` record or rejection-limit count is left behind. You can claim the same item again later without it counting against the 3-rejection cap.

**Side effect.** If this was the item's last `PENDING` claim, the item reverts from `CLAIMED` to `AVAILABLE`.

**200 OK:** `data: null`, `message: "Claim cancelled"`

**Errors** (shape A)

| Status | Message |
|---|---|
| 404 | `Commuter profile not found` |
| 404 | `Claim not found` (unknown ID, or it belongs to another commuter — not distinguished, for privacy) |
| 422 | `Only PENDING claims can be cancelled (current: {STATUS})` |

---

## Watchlist

A bookmark list. It does not affect the item or claim lifecycle at all — it exists so a commuter can track an item they think might be theirs before they are ready to claim it. The list itself is read at [`GET /commuter/watchlist`](commuter.md#get-commuterwatchlist).

Watchers are notified (announcement types, `reference_id` = item id) when a saved item changes in a way that matters to them:

| Type | When |
|---|---|
| `saved_item_taken` | Another commuter's claim on it is approved (it leaves the board) |
| `saved_item_back` | That approval is reversed and the item is open for claims again |
| `saved_item_expiring` | It's within 3 days of auto-expiry (`LostItemService::EXPIRY_REMINDER_DAYS`); sent once per availability window by `lost-items:expire` |

### POST /lost-found/{itemId}/watchlist

**COMMUTER only.** Idempotent.

- **Limiter:** commuter-write (20/min)

**Response**

| Status | When | `message` |
|---|---|---|
| 201 | Newly added | `Added to watchlist` |
| 200 | Already on the watchlist | `Already on watchlist` |

A concurrent double-tap is handled at the database level (a unique `(item_id, commuter_id)` constraint): if two requests race, the loser catches the constraint violation and fetches the row the winner just created, instead of erroring.

**Errors** (shape A): `404 "Item not found"`, `404 "Commuter profile not found"`

### DELETE /lost-found/{itemId}/watchlist

**COMMUTER only.** Idempotent — succeeds whether or not the item was being watched.

- **Limiter:** commuter-write (20/min)

**200 OK:** `data: null`, `message: "Removed from watchlist"`. Always `200`, even for an unknown item or a commuter with no profile.

---

## Auto-expiry

`lost-items:expire` runs daily at 01:00 Asia/Manila ([README](README.md#scheduled-jobs-that-change-api-state)):

- **First, closes uncollected approvals.** An `APPROVED` claim whose `pickup_at` day has ended (app timezone) without a release is auto-rejected as a no-show: status `REJECTED`, `rejection_reason` = `LostItemService::NO_SHOW_REASON`, `no_show_at` set, an audit row with `rejected_by: null`. There is no rescheduling. The item goes back to `AVAILABLE` with `available_since` reset (so the same run doesn't expire it), the claimant gets a `claim_rejected` notice titled "Claim Not Completed", and watchers get `saved_item_back`. The claimant claims again online (it counts toward the 3-rejection cap) or as a walk-in at the office. Walk-in approvals without a `pickup_at` are never swept.
- **Then reminds watchers** of `AVAILABLE` items within 3 days of expiring (`saved_item_expiring`). `lost_item_watchlists.expiry_reminded_at` records the send, so each watcher is reminded once per window; a reactivated item gets a fresh one.
- **Archives every `AVAILABLE` item** that has sat unclaimed for **30 days** (`LostItemService::EXPIRY_DAYS`), measured from `available_since` if set, otherwise `created_at`.
- **Never touches an item with any claim history.** `CLAIMED`, `APPROVED` and `CLOSED` items are left alone regardless of age.
- **Not deletion.** The row, its photos, and any past rejected claims stay intact. An admin can reactivate an `EXPIRED` item back to `AVAILABLE` (phase 5), which resets `available_since` to that moment — so a reactivated item gets a fresh 30-day window, not credit for its original report date.
- **An `EXPIRED` item drops out of the commuter browse list** (only `AVAILABLE`/`CLAIMED` show), but `GET /lost-found/{itemId}` still returns it directly if a commuter already has the link, e.g. from a watchlist entry made before it expired. It no longer shows in `GET /commuter/watchlist`, though, since that list also filters to `AVAILABLE`/`CLAIMED`.

---

## Error mapping

Every endpoint here catches `LostFoundException` (`app/Support/LostFound/LostFoundException.php`) and maps it in the controller:

```
str_contains(message, "not found") ? 404 : 422
```

So the HTTP status is decided by **substring-matching the English message**, not by an explicit error code. All of these errors use the envelope (shape A), not the bare-message shape other parts of the API use for business-rule failures.

---

## Known quirks

1. **`DELETE /lost-found/claims/{claimId}` does not distinguish "not found" from "not yours."** Both return `404 "Claim not found"`, by design, so a commuter cannot probe for the existence of another commuter's claim ID.
2. **Status-based error mapping is substring matching on the message text.** A future message that happens to contain "not found" for a non-404 situation would be misrouted to `404`. None currently do.
3. **`lost_items.claimed_by` is a fillable column that is never set or read anywhere in the codebase.** Use `status` and the related `claims` to determine claim state; `claimed_by` is dead.
4. **`category` has no fixed set of values.** It is free text (max 20 characters) set by the admin when reporting the item. There is no admin-defined category list to validate or display against.
5. **`GET /lost-found?status=APPROVED` (or any non-browsable status) returns an empty page, not an error.** The fixed `AVAILABLE`/`CLAIMED` visibility filter runs first and `status` narrows within it.
