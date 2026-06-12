// lib/commuter/types.ts
// Canonical type definitions for the commuter service layer.
// Follows the same pattern as lib/conductor/types.ts.
//
// When Laravel backend is integrated, these types represent the API contract.

import type { GpsStatus } from "@/lib/nearby-detector";

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
  nearbyVehicles: import("@/lib/nearby-detector").NearbyVehicle[];
  canHail: boolean;
  nearestVehicle: import("@/lib/nearby-detector").NearbyVehicle | null;
}
