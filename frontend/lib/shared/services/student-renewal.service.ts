export type DiscountCategory = 'STUDENT' | 'PWD' | 'SENIOR';
export const DISCOUNT_CATEGORIES: Record<DiscountCategory, string> = { STUDENT: 'Student', PWD: 'PWD', SENIOR: 'Senior Citizen' };

/**
 * Students renew yearly in one shared month; PWDs renew around their own
 * card's "Valid until" date. Both share the same screens and response shape.
 */
export type RenewalKind = 'STUDENT' | 'PWD';

/** The renewal a commuter can have, or null. Legacy PWD cards (no date) have none. */
export function renewalKindFor(profile: { commuterType?: string; appliedType?: string; pwdValidUntil?: string | null } | null | undefined): RenewalKind | null {
  if (!profile) return null;
  if (profile.commuterType === 'STUDENT' || (profile.commuterType === 'REGULAR' && profile.appliedType === 'STUDENT')) return 'STUDENT';
  if (profile.pwdValidUntil && (profile.commuterType === 'PWD' || (profile.commuterType === 'REGULAR' && profile.appliedType === 'PWD'))) return 'PWD';
  return null;
}

export const RENEWAL_PATH: Record<RenewalKind, string> = { STUDENT: '/student-renewal', PWD: '/pwd-renewal' };

/** Wording that differs between the two renewals; everything else is shared. */
export const RENEWAL_COPY: Record<RenewalKind, {
  title: string; label: string; discount: string; proof: string; proofShort: string; renewAction: string; correctedAction: string;
  submitAction: string; regularAction: string; ready: string; correctionTitle: string;
}> = {
  STUDENT: {
    title: 'Student Renewal', label: 'Student renewal', discount: 'student discount', proof: 'enrollment proof', proofShort: 'proof',
    renewAction: 'Renew student status', correctedAction: 'Submit corrected proof', submitAction: 'Submit Enrollment Proof',
    regularAction: 'No Longer a Student', ready: 'your current school ID or enrollment proof', correctionTitle: 'Update your enrollment proof',
  },
  PWD: {
    title: 'PWD Renewal', label: 'PWD renewal', discount: 'PWD discount', proof: 'PWD ID', proofShort: 'PWD ID',
    renewAction: 'Renew PWD ID', correctedAction: 'Submit corrected PWD ID', submitAction: 'Submit PWD ID',
    regularAction: 'Switch to Regular', ready: 'your renewed PWD ID', correctionTitle: 'Update your PWD ID',
  },
};

/** 'YYYY-MM-DD' (a calendar date, no time zone) as "Mar 15, 2027". */
export function formatCardDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export type RenewalStatus = 'NOT_RENEWED' | 'PENDING' | 'NEEDS_CORRECTION' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export const RENEWAL_LABELS: Record<RenewalStatus, string> = {
  NOT_RENEWED: 'Not Renewed', PENDING: 'Pending Renewal Verification', NEEDS_CORRECTION: 'Needs Correction',
  APPROVED: 'Renewed', REJECTED: 'Rejected', CANCELLED: 'Cancelled', EXPIRED: 'Expired',
};

export type EducationLevel = 'HIGH_SCHOOL' | 'COLLEGE';

export const EDUCATION_LABELS: Record<EducationLevel, string> = { HIGH_SCHOOL: 'High school', COLLEGE: 'College' };

// High school covers Grades 7-12; college records no year level.
export const HIGH_SCHOOL_GRADES = [7, 8, 9, 10, 11, 12] as const;

// Stored as the label itself: enrollment_term is a free-text column (max 50).
export const ENROLLMENT_TERMS = ['1st Semester', '2nd Semester', '3rd Semester'] as const;

export function educationSummary(application: Pick<DiscountApplication, 'education_level' | 'grade_level'>) {
  const label = (application.education_level ? EDUCATION_LABELS[application.education_level] : null) ?? 'Not provided';
  return application.grade_level ? `${label}, Grade ${application.grade_level}` : label;
}

export function schoolYearSummary(application: Pick<DiscountApplication, 'school_year' | 'enrollment_term'>) {
  return application.enrollment_term ? `${application.school_year}, ${application.enrollment_term}` : application.school_year ?? 'Not provided';
}

export interface DiscountApplication {
  id: string; request_type: 'RENEWAL' | 'APPLICATION'; requested_type: DiscountCategory; cycle_year: number | null; revision: number; status: RenewalStatus;
  school_name: string | null; education_level: EducationLevel | null; grade_level: number | null;
  school_year: string | null; enrollment_term: string | null;
  /** PWD requests only: the card's "Valid until" date ('YYYY-MM-DD'). */
  valid_until?: string | null;
  submitted_at: string; first_submitted_at: string; reviewed_at: string | null; reason: string | null;
  correction_due_at: string | null; document_url?: string; document_mime?: string | null;
  commuter?: { id: string; first_name: string; middle_name: string | null; suffix?: string | null; surname: string; email: string;
    birthdate: string; gender: string; contact_number: string; username: string; commuter_type: string; pwd_valid_until?: string | null };
}

export interface RenewalState {
  /** Absent on student responses. */
  kind?: RenewalKind; valid_until?: string;
  cycle_year: number; deadline: string; commuter_type: string; discount_eligible: boolean;
  opens_at: string; renewal_period: string;
  discount_expires_at: string | null; status: RenewalStatus; can_submit: boolean;
  can_switch_to_regular: boolean; application: DiscountApplication | null;
  notice_active: boolean; reminder_due: boolean;
}

/** Carries the HTTP status so callers can tell "not eligible" (403) from other failures. */
export class RenewalRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'RenewalRequestError';
  }
}

export async function renewalRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { credentials: 'include', cache: 'no-store', ...options, headers: { Accept: 'application/json', ...options.headers } });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const errors = json?.errors as Record<string, string[]> | undefined;
    throw new RenewalRequestError((errors && Object.values(errors).flat().join(' ')) || json?.message || 'Unable to complete this request. Please try again.', res.status);
  }
  return json.data as T;
}

export const renewalApi = (kind: RenewalKind) => `/api/commuter/${kind === 'PWD' ? 'pwd' : 'student'}-renewal`;

export function getRenewalState(signal?: AbortSignal, kind: RenewalKind = 'STUDENT') {
  return renewalRequest<RenewalState>(renewalApi(kind), { signal });
}

// 'snooze' hides the pop-up reminder for a day; 'dismiss' hides it for the rest of this renewal cycle.
export function setRenewalReminder(action: 'snooze' | 'dismiss', kind: RenewalKind = 'STUDENT') {
  return renewalRequest<RenewalState>(`${renewalApi(kind)}/reminder`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
  });
}

export interface ApplicationState {
  commuter_type: string; effective_fare_type: string; discount_expires_at: string | null;
  status: RenewalStatus | 'NOT_APPLIED'; can_submit: boolean; document_required: boolean; application: DiscountApplication | null;
}

export const APPLICATION_LABELS: Record<ApplicationState['status'], string> = {
  ...RENEWAL_LABELS, NOT_APPLIED: 'Not applied', NOT_RENEWED: 'Not applied',
  PENDING: 'Pending verification', APPROVED: 'Approved',
};

export function discountStatusLabel(application: DiscountApplication) {
  return (application.request_type === 'APPLICATION' ? APPLICATION_LABELS : RENEWAL_LABELS)[application.status];
}

export function getApplicationState(signal?: AbortSignal) {
  return renewalRequest<ApplicationState>('/api/commuter/discount-applications', { signal });
}
