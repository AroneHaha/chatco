# ChatCo — Project Context (full architectural review)

_Generated from live GitHub repo (github.com/AroneHaha/chatco) + ClickUp workspace dump, 2026-06-26_

## 1. What ChatCo is

A school capstone project masquerading as an industry-grade transit-tech platform.
A modern jeepney dispatch + e-payment system for Philippine commuter jeepneys:

- **Commuter** (mobile web): hails nearest jeepney, sees ETA, pays via GCash scan-to-pay or cash
- **Conductor** (tablet web): starts/ends shift, broadcasts GPS, records cash fares, generates GCash QR, submits end-of-day remittance
- **Admin** (desktop web): live fleet monitoring, vehicle/driver/conductor CRUD, user management, remittance reconciliation, analytics, settings

Stack positioning: "industry-level" Laravel 12 + Next.js 16 + Pusher realtime + PayMongo GCash sandbox.

## 2. Repo layout (dev branch — the live source of truth)

```
chatco/
├── backend/                # Laravel 12 API (PHP 8.2+, Sanctum auth, MySQL)
│   ├── app/
│   │   ├── Console/Commands/ExpireStaleHails.php   # S3-T7 hail expiry scheduler
│   │   ├── Contracts/Payments/PaymentGateway.php   # Payment gateway abstraction
│   │   ├── Enums/         # UserRole, ShiftStatus, CapacityStatus, HailStatus, PaymentMethod, PaymentStatus
│   │   ├── Events/        # HailCreated, HailStatusChanged, VehicleLocationUpdated, PaymentStatusUpdated (Pusher broadcast)
│   │   ├── Exceptions/    # AccountSuspendedException, OutsideRadiusException
│   │   ├── Helpers/GeoHelper.php                   # Haversine distance (S3-T3)
│   │   ├── Http/
│   │   │   ├── ApiResponse.php                     # Consistent JSON envelope trait
│   │   │   ├── Controllers/{Auth,Commuter,Conductor,Admin,Payment}/...
│   │   │   ├── Middleware/EnsureUserRole.php       # role:COMMUTER|CONDUCTOR|ADMIN
│   │   │   └── Requests/{Admin,Commuter,Conductor}/...  # FormRequest validation
│   │   ├── Models/        # 20 models incl. User, *Profile, Vehicle, Driver, ShiftLog, Hail, Transaction, GcashPaymentIntent, PaymentEvent, Remittance, VehicleLocation, etc.
│   │   └── Services/      # Auth, Commuter, Conductor, Admin, Shift, Location, Hail, Transaction, Payment
│   │       └── Payments/Gateways/{FakeGateway, PayMongoGateway}.php   # Provider-agnostic payment
│   ├── database/migrations/  # 31 migrations, S1→S5 schema evolution
│   ├── routes/api.php     # All endpoints /api/v1/* with per-route throttling
│   └── tests/Feature/     # 14 feature test files
│
├── frontend/              # Next.js 16 (App Router) + React 19 + Tailwind 4 + Leaflet + Laravel Echo
│   ├── app/
│   │   ├── (auth)/{login,signup,forgot-password}/page.tsx
│   │   ├── (commuter)/{dashboard,profile,rewards,feedback,lost-and-found}/page.tsx
│   │   ├── (conductor)/{unit-verification,conductor-dashboard{,/metrics,/end-of-day,/conductor-settings}}/page.tsx
│   │   ├── (admin)/{admin-dashboard,users,vehicles,remittance,monitoring,receipts,lost-found,analytics,settings/*}/page.tsx
│   │   └── api/  # Next.js API routes — thin proxies to Laravel backend (avoid CORS, hold session cookie)
│   │       ├── auth/{login,logout,me}/route.ts
│   │       ├── commuter/{hail[*],payments[*]}/route.ts
│   │       ├── conductor/{shifts[*],hails[*],location,transactions,earnings,remittances,drivers,units,profile,ratings,payments/gcash/initiate}/route.ts
│   │       ├── admin/{conductors[*],drivers[*],vehicles[*],remittances,routes,shift-logs,transactions}/route.ts
│   │       ├── payments/{[id]/status,[id]/simulate}/route.ts
│   │       └── vehicles/locations/route.ts
│   ├── components/  # admin/ conductor/ commuter/ shared/ ui/ landing/ auth/
│   ├── lib/
│   │   ├── api/{client,endpoints}.ts                # Backend API client
│   │   ├── {admin,commuter,conductor}/endpoints.ts  # Per-role endpoint maps
│   │   ├── commuter/server/proxy.ts                 # Server-side proxy to Laravel
│   │   ├── conductor/server/{proxy,auth,mappers,response,seed,store}.ts
│   │   ├── conductor/services/*.service.ts          # 9 services (shift, hails, transactions, etc.)
│   │   ├── conductor/persistence/*.store.ts         # LocalStorage fallback stores (offline-first)
│   │   ├── echo.ts                                  # Laravel Echo + Pusher-js realtime client
│   │   └── shared/{fare,geo,payment,data}/*.ts      # Shared business logic
│   ├── middleware.ts  # Route group protection (admin/commuter/conductor) by session cookie
│   └── AGENTS.md      # "This is NOT the Next.js you know — read node_modules/next/dist/docs/"
│
├── installed-libs.txt  # npm install commands used
└── README.md           # Minimal
```

## 3. Branch topology

- **main** — Sprint 1 backend foundation + pre-Sprint UI work (commuter/conductor frontend was prototyped before backend existed)
- **dev** — current integration branch, contains S2 + S3 + S4 + S5-T1/T2/T3 (and partial T4-T7 from sprintMhak merge)
- **arone** — Mark Arone's working branch (most PRs come from here)
- **sprintMhak** — Mhak's branch (S5-T4/T5/T6/T7 admin endpoints)
- **mhak, rod, cze** — individual dev branches
- **PR #24 (open)** — cze's S3-T12 GeoHelper unit tests, still unmerged
- **PRs #19-33 (closed)** — Sprint 1→5 progression, all merged to dev

dev is ~30+ commits ahead of main. main has not been updated since Sprint 1 backend merge.

## 4. Backend architecture (Laravel 12)

**Auth**: Sanctum (token-based for API), session-cookie bridge for frontend via `/api/auth/login`.
**RBAC**: `EnsureUserRole` middleware using `UserRole` enum (COMMUTER/CONDUCTOR/ADMIN, uppercase after S3 migration).
**API envelope**: `ApiResponse` trait — consistent `{success, message, data}` JSON across all endpoints.
**Rate limiting**: Per-route named throttle limiters (`commuter-read`, `commuter-write`, `commuter-hail`, `commuter-security`, `conductor-read`, `conductor-write`, `conductor-gps`, `conductor-mutation`, `admin-read`, `admin-write`, `vehicle-locations`).
**Realtime**: Pusher (cluster `ap1`) — events broadcast on `HailCreated`, `HailStatusChanged`, `VehicleLocationUpdated`, `PaymentStatusUpdated`. Queue-based ShouldBroadcast (database driver in dev, redis for prod).
**Payment**: Provider-agnostic `PaymentGateway` contract with `FakeGateway` (dev/sim) and `PayMongoGateway` (sandbox). Idempotency via `PaymentEvent` model + `gcash_payment_intents` table. PayMongo webhook at `POST /payments/webhook` (public, signature-verified).
**Geo**: `GeoHelper::haversineDistance()` server-side radius enforcement for hails.
**Scheduled**: `ExpireStaleHails` artisan command (S3-T7) — auto-expires hails past TTL.

## 5. Frontend architecture (Next.js 16 + React 19)

**App Router** with route groups: `(auth)`, `(commuter)`, `(conductor)`, `(admin)`.
**API proxy pattern**: every external call goes through `app/api/*/route.ts` server-side handlers that proxy to Laravel. Avoids CORS, holds session cookie server-side, lets frontend stay client-only.
**Realtime**: `lib/echo.ts` — Laravel Echo + pusher-js client. Subscribes to channel `vehicle-locations`, `hails.{userId}`, etc.
**Maps**: Leaflet + react-leaflet 5.0 (not Google Maps). Custom markers in `commuter-map-icons.ts`.
**State**: 
- Server state: TanStack Query (planned per stack convention, but mostly `useEffect` + `fetch` patterns in current code)
- Client state: Zustand (planned; current code uses React Context + LocalStorage)
- Offline-first: `lib/conductor/persistence/*.store.ts` — LocalStorage fallbacks for shift/remittance/transactions when offline
**Auth**: `chatco_session` HTTP-only cookie set by `/api/auth/login`, read by `middleware.ts` for route-group protection.
**Validation**: FormRequest mirrors on backend; client-side Zod is NOT used (relies on native HTML validation).

## 6. Database schema (31 migrations)

Core entities:
- **users** + role-specific profiles (admin_profiles, conductor_profiles, commuter_profiles)
- **routes** + **fare_points** (route geometry + fare matrix)
- **drivers** + **vehicles** (with active_shift_id FK after S2)
- **shift_logs** (S1 created, S2 added status enum, S4 dropped route_name)
- **vehicle_locations** (S2 GPS tracking, indexed)
- **hails** (S3, with status enum + commuter/conductor FKs + lat/lng)
- **transactions** (S4 finalized for cash + GCash, idempotency indexes)
- **gcash_payment_intents** + **payment_events** (S4 PayMongo tracking)
- **remittances** (S1 created, S2 added shift FKs)
- **announcements, vouchers, lost_items, claims** (S1 operational tables)

No wallet table (S1-QA4 verified — wallet/top-up stubs were explicitly removed).

## 7. Sprint progress (from ClickUp, cross-referenced with git)

| Sprint | Backend | Frontend | Status |
|---|---|---|---|
| **S1** Foundation | ✅ 14 tasks + 7 QA closed | (predates backend, UI prototype) | DONE |
| **S2** Shift+GPS | ✅ 7 tasks + 5 hardening + 2 ctx closed | (conductor dashboard already existed) | DONE |
| **S3** Hail | ✅ 12 tasks closed | ✅ commuter hail UI proxies + dashboard | DONE |
| **S4** Transactions+GCash | ✅ 9 backend tasks closed | 🟡 cash UI ✅ / GCash UI 🟡 (T10, T12 in-progress) | 85% |
| **S5** Admin+Profile | 🟡 T1-T3 ✅ / T4-T7 in-progress (mhak) | 🔴 10 frontend integration tasks in `s4` (todo) | 25% |
| **S6** | — | — | Not planned yet |

Active branches right now:
- Mhak pushing S5-T4/T5/T6/T7 to `sprintMhak` (admin vehicle CRUD, fleet monitoring endpoint, analytics endpoint, role-scoped security audit)
- Arone merging sprintMhak into `arone` then PR'ing to `dev` (PRs #31, #33 already merged)
- 10 frontend S5 integration tasks queued (T9-T17): commuter profile UI, admin user/vehicle/fleet/analytics UI, registration + ID upload flow

## 8. Notable engineering decisions (industry-level patterns spotted)

✅ **Provider-agnostic payment** (`PaymentGateway` contract + 2 implementations) — easy to swap PayMongo → Stripe
✅ **Idempotent payments** (`payment_events` table + idempotency key on `gcash_payment_intents`) — prevents double-charges
✅ **Per-route rate limiting** with named limiters and tuned limits per endpoint type (GPS 30/min, reads 60/min, mutations 10-30/min)
✅ **Queue-based broadcasting** (ShouldBroadcast via queue, not sync) — production-safe
✅ **API versioning** (`/api/v1/` prefix, S2 [INFRA] task)
✅ **FormRequest validation** on every mutation endpoint
✅ **Consistent JSON envelope** (`ApiResponse` trait)
✅ **Role-scoped data isolation** (S5-T7 in-progress, will be the formal audit)
✅ **Offline-first conductor persistence** (LocalStorage fallback stores for shift/remittance/transactions)
✅ **Server-side Haversine radius enforcement** (not just client-side)
✅ **Auto-expire scheduler** for stale hails (prevents orphaned hail records)
✅ **Webhook signature verification** for PayMongo (S4-T6)
✅ **Hail expiry TTL** (prevents zombie hails)

## 9. Gaps / things to watch (for when I'm asked to work)

🔴 **Local `/home/z/my-project/src` is STALE** — previous agent's manual sync only captured an early snapshot. ~50+ files in `dev:frontend/` are missing locally, including all `app/api/admin/*` proxy routes (S5-T3/T4 frontend wiring), `app/api/conductor/earnings`, `app/api/conductor/hails/[id]/{accept,reject}`, `app/api/commuter/hail/*`, `app/api/auth/{logout,me}`, `app/(conductor)/hooks/use-conductor-location-broadcast.ts`. **If asked to work on frontend, I MUST first sync local src/ from dev branch.**
🟡 **PR #24 (cze — S3-T12 GeoHelper unit tests) still open** — needs review/merge
🟡 **No `gh-pages` / preview deployment** — only local dev
🟡 **No CI/CD** — no GitHub Actions, all merges manual
🟡 **dev is ~30 commits ahead of main** — main is stale since Sprint 1
🟡 **README is essentially empty** (just "chatco-tracking-capstone")
🟡 **No Zod** on frontend — relies on HTML native validation
🟡 **No TanStack Query** actually used yet (planned per stack convention but current code uses useEffect+fetch)
🟡 **No Zustand** actually used yet (planned but current code uses Context + LocalStorage)
🟡 **2 in-progress S4 GCash UI tasks** (T10, T12) may be blocked on PayMongo sandbox testing
🟡 **10 S5 frontend integration tasks queued** (T9-T17) — these are the next big batch of work
🟡 **Local dev DB is SQLite** (per Next.js stack rules) but backend uses MySQL — schema drift possible
🟡 **Local has no Laravel backend running** — only Next.js on port 3000. To exercise full stack, Laravel backend must be run separately (not currently set up).

## 10. Workspace team (from ClickUp)

- **Mark Arone Dela Cruz** (markaronedc@gmail.com) — owner, main backend dev, PRs from `arone` branch
- **Mhaku Jose Manalili** (manalilimhakujose@gmail.com) — backend dev, working S5-T4-T7 on `sprintMhak` branch
- **Rod Dulalia** (ericktuazondulalia@gmail.com) — backend/frontend, hardening tasks, handoff specs
- **Marinel Carbonell** (lyraresflovilla@gmail.com) — QA (S1-QA1-QA7), documentation
- **Czerina Pieded** (czerina.pieded1030@gmail.com) — recently invited, working on S3-T12 (PR #24)

## 11. Local working state at /home/z/my-project

- Next.js 16 project scaffolded at root (NOT the `frontend/` folder from dev branch)
- Local `src/` is an older snapshot of dev:frontend/ (Sprint 2-era UI work + Batch 3 shared component refactor)
- Prisma + SQLite configured (`prisma/schema.prisma`, `db/custom.db`) — but NOT used by the actual project (the real backend is Laravel + MySQL)
- Git remote `origin` now configured with PAT embedded → can pull/push
- ClickUp dump saved at `upload/clickup/` (84 tasks, open + closed)
- Dev server runs on port 3000 via `bun run dev`
