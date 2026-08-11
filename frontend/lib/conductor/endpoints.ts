// Conductor-scoped API endpoint registry.
// Relative paths target Next.js route stubs by default.
// When migrating to Laravel, point NEXT_PUBLIC_API_URL at the gateway and
// update these paths to match the backend contract.

export const CONDUCTOR_API = {
  profile: "/api/conductor/profile",
  units: "/api/conductor/units",
  drivers: "/api/conductor/drivers",
  receiptSettings: "/api/conductor/receipt-settings",
  shifts: {
    active: "/api/conductor/shifts/active",
    start: "/api/conductor/shifts/start",
    end: "/api/conductor/shifts/end",
  },
  transactions: {
    list: (shiftId: string) =>
      `/api/conductor/transactions?shift_id=${encodeURIComponent(shiftId)}`,
    page: (
      shiftId: string,
      params: {
        page: number;
        perPage: number;
        paymentMethod?: string;
        dateFrom?: string;
        dateTo?: string;
      }
    ) => {
      const search = new URLSearchParams({
        shift_id: shiftId,
        page: String(params.page),
        per_page: String(params.perPage),
      });
      if (params.paymentMethod) search.set("payment_method", params.paymentMethod);
      if (params.dateFrom) search.set("date_from", params.dateFrom);
      if (params.dateTo) search.set("date_to", params.dateTo);
      return `/api/conductor/transactions?${search.toString()}`;
    },
    create: "/api/conductor/transactions",
  },
  earnings: {
    // GET /api/conductor/earnings?shift_id={id}
    // Returns { cash_total, gcash_total, total } from the DB
    // (only PAID transactions count; PENDING GCash is excluded)
    get: (shiftId: string) =>
      `/api/conductor/earnings?shift_id=${encodeURIComponent(shiftId)}`,
  },
  remittances: {
    list: "/api/conductor/remittances?per_page=100",
    create: "/api/conductor/remittances",
  },
  payments: {
    gcashInitiate: "/api/conductor/payments/gcash/initiate",
    gcashPending: "/api/conductor/payments/gcash/pending",
    status: (id: string) => `/api/payments/${encodeURIComponent(id)}/status`,
    simulate: (id: string) => `/api/payments/${encodeURIComponent(id)}/simulate`,
  },
  ratings: (shiftId: string) =>
    `/api/conductor/ratings?shift_id=${encodeURIComponent(shiftId)}`,
  hails: "/api/conductor/hails",
  hailAccept: (id: string) =>
    `/api/conductor/hails/${encodeURIComponent(id)}/accept`,
  hailReject: (id: string) =>
    `/api/conductor/hails/${encodeURIComponent(id)}/reject`,
  shiftLogs: "/api/conductor/shift-logs",
  breakStatus: "/api/conductor/break-status",
  location: "/api/conductor/location",
  capacityStatus: "/api/conductor/capacity-status",
} as const;
