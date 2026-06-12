// Conductor-scoped API endpoint registry.
// Connect real Laravel routes here when the backend is available.

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

export const CONDUCTOR_API = {
  profile: `${BASE}/api/conductor/profile`,
  units: `${BASE}/api/conductor/units`,
  drivers: `${BASE}/api/conductor/drivers`,
  shifts: {
    active: `${BASE}/api/conductor/shifts/active`,
    start: `${BASE}/api/conductor/shifts/start`,
    end: `${BASE}/api/conductor/shifts/end`,
  },
  transactions: {
    list: (shiftId: string) =>
      `${BASE}/api/conductor/transactions?shift_id=${encodeURIComponent(shiftId)}`,
    create: `${BASE}/api/conductor/transactions`,
  },
  remittances: {
    list: `${BASE}/api/conductor/remittances`,
    create: `${BASE}/api/conductor/remittances`,
  },
  ratings: (shiftId: string) =>
    `${BASE}/api/conductor/ratings?shift_id=${encodeURIComponent(shiftId)}`,
  hails: `${BASE}/api/conductor/hails`,
  location: `${BASE}/api/conductor/location`,
} as const;
