# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three roles on one system:
- **Commuters** — daily jeepney riders on the Calumpit–Meycauayan corridor (Bulacan, Philippines), tracking their ride, paying cashless, and using safety features.
- **Conductors** — on-board staff who verify units, collect/remit fares, and log lost & found items during a shift.
- **Admins/operators** — back-office staff who monitor the fleet, manage fare/financial rules, review remittances and receipts, and handle safety/lost-and-found resolution.

## Product Purpose

CHATCO digitizes the jeepney riding experience end to end: real-time GPS tracking of the vehicle, cashless fare payment (QR + GCash), and safety tooling (share-my-ride, SOS, lost & found), unified across commuter, conductor, and admin apps so all three sides of a single ride are coordinated in one system. Success is a working pilot on the Calumpit–Meycauayan route that operators can actually run rides on, not just a classroom demo.

## Positioning

Most jeepney-tracking or fare apps solve one side of the ride (either commuter-facing tracking, or driver/operator fare collection) in isolation. CHATCO's mechanism is a single coordinated system spanning commuter, conductor, and admin/operator — live vehicle tracking, per-ride cashless payment, remittance/financial reconciliation, and safety response all reference the same ride and vehicle state, rather than being separate tools bolted together.

## Operating Context

- Built as a BSIT capstone project, but aimed at a real pilot deployment (not demo-only) on the Calumpit–Meycauayan jeepney route in Bulacan.
- Frontend: Next.js 16 / React 19 / Tailwind v4, three route groups for the three roles — `(commuter)`, `(conductor)`, `(admin)` — plus `(auth)`.
- Backend: Laravel, with real-time event broadcasting (Laravel Echo/Pusher) for live tracking and status updates.
- Conductor-side unit verification, end-of-day close-out, and remittance are real operational workflows a conductor performs during/after a shift, not just reporting screens.
- Admin covers fleet/vehicle management, analytics, monitoring, remittance, receipts, fare matrix, financial rules, operations rules, safety notifications, announcements, and lost & found resolution.
- Payment flow: QR-based fare payment with GCash as the cashless rail (checkout + return flow); receipts are generated per ride.
- Rewards: voucher-based loyalty/rewards system for commuters (recent work shortened voucher validity from 30 to 3 days — treat voucher lifetime as an actively-tuned operational parameter, not a fixed constant).

## Capabilities and Constraints

- Real-time GPS tracking of jeepneys (map-based, via Leaflet) — implemented, not aspirational.
- Cashless fare payment via QR code and GCash — implemented.
- Safety features — implemented: Share My Ride (live location link for family/friends), Emergency SOS/panic button, overspeeding detection, Lost & Found reporting (commuter-reported, conductor-logged, admin-matched).
- **English-only by decision.** Multi-language support was previously stated as a product intent (EN/Filipino/regional) but has been dropped — no i18n system exists, and no future work should add a language picker back into the commuter-facing UI or landing page. The `language_preference` field still exists on the backend (DB column, model, admin/auth services) and is intentionally left as-is; only the user-facing pickers and marketing claims were removed from the frontend (landing page stats/badges, commuter profile edit).
- Conductor role has its own settings, metrics, unit verification, and end-of-day close-out flows distinct from admin.
- Admin dashboard, analytics, monitoring, and financial/fare/operations rules are distinct configuration surfaces already built out.

## Brand Commitments

- Name: **CHATCO**. Tagline register: "The Future of Jeepney Rides."
- Established color identity already in code: deep navy (`#071A2E`) as the dark/hero surface, CHATCO Blue (`#1A5FB4`, admin primary `#62A0EA`) as the primary brand color, with a distinct orange accent (`#FF6D3A`) for the "Pick Me Up" safety signal. Admin surfaces run a separate dark design-token scale (`--admin-*` in globals.css) from the light public/commuter surfaces.
- Font: Poppins (`--font-poppins`) as the base sans body/UI font.
- Voice leans confident/editorial on the landing page ("Why CHATCO" manifesto framing) and utilitarian/operational inside the commuter, conductor, and admin apps.

## Evidence on Hand

- Real pilot route: Calumpit–Meycauayan, Bulacan — used as the actual reference corridor, not a placeholder.
- No confirmed real testimonials, press, case studies, or named operator partner beyond the route itself — do not fabricate these for future work.
- Existing landing page (`frontend/app/page.tsx` and `frontend/components/landing/*`) and admin design tokens (`frontend/app/globals.css`) are the current visual authority; no DESIGN.md exists yet to formally record them.

## Product Principles

1. One ride, one system — commuter, conductor, and admin views must stay coordinated around the same ride/vehicle state rather than drifting into siloed tools.
2. Cashless-first, but never blocking — QR/GCash payment is the default path; failure or edge cases in payment must not strand a commuter mid-ride.
3. Safety is one tap away — SOS, share-my-ride, and lost & found are core features, not add-ons, and should stay fast to reach under stress.
4. Build for the real pilot, not the demo — Calumpit–Meycauayan is a real corridor with real operational constraints (conductors, remittance, end-of-day close-out); prioritize what makes that pilot actually runnable.
5. English-only, deliberately — don't reintroduce language-selection UI or multi-language marketing claims; if localization becomes a real requirement later, that's a scoped decision to revisit, not a default to drift back into.

## Accessibility & Inclusion

No formal accessibility standard has been confirmed as a requirement. The product is English-only by decision — this is not an accessibility gap to fill, it's a scope boundary.
