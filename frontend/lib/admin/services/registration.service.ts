// lib/admin/services/registration.service.ts
//
// Admin registration review service (S5-T15).
//
// Calls Next.js proxy routes (which forward to Laravel with the httpOnly
// `chatco_session` cookie) — never calls Laravel directly from the browser.
//
//   GET  /api/admin/registrations              → listPending()
//   POST /api/admin/registrations/{id}/approve → approve(id)
//   POST /api/admin/registrations/{id}/reject  → reject(id, reason)

// ─── Types ────────────────────────────────────────────────────────────

export type AppliedType = "REGULAR" | "STUDENT" | "SENIOR" | "PWD";

/** Raw registration row from the backend (Laravel paginator item). */
export interface RawRegistration {
  id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  surname: string;
  birthdate: string;
  gender: string;
  contact_number: string;
  username: string;
  applied_type: AppliedType;
  id_image_url: string;
  account_status: string;
  language_preference: string;
  created_at: string;
}

/** Frontend view-model for the pending registrations table + review modal. */
export interface PendingRegistration {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  commuterType: string;
  languagePreference: string;
  idImageUrl: string;
  status: "Pending Verification";
  birthdate: string;
  gender: string;
  username: string;
  appliedType: AppliedType;
  createdAt: string;
}

export interface ApproveResult {
  id: string;
  email: string;
  name: string;
  commuter_type: string;
  account_status: string;
  verified_at: string;
}

export interface RejectResult {
  id: string;
  email: string;
  account_status: string;
  rejection_reason: string;
}

export class RegistrationError extends Error {
  errors: Record<string, string[]>;
  status: number;

  constructor(message: string, errors: Record<string, string[]>, status: number) {
    super(message);
    this.name = "RegistrationError";
    this.errors = errors;
    this.status = status;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  REGULAR: "Regular",
  STUDENT: "Student",
  SENIOR: "Senior Citizen",
  PWD: "PWD",
};

function mapToViewModel(r: RawRegistration): PendingRegistration {
  return {
    id: r.id,
    name: `${r.first_name} ${r.middle_name ? r.middle_name + " " : ""}${r.surname}`.trim(),
    email: r.email,
    phoneNumber: r.contact_number,
    commuterType: TYPE_LABELS[r.applied_type] ?? "Regular",
    languagePreference: r.language_preference === "Filipino" ? "Filipino" : "English",
    idImageUrl: r.id_image_url,
    status: "Pending Verification",
    birthdate: r.birthdate,
    gender: r.gender,
    username: r.username,
    appliedType: r.applied_type,
    createdAt: r.created_at,
  };
}

// ─── API methods ──────────────────────────────────────────────────────

/**
 * GET /api/admin/registrations
 * Lists all PENDING commuter registrations awaiting admin review.
 */
export async function listPending(): Promise<PendingRegistration[]> {
  const res = await fetch("/api/admin/registrations", {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new RegistrationError(
      body?.message ?? `Failed to fetch registrations (HTTP ${res.status})`,
      {},
      res.status
    );
  }

  const json = await res.json();
  // The backend returns a paginator: { data: { data: [...], ... } }
  const rows = json.data?.data ?? json.data ?? [];
  return (rows as RawRegistration[]).map(mapToViewModel);
}

/**
 * POST /api/admin/registrations/{id}/approve
 * Approves a pending registration — copies applied_type to commuter_type,
 * sets verified_at, sets account_status to APPROVED.
 */
export async function approve(id: string): Promise<ApproveResult> {
  const res = await fetch(`/api/admin/registrations/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({}),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new RegistrationError(
      data.message ?? "Failed to approve registration.",
      data.errors ?? {},
      res.status
    );
  }

  return data.data as ApproveResult;
}

/**
 * POST /api/admin/registrations/{id}/reject
 * Rejects a pending registration — sets account_status to REJECTED,
 * records the rejection reason, soft-deletes the account (frees the email).
 */
export async function reject(id: string, reason: string): Promise<RejectResult> {
  const res = await fetch(`/api/admin/registrations/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ rejection_reason: reason }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new RegistrationError(
      data.message ?? "Failed to reject registration.",
      data.errors ?? {},
      res.status
    );
  }

  return data.data as RejectResult;
}
