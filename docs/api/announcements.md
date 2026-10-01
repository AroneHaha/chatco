# Announcements API

The notification bell: an admin-published feed plus system-generated, single-recipient notices (Lost & Found claim updates, SOS alerts, shift and remittance events). Every signed-in role reads the same four endpoints.

Admin CRUD (create, update, archive) is `AdminAnnouncementController` under `/admin/announcements/*` (phase 5). This doc links there instead of repeating it.

All paths are relative to `/api/v1`. Conventions are in [README.md](README.md). Every route requires `auth:sanctum` only — **any** role.

> **IDs.** `Announcement.id` is a UUID. `AnnouncementRead` has no own ID — its primary key is the pair `(announcement_id, user_id)`.

## Contents

- [Broadcast vs targeted](#broadcast-vs-targeted)
- [System-generated types](#system-generated-types)
- [GET /announcements](#get-announcements)
- [GET /announcements/unread-count](#get-announcementsunread-count)
- [POST /announcements/mark-all-read](#post-announcementsmark-all-read)
- [POST /announcements/{id}/read](#post-announcementsidread)
- [Realtime](#realtime)
- [Archiving and retention](#archiving-and-retention)
- [Known quirks](#known-quirks)

---

## Broadcast vs targeted

Every row is one `announcements` table, split by `user_id`:

| `user_id` | Visible to | Who creates it |
|---|---|---|
| `NULL` (broadcast) | Every signed-in user | An admin, via `POST /admin/announcements` (phase 5) |
| Set (targeted) | Only that one user | The system, via internal service calls — never through a controller a client can call directly |

A user's feed is broadcasts **plus** rows targeted at them, and nothing else. There is no way to see another user's targeted announcements.

## System-generated types

Targeted announcements are created by `AnnouncementService::notifyUser()` (one recipient) or `notifyAdmins()` (fanned out to every `ADMIN` account, one row per admin — there is no separate "admin inbox" table, it rides the same feed). Known `type` values in the codebase:

| `type` | Recipient | Fired by | When |
|---|---|---|---|
| `claim_approved` | The claimant | `LostItemService::approveClaim` | An admin approves their Lost & Found claim |
| `claim_rejected` | The claimant | `LostItemService::rejectClaim` | An admin rejects their claim (initial or post-approval reversal) |
| `claim_released` | The claimant | `LostItemService::releaseClaim` | An admin marks the item as handed back to them |
| `NEW_REGISTRATION` | Every admin | `AuthService` | A commuter signs up and needs approval |
| `SOS_TRIGGERED` | Every admin | `SosService` | A commuter or conductor sends an SOS alert |
| `SHIFT_STARTED` | Every admin | `ShiftService::startShift` | A conductor starts a shift |
| `OVERSPEED_FLAGGED` | Every admin | `LocationService::recordOverspeedAtomic` | A new overspeed episode starts on a shift ([conductor.md](conductor.md#post-conductorlocation)) |
| `REMITTANCE_COMPLETED` | Every admin | `ShiftCloseoutService` | A shift's remittance reaches `COMPLETE`, `SHORTAGE` or `OVERAGE` |

`type` is a free string (max 20, nullable) — this list is observed from the code, not an enforced enum. An admin-authored broadcast can set any `type` it likes, or leave it `null`.

`reference_id` (nullable) names the record the notification is about — e.g. the pending user's ID for `NEW_REGISTRATION` — so a client can deep-link straight to it instead of only showing the message text.

---

## GET /announcements

The feed: `ACTIVE` announcements visible to the caller, newest first.

- **Limiter:** commuter-read (60/min)
- **Service:** `AnnouncementService::listForUser`

**Query**

| Param | Rules |
|---|---|
| `unread_only` | `1`/`true` to return only unread rows |
| `per_page` | Default 15. **Not clamped.** |
| `page` | |

**200 OK.** A Laravel paginator (README format 1). Each row has a computed `is_read` boolean:

```json
{
  "id": "…",
  "type": "claim_approved",
  "title": "Claim Approved",
  "message": "Your claim on \"Black umbrella\" was approved. Bring a valid ID and the proof you submitted to the terminal office to complete the handover.",
  "status": "ACTIVE",
  "user_id": "9c1e…",
  "reference_id": null,
  "created_at": "2026-10-01T08:15:02+08:00",
  "is_read": false
}
```

`is_read` is computed with a `LEFT JOIN` against `announcement_reads` scoped to the caller, not a model accessor — so pagination stays a single query regardless of page size.

## GET /announcements/unread-count

The bell badge count.

- **Limiter:** commuter-read (60/min)

**Query:** `types` — optional, comma-separated or repeated, e.g. `?types=claim_approved,claim_rejected`. Omitted, it counts every unread `ACTIVE` row visible to the caller. The commuter Lost & Found "Claims" tab badge, for example, passes `claim_approved,claim_rejected,claim_released` so it doesn't count unrelated admin broadcasts.

**200 OK:** `{ "data": { "count": 3 }, "message": "Unread count retrieved" }`

## POST /announcements/mark-all-read

Marks every currently-unread row visible to the caller as read, in one bulk insert (not one upsert per row).

- **Limiter:** commuter-write (20/min)

**Query:** `types` — same optional filter as unread-count. Marking all read for `claim_approved` leaves an unrelated `SHIFT_STARTED` row (for an admin) untouched.

**200 OK:** `{ "data": { "count": 2 }, "message": "Marked as read" }`. `count` is how many rows were newly marked — `0` if nothing was unread.

## POST /announcements/{id}/read

Marks one announcement as read for the caller. Idempotent — reading it again just refreshes `read_at`.

- **Limiter:** commuter-write (20/min)
- **Service:** `AnnouncementService::markRead`

**200 OK**

```json
{ "success": true, "data": null, "message": "Marked as read", "errors": null, "meta": null }
```

The status is **`200`**, not `204` — despite what the controller's own docblock, the route file's comment block, and this project's README status-codes table all currently say. Verified against `AnnouncementController::markRead` and `AnnouncementFlowTest`, which asserts `200`. See [Known quirks](#known-quirks).

**Errors:** `404 "Announcement not found"` (shape A)

---

## Realtime

Only **broadcast, `ACTIVE`** announcements go out live — a targeted (single-recipient) announcement never broadcasts, since it is created for exactly one person and that person's own next poll or page load picks it up.

| Channel | Type | Event | Payload | Fired when |
|---|---|---|---|---|
| `announcements` | public | `AnnouncementCreated` | `id, type, title, message, status, created_at` | `AnnouncementService::create()` saves a broadcast row with `status: "ACTIVE"` |

See [README](README.md#realtime-pusher) for the general Pusher setup. `GET /announcements` and `GET /announcements/unread-count` are the polling fallback — treat the event as a hint to refetch, not as the data itself.

An admin creating an announcement **pre-archived** (`status: "ARCHIVED"` in the create body) does **not** broadcast, since nobody's live feed should show something that is already hidden.

---

## Archiving and retention

- **An admin archives an announcement** (`PATCH /admin/announcements/{id}/archive`, phase 5): `status` becomes `ARCHIVED`, and it drops out of every user's feed, the unread count, and mark-all-read.
- **Archiving is idempotent.** Archiving an already-`ARCHIVED` row is a no-op — `archived_at` keeps its original timestamp rather than restarting the retention clock.
- **`announcements:prune-archived`** runs daily at 02:00 Asia/Manila ([README](README.md#scheduled-jobs-that-change-api-state)): soft-deletes `ARCHIVED` rows whose `archived_at` is more than **30 days** old (`AnnouncementService::ARCHIVE_RETENTION_DAYS`). `Announcement` uses `SoftDeletes`, so pruned rows vanish from every query, including the admin list, but the data survives in the database.

---

## Known quirks

1. **`POST /announcements/{id}/read` returns `200`, not `204`.** The controller's docblock ("Idempotent — returns 204"), the route file's own comment block, and the project README's status-code table all say `204`. The actual response is `200` with a JSON body (`AnnouncementFlowTest` asserts this). The README entry has been corrected to match; the source comments have not.
2. **`markRead` can mark an `ARCHIVED` announcement as read.** Its own comment says "can't read an archived one," but the lookup (`AnnouncementService::show()`) only checks that the row exists — it does not filter by `status`. In practice this rarely matters, since an archived row has already dropped out of the feed and the unread count, so there is usually no `id` to call it with.
3. **`GET /announcements` does not clamp `per_page`.** Unlike most list endpoints in this API, a caller can request an arbitrarily large page.
4. **`types` on `unread-count` / `mark-all-read` accepts a comma-separated string or a repeated query array,** parsed by `AnnouncementController::parseTypes()`. Empty segments are dropped; whitespace is trimmed.
5. **There is no endpoint to list *only* system-generated (targeted) announcements separately from admin broadcasts.** Both arrive in the same `GET /announcements` feed; a client distinguishes them, if it needs to, by `type`.
