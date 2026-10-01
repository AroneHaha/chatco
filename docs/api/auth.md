# Auth API

Login, logout, the current user, commuter self-sign-up with email verification, and password reset.

- **Controller:** `app/Http/Controllers/Auth/AuthController.php`
- **Services:** `AuthService`, `EmailVerificationService`, `RegistrationGuard`

All paths are relative to `/api/v1`. Conventions (envelope, error shapes, rate limits) are in [README.md](README.md).

Every endpoint here except `logout` and `GET /user` is public and uses the `auth` limiter: **10 requests per minute per IP**, shared across all of these routes.

> Commuter password **change** (signed in, current password plus an emailed code) is a commuter endpoint. See [commuter.md](commuter.md#password-change-two-steps).

## Contents

- [POST /auth/login](#post-authlogin)
- [Session rules](#session-rules)
- [POST /auth/logout](#post-authlogout)
- [GET /user](#get-user)
- [Sign-up flow](#sign-up-flow)
  - [POST /auth/register/send-code](#post-authregistersend-code)
  - [POST /auth/register/verify-code](#post-authregisterverify-code)
  - [POST /auth/register](#post-authregister)
- [Password reset flow](#password-reset-flow)
  - [POST /auth/forgot-password](#post-authforgot-password)
  - [POST /auth/verify-reset-code](#post-authverify-reset-code)
  - [POST /auth/reset-password](#post-authreset-password)

---

## POST /auth/login

Exchanges credentials for a Sanctum Bearer token. The same endpoint serves all three roles.

**Body (JSON)**

| Field | Type | Rules |
|---|---|---|
| `login` | string | Required. One of: an email (any role), a **conductor's generated username**, or a **commuter's username**. Lookups are tried in that order. |
| `password` | string | Required, min 6 |
| `device_id` | string | Optional. 16–100 characters, `[A-Za-z0-9._:-]`. Must be stable per browser or app install. |
| `device_type` | string | `WEB` or `MOBILE`. Required when `device_id` is sent. |

> The Next.js handler (`frontend/app/api/auth/login/route.ts`) accepts `email` from the browser and forwards it to Laravel as `login`.

**200 OK**

```json
{
  "success": true,
  "data": {
    "id": "9c1e…",
    "email": "juan@gmail.com",
    "role": "COMMUTER",
    "name": "Juan Dela Cruz",
    "token": "12|Xf3…"
  },
  "message": "Login successful"
}
```

**Errors**

| Status | When | `message` |
|---|---|---|
| 401 | Wrong login or password (it never reveals which) | `Invalid credentials` |
| 403 | The user has an active suspension record | `This account is suspended until Oct 3, 2026 5:00 PM. Reason: …` (or `permanently`) |
| 403 | The conductor was disabled by an admin | `This conductor account has been disabled. Ask an administrator to reset your credentials.` |
| 403 | Commuter `account_status` is `SUSPENDED` | `This account has been suspended.` |
| 403 | Commuter `account_status` is `PENDING` | `Your account is pending admin approval.` |
| 403 | Commuter `account_status` is `REJECTED` | `Your registration was rejected. Please contact support.` |
| 409 | A conductor logs in **without** `device_id` while another device owns their active shift. This uses error shape B (bare `message`). | `Update this conductor client before moving an active shift from another device.` |
| 422 | Missing or invalid fields | Field errors in `errors` |
| 429 | Rate limited | `Too many requests. Please slow down.` |

Account-status checks run **after** the password check, so a `403` never reveals whether an email exists.

## Session rules

Logging in revokes older tokens. Which tokens it revokes depends on role and `device_type`:

| Who | `device_type` sent? | Tokens revoked | New token name |
|---|---|---|---|
| Admin | any | **All** of the user's tokens (one session total) | `auth-token` |
| Conductor or commuter | `WEB` or `MOBILE` | Only that platform's token, plus any legacy `auth-token` | `auth-token:WEB` / `auth-token:MOBILE` |
| Conductor or commuter | omitted | **All** of the user's tokens | `auth-token` |

So a conductor can stay signed in on the web portal and the mobile app at once, but a second web login kicks out the first.

The displaced device finds out on its next request, which returns `401`. The web client then redirects to `/login?reason=session_ended`.

Logins are serialized with a row lock on the user, so two simultaneous logins always leave exactly one token per slot.

**Conductor shift handoff on login.** If the conductor has an active shift and logs in with a `device_id`:

- If no device owns the shift yet, this device becomes its operating device.
- If a **different** device owns it, ownership moves to this device and the handoff is logged.

No shift, transaction or remittance data changes. See [Conductor device ownership](README.md#conductor-device-ownership).

> Scripts that log in as a shared admin account will sign out whoever is using it, because admins get a single session.

## POST /auth/logout

Revokes **only** the token that made the request. Other platform sessions survive.

- **Auth:** any signed-in role
- **Body:** none

**200 OK:** `data: null`, `message: "Logged out successfully"`

## GET /user

Returns the signed-in user plus role-specific profile fields.

- **Auth:** any signed-in role
- **Limiter:** none

**200 OK**

```json
{
  "data": {
    "user": {
      "id": "9c1e…",
      "email": "juan@gmail.com",
      "role": "COMMUTER",
      "name": "Juan Dela Cruz"
    },
    "profile": { }
  }
}
```

The contents of `profile` depend on `role`:

| Role | `profile` fields |
|---|---|
| `ADMIN` | `first_name`, `middle_name`, `last_name` |
| `CONDUCTOR` | `first_name`, `middle_name`, `last_name`, `username` (the generated login username) |
| `COMMUTER` | `first_name`, `surname`, `username`, `commuter_type`, `account_status` |

For the full commuter profile, use [`GET /commuter/profile`](commuter.md#get-commuterprofile).

---

## Sign-up flow

Only commuters can self-register. Conductors and admins are created by an admin. Sign-up takes three calls:

```
1. POST /auth/register/send-code    { email }           → 6-digit code is emailed
2. POST /auth/register/verify-code  { email, code }     → email marked verified for 60 min
3. POST /auth/register              { ...full form }    → account created as PENDING
```

After step 3 **no token is issued**. The account stays `PENDING` until an admin approves it through `POST /admin/registrations/{id}/approve`. Until then, login returns `403` "pending admin approval".

Emails are normalized (trimmed and lower-cased) at every step, so `Juan@Gmail.com` and `juan@gmail.com` are the same address.

**Timing constants** (from `EmailVerificationService` and `config/registration.php`):

| Constant | Value |
|---|---|
| Code lifetime | 15 minutes |
| Resend cooldown | 60 seconds |
| Wrong attempts before the code is burned | 5 |
| Verified-email window for completing step 3 | 60 minutes |
| Rejection cooldown | 3 rejections for the same email or contact number block sign-up for 3 days (`REGISTRATION_REJECTION_THRESHOLD`, `REGISTRATION_COOLDOWN_DAYS`) |

### POST /auth/register/send-code

Emails a 6-digit verification code.

This step also runs the checks that would fail registration later (rejection cooldown, email already in use). That way the applicant learns about them before filling in the whole form.

**Body (JSON)**

| Field | Type | Rules |
|---|---|---|
| `email` | string | Required, RFC email, max 255 |
| `contact_number` | string | Optional, `09XXXXXXXXX`. When sent, it is also checked against the rejection cooldown. |

**200 OK**

```json
{
  "data": { "expires_in_minutes": 15, "resend_in_seconds": 60 },
  "message": "We sent a 6-digit code to juan@gmail.com. It expires in 15 minutes."
}
```

**Errors**

| Status | When |
|---|---|
| 422 | Invalid email; `errors.email = ["That email is already in use."]`; or the email/contact is in its rejection cooldown (`errors.email` names the date sign-ups reopen) |
| 429 | Asked again within 60 s: `"You just requested a code. Please wait N seconds before asking for another."` |
| 502 | Mail delivery failed: `"We could not send the verification code right now. ..."` |

### POST /auth/register/verify-code

Checks the code. A correct code marks the email as verified for 60 minutes.

**Body (JSON)**

| Field | Type | Rules |
|---|---|---|
| `email` | string | Required |
| `code` | string | Required. Surrounding whitespace is trimmed. |

**200 OK**

```json
{
  "data": { "verified_for_minutes": 60 },
  "message": "Email verified. You can finish creating your account."
}
```

**Errors**

| Status | When |
|---|---|
| 400 | Wrong code (the message says how many attempts are left), no code requested, or the code expired |
| 429 | The 5th wrong attempt burns the code: `"Too many incorrect attempts. Please request a new code."` The client must go back to step 1. |

`429` here means "request a new code", not "slow down". Branch on the status code.

### POST /auth/register

Creates the commuter account with `account_status = PENDING` and notifies admins.

- **Content-Type:** `multipart/form-data`, because of `id_image`

**Body**

| Field | Type | Rules |
|---|---|---|
| `first_name` | string | Required, max 100 |
| `middle_name` | string | Optional, max 100. The server title-cases it. |
| `suffix` | string | Optional. One of `Jr.`, `Sr.`, `II`, `III`, `IV`. |
| `surname` | string | Required, max 100 |
| `birthdate` | date | Required, before today |
| `gender` | string | Required, max 20 |
| `email` | string | Required. **Must have been verified in the last 60 min** (steps 1–2). |
| `contact_number` | string | Required, `09XXXXXXXXX` |
| `username` | string | Required, max 50, unique among commuters |
| `password` | string | Required. Strong-password policy (see [README](README.md#request-conventions)). |
| `password_confirmation` | string | Required. Must match `password`. |
| `applied_type` | string | Required. `REGULAR`, `STUDENT`, `SENIOR` or `PWD`. |
| `id_image` | file | jpeg/jpg/png/webp, max 5 MB. **Required** when `applied_type` is not `REGULAR`. For `REGULAR` it is required only while the admin setting `require_id_upload` is on (see `GET /system-status`). |
| `language_preference` | string | Optional, max 20, defaults to `English`. The product is English-only, so the frontend no longer sends this. |

**201 Created**

```json
{
  "data": {
    "id": "9c1e…",
    "email": "juan@gmail.com",
    "role": "COMMUTER",
    "account_status": "PENDING",
    "applied_type": "STUDENT"
  },
  "message": "Registration submitted. An admin will review your account shortly."
}
```

**Errors** (all `422` with field errors)

| Field | Reason |
|---|---|
| `email` | `"Please verify this email address before creating your account. ..."` (no verified code in the last 60 min, or the verification was already used) |
| `email` | Already registered, including a race lost against a simultaneous sign-up |
| `email` | In rejection cooldown |
| `username` | Already taken |
| `id_image` | `"A valid ID image is required to complete registration."` |
| other | Standard validation |

**Side effects**

- **The ID image is uploaded to private R2 storage before the database insert.** If the insert fails, the upload is deleted, so no orphaned ID images are left behind.
- **The email verification is consumed.** One verification creates one account.
- **Admins get a `NEW_REGISTRATION` notification.**

---

## Password reset flow

```
1. POST /auth/forgot-password    { email }                         → 6-digit code emailed
2. POST /auth/verify-reset-code  { email, code }                   → optional pre-check
3. POST /auth/reset-password     { email, code, password, password_confirmation }
```

| Rule | Value |
|---|---|
| Code lifetime | 15 minutes |
| Attempts allowed | 5 wrong attempts, then the code is deleted |
| Storage | Hashed in `password_reset_tokens` |
| New code request | Replaces the old code and resets the attempt count |

Step 2 is optional: step 3 re-checks the code anyway.

Only accounts that can already log in may reset. Commuters who are `PENDING` or `REJECTED` are refused.

### POST /auth/forgot-password

**Body:** `email` (required, email)

**200 OK:** `data: null`, `message: "We have sent a 6-digit reset code to your email."`

**Errors**

| Status | When |
|---|---|
| 404 | No live account has this email. This is deliberate: the message also explains that pending or rejected registrations cannot reset. |
| 403 | Commuter still `PENDING`: `"Your account is still pending admin approval. ..."` |
| 403 | Commuter `REJECTED`: `"Your registration was not approved, so this account cannot reset a password."` |
| 502 | Mail delivery failed |

> Returning `404` for an unknown email lets someone probe which emails have accounts. This is a conscious trade-off, because registration already exposes the same fact. The 10/min IP limit blocks bulk harvesting.

### POST /auth/verify-reset-code

**Body:** `email`, `code` (both required)

**200 OK:** `data: null`, `message: "Code verified. You can now set a new password."`

**Errors:** `400` for a wrong, expired or missing code, and also when attempts run out ("Too many incorrect attempts. Please request a new code.").

> Unlike sign-up verification, running out of attempts here is `400`, not `429`. Use the message text to tell the cases apart.

### POST /auth/reset-password

**Body (JSON)**

| Field | Rules |
|---|---|
| `email` | Required |
| `code` | Required |
| `password` | Required. Strong-password policy. |
| `password_confirmation` | Required. Must match `password`. |

**200 OK:** `data: null`, `message: "Password reset successfully. You can now log in."`

All of these happen in one database transaction:

- the password is updated;
- **every token for the account is revoked**, signing out web and mobile;
- the code is deleted.

**Errors**

| Status | When |
|---|---|
| 400 | Wrong, expired or locked code, or the account vanished |
| 403 | The account is a `PENDING` or `REJECTED` commuter (re-checked at this step too) |
| 422 | Password policy or confirmation failed |
