'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { APPLICATION_LABELS, DISCOUNT_CATEGORIES, getApplicationState, type ApplicationState } from '@/lib/shared/services/student-renewal.service';

export function DiscountApplicationEntry({ commuterType, onClassificationChanged }: { commuterType: string; onClassificationChanged: () => void }) {
  const [state, setState] = useState<ApplicationState | null>(null);
  const [failed, setFailed] = useState(false);
  const reportedType = useRef(commuterType);
  useEffect(() => {
    if (state && state.commuter_type !== commuterType && reportedType.current !== state.commuter_type) {
      reportedType.current = state.commuter_type;
      onClassificationChanged();
    }
  }, [state, commuterType, onClassificationChanged]);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => { void getApplicationState(controller.signal).then(next => {
      if (!controller.signal.aborted) { setState(next); setFailed(false); }
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); }); };
    load(); window.addEventListener('focus', load);
    return () => { controller.abort(); window.removeEventListener('focus', load); };
  }, [commuterType]);
  // Only Regular accounts (including ones that reverted from a discount) can
  // apply. A discounted account never sees this, and an approval hides it as
  // soon as the server reports the new classification.
  if ((state?.commuter_type ?? commuterType) !== 'REGULAR') return null;
  // An unknown status must not be presented as an account that hasn't applied.
  if (!state && !failed) return <div role="status" className="mt-3 border-t border-white/10 pt-3 text-sm text-white/60">
    Loading discount application status...
  </div>;
  const application = state?.application;
  const renewal = application?.request_type === 'RENEWAL';
  const category = application ? DISCOUNT_CATEGORIES[application.requested_type] : '';
  // Cancelled or legacy expired requests leave nothing open, so the commuter
  // is offered a fresh application.
  const status = state && application && !['CANCELLED', 'EXPIRED'].includes(state.status) ? state.status : 'NOT_APPLIED';
  const content = !state ? { text: 'Unable to load your discount application status.', link: 'View application status' }
    : renewal ? { text: `Student renewal: ${APPLICATION_LABELS[status]}`, link: 'View Student renewal' }
    : status === 'PENDING' ? { text: 'Your discount application is currently under review. Check here for updates on your application status.', link: 'View application status' }
    : status === 'NEEDS_CORRECTION' ? { text: `An admin asked for a correction to your ${category} discount application. Send corrected documents to continue the review.`, link: 'Update your application' }
    : status === 'REJECTED' ? { text: `Your ${category} discount application was not approved.`, link: 'Apply again' }
    : { text: 'Eligible for a Student, PWD, or Senior Citizen discount? Submit your supporting document for verification.', link: 'Apply for a discount' };
  return <div className="mt-3 border-t border-white/10 pt-3 text-sm">
    <p className={status === 'REJECTED' ? 'text-red-200' : status === 'NEEDS_CORRECTION' ? 'text-amber-200' : 'text-white/60'}>{content.text}</p>
    {(status === 'REJECTED' || status === 'NEEDS_CORRECTION') && application?.reason && <p className="mt-1 wrap-break-word text-white/60"><span className="text-white/45">Reason: </span>{application.reason}</p>}
    {failed && <p className="mt-1 text-xs text-white/50">Open your application to check its latest status.</p>}
    <Link href={renewal ? '/student-renewal' : '/discount-application'} onClick={() => window.dispatchEvent(new Event('commuter:close-popovers'))} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[#99C1F1] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#99C1F1]">
      {content.link}
    </Link>
  </div>;
}
