// lib/commuter/endpoints.ts
// Commuter-scoped API endpoint registry.
// Same pattern as lib/conductor/endpoints.ts.
//
// Relative paths target Next.js route stubs by default.
// When migrating to Laravel, point NEXT_PUBLIC_API_URL at the gateway and
// update these paths to match the backend contract.

export const COMMUTER_API = {
  profile: "/api/commuter/profile",
  changePassword: "/api/commuter/change-password",
  tracking: {
    nearby: "/api/commuter/tracking/nearby",
    hail: "/api/commuter/hail",
    cancelHail: (id: string) => `/api/commuter/hail/${id}`,
  },
  payments: {
    history: "/api/commuter/payments",
    create: "/api/commuter/payments",
    claim: "/api/commuter/payments/claim",
    status: (id: string) => `/api/payments/${encodeURIComponent(id)}/status`,
    simulate: (id: string) => `/api/payments/${encodeURIComponent(id)}/simulate`,
    redeemVoucher: (id: string) => `/api/commuter/payments/${encodeURIComponent(id)}/redeem-voucher`,
  },
  receipts: {
    claim: "/api/commuter/receipts/claim",
  },
  rewards: {
    summary: "/api/commuter/rewards",
    vouchers: "/api/commuter/rewards/vouchers",
  },
  announcements: {
    list: "/api/commuter/announcements",
    markRead: (id: string) => `/api/commuter/announcements/${id}/read`,
  },
  lostFound: {
    list: "/api/commuter/lost-found",
    claim: "/api/commuter/lost-found/claim",
  },
  feedback: {
    /** POST — submit a rating (+ optional comment) for a ride's shift_id (S6-T7). */
    submit: "/api/commuter/feedback",
    /** GET — the commuter's own feedback history, for the read-only "View Feedback" state (S6-T7). */
    history: "/api/commuter/feedback/history",
  },
  /**
   * Sprint 6 — Feedback Unit-QR resolution layer (S6-T6 frontend wiring).
   *
   *   validate  — pre-check a scanned token's signature + expiry (no DB hit)
   *   scan      — verify + resolve today's driver + conductor from shift_logs
   *
   * Both are commuter-only. The scan response carries the `shift_id` that
   * the subsequent POST /commuter/feedback (S6-T2) consumes.
   */
  feedbackQr: {
    validate: "/api/qr/validate",
    scan: "/api/qr/scan",
    /** Permanent unit-QR: resolves today's crew from a bare vehicle_id. */
    scanPublic: "/api/qr/scan-public",
  },
  sos: {
    /** POST — trigger a new emergency SOS alert with lat/lng (S6-T10). */
    create: "/api/commuter/sos",
    /** GET — poll the commuter's own alert status (ACTIVE/ACKNOWLEDGED/RESOLVED). */
    status: (id: string) => `/api/commuter/sos/${encodeURIComponent(id)}`,
  },
} as const;
