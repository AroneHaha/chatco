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

// ─── Auth User (from Laravel Sanctum /api/user) ─────────────────────
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

// ─── Commuter Type & Account Status ──────────────────────────────────
export type CommuterType = "REGULAR" | "STUDENT" | "SENIOR_CITIZEN" | "PWD";
export type AccountStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
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
  verifiedAt: string | null;
  createdAt: string;
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

export function getCommuterTypeLabel(type: CommuterType): string {
  return COMMUTER_TYPE_LABELS[type];
}
