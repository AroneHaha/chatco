'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, FileText, ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { DiscountProofFields, useDiscountProof } from '@/components/commuter/discount-proof-fields';
import { Modal } from '@/components/shared/modal';
import {
  educationSummary, getRenewalState, renewalRequest, RENEWAL_LABELS, schoolYearSummary,
  type RenewalState, type RenewalStatus,
} from '@/lib/shared/services/student-renewal.service';

// Statuses without an entry stay neutral instead of borrowing a success or warning colour.
const STATUS_COLOR: Partial<Record<RenewalStatus, string>> = {
  APPROVED: 'text-emerald-300', PENDING: 'text-[#99C1F1]', NOT_RENEWED: 'text-amber-200',
  NEEDS_CORRECTION: 'text-amber-200', REJECTED: 'text-red-300',
};

const formatDateTime = (value: string) => new Date(value).toLocaleString('en-PH', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila',
});
const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1A5FB4] px-5 text-sm font-semibold transition-colors hover:bg-[#164A8F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#99C1F1] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#1A5FB4]';
const secondaryButton = 'min-h-11 rounded-lg border border-white/20 px-4 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#99C1F1] disabled:opacity-50';

export default function StudentRenewalPage() {
  const { refresh } = useAuth();
  const [state, setState] = useState<RenewalState | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmRegular, setConfirmRegular] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const proof = useDiscountProof();
  const { document, setDocument, incomplete, prefill } = proof;
  const proofId = useId();
  const regularRef = useRef<HTMLButtonElement>(null);
  const arrivedAtRegular = useRef(false);
  const prefilledFor = useRef('');
  const load = useCallback(async () => {
    try {
      const next = await getRenewalState();
      setState(next); setError('');
      // A correction request starts the form from what the commuter last sent,
      // so they only fix what was wrong; the proof itself is always chosen
      // again. This runs once per revision because load() also fires on every
      // window focus and must not overwrite edits in progress. Values the
      // current dropdowns cannot show are left blank instead of being
      // resubmitted unseen.
      const previous = next.application;
      if (previous && next.status === 'NEEDS_CORRECTION' && next.can_submit && prefilledFor.current !== `${previous.id}:${previous.revision}`) {
        prefilledFor.current = `${previous.id}:${previous.revision}`;
        prefill(previous);
      }
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load renewal.'); }
    finally { setLoading(false); }
  }, [prefill]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  // The "No Longer a Student" link in Rewards & Updates points at #regular, but
  // that button only exists once the renewal state has loaded, after the
  // browser's own hash scroll has already run.
  const canSwitch = state?.can_switch_to_regular ?? false;
  useEffect(() => {
    if (!canSwitch || arrivedAtRegular.current || window.location.hash !== '#regular') return;
    arrivedAtRegular.current = true;
    regularRef.current?.scrollIntoView({ block: 'center' });
  }, [canSwitch]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !document || incomplete) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const body = proof.formData();
      setState(await renewalRequest<RenewalState>('/api/commuter/student-renewal', { method: 'POST', body }));
      setMessage('Your proof was submitted. An admin will verify your student status.');
      setDocument(null); refresh();
    } catch (err) { await load(); setError(err instanceof Error ? err.message : 'Unable to submit proof.'); }
    finally { setBusy(false); }
  };
  const switchRegular = async () => {
    if (busy) return;
    setBusy(true); setSwitchError('');
    try {
      setState(await renewalRequest<RenewalState>('/api/commuter/student-renewal/regular', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmed: true }) }));
      setConfirmRegular(false); setError(''); setMessage('Your commuter type is now Regular.'); refresh();
    } catch (err) { setSwitchError(err instanceof Error ? err.message : 'Unable to change commuter type.'); }
    finally { setBusy(false); }
  };

  const application = state?.application ?? null;
  // A student can also read as renewed with no application on file (their
  // discount already runs past this cycle), so the approved view needs both.
  const approved = state?.status === 'APPROVED' && application?.status === 'APPROVED';
  // Pending and approved submissions list their details in the main column.
  const detailsInMain = state?.status === 'PENDING' || approved;
  const submittedDetails = application && (
    <dl className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <div>
        <dt className="text-xs text-white/50">School</dt>
        <dd className="mt-1 wrap-break-word text-sm font-medium">{application.school_name}</dd>
      </div>
      <div>
        <dt className="text-xs text-white/50">Education level</dt>
        <dd className="mt-1 text-sm font-medium">{educationSummary(application)}</dd>
      </div>
      <div>
        <dt className="text-xs text-white/50">School year</dt>
        <dd className="mt-1 wrap-break-word text-sm font-medium">{schoolYearSummary(application)}</dd>
      </div>
      {application.document_mime && (
        <div>
          <dt className="text-xs text-white/50">Enrollment proof</dt>
          <dd className="mt-1 inline-flex items-center gap-2 text-sm font-medium">
            {application.document_mime === 'application/pdf'
              ? <><FileText size={16} aria-hidden="true" className="text-[#99C1F1]" />PDF document</>
              : <><ImageIcon size={16} aria-hidden="true" className="text-[#99C1F1]" />Image</>}
          </dd>
        </div>
      )}
    </dl>
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#050F1A] text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#071A2E]">
        <div className="mx-auto max-w-2xl px-4 pb-5 pt-4 lg:px-8 lg:pt-6 xl:max-w-4xl">
          <Link href="/rewards" aria-label="Back to Rewards & Updates" className="-ml-1 inline-flex min-h-9 items-center gap-2 rounded-lg px-1 text-sm text-[#99C1F1] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-[#99C1F1]">
            <ArrowLeft size={16} aria-hidden="true" /> Rewards &amp; Updates
          </Link>
          <h1 className="mt-2 text-xl font-bold lg:text-2xl">Student Renewal</h1>
        </div>
      </header>

      {/* The commuter layout's <main> does not scroll, so this page owns its
          scroll region the same way Rewards & Updates does. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 pb-28 pt-6 lg:px-8 lg:pt-8 xl:max-w-4xl">
          {error && (
            <div role="alert" className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm leading-relaxed text-red-200">
              {error}<button type="button" onClick={() => void load()} className="ml-3 font-medium underline underline-offset-2 hover:text-white">Refresh status</button>
            </div>
          )}
          {message && (
            <p role="status" className="mb-6 flex items-start gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm leading-relaxed text-emerald-200">
              <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0" />{message}
            </p>
          )}
          {loading && <div role="status" className="flex items-center justify-center gap-3 py-16 text-sm text-white/60"><Loader2 size={20} className="animate-spin" />Loading renewal status</div>}

          {/* Stacked below xl: status, task, then the rules. At xl the task
              takes the wide left column and the rest becomes a side rail, so
              the page uses the width instead of sitting in a narrow strip.
              The rail is four rows (status, rules, submit, switch) and the
              last is 1fr, which keeps them packed at the top when the form is
              taller than they are. */}
          {state && <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_18rem] xl:grid-rows-[auto_auto_auto_1fr] xl:gap-x-12">
            <div className="xl:col-start-2 xl:row-start-1 xl:border-l xl:border-white/10 xl:pl-8">
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-1">
              <div>
                <dt className="text-xs text-white/50">Status</dt>
                <dd className={`mt-1 text-sm font-medium ${STATUS_COLOR[state.status] ?? 'text-white/70'}`}>{RENEWAL_LABELS[state.status]}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Student discount</dt>
                <dd className={`mt-1 inline-flex items-center gap-2 text-sm font-medium ${state.discount_eligible ? 'text-emerald-300' : 'text-amber-200'}`}>
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${state.discount_eligible ? 'bg-emerald-300' : 'bg-amber-200'}`} />
                  {state.discount_eligible ? 'Available' : 'Unavailable'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Renewal period</dt>
                <dd className="mt-1 text-sm font-medium">{state.renewal_period}</dd>
                <dd className="mt-1 text-xs text-white/50">Philippine time</dd>
              </div>
              {/* While a submission is pending or approved, the main column
                  lists what was sent, so the rail does not repeat it. */}
              {application && !detailsInMain && <>
                <div>
                  <dt className="text-xs text-white/50">School</dt>
                  <dd className="mt-1 wrap-break-word text-sm font-medium">{application.school_name}</dd>
                  <dd className="mt-1 text-xs text-white/50">{educationSummary(application)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-white/50">School year</dt>
                  <dd className="mt-1 wrap-break-word text-sm font-medium">{schoolYearSummary(application)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-white/50">Last submitted</dt>
                  <dd className="mt-1 text-sm font-medium">{formatDateTime(application.submitted_at)}</dd>
                </div>
              </>}
            </dl>

            {(application?.reason || application?.correction_due_at) && (
              <div className="mt-6 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-relaxed">
                {application.reason && <>
                  <p className="text-xs font-medium text-amber-200">Review note</p>
                  <p className="mt-1 wrap-break-word text-white/90">{application.reason}</p>
                </>}
                {application.correction_due_at && <p className={`text-amber-200 ${application.reason ? 'mt-3' : ''}`}>Correction deadline: {formatDateTime(application.correction_due_at)} (Philippine time).</p>}
              </div>
            )}
            </div>

            {state.can_submit ? (
              <section aria-labelledby={`${proofId}-title`} className="mt-8 border-t border-white/10 pt-8 xl:col-start-1 xl:row-span-4 xl:row-start-1 xl:mt-0 xl:border-t-0 xl:pt-0">
                <h2 id={`${proofId}-title`} className="text-base font-semibold">Submit your proof</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/70">Submit a school ID showing the current school year or a document proving current enrollment. Upload a clear image or PDF of the complete document.</p>
                {state.status === 'NEEDS_CORRECTION' && <p className="mt-2 text-sm leading-relaxed text-white/70">Your previous details are filled in below. Check them, then choose your corrected proof.</p>}
                <form id={`${proofId}-form`} onSubmit={submit} className="mt-6 space-y-6">
                  <DiscountProofFields proof={proof} busy={busy} proofId={proofId} year={state.cycle_year} />
                </form>
              </section>
            ) : state.status === 'PENDING' && application ? (
              <section aria-labelledby={`${proofId}-pending`} className="mt-8 border-t border-white/10 pt-8 xl:col-start-1 xl:row-span-4 xl:row-start-1 xl:mt-0 xl:border-t-0 xl:pt-0">
                <h2 id={`${proofId}-pending`} className="text-base font-semibold">Your proof is being verified</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/70">You do not need to submit again. Here is what happens next.</p>
                {/* The three stages mirror the backend: submitted, admin review,
                    then a decision that either settles the renewal or opens a
                    seven-day correction window. */}
                <ol className="mt-6 max-w-md">
                  <li className="relative flex gap-4 pb-7">
                    <span aria-hidden="true" className="absolute bottom-1 left-3 top-7 w-px -translate-x-1/2 bg-[#62A0EA]/40" />
                    <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#62A0EA]/40 bg-[#62A0EA]/10 text-[#99C1F1]"><Check size={14} /></span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-medium"><span className="sr-only">Completed: </span>Proof submitted</p>
                      <p className="mt-1 text-xs text-white/60">{formatDateTime(application.submitted_at)}</p>
                    </div>
                  </li>
                  <li aria-current="step" className="relative flex gap-4 pb-7">
                    <span aria-hidden="true" className="absolute bottom-1 left-3 top-7 w-px -translate-x-1/2 bg-white/15" />
                    <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#62A0EA]"><span className="h-2 w-2 rounded-full bg-[#62A0EA]" /></span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-medium"><span className="sr-only">In progress: </span>Admin verification</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/60">An admin is checking your enrollment proof.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border border-white/20" />
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-white/70"><span className="sr-only">Upcoming: </span>Result</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/60">You will get an update in Rewards &amp; Updates. If your proof needs a correction, you will have seven days to resubmit it.</p>
                    </div>
                  </li>
                </ol>

                <h3 className="mt-8 border-t border-white/10 pt-6 text-sm font-semibold">What you submitted</h3>
                {submittedDetails}
              </section>
            ) : approved && application ? (
              <section aria-labelledby={`${proofId}-approved`} className="mt-8 border-t border-white/10 pt-8 xl:col-start-1 xl:row-span-4 xl:row-start-1 xl:mt-0 xl:border-t-0 xl:pt-0">
                <h2 id={`${proofId}-approved`} className="flex items-center gap-2 text-base font-semibold">
                  <Check size={18} aria-hidden="true" className="shrink-0 text-emerald-300" />Your student renewal is approved
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/70">Your enrollment proof was verified for this renewal cycle.</p>
                <dl className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  {application.reviewed_at && (
                    <div>
                      <dt className="text-xs text-white/50">Approved</dt>
                      <dd className="mt-1 text-sm font-medium">{formatDateTime(application.reviewed_at)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-white/50">Submitted</dt>
                    <dd className="mt-1 text-sm font-medium">{formatDateTime(application.submitted_at)}</dd>
                  </div>
                </dl>

                <h3 className="mt-8 border-t border-white/10 pt-6 text-sm font-semibold">School details</h3>
                {submittedDetails}
              </section>
            ) : (
              <p className="mt-8 border-t border-white/10 pt-8 text-sm leading-relaxed text-white/80 xl:col-start-1 xl:row-span-4 xl:row-start-1 xl:mt-0 xl:border-t-0 xl:pt-0 xl:text-base">{state.status === 'PENDING' ? 'Your submission is awaiting verification. You do not need to submit again.' : state.status === 'APPROVED' ? 'Your student status is verified for this cycle.' : state.can_switch_to_regular ? `Submission opens ${new Date(state.opens_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}. You can switch to Regular at any time.` : 'Renewal is available to eligible student accounts.'}</p>
            )}

            {/* Lives outside the <form> (tied to it by the form attribute) so
                one button can sit under the form when stacked and in the rail,
                above "No Longer a Student", at xl. */}
            {state.can_submit && (
              <div className="mt-6 xl:col-start-2 xl:row-start-3 xl:mt-0 xl:border-l xl:border-white/10 xl:pl-8 xl:pt-6">
                <button form={`${proofId}-form`} disabled={busy || !document || incomplete} className={`${primaryButton} w-full sm:w-auto xl:w-full`}>
                  {busy && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}{busy ? 'Submitting...' : 'Submit Enrollment Proof'}
                </button>
              </div>
            )}

            <div className="xl:col-start-2 xl:row-start-2 xl:border-l xl:border-white/10 xl:pl-8">
              <p className="mt-8 border-t border-white/10 pt-6 text-sm leading-relaxed text-white/60 xl:mt-6">Previously approved discounts continue throughout the renewal period. After the deadline, pending renewals keep the Student type while the discount waits for approval. Students who did not submit become Regular.</p>
            </div>

            <div className="xl:col-start-2 xl:row-start-4 xl:border-l xl:border-white/10 xl:pl-8">
              {/* Not offered once the renewal is approved: the commuter has
                  just been verified as a student for this cycle. */}
              {state.can_switch_to_regular && state.status !== 'APPROVED' && (
                <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 xl:flex-col xl:items-stretch xl:gap-4">
                  {/* Locked while a submission is under review, so a renewal the
                      commuter just sent cannot be cancelled by a stray tap. */}
                  <p id={`${proofId}-regular-note`} className="text-sm leading-relaxed text-white/60">{state.status === 'PENDING' ? 'Switching to Regular is unavailable while your proof is being verified.' : 'No longer enrolled? You can switch to Regular at any time.'}</p>
                  <button ref={regularRef} id="regular" type="button" disabled={busy || state.status === 'PENDING'} aria-describedby={`${proofId}-regular-note`} onClick={() => { setSwitchError(''); setConfirmRegular(true); }} className={`${secondaryButton} shrink-0 cursor-pointer disabled:cursor-not-allowed`}>No Longer a Student</button>
                </div>
              )}
            </div>
          </div>}
        </div>
      </div>

      <Modal isOpen={confirmRegular} onClose={() => { if (!busy) setConfirmRegular(false); }} maxWidth="max-w-md">
        <h2 className="pr-8 text-lg font-bold">Switch to Regular?</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">Your student discount ends immediately and any pending renewal is cancelled. Your account, rides, and rewards remain available.</p>
        {switchError && <p role="alert" className="mt-4 text-sm text-red-300">{switchError}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={() => setConfirmRegular(false)} className={secondaryButton}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => void switchRegular()} className={primaryButton}>
            {busy && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}{busy ? 'Updating...' : 'Switch to Regular'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
