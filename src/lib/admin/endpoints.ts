// lib/admin/endpoints.ts
// Admin-scoped API endpoint registry.
// Same pattern as lib/conductor/endpoints.ts and lib/commuter/endpoints.ts.
//
// Relative paths target Next.js route stubs by default.
// When migrating to Laravel, update these paths to match the backend contract.

export const ADMIN_API = {
  dashboard: "/api/admin/dashboard",
  users: {
    list: "/api/admin/users",
    active: "/api/admin/users/active",
    pending: "/api/admin/users/pending",
    rejected: "/api/admin/users/rejected",
    approve: (id: string) => `/api/admin/users/${id}/approve`,
    reject: (id: string) => `/api/admin/users/${id}/reject`,
    suspend: (id: string) => `/api/admin/users/${id}/suspend`,
  },
  vehicles: {
    list: "/api/admin/vehicles",
    create: "/api/admin/vehicles",
    update: (id: string) => `/api/admin/vehicles/${id}`,
    delete: (id: string) => `/api/admin/vehicles/${id}`,
  },
  personnel: {
    list: "/api/admin/personnel",
    create: "/api/admin/personnel",
    update: (id: string) => `/api/admin/personnel/${id}`,
    terminate: (id: string) => `/api/admin/personnel/${id}/terminate`,
  },
  remittances: {
    list: "/api/admin/remittances",
    verify: (id: string) => `/api/admin/remittances/${id}/verify`,
    flag: (id: string) => `/api/admin/remittances/${id}/flag`,
  },
  lostFound: {
    list: "/api/admin/lost-found",
    create: "/api/admin/lost-found",
    update: (id: string) => `/api/admin/lost-found/${id}`,
  },
  monitoring: {
    live: "/api/admin/monitoring/live",
    sos: "/api/admin/monitoring/sos",
    resolveSos: (id: string) => `/api/admin/monitoring/sos/${id}/resolve`,
    overspeed: "/api/admin/monitoring/overspeed",
    demandZones: "/api/admin/monitoring/demand-zones",
  },
  analytics: {
    summary: "/api/admin/analytics/summary",
    remittances: "/api/admin/analytics/remittances",
    paymentUsage: "/api/admin/analytics/payment-usage",
    pickupPoints: "/api/admin/analytics/pickup-points",
  },
  receipts: {
    list: "/api/admin/receipts",
  },
  settings: {
    fareMatrix: "/api/admin/settings/fare-matrix",
    financialRules: "/api/admin/settings/financial-rules",
    safety: "/api/admin/settings/safety",
    appConfig: "/api/admin/settings/app-config",
    vouchers: "/api/admin/settings/vouchers",
    faq: "/api/admin/settings/faq",
    routes: "/api/admin/settings/routes",
    notificationTemplates: "/api/admin/settings/notification-templates",
  },
} as const;
