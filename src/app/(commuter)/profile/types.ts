// app/(commuter)/profile/types.ts
// Re-exports from canonical @/types to avoid duplication.
// Only PasswordPayload is local to this module.

export type { CommuterType, AccountStatus, CommuterProfile } from "@/types";

export interface PasswordPayload {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
