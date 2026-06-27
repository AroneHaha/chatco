# ChatCo — Sprint 6 (S6) Task Specifications

> **Source:** Derived from `CHATCO-SPRINT.pdf` Week 6 (July 21 – July 27, 2025) — *"QR signing, feedback, lost & found, announcements, SOS alert."*
> **Format:** Identical to the existing S5 task entries in `clickup_all_tasks.md` — each task description is ready to paste into ClickUp as the task's `description` field.
> **Scope:** 12 tasks covering backend (T1–T5), frontend (T6–T10), feature tests (T11), and role-scoped security audit (T12). Together they make Sprint 6 work end-to-end across DB → backend → UI.
> **Stack assumptions:** Laravel 12 + Next.js 16 App Router + Sanctum + MySQL/SQLite, following the architecture established in S1–S5 (service/controller separation, `ApiResponse` envelope, Form Requests, `role:*` middleware, named throttle limiters, Next.js proxy → service → hook → page pattern).

---

## Sprint 6 — Task Index

| ID  | Title                                                              | Layer    | Depends On       |
|-----|--------------------------------------------------------------------|----------|------------------|
| T1  | QR Signing & Verification Backend (HMAC-SHA256)                    | Backend  | —                |
| T2  | Commuter Feedback Backend (Submit Rating + Comment)                | Backend  | —                |
| T3  | Lost & Found Backend (List, Report, Claim, Confirm)                | Backend  | —                |
| T4  | Announcements Backend (CRUD + Per-User Mark-as-Read)               | Backend  | —                |
| T5  | SOS Alert Backend (Commuter Trigger + Admin Notification)          | Backend  | —                |
| T6  | Frontend QR Display & Scan (Conductor Receipt + Commuter Verify)   | Frontend | T1               |
| T7  | Frontend Commuter Feedback Submission                              | Frontend | T2               |
| T8  | Frontend Lost & Found (Commuter Report + Admin Manage)             | Frontend | T3               |
| T9  | Frontend Announcements (Admin Create + Commuter View + Mark-Read)  | Frontend | T4               |
| T10 | Frontend SOS Alert (Commuter Trigger + Admin Monitor Feed)         | Frontend | T5               |
| T11 | Feature Tests: QR, Feedback, Lost & Found, Announcements, SOS      | Test     | T1–T5            |
| T12 | Role-Scoped Security Audit & Data Isolation for S6                 | Test/Sec | T1–T5            |

---

### S6-T1 - QR Signing & Verification Backend (HMAC-SHA256)

**Description:**
```
Implement signed-QR generation and verification for transaction receipts. A conductor finalises a cash fare and the backend returns a signed QR payload; the commuter (or admin/auditor) can later scan it and the backend verifies the signature + expiry. The QR is tied to a transaction — it is NOT a wallet funding source, NOT a payment instrument, and NEVER stores monetary balance. Stateless HMAC-SHA256 — no DB table required for signing itself, but a `qr_audits` table is added for replay-forensics (optional write, never blocks verify).

Files to Create / Modify

app/Services/QrService.php (new) — sign(payload): string, verify(token): array, rotateSecret(): void.
app/Http/Controllers/QrController.php — replace the existing 501 stubs for sign() + verify() (the controller already exists from S1; wire it to QrService).
app/Http/Requests/Qr/SignQrRequest.php (new) — validate transaction_id (exists, owned by auth conductor), amount (numeric > 0), commuter_id (nullable UUID).
app/Http/Requests/Qr/VerifyQrRequest.php (new) — validate token (required string).
routes/api.php — in the existing qr group: POST /qr/sign (auth:sanctum + role:CONDUCTOR + throttle:conductor-write), POST /qr/verify (auth:sanctum + any role + throttle:conductor-read).
config/qr.php (new) — default ttl_seconds=300, algorithm='sha256', secret_env_key='QR_SECRET'.
.env.example — add QR_SECRET= (32+ random chars; document generation: php -r "echo bin2hex(random_bytes(32));").

Database / Schema

 Migration: create_qr_audits_table — columns: id (UUID PK), transaction_id (UUID FK → transactions.id, cascade delete), conductor_id (UUID FK → users.id), payload_hash (string, indexed — for replay lookup), action ('sign'|'verify'), verified_at (nullable timestamp), created_at, updated_at.
 No column on transactions — the link is one-way (qr_audits → transactions).
 No wallet / balance / top_up columns anywhere (S7 audit will grep for these).

Behavior

 sign(): build payload { tid, amt, cid?, iat, exp } where exp = iat + ttl (default 300s). Base64url-encode the JSON, then HMAC-SHA256(secret, encoded) → token = encoded + '.' + signature. Write a qr_audits row (action='sign', payload_hash = sha256(encoded)). Return { token, expires_at, payload } (payload is the decoded JSON, for the conductor UI to render the QR cell content).
 verify(): split token on '.', recompute HMAC over the encoded part, constant-time compare (hash_equals). Reject on mismatch (422 'Invalid signature'), on expired exp (422 'Token expired'), on malformed structure (422). On success, write a qr_audits row (action='verify', verified_at=now) and return the decoded payload + the linked transaction (eager-loaded, scoped to the authenticated user's role — conductors see their own, commuters see their own, admins see any).
 Secret rotation: QrService::rotateSecret() writes a new secret to config (runtime only — persistence is a deploy concern). Not exposed via HTTP.
 The QR is for receipt/verification only — it does NOT mutate transaction.status, does NOT issue refunds, does NOT move money. A paid transaction stays paid.

Acceptance Criteria

 POST /api/v1/qr/sign with a valid owned transaction_id returns 201 + { token, expires_at, payload }.
 POST /api/v1/qr/verify with a tampered payload (any byte changed) returns 422 'Invalid signature'.
 POST /api/v1/qr/verify with an expired token (exp in the past) returns 422 'Token expired'.
 A conductor cannot sign a transaction they did not create (403, scoped to auth()->id()).
 A commuter token can call /qr/verify (any role) but /qr/sign is conductor-only (403 for commuter/admin).
 QR_SECRET is read from .env, never hardcoded; grep -r 'QR_SECRET' app/ returns zero matches except config/qr.php.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

### S6-T2 - Commuter Feedback Backend (Submit Rating + Comment)

**Description:**
```
Allow a commuter to submit post-ride feedback (1–5 star rating + optional comment), optionally linked to the conductor and/or shift that served them. This closes the loop for service-quality monitoring — admins can later aggregate ratings per conductor (S7 analytics). Commuter-only: a conductor/admin cannot submit feedback. Strictly scoped: a commuter can never submit feedback on another commuter's behalf, and the conductor_id/shift_id must be referenced from the commuter's own ride history (not arbitrary ids from the request body).

Files to Create / Modify

app/Services/FeedbackService.php (new) — create(User, array): Feedback, listForConductor(User conductor): Paginator, listForCommuter(User commuter): Paginator.
app/Http/Controllers/Commuter/FeedbackController.php (new) — store() (thin, delegates to FeedbackService).
app/Http/Controllers/Admin/AdminController.php — add feedbackIndex() (admin can list all feedback for QA review).
app/Http/Requests/Commuter/SubmitFeedbackRequest.php (new) — rating (required, integer, 1–5), comment (nullable, string, max 1000), conductor_id (nullable UUID, must exist), shift_id (nullable UUID, must exist).
routes/api.php — commuter group: POST /feedback (auth:sanctum + role:COMMUTER + throttle:commuter-write). admin group: GET /feedback (auth:sanctum + role:ADMIN + throttle:admin-read).

Database / Schema

 Migration: create_feedback_table — columns: id (UUID PK), commuter_id (UUID FK → users.id, cascade), conductor_id (UUID nullable FK → users.id, cascade), shift_id (UUID nullable FK → shift_logs.id, cascade), rating (TINYINT, 1–5, NOT NULL), comment (TEXT nullable), created_at, updated_at.
 Indexes: index on conductor_id (for admin aggregation), index on commuter_id (for "my feedback" list), composite index on (conductor_id, rating) for per-conductor rating distribution.
 Constraint: rating CHECK (rating BETWEEN 1 AND 5).
 Model Feedback.php — $fillable = [commuter_id, conductor_id, shift_id, rating, comment]; $casts = ['rating' => 'integer']; belongsTo User (commuter), belongsTo User (conductor), belongsTo ShiftLog (shift).

Behavior

 POST /api/v1/commuter/feedback — the commuter_id is ALWAYS auth()->id(), never read from the request body. If conductor_id is supplied, validate that the commuter has at least one transaction with that conductor (prevents feedback spam on random conductors). If shift_id is supplied, validate it matches a shift the commuter rode on.
 One feedback per (commuter, shift) pair — a second submission for the same shift_id returns 422 'You have already submitted feedback for this shift'. (If shift_id is null, no uniqueness check — allows general feedback.)
 GET /api/v1/admin/feedback?conductor_id=&rating=&page= — paginated, filterable; eager-loads commuter (name only) + conductor + shift. Admin-only.
 A commuter can list their own feedback via GET /api/v1/commuter/feedback (lightweight — for the commuter's own history page).

Acceptance Criteria

 POST /api/v1/commuter/feedback with rating=5, comment='Great ride' → 201, row in feedback table, commuter_id = auth()->id().
 POST with rating=0 or rating=6 → 422.
 POST with rating=5 but conductor_id belonging to a conductor the commuter never rode with → 422 'You have not ridden with this conductor'.
 POST twice with same shift_id → second 422.
 Conductor or admin token calling POST → 403.
 Admin calling GET /admin/feedback → paginated list with filters working.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

### S6-T3 - Lost & Found Backend (List, Report, Claim, Confirm)

**Description:**
```
Implement the lost-items workflow. A commuter reports an item they left on a jeepney; any authenticated user can browse the list; a commuter can claim an item they recognise; an admin confirms the claim (or marks the item resolved). The flow is: REPORTED → CLAIMED → CONFIRMED (admin) → RESOLVED (admin closes). No monetary side, no shipping — purely an item-matching ledger.

Files to Create / Modify

app/Services/LostItemService.php (new) — list(filters), create(User, array), claim(User, id), confirmClaim(User admin, id), resolve(User admin, id), present(LostItem).
app/Http/Controllers/LostItemController.php (new) — index(), store(), claim(), confirm(), resolve(). (Place under app/Http/Controllers/ — lost-found is shared across commuter + admin.)
app/Http/Requests/LostItem/StoreLostItemRequest.php (new) — description (required, string, max 2000), location_hint (nullable, string, max 200 — e.g. 'Unit 007, near back row'), shift_id (nullable UUID, for context), contact_number (nullable, string, max 20).
app/Http/Requests/LostItem/ClaimLostItemRequest.php (new) — claim_note (required, string, max 500 — the commuter must describe identifying details to prove ownership).
routes/api.php — new top-level group: GET /lost-found (auth:sanctum, any role, throttle:commuter-read) for listing; POST /lost-found (auth:sanctum + role:COMMUTER + throttle:commuter-write) for reporting; PUT /lost-found/{id}/claim (auth:sanctum + role:COMMUTER + throttle:commuter-write); PATCH /lost-found/{id}/confirm (auth:sanctum + role:ADMIN + throttle:admin-write); PATCH /lost-found/{id}/resolve (auth:sanctum + role:ADMIN + throttle:admin-write).

Database / Schema

 Migration: create_lost_items_table — columns: id (UUID PK), description (TEXT, NOT NULL), location_hint (VARCHAR nullable), shift_id (UUID nullable FK → shift_logs.id), reported_by (UUID FK → users.id, cascade), status (ENUM('REPORTED','CLAIMED','CONFIRMED','RESOLVED'), default 'REPORTED'), claimed_by (UUID nullable FK → users.id, null on delete), claim_note (TEXT nullable), confirmed_by (UUID nullable FK → users.id), confirmed_at (TIMESTAMP nullable), resolved_at (TIMESTAMP nullable), contact_number (VARCHAR nullable), created_at, updated_at.
 Indexes: index on status (filter by open/closed), index on reported_by, index on claimed_by.
 Model LostItem.php — $fillable per above; $casts = ['confirmed_at' => 'datetime', 'resolved_at' => 'datetime']; accessor getUrlAttribute() if media attachments are added later (out of scope for S6).

Behavior

 GET /api/v1/lost-found?status=&page= — paginated list, all authenticated roles. Filter by status (REPORTED, CLAIMED, CONFIRMED, RESOLVED). Eager-loads reported_by (name only) — NEVER exposes claimed_by user info to non-admins (privacy: a reporter should not see who claimed their item until admin confirms).
 POST /api/v1/lost-found — reported_by = auth()->id(); status = REPORTED; claimed_by/confirmed_by null.
 PUT /api/v1/lost-found/{id}/claim — only allowed when status=REPORTED; sets status=CLAIMED, claimed_by=auth()->id(), claim_note from body. A second claim attempt on a CLAIMED item → 409 'Item already claimed'.
 PATCH /api/v1/lost-found/{id}/confirm — admin only; only when status=CLAIMED; sets status=CONFIRMED, confirmed_by=auth()->id(), confirmed_at=now.
 PATCH /api/v1/lost-found/{id}/resolve — admin only; only when status=CONFIRMED; sets status=RESOLVED, resolved_at=now. Item is closed but retained for audit.
 Status-transition guards: any out-of-order transition (e.g. REPORTED → CONFIRMED) → 422.

Acceptance Criteria

 A commuter reports an item → 201, status=REPORTED, reported_by=auth()->id().
 A different commuter claims it → 200, status=CLAIMED, claimed_by set.
 A third commuter tries to claim the same item → 409.
 Admin confirms → 200, status=CONFIRMED, confirmed_at set.
 Admin tries to confirm a REPORTED (unclaimed) item → 422.
 GET /lost-found does not leak claimed_by info to non-admins.
 Conductor can list (any role) but cannot report/claim (only commuters report/claim).

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

### S6-T4 - Announcements Backend (CRUD + Per-User Mark-as-Read)

**Description:**
```
Admin-published system announcements (e.g. holiday schedules, route suspensions, new features). Admins create/list/update/archive; commuters and conductors see active announcements and mark them read per-user (so the bell badge clears). Read state is per (user, announcement) — never global. Soft-archiving (status=ARCHIVED) keeps the audit trail without showing stale items to commuters.

Files to Create / Modify

app/Services/AnnouncementService.php (new) — list(filters), create(User admin, array), update(User admin, id, array), archive(User admin, id), listForUser(User, filters), markRead(User, id), unreadCount(User).
app/Http/Controllers/Admin/AnnouncementController.php (new) — index(), store(), show(), update(), archive(). (Admin writes.)
app/Http/Controllers/AnnouncementController.php (new, top-level) — index() (public read for any authenticated user), markRead(id). (User-facing reads.)
app/Http/Requests/Announcement/StoreAnnouncementRequest.php (new) — title (required, string, max 200), body (required, string, max 5000), status (nullable, in ['ACTIVE','ARCHIVED'], default 'ACTIVE').
app/Http/Requests/Announcement/UpdateAnnouncementRequest.php (new) — same fields, all optional.
routes/api.php — admin group: GET/POST /announcements, GET/PUT /announcements/{id}, PATCH /announcements/{id}/archive (all auth:sanctum + role:ADMIN + admin-read/admin-write throttles). Top-level authenticated group: GET /announcements (any role, throttle:commuter-read), POST /announcements/{id}/read (any role, throttle:commuter-write).

Database / Schema

 Migration: create_announcements_table — columns: id (UUID PK), title (VARCHAR 200, NOT NULL), body (TEXT, NOT NULL), created_by (UUID FK → users.id, cascade), status (ENUM('ACTIVE','ARCHIVED'), default 'ACTIVE'), created_at, updated_at.
 Migration: create_announcement_reads_table — columns: announcement_id (UUID FK → announcements.id, cascade), user_id (UUID FK → users.id, cascade), read_at (TIMESTAMP, NOT NULL), PRIMARY KEY (announcement_id, user_id).
 Indexes: index on announcements.status (filter active); composite index on (announcement_id, user_id) is the PK so already indexed.
 Model Announcement.php — $fillable per above; hasMany AnnouncementRead; accessor getIsReadAttribute() resolved per authenticated user via a loaded pivot.
 Model AnnouncementRead.php — $fillable = [announcement_id, user_id, read_at]; $casts = ['read_at' => 'datetime'].

Behavior

 GET /api/v1/announcements (any role) — returns ACTIVE announcements, ordered by created_at DESC, paginated. Each row includes is_read (bool) for the authenticated user. Supports ?unread_only=1 to filter to unread only.
 POST /api/v1/announcements (admin) — creates with created_by = auth()->id().
 PUT /api/v1/announcements/{id} (admin) — updates title/body. Status changes via archive endpoint.
 PATCH /api/v1/announcements/{id}/archive (admin) — sets status=ARCHIVED. Commuters no longer see it. Idempotent (archiving an already-archived item is a no-op).
 POST /api/v1/announcements/{id}/read (any role) — upserts an announcement_reads row (read_at = now). Idempotent: re-reading just refreshes read_at. Returns 204.
 GET /api/v1/announcements/unread-count (any role) — lightweight endpoint for the bell badge: returns { count: N }.

Acceptance Criteria

 Admin creates an announcement → 201, commuters see it in GET /announcements, is_read=false.
 Commuter POSTs /announcements/{id}/read → 204; subsequent GET /announcements shows is_read=true for that row.
 A second POST /read on the same announcement → 204 (idempotent, no error).
 Admin archives → 200; commuters no longer see it in GET /announcements.
 A non-admin token calling POST /announcements (create) → 403.
 Unauthenticated GET → 401.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

### S6-T5 - SOS Alert Backend (Commuter Trigger + Admin Notification)

**Description:**
```
Emergency SOS feature: a commuter in distress hits the SOS button, the backend stores the alert (with their current lat/lng) and notifies the admin dashboard. Rate-limited hard (1 per 5 minutes per commuter) to prevent abuse. Admin can acknowledge and resolve alerts. The alert is purely a notification + audit record — it does NOT dispatch emergency services, does NOT make payments, does NOT mutate the commuter's account.

Files to Create / Modify

app/Services/SosService.php (new) — trigger(User commuter, array), listActive(User admin), acknowledge(User admin, id), resolve(User admin, id), present(SosAlert).
app/Http/Controllers/Commuter/SosController.php (new) — trigger() (thin).
app/Http/Controllers/Admin/AdminController.php — add sosIndex(), sosAcknowledge(), sosResolve() (or split into AdminSosController for clarity — preferred).
app/Http/Requests/Commuter/SosRequest.php (new) — lat (required, numeric, between -90 and 90), lng (required, numeric, between -180 and 180), note (nullable, string, max 500 — free-text context).
routes/api.php — commuter group: POST /sos (auth:sanctum + role:COMMUTER + throttle:sos — see below). admin group: GET /sos (admin-read), PATCH /sos/{id}/acknowledge (admin-write), PATCH /sos/{id}/resolve (admin-write).

Database / Schema

 Migration: create_sos_alerts_table — columns: id (UUID PK), commuter_id (UUID FK → users.id, cascade), lat (DECIMAL(10,7), NOT NULL), lng (DECIMAL(10,7), NOT NULL), note (TEXT nullable), status (ENUM('ACTIVE','ACKNOWLEDGED','RESOLVED'), default 'ACTIVE'), acknowledged_by (UUID nullable FK → users.id), acknowledged_at (TIMESTAMP nullable), resolved_by (UUID nullable FK → users.id), resolved_at (TIMESTAMP nullable), created_at, updated_at.
 Indexes: index on status (admin filters active), index on commuter_id, index on created_at (time-ordered feed).
 Model SosAlert.php — $fillable per above; $casts for datetime columns; belongsTo User (commuter, acknowledged_by, resolved_by).

Behavior

 Rate limiter: define a named throttle:sos limiter in AppServiceProvider::configureRateLimiters() — 1 request per 5 minutes per commuter_id (not per IP — a shared IP would otherwise block a real emergency from a second commuter). On 429, the response includes a Retry-After header and the JSON envelope { message: 'SOS rate limit reached. Please wait {N} seconds.', errors: { retry_after: N } }.
 POST /api/v1/commuter/sos — stores the alert with status=ACTIVE. Optionally broadcasts a RealtimeSos event via Laravel Echo/Pusher on the admin channel (reuse the S2 Pusher config; broadcast is best-effort — the DB write is the source of truth). Returns 201 with the alert id.
 GET /api/v1/admin/sos?status=&page= — paginated, default filter status=ACTIVE. Returns alerts with commuter name + location + age (minutes since created_at).
 PATCH /api/v1/admin/sos/{id}/acknowledge — sets status=ACKNOWLEDGED, acknowledged_by=auth()->id(), acknowledged_at=now. Does NOT resolve — admin is just signalling 'I see this'.
 PATCH /api/v1/admin/sos/{id}/resolve — sets status=RESOLVED, resolved_by=auth()->id(), resolved_at=now. Out-of-order transitions (ACTIVE → RESOLVED without ACK) are allowed (admin may resolve directly) but logged.
 A commuter CANNOT cancel their own SOS via the API (the alert is a paper trail once filed) — cancellation is admin-only via resolve.

Acceptance Criteria

 POST /sos with valid lat/lng → 201, status=ACTIVE, row in sos_alerts.
 Second POST within 5 minutes → 429 with retry_after.
 PATCH /admin/sos/{id}/acknowledge → 200, status=ACKNOWLEDGED.
 PATCH /admin/sos/{id}/resolve → 200, status=RESOLVED.
 GET /admin/sos?status=ACTIVE returns only ACTIVE alerts.
 A conductor token calling POST /sos → 403.
 A commuter cannot ACK/resolve their own alert via the admin endpoints (403 on admin routes).

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

### S6-T6 - Frontend QR Display & Scan (Conductor Receipt + Commuter Verify)

**Description:**
```
Wire the existing QR UI (conductor receipt modal + commuter scan modal) to the real /api/v1/qr/sign and /api/v1/qr/verify endpoints (S6-T1). When a conductor finalises a cash fare, the receipt modal fetches a signed QR and renders it as a scannable image. When a commuter scans (or pastes) a token, the verify modal calls /qr/verify and shows the result.

Files to Create / Modify

frontend/app/api/qr/sign/route.ts (new) — POST proxy → Laravel POST /api/v1/qr/sign. Forwards the transaction_id + amount + commuter_id.
frontend/app/api/qr/verify/route.ts (new) — POST proxy → Laravel POST /api/v1/qr/verify. Forwards the token.
frontend/lib/conductor/services/qr.service.ts (new) — sign({ transactionId, amount, commuterId? }): Promise<SignedQr>, verify(token): Promise<VerifiedPayload>. Typed errors: QrOperationError with codes validation | invalid_signature | expired | not_found | forbidden | unauthenticated | network.
frontend/components/conductor/qr-receipt-modal.tsx — on open, call qrService.sign(...); render the token as a QR image (use the existing qrcode.react dependency, or add it if missing). Show expires_at countdown. Disable the modal's close button until the QR has rendered (or 3s timeout).
frontend/components/commuter/qr-verify-modal.tsx — input field for the token (or camera-scan result); on submit, call qrService.verify(token). On success, show { transaction_id, amount, commuter_id, issued_at, expires_at } from the payload. On QrOperationError('invalid_signature'), show 'This QR is invalid or has been tampered with.' On ('expired'), show 'This QR has expired. Ask the conductor for a new one.'
frontend/lib/conductor/endpoints.ts (or equivalent) — add the sign + verify endpoint paths.

Behavior

 The sign call is made immediately after the transaction is recorded (or when the conductor clicks 'Show QR Receipt' on an existing transaction row).
 The QR image encodes the raw token string (the base64url.encoded + '.' + signature). The commuter scans it; the scanned string is the token passed to verify.
 Loading + error states: spinner during sign/verify; inline error message on failure; no toast spam.
 The verify modal never auto-retries on signature failure (could be a fraud attempt — show the error and let the user decide).
 Expiry countdown: if expires_at is within 30s, show a warning ('Expires in Ns'); if expired, disable the verify button and show 'Expired'.

Acceptance Criteria

 Conductor cash-fare receipt modal renders a scannable QR within 1s of the transaction being recorded.
 Scanning the QR with the commuter verify modal returns the correct transaction details.
 Tampering with the token (manually editing one character) → verify modal shows the 'invalid or tampered' error.
 Waiting past expires_at then verifying → 'expired' error.
 422 validation errors from Laravel surface inline (e.g. 'transaction_id not owned by you').

Coordination (read before starting)

Depends on S6-T1 (backend QR endpoints). The conductor receipt modal likely already exists from S4 (cash fare recording) — extend it, do not rebuild. If a qrcode.react (or similar) dependency is missing, add it via bun add qrcode.react and document in the PR description.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

### S6-T7 - Frontend Commuter Feedback Submission

**Description:**
```
Wire the commuter ride-history page to a feedback flow: after a completed ride, the commuter can tap 'Leave Feedback' → a modal opens with a 5-star picker + optional comment → submit calls POST /api/v1/commuter/feedback (S6-T2). Surface validation errors inline. Show 'Feedback submitted' state on the ride row after success.

Files to Create / Modify

frontend/app/api/commuter/feedback/route.ts (new) — POST proxy → Laravel POST /api/v1/commuter/feedback.
frontend/app/api/commuter/feedback/history/route.ts (new) — GET proxy → Laravel GET /api/v1/commuter/feedback (commuter's own feedback history).
frontend/lib/commuter/services/feedback.service.ts (new) — submit({ rating, comment?, conductorId?, shiftId? }): Promise<Feedback>, listMy(): Promise<Feedback[]>. Typed FeedbackOperationError.
frontend/components/commuter/feedback-modal.tsx (new or modify existing) — 5-star picker (clickable stars), comment textarea (max 1000 chars, with counter), submit button with loading state, inline error surface. Pre-fill conductor_id/shift_id from the ride row that opened the modal.
frontend/app/(commuter)/history/page.tsx (or wherever the ride-history list lives) — add 'Leave Feedback' button per row; on success, mark the row as 'Feedback submitted' (disable the button or show a checkmark). Allow viewing existing feedback via the same modal in read-only mode.
frontend/lib/commuter/endpoints.ts — add the feedback endpoint paths.

Behavior

 Star picker: 1–5 stars, click to set; hovering previews. Minimum 1 star required to submit.
 Comment: optional, but if provided must be ≤ 1000 chars (show counter '374 / 1000').
 Submit: calls feedbackService.submit(...). On 201, close the modal, show a success toast, mark the row.
 On 422 'You have already submitted feedback for this shift', show inline 'You already left feedback for this ride' and switch the row button to 'View Feedback' (which reopens the modal in read-only mode with the existing feedback).
 On 422 'You have not ridden with this conductor' (shouldn't happen if pre-filled correctly, but defensive), show the error inline.

Acceptance Criteria

 Commuter can submit 1–5 star feedback on a completed ride; the row reflects the submitted state.
 Reopening the feedback modal on a submitted ride shows the existing feedback read-only.
 A second submit on the same shift is blocked inline (no second row in the DB).
 Conductor/admin tokens cannot reach the modal (route guarded + role check on the page).

Coordination (read before starting)

Depends on S6-T2 (backend feedback endpoint). The ride-history page already exists from S4 (commuter payment history) — extend it, do not rebuild. The feedback button should only appear on rides that are PAID (not on pending/refunded rides).

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

### S6-T8 - Frontend Lost & Found (Commuter Report + Admin Manage)

**Description:**
```
Wire the lost-and-found UI to the real /api/v1/lost-found endpoints (S6-T3). Two surfaces: (1) a commuter-facing page to browse reported items + report a new loss + claim an item; (2) an admin-facing page to confirm/resolve claims. Both use the same backend, different proxies.

Files to Create / Modify

frontend/app/api/lost-found/route.ts (new) — GET (list, query passthrough) + POST (report) proxy.
frontend/app/api/lost-found/[id]/claim/route.ts (new) — PUT proxy.
frontend/app/api/admin/lost-found/[id]/confirm/route.ts (new) — PATCH proxy.
frontend/app/api/admin/lost-found/[id]/resolve/route.ts (new) — PATCH proxy.
frontend/lib/shared/services/lost-found.service.ts (new) — list({ status?, page? }), report({ description, locationHint?, shiftId?, contactNumber? }), claim(id, { claimNote }), confirm(id), resolve(id). Typed LostFoundOperationError with codes validation | not_found | conflict | forbidden | unauthenticated | network.
frontend/app/(commuter)/lost-found/page.tsx (new or modify existing) — list view (cards), filter by status (default REPORTED only), 'Report an Item' button → modal with description + location hint + contact number, 'Claim' button per reported item → modal asking for claim_note (identifying detail).
frontend/app/(admin)/lost-found/page.tsx (new or modify existing) — admin view with all statuses, 'Confirm' button on CLAIMED items, 'Resolve' button on CONFIRMED items. Shows claimed_by user info (admin-only field).
frontend/components/lost-found/report-modal.tsx, claim-modal.tsx, lost-found-card.tsx — shared components.

Behavior

 List page: cards show description (truncated 200 chars), location_hint, status badge (color-coded: REPORTED=amber, CLAIMED=blue, CONFIRMED=green, RESOLVED=gray), reported_by first name, time-ago. Click card → detail modal.
 Report modal: description (required, max 2000), location_hint (optional, max 200), contact_number (optional, max 20). Submit → 201 → list refreshes → success toast.
 Claim modal: claim_note (required, max 500, with helper text 'Describe a unique feature of the item to verify ownership'). Submit → 200 → list refreshes → success toast.
 Admin confirm: button on CLAIMED items only. Click → confirm dialog → 200 → row moves to CONFIRMED.
 Admin resolve: button on CONFIRMED items only. Click → confirm dialog → 200 → row moves to RESOLVED.
 Status badges are clickable filters in the admin view; commuter view defaults to REPORTED only (commuters don't see other people's claims).

Acceptance Criteria

 Commuter reports an item → it appears in the list (theirs + others).
 A second commuter claims the reported item → status flips to CLAIMED, the original reporter sees 'Claim pending admin review' (no claimer name shown).
 Admin sees claimed_by info; can confirm → status CONFIRMED; can resolve → status RESOLVED.
 Trying to claim a CLAIMED item → 409 surfaces as inline error 'Item already claimed'.
 Commuter cannot see other commuters' claimed_by info (privacy).
 Conductor role: can browse the list (any role) but cannot report/claim (403 if attempted — surface inline).

Coordination (read before starting)

Depends on S6-T3 (backend lost-and-found endpoints). The commuter and admin pages share the lost-found.service.ts — do not duplicate the service.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

### S6-T9 - Frontend Announcements (Admin Create + Commuter View + Mark-Read)

**Description:**
```
Wire the existing announcement bell (in the admin/commutor/conductor layouts) and the admin announcement-management page to the real /api/v1/announcements endpoints (S6-T4). The bell badge fetches /announcements/unread-count on mount + on a 30s poll; clicking the bell opens a dropdown of recent unread announcements; clicking one marks it read. Admins have a separate management page for create/edit/archive.

Files to Create / Modify

frontend/app/api/announcements/route.ts (new) — GET (list, any role) + POST (admin create) proxy.
frontend/app/api/announcements/[id]/route.ts (new) — GET + PUT (admin edit) proxy.
frontend/app/api/announcements/[id]/read/route.ts (new) — POST (mark as read, any role) proxy.
frontend/app/api/announcements/[id]/archive/route.ts (new) — PATCH (admin archive) proxy.
frontend/app/api/announcements/unread-count/route.ts (new) — GET (any role) proxy.
frontend/lib/shared/services/announcement.service.ts (new) — list({ status?, unreadOnly?, page? }), create({ title, body }), update(id, { title?, body? }), archive(id), markRead(id), unreadCount(). Typed AnnouncementOperationError.
frontend/components/shared/announcement-bell.tsx (new or modify existing) — bell icon with badge count; dropdown lists unread announcements; click an item → markRead(id) → badge decrements → dropdown closes. Polls unread-count every 30s.
frontend/app/(admin)/announcements/page.tsx (new or modify existing) — admin table: title, body (truncated), status, created_at, actions (Edit, Archive). Create button → modal with title + body fields. Edit modal reuses the create form.
frontend/components/admin/announcements/announcement-form-modal.tsx — shared create/edit modal.
frontend/components/shared/announcement-detail-modal.tsx — full-body view modal (used by bell + admin table).

Behavior

 Bell badge: shows count from /announcements/unread-count. 0 → no badge. >0 → red badge with count (capped at '99+').
 Bell dropdown: top 5 unread announcements (title + first 100 chars of body + time-ago). 'View all' link → /announcements page (commuter-facing list, future — for S6 the dropdown is enough).
 Click an unread item in the dropdown → markRead(id) → badge decrements → detail modal opens.
 Admin management page: paginated table with status filter (default ACTIVE). Create modal: title (max 200), body (max 5000, textarea). Edit: same form, pre-filled. Archive: confirm dialog.
 Archived items disappear from the admin's default view (filter to ARCHIVED to see them) and from the commuter bell.
 422 errors (e.g. title too long) surface inline in the modal.

Acceptance Criteria

 Admin creates an announcement → it appears in the commuter bell within 30s (next poll).
 Commuter clicks the announcement in the bell → markRead succeeds → badge decrements → reopening the bell shows it as read (no longer in the unread list).
 Admin archives → commuters no longer see it in the bell.
 Unread-count endpoint returns the correct number after mark-read.
 A commuter token calling POST /announcements (create) → 403 surfaced as 'You do not have permission to create announcements.'

Coordination (read before starting)

Depends on S6-T4 (backend announcements). The announcement bell likely already exists as a mock (S5 added a notification bell to the admin layout) — extend it with the real unread-count polling. Do not rebuild the bell from scratch.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

### S6-T10 - Frontend SOS Alert (Commuter Trigger + Admin Monitor Feed)

**Description:**
```
Wire the commuter SOS button + admin SOS feed to the real /api/v1/commuter/sos + /api/v1/admin/sos endpoints (S6-T5). The commuter side: a prominent red SOS button (with a 3-second hold-to-confirm to prevent accidental triggers) that captures the commuter's current geolocation and POSTs. The admin side: a live feed of active SOS alerts with acknowledge + resolve actions, polling every 10s.

Files to Create / Modify

frontend/app/api/commuter/sos/route.ts (new) — POST proxy → Laravel POST /api/v1/commuter/sos.
frontend/app/api/admin/sos/route.ts (new) — GET (list, status filter) proxy.
frontend/app/api/admin/sos/[id]/acknowledge/route.ts (new) — PATCH proxy.
frontend/app/api/admin/sos/[id]/resolve/route.ts (new) — PATCH proxy.
frontend/lib/commuter/services/sos.service.ts (new) — trigger({ lat, lng, note? }). Typed SosOperationError with codes validation | rate_limited | forbidden | unauthenticated | network. The rate_limited error exposes retryAfterSeconds.
frontend/lib/admin/services/sos.service.ts (new) — list({ status?, page? }), acknowledge(id), resolve(id).
frontend/components/commuter/sos-button.tsx (new or modify existing) — large red button; on click, requires a 3-second hold (progress ring fills); on hold complete, calls navigator.geolocation.getCurrentPosition → sosService.trigger(...). Shows success ('Emergency services notified') or error (rate-limited message with countdown).
frontend/app/(admin)/sos/page.tsx (new) or section in monitoring page — list of active alerts with commuter name, location (lat/lng + mini-map link), age (minutes), Acknowledge + Resolve buttons. Polls every 10s.
frontend/components/admin/sos-alert-card.tsx — card per alert; Acknowledge button (flips to ACKNOWLEDGED, shows acknowledged_by); Resolve button (flips to RESOLVED, removes from active list after 5s).
frontend/lib/commuter/endpoints.ts + frontend/lib/admin/endpoints.ts — add SOS paths.

Behavior

 Commuter SOS button: 3-second hold-to-confirm (cancels if released early). On hold complete: request geolocation (high accuracy, 5s timeout). If geolocation fails, show 'Cannot get your location. Please enable location services.' If geolocation succeeds, POST to /commuter/sos with lat/lng.
 On 201: full-screen red banner 'Emergency alert sent. Help is on the way.' with the alert id. The button stays disabled for 5 minutes (client-side mirror of the server rate limit).
 On 429: 'You already sent an SOS recently. Please wait Ns before sending another.' with the retry_after from the response.
 Admin SOS feed: polls /admin/sos?status=ACTIVE every 10s. New alerts slide in at the top with a brief highlight animation. Acknowledge + Resolve buttons call the respective endpoints and update the list optimistically (rollback on error).
 Admin acknowledge: button only on ACTIVE items. After ACK, the card shows 'Acknowledged by {admin name} at {time}'.
 Admin resolve: button on ACTIVE or ACKNOWLEDGED items. After resolve, the card greys out and is removed after 5s.

Acceptance Criteria

 Commuter holds the SOS button for 3s → geolocation prompt → on allow, the alert is sent (201 in network tab) → success banner.
 Tapping the button (without holding) does nothing (no accidental trigger).
 Sending a second SOS within 5 minutes → 429 with the countdown.
 Admin sees the alert in the feed within 10s (next poll).
 Admin acknowledge → status flips, card updates.
 Admin resolve → status flips, card greys out and is removed.
 A conductor token calling POST /commuter/sos → 403 (the button is hidden for conductors anyway).
 A commuter token calling GET /admin/sos → 403 (the admin feed page is admin-only).

Coordination (read before starting)

Depends on S6-T5 (backend SOS endpoints). The SOS button should be placed in the commuter dashboard header (visible on every commuter page) so it's reachable in an emergency. The admin feed can be a dedicated page or a panel within the existing admin monitoring page — coordinate with whoever owns monitoring.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

### S6-T11 - Feature Tests: QR, Feedback, Lost & Found, Announcements, SOS

**Description:**
```
Cover all Sprint 6 backend endpoints with feature tests (SQLite in-memory, matching the existing suite). Tests must assert real persistence and the standard ApiResponse envelope — not just status codes. Every endpoint has at least: a happy path, a validation failure, a wrong-role (403) case, and the spec's specific edge case (signature tamper, rate-limit, status-transition guard, etc.).

Files to Create / Modify

tests/Feature/QrSignTest.php — sign happy path; sign with unowned transaction_id → 403; verify with valid token; verify with tampered token → 422 'Invalid signature'; verify with expired token → 422 'Token expired'; commuter token calling sign → 403; qr_audits row written on sign + verify.
tests/Feature/FeedbackTest.php — submit happy path; submit with rating=0 or 6 → 422; submit with conductor_id the commuter never rode with → 422; double-submit on same shift_id → 422; conductor/admin calling POST → 403; admin GET /admin/feedback filters work; commuter_id always = auth()->id() (verify in DB).
tests/Feature/LostFoundTest.php — report happy path; list filters by status; claim on REPORTED → 200 + status=CLAIMED; second claim on CLAIMED → 409; admin confirm on CLAIMED → 200; admin confirm on REPORTED (unclaimed) → 422; admin resolve on CONFIRMED → 200; non-admin calling confirm → 403; GET /lost-found does not leak claimed_by to non-admins (assert response lacks claimed_by field).
tests/Feature/AnnouncementTest.php — admin create happy path; commuter GET shows is_read=false; commuter mark-read → 204; second mark-read → 204 (idempotent); commuter GET now shows is_read=true; admin archive → commuters no longer see it; non-admin POST create → 403; unread-count endpoint returns correct number.
tests/Feature/SosAlertTest.php — trigger happy path; second trigger within 5 min → 429 with retry_after; admin list filters by status=ACTIVE; admin acknowledge → 200 + status=ACKNOWLEDGED; admin resolve → 200 + status=RESOLVED; conductor calling POST /commuter/sos → 403; commuter calling admin ACK → 403; lat/lng out of range → 422.

Acceptance Criteria

 php artisan test is green (the existing pre-existing GCash/PayMongo failure is the only allowed failure).
 Each test file has at least 6 test methods covering: happy path, validation, wrong-role, the spec-specific edge case, and a state-transition case where applicable.
 No test depends on mocked/static data — every assertion checks DB state via $this->assertDatabaseHas(...) or ->assertDatabaseMissing(...).
 Tests use actingAs($user) (not Bearer tokens) to match the existing suite style.
 Tests use RefreshDatabase; migrations run cleanly on SQLite in-memory.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

### S6-T12 - Role-Scoped Security Audit & Data Isolation for S6

**Description:**
```
Systematically verify every Sprint 6 endpoint enforces auth:sanctum + the correct role middleware, and that no endpoint leaks another role's or another user's data. This is the Week 6 'role-scoped data access' gate — mirrors S5-T7 but for the S6 surface.

Scope

 Build a cross-role access matrix for the new S6 routes: for each protected route, assert the wrong actors get 401/403 and only the right role gets 2xx.
 Confirm commuter feedback + SOS are scoped strictly to auth()->id() — a commuter cannot submit feedback or SOS on another commuter's behalf, and cannot read another commuter's feedback/SOS history.
 Confirm lost-and-found claim is commuter-only (conductors cannot claim), and that non-admins never see claimed_by user info (privacy).
 Confirm announcements mark-read is per-user (one user marking read does not affect another user's is_read state).
 Confirm QR sign is conductor-only and scoped to transactions the conductor owns; verify is any-role but returns only the authenticated user's own transaction (admin sees any).
 Confirm admin SOS acknowledge/resolve are admin-only and the admin's id is stamped on acknowledged_by/resolved_by (audit trail).
 Confirm no S6 endpoint leaks password hashes, tokens, or other users' rows.

Files to Create / Modify

tests/Feature/S6RoleAccessMatrixTest.php (new) — data-provider-driven cross-role assertions across the S6 routes. Mirror the structure of tests/Feature/RoleAccessMatrixTest.php from S5-T7.
 Fix any controller/service that scopes by a request-supplied id instead of the authenticated user.
 Run grep -rE 'wallet|balance|top_up|stored_funds' app/ — must return zero results (carry-over from S7, but verify now since S6 adds new files).

Routes to Audit (S6 surface)

 POST /api/v1/qr/sign — CONDUCTOR only.
 POST /api/v1/qr/verify — any authenticated role.
 POST /api/v1/commuter/feedback — COMMUTER only.
 GET /api/v1/commuter/feedback — COMMUTER only (own history).
 GET /api/v1/admin/feedback — ADMIN only.
 GET /api/v1/lost-found — any authenticated role.
 POST /api/v1/lost-found — COMMUTER only.
 PUT /api/v1/lost-found/{id}/claim — COMMUTER only.
 PATCH /api/v1/lost-found/{id}/confirm — ADMIN only.
 PATCH /api/v1/lost-found/{id}/resolve — ADMIN only.
 GET/POST /api/v1/announcements (create) — ADMIN only for POST; any role for GET.
 POST /api/v1/announcements/{id}/read — any authenticated role.
 GET /api/v1/announcements/unread-count — any authenticated role.
 PATCH /api/v1/announcements/{id}/archive — ADMIN only.
 POST /api/v1/commuter/sos — COMMUTER only.
 GET /api/v1/admin/sos — ADMIN only.
 PATCH /api/v1/admin/sos/{id}/acknowledge — ADMIN only.
 PATCH /api/v1/admin/sos/{id}/resolve — ADMIN only.

Acceptance Criteria

 The S6RoleAccessMatrixTest passes: all wrong-role/owner combinations return 401/403; correct ones 2xx.
 No S6 endpoint returns another user's data when given a foreign id.
 No S6 endpoint leaks password hash, token, or claimed_by info to non-admins.
 grep -rE 'wallet|balance|top_up|stored_funds' app/ returns zero results across the S6-added files.
 The new throttle:sos limiter is per-commuter (not per-IP) — verified by simulating two commuters from the same IP.

Post-Task Requirement

Upon completion, push all changes to your feature branch and open a PR targeting dev.
```

---

## Notes for ClickUp Import

1. **Task IDs (S6-T1 … S6-T12)** — use these as the task names/titles in ClickUp. The `## Sprint 6 — Task Index` table at the top can be a single "S6 Index" task for navigation.
2. **Status** — set all 12 tasks to `s4` (or the equivalent "ready to start" status) initially.
3. **Assignees** — leave unassigned; the team picks up per the dependency graph.
4. **Dependencies** — set in ClickUp's dependency field per the table at the top (T6 depends on T1, T7 on T2, etc.; T11 + T12 depend on T1–T5).
5. **Tags** — suggest `backend`, `frontend`, `test`, `security` per the layer column.
6. **Post-Task Requirement** — every task ends with the same line: push to feature branch + open PR targeting `dev`. This matches the S5 convention.
7. **Stack notes** — the tasks assume Laravel 12 (not 11 as the PDF says) and MySQL/SQLite (not Supabase/PostgreSQL). The actual project conventions from S1–S5 take precedence over the PDF's idealized stack.
8. **No new wallet logic** — Sprint 7 will grep for `wallet|balance|top_up` across `app/`. Sprint 6 must not introduce any of these terms. Each task's acceptance criteria reiterate this.
