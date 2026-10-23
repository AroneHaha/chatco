/**
 * Canonical User types for the entire Chatco application.
 *
 * Architecture notes (Laravel + Supabase):
 * - AuthUser maps to Laravel Sanctum's authenticated user (from /api/user)
 * - CommuterProfile maps to the `commuter_profiles` Supabase table
 * - UserRole maps to the `role` column in the `users` table
 *
 * This file is the SINGLE SOURCE OF TRUTH for all user-related types.
 * Do NOT re-define User, UserRole, or CommuterProfile elsewhere.
 */

// ─── Role ────────────────────────────────────────────────────────────
export type UserRole = "COMMUTER" | "ADMIN" | "CONDUCTOR";

/** Shared destinations for verified roles; unknown roles have no access. */
export function getRoleDashboard(role: string | null | undefined): string | null {
  switch (role) {
    case "ADMIN": return "/admin-dashboard";
    case "CONDUCTOR": return "/conductor-dashboard";
    case "COMMUTER": return "/dashboard";
    default: return null;
  }
}

// ─── Auth User (from Laravel Sanctum /api/user) ─────────────────────
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  /** Laravel `User::getDisplayName()`; falls back to the email when no profile exists. */
  name?: string;
}

// ─── Commuter Type & Account Status ──────────────────────────────────
export type CommuterType = "REGULAR" | "STUDENT" | "SENIOR_CITIZEN" | "PWD";
export type AccountStatus =
  | "PENDING_VERIFICATION"
  | "PENDING"
  | "ACTIVE"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "DISCOUNT_REJECTED";

// ─── Commuter Profile (from Supabase commuter_profiles table) ────────
export interface CommuterProfile {
  id: string;
  firstName: string;
  middleName: string | null;
  surname: string;
  birthdate: string;
  gender: string;
  email: string;
  contactNumber: string;
  commuterType: CommuterType;
  username: string;
  languagePreference: string;
  accountStatus: AccountStatus;
  idImageUrl: string | null;
  profileImageUrl?: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  appliedType?: CommuterType;
}

// ─── Display Label for CommuterType ──────────────────────────────────
export const COMMUTER_TYPE_LABELS: Record<CommuterType, string> = {
  REGULAR: "Regular",
  STUDENT: "Student",
  SENIOR_CITIZEN: "Senior Citizen",
  PWD: "PWD",
};

/** Commuter types eligible for 20% discount */
export const DISCOUNTED_TYPES = new Set<CommuterType>([
  "STUDENT",
  "SENIOR_CITIZEN",
  "PWD",
]);

export const DISCOUNT_RATE = 0.2;

/**
 * Backend commuter_type/applied_type store seniors as "SENIOR" (sign-up and
 * admin save that value), while the frontend type uses "SENIOR_CITIZEN".
 * Convert raw API values here so labels and discount checks find the type.
 */
export function toCommuterType(value: string | null | undefined): CommuterType | undefined {
  if (!value) return undefined;
  return (value === "SENIOR" ? "SENIOR_CITIZEN" : value) as CommuterType;
}

export function getCommuterTypeLabel(type: CommuterType): string {
  return COMMUTER_TYPE_LABELS[type];
}
