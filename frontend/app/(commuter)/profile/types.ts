export type CommuterType = "REGULAR" | "STUDENT" | "SENIOR_CITIZEN" | "PWD";
export type AccountStatus = "PENDING_VERIFICATION" | "ACTIVE" | "REJECTED";

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
}

export interface PasswordPayload {
  oldPassword: string;
  newPassword: string;
}