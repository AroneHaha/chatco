# Admin: People API

Everyone an admin manages as a person rather than a vehicle: member accounts (commuters/admins), commuter registration review, the combined Fleet "Personnel" view, terminated-personnel records, and the dedicated driver/conductor CRUD (profiles, license images, credentials, shift history).

Vehicles, routes and fare points are in [admin-fleet.md](admin-fleet.md). Dashboard/analytics/monitoring, shifts, remittances, SOS, feedback and the activity-log audit trail are in [admin-operations.md](admin-operations.md). Settings, vouchers, FAQs, announcements and Lost & Found management are in [admin-content.md](admin-content.md).

All paths are relative to `/api/v1`. Conventions are in [README.md](README.md). **Every route here requires role `ADMIN`** (`auth:sanctum` + `role:ADMIN`).

> **IDs.** A conductor's `conductor_profiles.id` is the same UUID as `users.id` (see [conductor.md](conductor.md)). A driver's `drivers.id` is its own UUID — drivers have no `users` row at all, so they never appear in `GET /admin/users`.

## Contents

- [Users](#users)
  - [GET /admin/users](#get-adminusers)
  - [GET /admin/users/{id}](#get-adminusersid)
  - [PUT/PATCH /admin/users/{id}](#putpatch-adminusersid)
  - [DELETE /admin/users/{id}](#delete-adminusersid)
  - [POST /admin/users/{id}/suspend](#post-adminusersidsuspend)
  - [POST /admin/users/{id}/unsuspend](#post-adminusersidunsuspend)
  - [GET /admin/users/{id}/suspensions](#get-adminusersidsuspensions)
  - [GET /admin/users/{id}/activity](#get-adminusersidactivity)
- [Registrations](#registrations)
  - [The rejection cooldown](#the-rejection-cooldown)
  - [GET /admin/registrations](#get-adminregistrations)
  - [GET /admin/registrations/rejected](#get-adminregistrationsrejected)
  - [POST /admin/registrations (onsite)](#post-adminregistrations-onsite)
  - [POST /admin/registrations/{id}/approve](#post-adminregistrationsidapprove)
  - [POST /admin/registrations/{id}/reject](#post-adminregistrationsidreject)
- [Personnel](#personnel)
  - [GET /admin/personnel](#get-adminpersonnel)
  - [GET /admin/terminated-personnel](#get-adminterminated-personnel)
- [Drivers](#drivers)
  - [GET /admin/drivers](#get-admindrivers)
  - [POST /admin/drivers](#post-admindrivers)
  - [GET /admin/drivers/{id}](#get-admindriversid)
  - [PUT/PATCH /admin/drivers/{id}](#putpatch-admindriversid)
  - [DELETE /admin/drivers/{id}](#delete-admindriversid)
  - [License images](#license-images)
  - [GET /admin/drivers/{id}/shift-logs](#get-admindriversidshift-logs)
- [Conductors](#conductors)
  - [GET /admin/conductors](#get-adminconductors)
  - [POST /admin/conductors](#post-adminconductors)
  - [GET /admin/conductors/{id}](#get-adminconductorsid)
  - [PUT/PATCH /admin/conductors/{id}](#putpatch-adminconductorsid)
  - [DELETE /admin/conductors/{id}](#delete-adminconductorsid)
  - [POST /admin/conductors/{id}/disable](#post-adminconductorsiddisable)
  - [POST /admin/conductors/{id}/reset-credentials](#post-adminconductorsidreset-credentials)
  - [GET /admin/conductors/{id}/shift-logs](#get-adminconductorsidshift-logs)
- [Known quirks](#known-quirks)

---

## Users

`GET/PUT/PATCH/DELETE /admin/users*` manage **member accounts** — commuters and other admins. Conductors have accounts too (`role: CONDUCTOR`), so they show up in this list, but their day-to-day lifecycle (disable, reset credentials, remove with a termination record) goes through the dedicated [Conductors](#conductors) endpoints instead — see [Known quirks](#known-quirks) for how the two surfaces overlap and where they diverge.

All five read/write endpoints are thin wrappers over `AdminService`; the shared shaping function is `present()`, which **never serializes a raw model** — every field is picked explicitly, so (unlike the vehicle/conductor endpoints in [Known quirks](#known-quirks)) nothing here ever leaks `conductor_profiles.generated_password`.

### GET /admin/users

- **Limiter:** conductor-read (60/min)
- **Service:** `AdminService::listUsers`

**Query**

| Param | Rules |
|---|---|
| `role` | Exact match: `ADMIN`, `CONDUCTOR`, `COMMUTER` |
| `search` | Matches email, or the admin/conductor/commuter profile's first/last name, or a conductor's `generated_username`, or a commuter's `username` |
| `account_status` | `ACTIVE` or `SUSPENDED` — see the composite rule below |
| `active_only` | `1`/`true`: excludes commuters whose `account_status` is `PENDING` or `REJECTED` |
| `sort` | `recent` (default, `created_at` desc), `oldest`, or `alphabetical` (surname/last_name/email, computed with a `COALESCE` subquery so commuters, conductors and admins sort on one column) |
| `per_page` | Default 15, clamped to 1–100 |
| `page` | |

**The `SUSPENDED` filter is a composite,** because the three roles each block a different way:

| Role | What counts as "SUSPENDED" |
|---|---|
| Commuter | Has an active (`lifted_at IS NULL`) `UserSuspension` row, **or** `commuter_profiles.account_status = 'SUSPENDED'` |
| Conductor | `conductor_profiles.status = 'DISABLED'` (set by [disable](#post-adminconductorsiddisable)) |
| Admin | Has an active `UserSuspension` row (admins can be suspended by another admin — see [Known quirks](#known-quirks)) |

`account_status=ACTIVE` is the exact complement of that.

**200 OK.** A Laravel paginator (README format 1) of shaped rows:

```json
{
  "id": "…",
  "email": "juan@gmail.com",
  "role": "COMMUTER",
  "name": "Juan Dela Cruz",
  "first_name": "Juan",
  "middle_name": null,
  "last_name": "Dela Cruz",
  "account_status": "ACTIVE",
  "commuter_type": "STUDENT",
  "username": "juandc",
  "contact_number": "09171234567",
  "birthdate": "2001-05-14",
  "verified_at": "2026-09-01T02:00:00+00:00",
  "created_at": "2026-08-20T01:00:00+00:00",
  "suspension": null
}
```

- `first_name`/`middle_name`/`last_name` are **commuter fields only** — always `null` for an admin or conductor row (their names aren't surfaced here; use [GET /admin/conductors/{id}](#get-adminconductorsid) or the admin's own profile).
- `account_status` is computed per role: a conductor's is `DISABLED`/`ACTIVE` from their Disable flag (never a suspension); an admin's and commuter's reflect an active suspension first, then the commuter profile's own `account_status`.
- `suspension` is the active `UserSuspension` (see [suspend](#post-adminusersidsuspend)) or `null`. Always `null` for a conductor, even a disabled one — disabling isn't modeled as a suspension row.

### GET /admin/users/{id}

- **Limiter:** conductor-read (60/min)

**200 OK:** the same shaped row as the list. **404** (shape A, `"User not found"`) if the ID doesn't exist — this is a plain envelope error, not a `findOrFail` 404.

### PUT/PATCH /admin/users/{id}

- **Limiter:** conductor-write (30/min)
- **Request:** `UpdateUserRequest` → `AdminService::updateUser`

**Body (JSON), all fields `sometimes`**

| Field | Rules |
|---|---|
| `first_name`, `last_name` | string, max 100 |
| `middle_name` | nullable string, max 100 |
| `account_status` | `ACTIVE` or `SUSPENDED` — **commuter only** |
| `contact_number` | Philippine mobile format — **commuter only** |
| `birthdate` | date, before today — **commuter only** |

`role`, `email` and `password` are **not accepted fields at all** — they're absent from the request's `rules()`, so sending them does nothing, by design (see the class docblock). `last_name` writes to `commuter_profiles.surname` for a commuter and `*.last_name` for an admin/conductor.

**Guards**

| Status | Shape | When |
|---|---|---|
| 404 | A | `"User not found"` |
| 422 | B (`ValidationException`) | The user has no profile row at all |
| 422 | B | `account_status`/`contact_number`/`birthdate` sent for a non-commuter |
| 422 | B | `account_status: SUSPENDED` sent for the caller's own account |

**200 OK:** the updated shaped row, `message: "User updated"`.

### DELETE /admin/users/{id}

Soft-deletes the account. Because `User` uses `SoftDeletes` with no explicit `withTrashed()` on Sanctum's `tokenable` relation, a soft-deleted user's existing tokens stop resolving on their very next request — `auth:sanctum` sees no tokenable user and returns 401, with no separate token-revocation step needed.

- **Limiter:** conductor-write (30/min)
- **Service:** `AdminService::deleteUser`

**Guards, checked in this order**

| Status | Shape | When |
|---|---|---|
| 404 | A | `"User not found"` |
| 422 | B | The target is the **last** `ADMIN` account |
| 422 | B | The target is the **caller's own** account |

Unlike [DELETE /admin/conductors/{id}](#delete-adminconductorsid), this has **no active-shift check and no termination record** — see [Known quirks](#known-quirks).

**200 OK:** `data: null`, `message: "User deleted"`.

### POST /admin/users/{id}/suspend

Blocks a commuter or admin from logging in for a fixed term, or permanently, and immediately kills their live sessions.

- **Limiter:** admin-write (30/min)

**Body (JSON)**

| Field | Rules |
|---|---|
| `reason_code` | Required. One of `POLICY_VIOLATION`, `FRAUD_SUSPECTED`, `SAFETY_CONCERN`, `ABUSIVE_BEHAVIOR`, `PAYMENT_ISSUE`, `OTHER` |
| `reason` | Required, 5–500 characters, free text |
| `is_permanent` | Required boolean |
| `duration_days` | Required unless `is_permanent`. One of `1, 3, 7, 14, 30, 90` |

**What happens, in one transaction:**

1. Any still-open suspension for the user (`lifted_at IS NULL`) is closed out (`lifted_at = now()`, `lifted_by = caller`) — a suspension is never stacked, only replaced.
2. A new `UserSuspension` row is created with `starts_at = now()` and `ends_at` = `now() + duration_days`, or `null` if permanent.
3. **Every Sanctum token for the user is revoked** — an active session is cut immediately, not just blocked on next login.

**Guards:** `404 "User not found"` (shape B, `abort(404, ...)`); `422` self-suspend; `422 "Conductors cannot be suspended. Use Disable Account instead."` — see [disable](#post-adminconductorsiddisable).

**200 OK:** the shaped user row with `suspension` populated, `message: "Account suspended and active sessions revoked."`

### POST /admin/users/{id}/unsuspend

- **Limiter:** admin-write (30/min)

Lifts the active suspension (`lifted_at = now()`) and, if the user is a commuter whose profile is independently `account_status = SUSPENDED` (the two can be set separately — see [Known quirks](#known-quirks)), resets that to `ACTIVE` too.

**Guards:** `404` unknown user (shape B); `422 "A disabled conductor is re-enabled by resetting their credentials in Fleet Management."` for a conductor ID.

**200 OK:** the shaped user row, `message: "Account reactivated."`

### GET /admin/users/{id}/suspensions

Full suspension history for the account, newest `starts_at` first — not just the active one.

- **Limiter:** conductor-read (60/min)

**200 OK:** an array. `404` (shape B, `findOrFail`) if the user doesn't exist at all (including soft-deleted — this doesn't use `withTrashed()`).

```json
[
  {
    "id": "…",
    "reason_code": "POLICY_VIOLATION",
    "reason": "Repeated fare disputes with conductors.",
    "starts_at": "2026-09-20T00:00:00+00:00",
    "ends_at": "2026-09-27T00:00:00+00:00",
    "is_permanent": false,
    "lifted_at": null
  }
]
```

### GET /admin/users/{id}/activity

A best-effort activity timeline built from existing tables — there is no separate `audit_logs` table backing this (that's what [GET /admin/activity-logs](admin-operations.md#get-adminactivity-logs) is, and it's a different thing: an **admin-action** audit trail, not a per-user timeline).

- **Limiter:** conductor-read (60/min)
- **Service:** `AdminService::getUserActivity`

**What it assembles, newest first:**

| Event | Source | Shown for |
|---|---|---|
| `Account Created` | `users.created_at` | Everyone |
| `Account Verified` | `commuter_profiles.verified_at` | Commuters, once approved |
| `Registration Rejected` | `commuter_profiles.rejection_reason` (only if still set and `account_status = REJECTED`) | Commuters |
| `Payment` (up to 10, newest first) | `transactions` where `passenger_id` = the commuter's profile ID | Commuters |
| `Shift Started` / `Shift Ended` (up to 10, newest first) | `shift_logs` where `conductor_id` = the conductor's profile ID | Conductors |

**404** (shape B, `abort(404, 'User not found')`) for an unknown ID. **200 OK:** a plain array (not paginated — capped at ~21 events by construction), each `{id, timestamp, action, details}`.

---

## Registrations

Commuter self-registration lands here `PENDING`. An admin reviews the uploaded valid ID against the requested discount tier (`applied_type`) and approves or rejects it. Admins can also create a `PENDING` account directly for a commuter who registers onsite (e.g. a terminal kiosk).

### The rejection cooldown

`App\Services\RegistrationGuard` stops an applicant from endlessly resubmitting a bad ID. Every rejection is logged against the applicant's **identity** — normalized email **or** contact number, matched with OR so swapping in a new email alone doesn't reset the count.

- **Threshold:** `REGISTRATION_REJECTION_THRESHOLD` env var, default **3**.
- **Cooldown:** `REGISTRATION_COOLDOWN_DAYS` env var, default **3 days**.
- At the threshold-th rejection, `blocked_until = now() + cooldown_days` is stamped on that rejection row, and both self sign-up (`AuthService::register`) and [onsite registration](#post-adminregistrations-onsite) refuse a new attempt from the same identity with a `422` until it elapses.
- A rejected account is **soft-deleted** and its email rewritten to `rejected+{user_id}@chatco.local` (and username to `rejected_{user_id}`) so the real email/username free up for a fresh attempt — the cooldown, not the identifier, is what actually blocks re-registration.

### GET /admin/registrations

Pending queue, oldest first (FIFO review).

- **Limiter:** conductor-read (60/min)
- **Service:** `AdminService::listPendingRegistrations`

**Query:** `search`, `applied_type` (`REGULAR`/`STUDENT`/`SENIOR`/`PWD`), `id` (exact UUID — used by the admin notification bell's `NEW_REGISTRATION` deep link), `per_page` (max 100), `page`.

**200 OK.** A Laravel paginator; each row:

```json
{
  "id": "…",
  "email": "juan@gmail.com",
  "first_name": "Juan",
  "middle_name": null,
  "surname": "Dela Cruz",
  "birthdate": "2001-05-14",
  "gender": "MALE",
  "contact_number": "09171234567",
  "username": "juandc",
  "applied_type": "STUDENT",
  "id_image_url": "https://…(signed, 10 min)…",
  "account_status": "PENDING",
  "language_preference": "English",
  "verified_at": null,
  "rejection_reason": null,
  "rejection_count": 1,
  "rejection_history": [
    { "reason": "Blurry ID photo", "attempt_number": 1, "blocked_until": null, "rejected_at": "2026-08-01T03:00:00+00:00" }
  ],
  "blocked_until": null,
  "created_at": "2026-09-30T10:00:00+00:00"
}
```

`id_image_url` is a 10-minute signed URL when the configured private disk is `r2_private` — re-fetch the list (don't cache this field) if the review screen stays open longer than that. `rejection_history`/`rejection_count`/`blocked_until` are batch-fetched for the whole page in one query, not per row.

### GET /admin/registrations/rejected

Same shape, plus who rejected the account and when. Includes soft-deleted rows (`withTrashed()`), ordered by `updated_at` desc (most recently rejected first).

- **Limiter:** conductor-read (60/min)
- **Service:** `AdminService::listRejectedRegistrations`

**Query:** `search`, `applied_type`, `per_page`, `page` (no `id` lookup here).

Adds `rejected_at` (`users.deleted_at`) and `rejected_by_name`/`rejected_by_email`, matched by an **exact** `rejected_user_id` (unlike `rejection_history`, which matches by identity and can span re-registrations under the same email/contact).

### POST /admin/registrations (onsite)

Creates a `PENDING` commuter account on the admin's behalf — mirrors self sign-up but skips email verification and password confirmation.

- **Limiter:** conductor-write (30/min)
- **Content-Type:** `multipart/form-data` (ID image upload)

**Body**

| Field | Rules |
|---|---|
| `first_name`, `surname` | Required, max 100 |
| `middle_name` | Nullable, max 100 |
| `birthdate` | Required date, before today |
| `gender` | Optional, max 20 — defaults to `UNSPECIFIED` (self sign-up requires it; onsite doesn't) |
| `email` | Required, valid, max 255, unique among **non-deleted** users |
| `contact_number` | Required, Philippine mobile format |
| `username` | Required, max 50, unique in `commuter_profiles` |
| `password` | Required, 8–128 chars — **not** the stronger `StrongPassword` rule self sign-up uses (see [Known quirks](#known-quirks)) |
| `language_preference` | Optional, max 20 |
| `applied_type` | Required: `REGULAR`/`STUDENT`/`SENIOR`/`PWD` |
| `id_image` | Required image (jpeg/jpg/png/webp), max 5 MB |

The [cooldown](#the-rejection-cooldown) is enforced here too — a blocked identity can't be re-created through the kiosk flow either. The ID image is uploaded to the private disk **before** the DB transaction opens (so the transaction's row locks don't hold through a slow network upload); if the transaction then fails, the just-uploaded image is deleted so a failed onsite registration never orphans a government ID in storage.

**201 Created:** `{id, email, first_name, surname, username, applied_type, account_status: "PENDING"}`, `message: "Onsite registration created — awaiting verification."`

**Errors:** `422` the cooldown (shape B via `ValidationException`), `422 "The email has already been taken."`, `422` field validation.

### POST /admin/registrations/{id}/approve

- **Limiter:** conductor-write (30/min)
- **Request:** `ApproveRegistrationRequest` (only accepts an unused `admin_note`) → `AdminService::approveRegistration`

Copies `applied_type` → `commuter_type` (the tier is never admin-overridable here — it's always what the applicant applied for and the admin is confirming), sets `verified_at = now()`, `account_status = APPROVED`, clears `rejection_reason`. Sends the commuter an approval email (best-effort — template-driven, see [admin-content.md](admin-content.md#settings)).

**Guards:** `404 "Registration not found."` (shape B); `422` if the account isn't `PENDING` (e.g. double-click after another admin already approved it).

**200 OK:** `{id, email, name, commuter_type, applied_type, account_status: "APPROVED", verified_at, rejection_reason: null}`, `message: "Registration approved — commuter can now log in."`

### POST /admin/registrations/{id}/reject

- **Limiter:** conductor-write (30/min)
- **Request:** `RejectRegistrationRequest` (`rejection_reason` required, 3–500 chars) → `AdminService::rejectRegistration`

1. Records a [cooldown](#the-rejection-cooldown) strike against the applicant's identity — **before** the email is rewritten, so the strike is keyed to the real email/contact.
2. Sends a rejection email (best-effort), including the cooldown's retry date if this strike tripped the threshold.
3. Rewrites `email` to `rejected+{id}@chatco.local` and `username` to `rejected_{id}`, then soft-deletes the user.

**Guards:** `404 "Registration not found."`; `422` if not `PENDING`.

**200 OK:** `{id, email: "<placeholder>", account_status: "REJECTED", rejection_reason, attempt_number, blocked_until}`, `message: "Registration rejected. The email is now available for re-registration."`

---

## Personnel

### GET /admin/personnel

The Fleet Management "Personnel" tab: drivers and conductors merged into one paginated, searchable, sortable list via a `UNION ALL` SQL subquery (not two separate fetches merged in PHP) — see `AdminService::fleetPersonnelBaseQuery`.

- **Limiter:** conductor-read (60/min)

**Query**

| Param | Rules |
|---|---|
| `search` | Matches first/last name or contact (role-specific columns on each side of the union) |
| `role` | `DRIVER` or `CONDUCTOR` — omitted returns both |
| `per_page` | Default 25 |
| `page` | |
| `count_only` | `1`: returns only `{total}` (its own lightweight count query, no row fetch) |

**Status is normalized across both roles** into one vocabulary, since a driver's native status is `ACTIVE`/`SUSPENDED` and a conductor's is `ACTIVE`/`DISABLED`:

| Source | Normalized `status` |
|---|---|
| Driver: `NULL` or `ACTIVE` | `ACTIVE` |
| Driver: anything else | `DEACTIVATED` |
| Conductor: `DISABLED` | `DEACTIVATED` |
| Conductor: anything else | `ACTIVE` |

**200 OK:** a Laravel paginator of `{id, name, role: "Driver"|"Conductor", contact, birthday, profile_picture_url, status}` — a deliberately thin shape; open the driver/conductor detail modal (below) for everything else.

### GET /admin/terminated-personnel

The "Separated Personnel" record — populated only by [DELETE /admin/drivers/{id}](#delete-admindriversid) and [DELETE /admin/conductors/{id}](#delete-adminconductorsid), **never** by the generic [DELETE /admin/users/{id}](#delete-adminusersid) (see [Known quirks](#known-quirks)).

- **Limiter:** conductor-read (60/min)

**Query:** `search` (name/role/contact/reason/last_vehicle/termination_type), `per_page` (max 100), `count_only`.

**200 OK:** a Laravel paginator ordered by `terminated_date` desc, then `created_at` desc. Each row is an immutable snapshot captured at termination time (name, contact, last assigned unit, `date_joined`) — it survives even if the underlying driver/conductor row is later purged, because the capture happens **before** the soft-delete in the same transaction.

```json
{
  "id": "…",
  "personnel_id": "…",
  "personnel_type": "CONDUCTOR",
  "name": "Pedro Reyes",
  "role": "Conductor",
  "contact": null,
  "reason": "Resigned to pursue other work.",
  "termination_type": "RESIGNED",
  "terminated_date": "2026-09-15",
  "last_vehicle": "U-07",
  "date_joined": "2025-01-10"
}
```

`contact` is always `null` for a terminated conductor (`destroyConductor` doesn't capture it — only drivers do).

---

## Drivers

Drivers have no `users` row — they can't log in, and they never show up in [GET /admin/users](#get-adminusers). The conductor app reads them read-only ([conductor.md](conductor.md#get-conductordrivers)) to populate shift-start pickers.

### GET /admin/drivers

**Two different responses depending on whether `page` is present** — both share the same route and controller method.

- **Limiter:** conductor-read (60/min)

| Mode | Trigger | Returns |
|---|---|---|
| **Full list** (legacy/default) | No `page` param | Every driver with `vehicle` loaded, as a plain array — what Fleet Management's and Lost & Found's driver pickers call, since they need the whole table at once |
| **Paginated/filterable** | `page` present | A Laravel paginator via `AdminService::listDrivers`, used by User Management's "Drivers" role filter |

**Paginated-mode query:** `search` (name/contact/license_number), `status` (`ACTIVE`, or anything else reads as "not ACTIVE" — mirrors the frontend's own convention), `sort` (`recent`/`oldest`/`alphabetical`), `per_page` (max 100).

### POST /admin/drivers

- **Limiter:** conductor-write (30/min)

**Body (JSON or multipart if uploading `profile_picture` directly)**

| Field | Rules |
|---|---|
| `first_name`, `last_name` | Required, max 100 |
| `middle_name` | Nullable, max 100 |
| `birthday` | Required date, before today |
| `contact` | Required, Philippine mobile format |
| `address` | Required, max 255 |
| `emergency_contact_name` | Required, max 100 |
| `emergency_contact_number` | Required, Philippine mobile format |
| `emergency_contact_relationship` | Required, one of `Spouse, Parent, Sibling, Relative, Guardian, Friend, Other` |
| `license_number` | Required, uppercased + trimmed server-side, must match `N01-23-045678` (LTO format: one letter, two digits, dash, two digits, dash, six digits), unique |
| `profile_picture_url` | Nullable string, max 500 |
| `profile_picture` | Nullable image (jpeg/jpg/png/webp), max 5 MB — uploaded and stored if present, overriding `profile_picture_url` |

`hire_date` is always `today()` — not admin-settable on create. `status` always starts `ACTIVE`.

If the DB insert fails after a picture was uploaded, the upload is deleted so a failed create never orphans an image. **201 Created:** the Driver with `vehicle` loaded. Logged as `PERSONNEL`.

### GET /admin/drivers/{id}

Full profile for the detail modal — not the same shape as the list. Includes derived fields: the driver's current `vehicle`, the `conductor_partner` sharing that vehicle, and `assigned_route` (falls back to the hardcoded `"Malolos - Meycauayan - Calumpit"` string if unassigned — the pilot's only route today).

- **Limiter:** conductor-read (60/min)

### PUT/PATCH /admin/drivers/{id}

Same body as create, minus the uniqueness check excluding this driver's own ID. Changing `profile_picture` deletes the old file after the DB update commits (not before — so a failed update never leaves the record pointing at a deleted file).

- **Limiter:** conductor-write (30/min)

### DELETE /admin/drivers/{id}

Soft-deletes the driver **and** writes a [terminated-personnel](#get-adminterminated-personnel) record, in one transaction.

- **Limiter:** conductor-write (30/min)

**Body (JSON):** `reason` (required, max 1000), `termination_type` (required: `TERMINATED` or `RESIGNED`).

**409 Conflict** (custom body, not the standard envelope's `errors` shape but close to it) if `drivers.active_shift_id` is set — a driver mid-shift can't be removed; end the shift via conductor remittance first.

**200 OK:** `data: null`, `message: "Driver removed successfully"`.

### License images

Government ID-grade documents, stored on the **private** disk (`filesystems.uploads.private_id_disk`, default `r2_private`) and only ever served through an authenticated admin request — never a public URL.

**POST /admin/drivers/{id}/license-images** — multipart, `front` and/or `back` (image, jpeg/jpg/png/webp, max 5 MB each; at least one required). Uploads happen before the DB transaction opens (same reasoning as the onsite-registration upload); a failed save deletes whatever was just uploaded. Old files are deleted only after the new paths are committed. **200 OK:** `{id, license_front_image_url, license_back_image_url}` — these are **storage paths**, not browsable URLs; fetch the actual image via the GET endpoint below.

**GET /admin/drivers/{id}/license-images/{side}** — streams the file inline (`Cache-Control: private, no-store`) to an authenticated admin. `side` must be `front` or `back` (404 otherwise); 404 if no image is on file.

**DELETE /admin/drivers/{id}/license-images/{side}** — clears the DB column first, then deletes the file, so a failed file-delete only leaves a harmless orphan rather than a dangling DB reference.

### GET /admin/drivers/{id}/shift-logs

Paginated assignment history for the detail modal's "Assignment History" tab, newest `time_in` first.

- **Limiter:** conductor-read (60/min)

**Query:** `date` (`YYYY-MM-DD`, filters to that single day — the range check is a plain `time_in BETWEEN` so the composite index `shift_logs_driver_id_time_in_index` still covers it), `per_page` (default 10, max 50).

**200 OK:** a Laravel paginator of `{shift_id, unit_number, plate_number, route, time_in, time_out, status}`.

---

## Conductors

Unlike drivers, a conductor **is** a `users` row (`role: CONDUCTOR`) plus a `conductor_profiles` row sharing the same UUID primary key. Conductors don't choose their own login — the admin-generated username/password **is** the account.

### GET /admin/conductors

Full list for the Personnel tab, ordered by `last_name`.

- **Limiter:** conductor-read (60/min)

**200 OK:** a plain array of **raw `ConductorProfile` models** with `vehicle.route` and `vehicle.driver` loaded — see [Known quirks](#known-quirks) for what that means for `generated_password`.

### POST /admin/conductors

Creates both the `User` and `ConductorProfile` in one transaction, generating login credentials deterministically from name + birthday.

- **Limiter:** conductor-write (30/min)

**Body (JSON or multipart)**

| Field | Rules |
|---|---|
| `first_name`, `last_name` | Required, max 100 |
| `middle_name` | Nullable, max 100 |
| `birthday` | Required date, before today |
| `contact` | Required, Philippine mobile format |
| `address` | Required, max 255 |
| `emergency_contact_name` | Required, max 100 |
| `emergency_contact_number` | Required, Philippine mobile format |
| `emergency_contact_relationship` | Required, same enum as drivers |
| `profile_picture_url` | Nullable string, max 500 |

**Credential generation** (also used by [reset-credentials](#post-adminconductorsidreset-credentials)):

- **Username:** `{first letter of first name}.{last name, spaces stripped}`, lowercased — e.g. "Mhaku Jose" + "Dela Cruz" → `m.delacruz`. A numeric suffix (`m.delacruz1`, `m.delacruz2`, …) is appended on collision.
- **Password:** `{first word of first name}.{remaining words}{birthday as MMDDYYYY}` — e.g. "Mhaku Jose" born 1995-05-14 → `mhaku.jose05142000`.
- **Email** (to satisfy the `users.email NOT NULL` + unique constraint; conductors never see or use it): `{username}@chatco.local`.

**201 Created:** `{id, first_name, last_name, generated_username, generated_password}` — **this is the only time the plaintext password is returned on purpose** (so the admin can hand it to the conductor). See [Known quirks](#known-quirks) for where it leaks *unintentionally*.

### GET /admin/conductors/{id}

Shaped detail payload for the modal (not a raw model — contrast with the list above): `vehicle`, `driver_partner`, `assigned_route` (same hardcoded fallback as drivers), `generated_username` — **not** `generated_password`.

- **Limiter:** conductor-read (60/min)

### PUT/PATCH /admin/conductors/{id}

Editable: `first_name`, `middle_name`, `last_name`, `birthday`, `contact`, `profile_picture_url`/`profile_picture`. **Not editable here:** `generated_username`/`generated_password` — that's [reset-credentials](#post-adminconductorsidreset-credentials) only.

- **Limiter:** conductor-write (30/min)

**200 OK:** the raw `ConductorProfile` model with `vehicle.route`/`vehicle.driver` loaded — again, see [Known quirks](#known-quirks).

### DELETE /admin/conductors/{id}

Soft-deletes the `User` (cascades to `conductor_profiles` via the shared primary key) **and** writes a [terminated-personnel](#get-adminterminated-personnel) record.

- **Limiter:** conductor-write (30/min)

**Body (JSON):** `reason` (required, max 1000), `termination_type` (`TERMINATED`/`RESIGNED`).

**Guards:** `404` if the `ConductorProfile` exists but its `User` doesn't (data integrity edge case); `422` self-deletion; `409` if the conductor's assigned vehicle has an `active_shift_id`.

All Sanctum tokens are explicitly revoked **before** the soft-delete (belt-and-suspenders alongside the automatic lockout described in [DELETE /admin/users/{id}](#delete-adminusersid)). **200 OK:** `data: null`, `message: "Conductor removed successfully"`.

### POST /admin/conductors/{id}/disable

A **non-destructive** block — no soft-delete, no termination record. This is a conductor's only suspension-equivalent: [POST /admin/users/{id}/suspend](#post-adminusersidsuspend) explicitly refuses conductors.

- **Limiter:** conductor-write (30/min)

**Body (JSON):** `current_password` — the **calling admin's own** password, re-verified with `Hash::check` so a stray click can't instantly disable a conductor.

**Guards:** `422` wrong password (`ValidationException`); `404` missing user; `409` if the conductor's vehicle has an active shift.

Sets `conductor_profiles.status = 'DISABLED'` and revokes every token. **200 OK:** `data: null`, `message: "Conductor account disabled. All sessions revoked."`

To re-enable: either [reset-credentials](#post-adminconductorsidreset-credentials) (which also clears `DISABLED`), or `PUT /admin/conductors/{id}` does **not** touch `status` — only credential reset does.

### POST /admin/conductors/{id}/reset-credentials

Regenerates username + password using the [same algorithm](#post-adminconductors) and returns them once, for the admin to hand over. Also the only way to re-enable a [disabled](#post-adminconductorsiddisable) conductor.

- **Limiter:** conductor-write (30/min)

**Body (JSON):** `current_password` — the calling admin's own, re-verified the same way as disable.

**Regeneration details:**

- The new password is the deterministic base **plus a random 4-digit suffix** (`base-1234`), so a reset doesn't just reproduce the password being replaced. A loop re-rolls the suffix in the 1-in-10,000 case it happens to re-hash to the current password.
- Username collision handling is the same numeric-suffix scheme as create.
- Clears a prior `DISABLED` status back to `ACTIVE`.
- Revokes every existing token — the conductor must log in fresh.

**200 OK:** `{id, first_name, last_name, generated_username, generated_password}`, `message: "Credentials reset successfully. The conductor must log in with the new credentials."`

### GET /admin/conductors/{id}/shift-logs

Same shape and pagination as [the driver version](#get-admindriversidshift-logs), plus `driver_name` on each row (a conductor's shift always has a paired driver; the reverse isn't shown on the driver side).

- **Limiter:** conductor-read (60/min)

---

## Known quirks

1. **`generated_password` leaks on four endpoints that were never meant to expose it.** `ConductorProfile` has `generated_password` in `$fillable` and **no `$hidden` array at all**. Three admin surfaces serialize a raw `ConductorProfile` (or a `Vehicle` with its `conductor` relation eager-loaded with no column restriction) straight into the JSON response, so the conductor's plaintext-equivalent login password rides along on every page load, not just the one-time reveal on create/reset:
   - [`GET /admin/conductors`](#get-adminconductors) — the full list.
   - [`PUT/PATCH /admin/conductors/{id}`](#putpatch-adminconductorsid) — the update response.
   - [`GET/POST/PUT/PATCH /admin/vehicles*`](admin-fleet.md#vehicles) — `AdminService::listVehicles`/`getVehicle`/`createVehicle`/`updateVehicle` all eager-load `conductor` with no `select()`, so any response that includes a vehicle's assigned conductor carries their password too.

   By contrast, [`GET /admin/conductors/{id}`](#get-adminconductorsid) and the [Users](#users) endpoints build their own explicit arrays and never leak it, and the two endpoints that are *supposed* to return it ([create](#post-adminconductors), [reset-credentials](#post-adminconductorsidreset-credentials)) are clearly a one-time reveal by design. This is a real, currently-shipping exposure, not a hypothetical — fixing it (adding `protected $hidden = ['generated_password']` to `ConductorProfile`, or restricting the eager-loads to specific columns) is a scoped follow-up, not a docs change.

2. **`GET /admin/dashboard` has no rate limit at all** — confirmed in `routes/api.php`: every other admin route has a `throttle:` middleware, this one has none. It calls the same `AdminService::analytics()` as `GET /admin/analytics` (which *is* throttled at `conductor-read`), so an unthrottled, authenticated loop against `/admin/dashboard` can run the full 30-day aggregation query set as fast as the client can fire requests.

3. **`DELETE /admin/users/{id}` and `DELETE /admin/conductors/{id}` both delete a conductor's account, but only one is safe to use operationally.** The generic user-delete has **no active-shift guard** and **writes no termination record** — an admin could soft-delete a conductor mid-shift, which (per the automatic Sanctum lockout described under [DELETE /admin/users/{id}](#delete-adminusersid)) cuts their access immediately but leaves the shift `ACTIVE` forever with no conductor able to end it, since their token no longer resolves. The vehicle stays assigned, no remittance is created, and nothing in [terminated-personnel](#get-adminterminated-personnel) explains why the conductor is gone. Always use [DELETE /admin/conductors/{id}](#delete-adminconductorsid) for conductor removal; the generic endpoint is really for commuters (and, carefully, other admins).

4. **A commuter's "suspended" state can be set two different, independent ways**, and they don't always agree: a [`UserSuspension`](#post-adminusersidsuspend) row (with a reason, a term, and a lift action), or `commuter_profiles.account_status = 'SUSPENDED'` directly via [`PUT /admin/users/{id}`](#putpatch-adminusersid) with `account_status`. `present()` treats an active suspension as authoritative when both exist, but [unsuspend](#post-adminusersidunsuspend) only flips `account_status` back to `ACTIVE` *in addition to* lifting the suspension row — a commuter suspended only via the profile-status path (no `UserSuspension` row) still gets correctly reactivated, but has no suspension history to show for it.

5. **Admins can suspend other admins.** Nothing in `suspendUser`/`unsuspendUser` special-cases `role: ADMIN` beyond the existing self-suspend guard — an admin account is suspended exactly like a commuter's (a `UserSuspension` row, all tokens revoked), which also means the [last-admin-protection](#delete-adminusersid) on delete has no equivalent guard against suspending the last remaining admin into a locked-out state.

6. **Onsite registration (`POST /admin/registrations`) uses a weaker password rule than self sign-up.** It validates `password` with plain `min:8|max:128`, not `App\Rules\StrongPassword` (uppercase + digit + symbol required) that `AuthService::register` enforces — see [README](README.md#request-conventions). An admin keying in a simple password at a kiosk is accepted where the same password would be rejected on the public sign-up form.
