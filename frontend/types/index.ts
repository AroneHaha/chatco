/**
 * Canonical index barrel file for all shared types.
 *
 * Import from here: import { User, Transaction, ShiftLog } from "@/types";
 *
 * This ensures all consumers use the same type definitions
 * and prevents type drift across the codebase.
 */

export type {
  UserRole,
  AuthUser,
  CommuterType,
  AccountStatus,
  CommuterProfile,
} from "./user";
export {
  COMMUTER_TYPE_LABELS,
  getCommuterTypeLabel,
  DISCOUNTED_TYPES,
  DISCOUNT_RATE,
} from "./user";

export type {
  PaymentMethodType,
  QRPaymentMethod,
  PaymentStatus,
  GCashPaymentMethodType,
  Transaction,
  GCashPaymentIntent,
  CreatePaymentParams,
  QRTransactionPayload,
  CommuterPaymentRecord,
  PaymentState,
} from "./transaction";
export {
  VALID_TRANSITIONS,
  canTransition,
} from "./transaction";

export type {
  ShiftLog,
  RemittanceRecord,
  RemittanceStatus,
} from "./shift";

export type {
  AnnouncementType,
  Announcement,
} from "./announcement";

export type {
  ItemCategory,
  ClaimStatus,
  ViewTab,
  LostItem,
  ClaimData,
  PaginatedAPIResponse,
} from "./lost-found";

// ─── Tracking Types (from nearby-detector.ts) ─────────────────────────
// Re-exported for convenient access via "@/types" barrel.
// These types are used by commuter-map, dashboard, and notification modules.

export type {
  VehicleLocation,
  NearbyVehicle,
  ConductorRadiusResult,
  GpsStatus,
} from "../lib/nearby-detector";

export {
  NEARBY_RADIUS_KM,
} from "../lib/nearby-detector";