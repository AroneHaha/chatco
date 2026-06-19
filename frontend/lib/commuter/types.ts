// lib/commuter/types.ts
// Canonical type definitions for the commuter service layer.
// Follows the same pattern as lib/conductor/types.ts.
//
// When Laravel backend is integrated, these types represent the API contract.

import type { GpsStatus } from "../shared/geo/nearby-detector";

// ─── Async State Helpers (same pattern as conductor) ─────────────────

export type AsyncStatus = "idle" | "loading" | "success" | "error" | "empty";

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T;
  error: string | null;
}

export function loadingState<T>(fallback: T): AsyncState<T> {
  return { status: "loading", data: fallback, error: null };
}

export function successState<T>(data: T): AsyncState<T> {
  return { status: "success", data, error: null };
}

export function errorState<T>(fallback: T, error: string): AsyncState<T> {
  return { status: "error", data: fallback, error };
}

export function emptyState<T>(fallback: T): AsyncState<T> {
  return { status: "empty", data: fallback, error: null };
}

// ─── Commuter Profile ────────────────────────────────────────────────

export interface CommuterProfileData {
  id: string;
  firstName: string;
  middleName: string | null;
  surname: string;
  birthdate: string;
  gender: string;
  email: string;
  contactNumber: string;
  commuterType: string;
  username: string;
  languagePreference: string;
  accountStatus: string;
  idImageUrl: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

// ─── Payment / Transaction ───────────────────────────────────────────

export interface CommuterPaymentRecord {
  id: string;
  shiftId: string;
  amount: number;
  paymentMethod: "CASH" | "GCASH" | "VOUCHER";
  status: "COMPLETED" | "FAILED" | "REFUNDED";
  createdAt: string;
  plateNumber?: string;
  conductorName?: string;
}

// ─── Rewards / Vouchers ──────────────────────────────────────────────

export interface CommuterVoucher {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  status: "ACTIVE" | "USED" | "EXPIRED";
  expiresAt: string;
}

export interface CommuterRewardData {
  totalPoints: number;
  currentCycle: string;
  vouchers: CommuterVoucher[];
  ridesThisMonth: number;
  pointsToNextReward: number;
}

// ─── Announcements ───────────────────────────────────────────────────

export interface CommuterAnnouncement {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "URGENT";
  isRead: boolean;
  createdAt: string;
}

// ─── Lost & Found ────────────────────────────────────────────────────

export interface CommuterLostItem {
  id: string;
  category: string;
  description: string;
  status: "REPORTED" | "UNDER_REVIEW" | "CLAIMED" | "RETURNED";
  reportedAt: string;
  imageUrl?: string;
}

export interface CommuterClaimData {
  lostItemId: string;
  commuterId: string;
  description: string;
  contactInfo: string;
}

// ─── SOS ─────────────────────────────────────────────────────────────

export interface SOSAlert {
  id: string;
  commuterId: string;
  latitude: number;
  longitude: number;
  message?: string;
  status: "ACTIVE" | "RESOLVED";
  createdAt: string;
}

// ─── Feedback ────────────────────────────────────────────────────────

export interface CommuterFeedback {
  conductorId: string;
  shiftId: string;
  rating: number;
  tags: string[];
  comment?: string;
}

// ─── Tracking ────────────────────────────────────────────────────────

export interface CommuterTrackingState {
  gpsStatus: GpsStatus;
  nearbyVehicles: import("../shared/geo/nearby-detector").NearbyVehicle[];
  canHail: boolean;
  nearestVehicle: import("../shared/geo/nearby-detector").NearbyVehicle | null;
}

// ─── Hail ────────────────────────────────────────────────────────────

/**
 * Lifecycle status of a commuter hail.
 *
 * Matches the backend App\Enums\HailStatus backed string enum.
 * Frontend uses lowercase to align with REST API conventions; backend
 * stores UPPERCASE per ShiftStatus/CapacityStatus enum pattern, but the
 * Next.js proxy layer can normalize casing if needed.
 *
 * For now, this union type intentionally accepts both casings so the
 * type system doesn't reject raw backend responses during the migration.
 */
export type HailStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "expired"
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

/**
 * Canonical hail record returned by GET/POST/DELETE /api/commuter/hail.
 *
 * Maps to the Laravel Hail model + HailController response shape:
 *   {
 *     "success": true,
 *     "data": {
 *       "id": "uuid",
 *       "commuter_id": "uuid",
 *       "vehicle_id": "uuid",
 *       "conductor_id": "uuid" | null,
 *       "commuter_lat": "14.5995120",
 *       "commuter_lng": "120.9842190",
 *       "distance_m": "850.50",
 *       "status": "PENDING",
 *       "expires_at": "2026-06-19T09:30:00.000000Z",
 *       "created_at": "2026-06-19T09:27:00.000000Z",
 *       "updated_at": "2026-06-19T09:27:00.000000Z"
 *     },
 *     "message": "Hail created",
 *     ...
 *   }
 *
 * The hail.service.ts layer strips the envelope and returns just `data`,
 * so this interface represents the inner `data` object only. Field names
 * use camelCase on the frontend; the proxy layer is responsible for any
 * snake_case → camelCase transformation if/when needed.
 */
export interface CommuterHailData {
  /** UUID of the hail record */
  id: string;
  /** UUID of the vehicle the commuter hailed */
  vehicleId: string;
  /** UUID of the conductor who accepted (null until accepted) */
  conductorId: string | null;
  /** Current lifecycle state — see HailStatus union */
  status: HailStatus;
  /** Haversine distance in meters between commuter and vehicle at creation */
  distanceM: number;
  /** ISO 8601 timestamp when the hail auto-expires (3 minutes after creation) */
  expiresAt: string;
  /** ISO 8601 timestamp when the hail was created */
  createdAt: string;
}
