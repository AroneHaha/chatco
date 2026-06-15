// lib/api/endpoints.ts
// Centralized API endpoint registry for Chatco.
// When the Laravel backend is integrated, all URLs are defined here
// so migrating from mock data to real API calls only requires updating these constants.

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ─── Auth ────────────────────────────────────────────────────────────
export const AUTH = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,
  ME: `${API_BASE_URL}/user`, // Laravel Sanctum's /api/user
  CSRF: `${API_BASE_URL}/sanctum/csrf-cookie`,
} as const;

// ─── Transactions ────────────────────────────────────────────────────
export const TRANSACTIONS = {
  LIST: `${API_BASE_URL}/transactions`,
  CREATE: `${API_BASE_URL}/transactions`,
  GET: (id: string) => `${API_BASE_URL}/transactions/${id}`,
  BY_SHIFT: (shiftId: string) => `${API_BASE_URL}/transactions?shift_id=${shiftId}`,
} as const;

// ─── Shifts ──────────────────────────────────────────────────────────
export const SHIFTS = {
  LIST: `${API_BASE_URL}/shifts`,
  START: `${API_BASE_URL}/shifts/start`,
  END: (id: string) => `${API_BASE_URL}/shifts/${id}/end`,
  ACTIVE: `${API_BASE_URL}/shifts/active`,
} as const;

// ─── Remittances ─────────────────────────────────────────────────────
export const REMITTANCES = {
  LIST: `${API_BASE_URL}/remittances`,
  CREATE: `${API_BASE_URL}/remittances`,
  GET: (id: string) => `${API_BASE_URL}/remittances/${id}`,
} as const;

// ─── Payments (PayMongo) ─────────────────────────────────────────────
export const PAYMENTS = {
  CREATE_INTENT: `/api/payments/create`,
  VERIFY: `/api/payments/verify`,
  REFUND: `/api/payments/refund`,
  WEBHOOK: `/api/payments/webhook`,
} as const;

// ─── QR ──────────────────────────────────────────────────────────────
export const QR = {
  SIGN: `/api/qr/sign`,
  VERIFY: `${API_BASE_URL}/qr/verify`,
} as const;

// ─── Users ───────────────────────────────────────────────────────────
export const USERS = {
  LIST: `${API_BASE_URL}/users`,
  GET: (id: string) => `${API_BASE_URL}/users/${id}`,
  PROFILE: (id: string) => `${API_BASE_URL}/users/${id}/profile`,
} as const;

// ─── Vehicles ────────────────────────────────────────────────────────
export const VEHICLES = {
  LIST: `${API_BASE_URL}/vehicles`,
  GET: (id: string) => `${API_BASE_URL}/vehicles/${id}`,
  LOCATIONS: `${API_BASE_URL}/vehicles/locations`,
} as const;

// ─── Lost & Found ────────────────────────────────────────────────────
export const LOST_FOUND = {
  LIST: `${API_BASE_URL}/lost-items`,
  CREATE: `${API_BASE_URL}/lost-items`,
  GET: (id: string) => `${API_BASE_URL}/lost-items/${id}`,
  CLAIM: (id: string) => `${API_BASE_URL}/lost-items/${id}/claims`,
} as const;

// ─── Announcements ───────────────────────────────────────────────────
export const ANNOUNCEMENTS = {
  LIST: `${API_BASE_URL}/announcements`,
  CREATE: `${API_BASE_URL}/announcements`,
} as const;

// ─── Refunds ─────────────────────────────────────────────────────────
export const REFUNDS = {
  LIST: `${API_BASE_URL}/refunds`,
  CREATE: `${API_BASE_URL}/refunds`,
  APPROVE: (id: string) => `${API_BASE_URL}/refunds/${id}/approve`,
  REJECT: (id: string) => `${API_BASE_URL}/refunds/${id}/reject`,
} as const;

// ─── Commuter-Specific ───────────────────────────────────────────────
export const COMMUTER = {
  /** Get the authenticated commuter's profile */
  PROFILE: `${API_BASE_URL}/commuter/profile`,
  /** Update commuter profile fields */
  UPDATE_PROFILE: `${API_BASE_URL}/commuter/profile`,
  /** Change password */
  CHANGE_PASSWORD: `${API_BASE_URL}/commuter/change-password`,
  /** Re-upload ID for discount verification */
  REUPLOAD_ID: `${API_BASE_URL}/commuter/reupload-id`,
  /** Get ride history for the commuter */
  RIDE_HISTORY: `${API_BASE_URL}/commuter/rides`,
  /** Get rewards / voucher data */
  REWARDS: `${API_BASE_URL}/commuter/rewards`,
  /** Redeem a voucher */
  REDEEM_VOUCHER: (voucherId: string) => `${API_BASE_URL}/commuter/vouchers/${voucherId}/redeem`,
  /** Submit feedback for a ride/driver */
  SUBMIT_FEEDBACK: `${API_BASE_URL}/commuter/feedback`,
  /** Hail a nearby vehicle */
  HAIL: `${API_BASE_URL}/commuter/hail`,
  /** Cancel an active hail */
  CANCEL_HAIL: (hailId: string) => `${API_BASE_URL}/commuter/hail/${hailId}`,
  /** SOS alert */
  SOS: `${API_BASE_URL}/commuter/sos`,
  /** Get active vehicles with locations (for map) */
  ACTIVE_VEHICLES: `${API_BASE_URL}/vehicles/locations`,
} as const;
