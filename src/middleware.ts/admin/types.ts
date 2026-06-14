// lib/admin/types.ts
// Canonical type definitions for the admin service layer.
// Follows the same pattern as lib/conductor/types.ts and lib/commuter/types.ts.
//
// When Laravel backend is integrated, these types represent the API contract.

// ─── Async State Helpers ─────────────────────────────────────────────

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

// ─── Dashboard ───────────────────────────────────────────────────────

export interface AdminStatItem {
  label: string;
  value: string;
  icon: string; // Lucide icon name — resolved at component level
  color: string;
  link: string;
}

export interface AdminDashboardData {
  quickStats: AdminStatItem[];
  topPickupPoints: { name: string; val: number }[];
  paymentTendencies: { gcash: number; cash: number };
  recentVehicles: { unit: string; driver: string; status: string }[];
  recentLostFound: { item: string; status: string }[];
  recentUsers: { name: string; role: string; status: string }[];
}

// ─── Users ───────────────────────────────────────────────────────────

export interface AdminActiveUser {
  id: string;
  name: string;
  email: string;
  commuterType: string;
  accountStatus: "ACTIVE" | "SUSPENDED";
  verifiedAt: string | null;
  createdAt: string;
}

export interface AdminPendingRequest {
  id: string;
  name: string;
  email: string;
  commuterType: string;
  idImageUrl: string;
  submittedAt: string;
}

export interface AdminRejectedUser {
  id: string;
  name: string;
  email: string;
  commuterType: string;
  rejectedAt: string;
  reason: string;
}

// ─── Vehicles ────────────────────────────────────────────────────────

export interface AdminVehicle {
  id: string;
  unitNumber: string;
  plateNumber: string;
  route: string;
  status: "ACTIVE" | "MAINTENANCE" | "DECOMMISSIONED";
  driverName: string | null;
  conductorName: string | null;
}

export interface AdminPersonnel {
  id: string;
  name: string;
  role: "DRIVER" | "CONDUCTOR";
  status: "AVAILABLE" | "ON_SHIFT" | "TERMINATED";
  assignedUnit: string | null;
  contactNumber: string;
}

// ─── Remittance ──────────────────────────────────────────────────────

export interface AdminRemittance {
  id: string;
  conductorName: string;
  unitNumber: string;
  cashTotal: number;
  gcashTotal: number;
  voucherTotal: number;
  grandTotal: number;
  submittedAt: string;
  status: "PENDING" | "VERIFIED" | "FLAGGED";
}

// ─── Lost & Found ────────────────────────────────────────────────────

export interface AdminLostItem {
  id: string;
  category: string;
  description: string;
  status: "REPORTED" | "UNDER_REVIEW" | "CLAIMED" | "RETURNED";
  reportedAt: string;
  imageUrl: string | null;
  claimsCount: number;
}

// ─── Monitoring ──────────────────────────────────────────────────────

export interface AdminLiveVehicle {
  id: string;
  plateNumber: string;
  lat: number;
  lng: number;
  speed: number;
  capacityStatus: "Available" | "Standing" | "Full";
  conductorName: string;
  driverName: string;
  isOverspeeding: boolean;
}

export interface AdminSOSAlert {
  id: string;
  commuterName: string;
  latitude: number;
  longitude: number;
  message: string;
  status: "ACTIVE" | "RESOLVED";
  createdAt: string;
}

export interface AdminDemandZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demandLevel: "LOW" | "MEDIUM" | "HIGH";
}

// ─── Analytics ───────────────────────────────────────────────────────

export interface AdminRemittanceRecord {
  id: string;
  conductorName: string;
  date: string;
  cashTotal: number;
  gcashTotal: number;
  total: number;
  status: string;
}

export interface AdminPaymentUsage {
  method: string;
  count: number;
  percentage: number;
  total: number;
}

// ─── Receipts ────────────────────────────────────────────────────────

export interface AdminReceipt {
  id: string;
  transactionId: string;
  passengerName: string;
  amount: number;
  paymentMethod: string;
  date: string;
  status: string;
}

// ─── Settings ────────────────────────────────────────────────────────

export interface AdminFareConfig {
  baseFare: number;
  perBarangay: number;
  discountRate: number;
}

export interface AdminFinancialRules {
  gcashSplitPercentage: number;
  operatorShare: number;
  conductorShare: number;
  driverShare: number;
}

export interface AdminSafetyConfig {
  overspeedThreshold: number;
  sosAutoNotify: boolean;
  proximityAlertRadius: number;
}

export interface AdminAppConfig {
  maintenanceMode: boolean;
  maxConcurrentHails: number;
  autoApproveRegistrations: boolean;
}

export interface AdminFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

export interface AdminNotificationTemplate {
  id: string;
  type: string;
  title: string;
  message: string;
  isActive: boolean;
}

export interface AdminVoucher {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxUses: number;
  currentUses: number;
  expiresAt: string;
  isActive: boolean;
}

export interface AdminRoute {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
  totalDistance: number;
  isActive: boolean;
}
