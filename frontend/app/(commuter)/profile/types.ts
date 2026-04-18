export type CommuterType = "REGULAR" | "STUDENT" | "SENIOR_CITIZEN" | "PWD";
export type AccountStatus = "PENDING_VERIFICATION" | "ACTIVE" | "DISCOUNT_REJECTED"; // Changed REJECTED to DISCOUNT_REJECTED

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
  balance: number;
  appliedType?: CommuterType; // To show what they applied for if rejected
}

export interface PasswordPayload {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string; // Added
}