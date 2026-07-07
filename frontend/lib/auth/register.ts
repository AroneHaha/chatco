// lib/auth/register.ts
//
// Frontend service for commuter self-registration.
// Submits multipart form data (including the ID image file) to
// POST /api/auth/register → Laravel /api/v1/auth/register.

export type AppliedType = "REGULAR" | "STUDENT" | "SENIOR" | "PWD";

export interface RegisterInput {
  first_name: string;
  middle_name?: string;
  surname: string;
  birthdate: string;
  gender: string;
  email: string;
  contact_number: string;
  username: string;
  password: string;
  password_confirmation: string;
  applied_type: AppliedType;
  language_preference?: string;
  id_image: File;
}

export interface RegisterResult {
  id: string;
  email: string;
  role: string;
  account_status: string;
  applied_type: string;
}

export class RegisterError extends Error {
  errors: Record<string, string[]>;
  status: number;

  constructor(message: string, errors: Record<string, string[]>, status: number) {
    super(message);
    this.name = "RegisterError";
    this.errors = errors;
    this.status = status;
  }
}

/**
 * Register a new commuter account.
 *
 * Sends multipart form data to /api/auth/register. On success, returns the
 * new account details (account_status = PENDING). On 422, throws a
 * RegisterError with field-specific validation messages.
 */
export async function register(input: RegisterInput): Promise<RegisterResult> {
  const formData = new FormData();

  formData.append("first_name", input.first_name);
  if (input.middle_name) formData.append("middle_name", input.middle_name);
  formData.append("surname", input.surname);
  formData.append("birthdate", input.birthdate);
  formData.append("gender", input.gender);
  formData.append("email", input.email);
  formData.append("contact_number", input.contact_number);
  formData.append("username", input.username);
  formData.append("password", input.password);
  formData.append("password_confirmation", input.password_confirmation);
  formData.append("applied_type", input.applied_type);
  if (input.language_preference) formData.append("language_preference", input.language_preference);
  formData.append("id_image", input.id_image);

  const res = await fetch("/api/auth/register", {
    method: "POST",
    body: formData, // browser sets Content-Type: multipart/form-data automatically
  });

  const data = await res.json();

  if (!res.ok) {
    throw new RegisterError(
      data.message ?? "Registration failed.",
      data.errors ?? {},
      res.status
    );
  }

  return data.data as RegisterResult;
}
