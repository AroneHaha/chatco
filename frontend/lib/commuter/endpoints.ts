// lib/commuter/endpoints.ts
// Commuter-scoped API endpoint registry.
// Same pattern as lib/conductor/endpoints.ts.
//
// Relative paths target Next.js route stubs by default.
// When migrating to Laravel, point NEXT_PUBLIC_API_URL at the gateway and
// update these paths to match the backend contract.

export const COMMUTER_API = {
  profile: "/api/commuter/profile",
  tracking: {
    nearby: "/api/commuter/tracking/nearby",
    hail: "/api/commuter/hail",
    cancelHail: (id: string) => `/api/commuter/hail/${id}`,
  },
  payments: {
    history: "/api/commuter/payments",
    create: "/api/commuter/payments",
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
    submit: "/api/commuter/feedback",
  },
  sos: {
    create: "/api/commuter/sos",
  },
} as const;
