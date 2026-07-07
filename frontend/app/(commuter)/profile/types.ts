// app/(commuter)/profile/types.ts
// Re-exports from canonical @/types to avoid duplication.
// Only PasswordPayload is local to this module.

export type { CommuterType, AccountStatus, CommuterProfile } from "@/types";

/**
 * Local form payload for the change-password modal.
 *
 * The frontend uses camelCase field names for readability; the profile
 * service translates these to the backend's snake_case contract
 * (`current_password`, `password`, `password_confirmation`).
 */
export interface PasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
