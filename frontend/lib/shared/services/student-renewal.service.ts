export type RenewalStatus = 'NOT_RENEWED' | 'PENDING' | 'NEEDS_CORRECTION' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export const RENEWAL_LABELS: Record<RenewalStatus, string> = {
  NOT_RENEWED: 'Not Renewed', PENDING: 'Pending Renewal Verification', NEEDS_CORRECTION: 'Needs Correction',
  APPROVED: 'Renewed', REJECTED: 'Rejected', CANCELLED: 'Cancelled', EXPIRED: 'Expired',
};

export type EducationLevel = 'HIGH_SCHOOL' | 'COLLEGE';

export const EDUCATION_LABELS: Record<EducationLevel, string> = { HIGH_SCHOOL: 'High school', COLLEGE: 'College' };

// High school covers Grades 7-12; college records no year level.
export const HIGH_SCHOOL_GRADES = [7, 8, 9, 10, 11, 12] as const;

export function educationSummary(application: Pick<DiscountApplication, 'education_level' | 'grade_level'>) {
  const label = EDUCATION_LABELS[application.education_level] ?? application.education_level;
  return application.grade_level ? `${label}, Grade ${application.grade_level}` : label;
}

export function schoolYearSummary(application: Pick<DiscountApplication, 'school_year' | 'enrollment_term'>) {
  return application.enrollment_term ? `${application.school_year}, ${application.enrollment_term}` : application.school_year;
}

export interface DiscountApplication {
  id: string; request_type: 'RENEWAL'; cycle_year: number; revision: number; status: RenewalStatus;
  school_name: string; education_level: EducationLevel; grade_level: number | null;
  school_year: string; enrollment_term: string | null;
  submitted_at: string; first_submitted_at: string; reason: string | null;
  correction_due_at: string | null; document_url?: string; document_mime?: string;
  commuter?: { id: string; first_name: string; middle_name: string | null; surname: string; email: string;
    birthdate: string; gender: string; contact_number: string; username: string; commuter_type: string };
}

export interface RenewalState {
  cycle_year: number; deadline: string; commuter_type: string; discount_eligible: boolean;
  opens_at: string; renewal_period: string;
  discount_expires_at: string | null; status: RenewalStatus; can_submit: boolean;
  can_switch_to_regular: boolean; application: DiscountApplication | null;
  notice_active: boolean; reminder_due: boolean;
}

export async function renewalRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...options, headers: { Accept: 'application/json', ...options.headers } });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const errors = json?.errors as Record<string, string[]> | undefined;
    throw new Error(errors ? Object.values(errors).flat().join(' ') : json?.message ?? 'Unable to complete this request. Please try again.');
  }
  return json.data as T;
}

export function getRenewalState(signal?: AbortSignal) {
  return renewalRequest<RenewalState>('/api/commuter/student-renewal', { signal });
}

// 'snooze' hides the pop-up reminder for a day; 'dismiss' hides it for the rest of this renewal cycle.
export function setRenewalReminder(action: 'snooze' | 'dismiss') {
  return renewalRequest<RenewalState>('/api/commuter/student-renewal/reminder', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
  });
}
