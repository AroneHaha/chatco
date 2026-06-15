// types/index.ts
//
// Shared types used across multiple admin data hooks and auth context.
// All field names are camelCase (the api.ts transformKeys utility
// automatically converts Laravel's snake_case responses to camelCase).
//
// Import as: import type { UserRole, AuthUser, CommuterProfile } from '@/types';

// ── UserRole (matches backend enum: ADMIN, CONDUCTOR, COMMUTER) ──────

export type UserRole = 'ADMIN' | 'CONDUCTOR' | 'COMMUTER';

// ── Auth types (used by auth-context.tsx) ────────────────────────────

export interface AdminProfile {
  id: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConductorProfile {
  id: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  birthday: string | null;
  profilePictureUrl: string | null;
  generatedUsername: string;
  generatedPassword: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommuterProfile {
  id: string;
  firstName: string | null;
  middleName: string | null;
  surname: string | null;
  birthdate: string | null;
  gender: string | null;
  email: string | null;
  contactNumber: string | null;
  commuterType: string | null;
  appliedType: string | null;
  username: string | null;
  languagePreference: string | null;
  accountStatus: string | null;
  idImageUrl: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
  commuterProfile?: CommuterProfile | null;
  conductorProfile?: ConductorProfile | null;
  adminProfile?: AdminProfile | null;
}

// ── Remittance types (used by remittance-data.ts) ────────────────────

export type RemittanceStatus = 'Remitted' | 'Pending' | 'Shortage' | 'Overage';

export interface RemittanceRecord {
  shiftId: string;
  date: string;
  conductorId: string;
  conductorName: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  unitNumber: string;
  totalPassengers: number;
  gcashScannedTotal: number;
  gcashDirectTotal: number;
  voucherTotal: number;
  totalCashless: number;
  cashDeclared: number;
  cashTotal: number;
  gcashTotal: number;
  remittanceStatus: RemittanceStatus;
  timeIn: string;
  timeOut: string | null;
  createdAt?: string;
  updatedAt?: string;
}