// Conductor-scoped API endpoint registry.
// Relative paths target Next.js route stubs by default.
// When migrating to Laravel, point NEXT_PUBLIC_API_URL at the gateway and
// update these paths to match the backend contract.

export const CONDUCTOR_API = {
  profile: "/api/conductor/profile",
  units: "/api/conductor/units",
  drivers: "/api/conductor/drivers",
  shifts: {
    active: "/api/conductor/shifts/active",
    start: "/api/conductor/shifts/start",
    end: "/api/conductor/shifts/end",
  },
  transactions: {
    list: (shiftId: string) =>
      `/api/conductor/transactions?shift_id=${encodeURIComponent(shiftId)}`,
    create: "/api/conductor/transactions",
  },
  remittances: {
    list: "/api/conductor/remittances",
    create: "/api/conductor/remittances",
  },
  ratings: (shiftId: string) =>
    `/api/conductor/ratings?shift_id=${encodeURIComponent(shiftId)}`,
  hails: "/api/conductor/hails",
  shiftLogs: "/api/conductor/shift-logs",
  location: "/api/conductor/location",
} as const;
