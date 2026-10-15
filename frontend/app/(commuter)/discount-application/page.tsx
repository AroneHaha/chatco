'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Accessibility, AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, CircleDashed, CircleHelp, Clock3, GraduationCap, IdCard, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { DiscountProofFields, useDiscountProof } from '@/components/commuter/discount-proof-fields';
import { Modal } from '@/components/shared/modal';
import { APPLICATION_LABELS, DISCOUNT_CATEGORIES, educationSummary, getApplicationState, renewalRequest,
  schoolYearSummary, type ApplicationState, type DiscountCategory } from '@/lib/shared/services/student-renewal.service';

const date = (value: string) => new Date(value).toLocaleString('en-PH', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
});
const button = 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#1A5FB4] px-5 text-sm font-semibold text-white hover:bg-[#164A8F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#99C1F1] disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-white/20 px-4 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white light:border-gray-300 light:text-gray-700 light:hover:bg-gray-100 light:hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#99C1F1] disabled:cursor-not-allowed disabled:opacity-50';
const categoryOptions: { value: DiscountCategory; label: string; detail: string; Icon: typeof GraduationCap }[] = [
  { value: 'STUDENT', label: 'Student', detail: 'Current enrollment proof', Icon: GraduationCap },
  { value: 'PWD', label: 'PWD', detail: 'Valid PWD identification', Icon: Accessibility },
  { value: 'SENIOR', label: 'Senior Citizen', detail: 'Valid senior citizen ID', Icon: IdCard },
];
// Status reads as coloured text with an icon, not a pill badge.
const statusTone: Record<string, { className: string; Icon: typeof Clock3 }> = {
  NOT_APPLIED: { className: 'text-white/75 light:text-gray-600', Icon: CircleDashed },
  PENDING: { className: 'text-sky-200 light:text-sky-700', Icon: Clock3 },
  NEEDS_CORRECTION: { className: 'text-amber-200 light:text-amber-700', Icon: AlertTriangle },
  APPROVED: { className: 'text-emerald-200 light:text-emerald-700', Icon: CheckCircle2 },
  REJECTED: { className: 'text-red-200 light:text-red-700', Icon: XCircle },
  EXPIRED: { className: 'text-white/60 light:text-gray-500', Icon: CircleDashed },
};

export default function DiscountApplicationPage() {
  const { commuterProfile, refresh } = useAuth();
  const [state, setState] = useState<ApplicationState | null>(null);
  const [category, setCategory] = useState<DiscountCategory | ''>('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const proof = useDiscountProof();
  const { prefill } = proof;
  const proofId = useId();
  const prefilled = useRef('');
  const sequence = useRef(0);
  const submitting = useRef(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    if (submitting.current) return;
    const request = ++sequence.current;
    try {
      const next = await getApplicationState(signal);
      if (signal?.aborted || request !== sequence.current) return;
      setState(next); setError('');
      const previous = next.application;
      if (previous?.request_type === 'APPLICATION' && next.status === 'NEEDS_CORRECTION'
          && next.can_submit && prefilled.current !== `${previous.id}:${previous.revision}`) {
        prefilled.current = `${previous.id}:${previous.revision}`;
        setCategory(previous.requested_type); prefill(previous);
      }
    } catch (err) {
      if (!signal?.aborted && request === sequence.current) setError(err instanceof Error ? err.message : 'Unable to load application.');
    } finally {
      if (!signal?.aborted && request === sequence.current) setLoading(false);
    }
  }, [prefill]);
  useEffect(() => {
    const controller = new AbortController();
    const focus = () => { void load(controller.signal); };
    focus(); window.addEventListener('focus', focus);
    return () => { controller.abort(); window.removeEventListener('focus', focus); };
  }, [load]);
  useEffect(() => {
    if (state && commuterProfile && state.commuter_type !== commuterProfile.commuterType) void refresh();
  }, [state, commuterProfile, refresh]);

  const application = state?.application;
  const correction = state?.status === 'NEEDS_CORRECTION' && application?.request_type === 'APPLICATION';
  const student = category === 'STUDENT';
  const incomplete = !category || (state?.document_required !== false && !proof.document) || (student && proof.incomplete);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || submitting.current || incomplete || !state?.can_submit) return;
    setConfirmSubmit(true);
  };
  const submitConfirmed = async () => {
    if (submitting.current || incomplete || !state?.can_submit) return;
    submitting.current = true; ++sequence.current;
    setConfirmSubmit(false);
    setBusy(true); setError(''); setMessage('');
    try {
      const body = proof.formData(student, state?.document_required !== false); body.set('requested_type', category);
      if (correction && application) {
        body.set('application_id', application.id); body.set('revision', String(application.revision));
      }
      setState(await renewalRequest<ApplicationState>('/api/commuter/discount-applications', { method: 'POST', body }));
      proof.setDocument(null);
      setMessage('Your discount application was submitted. Your account stays Regular until an admin approves it.');
    } catch (err) {
      submitting.current = false; await load();
      setError(err instanceof Error ? err.message : 'Unable to submit application.');
    } finally { submitting.current = false; setBusy(false); }
  };
  // Only the commuter's own open application can be withdrawn; renewals have
  // their own "No Longer a Student" path.
  const cancellable = application?.request_type === 'APPLICATION' && (state?.status === 'PENDING' || state?.status === 'NEEDS_CORRECTION');
  const cancelConfirmed = async () => {
    if (submitting.current || !cancellable || !application) return;
    submitting.current = true; ++sequence.current;
    setBusy(true); setCancelError(''); setError(''); setMessage('');
    try {
      setState(await renewalRequest<ApplicationState>('/api/commuter/discount-applications/cancel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application_id: application.id }),
      }));
      setConfirmCancel(false); setCategory(''); proof.setDocument(null);
      setMessage('Your application was cancelled. You can start a new application at any time.');
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Unable to cancel the application.');
      submitting.current = false; void load();
    } finally { submitting.current = false; setBusy(false); }
  };
  const cancelButton = cancellable && <button type="button" disabled={busy} onClick={() => { setCancelError(''); setConfirmCancel(true); }} className={`${secondaryButton} mt-5`}>Cancel application</button>;

  return <div className="flex h-full w-full flex-col overflow-hidden bg-[#050F1A] text-white light:bg-[#F8FAFC] light:text-gray-900">
    {/* Padding sits outside max-w-6xl, matching <main>, so the title lines up
        with the form below. The "stays Regular during review" note lives in
        the form's callout, so the header is just the way back and the title. */}
    <header className="shrink-0 border-b border-white/10 bg-[#071A2E] light:border-gray-200 light:bg-white px-4 pb-5 pt-4 sm:px-6 lg:px-8 lg:pt-5">
      <div className="mx-auto max-w-6xl">
        <Link href="/profile" className="-ml-1 inline-flex min-h-9 items-center gap-2 rounded-lg px-1 text-sm text-[#99C1F1] transition-colors hover:text-white light:text-[#1A5FB4] light:hover:text-[#164A8F]"><ArrowLeft size={16} aria-hidden="true" />My profile</Link>
        <h1 className="mt-1 text-xl font-bold tracking-tight lg:text-2xl">Discount Application</h1>
        <p className="mt-1 text-sm leading-relaxed text-white/65 light:text-gray-600">Tell us which discount applies to you and send proof for verification.</p>
      </div>
    </header>
    <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-6xl">
        {loading && <div role="status" className="flex min-h-56 items-center justify-center gap-3 text-sm text-white/60 light:text-gray-500"><Loader2 size={20} className="animate-spin text-[#62A0EA] light:text-[#1A5FB4]" />Loading your application status...</div>}
        {error && <div role="alert" className="mb-6 flex flex-col gap-3 rounded-xl border border-red-300/25 bg-red-300/10 p-4 text-sm text-red-200 light:border-red-200 light:bg-red-50 light:text-red-700 sm:flex-row sm:items-center sm:justify-between">{error}<button type="button" onClick={() => void load()} disabled={busy} className="min-h-10 self-start font-medium underline underline-offset-4 sm:self-auto">Refresh status</button></div>}
        {message && <p role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm leading-relaxed text-emerald-200 light:border-emerald-200 light:bg-emerald-50 light:text-emerald-800"><Check size={18} className="mt-0.5 shrink-0" aria-hidden="true" />{message}</p>}
        {state && <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(16rem,0.8fr)] lg:gap-12">
          <section className="min-w-0" aria-labelledby={`${proofId}-section`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5 light:border-gray-200">
              <div><p className="text-xs uppercase tracking-[0.14em] text-white/45 light:text-gray-500">Your request</p><h2 id={`${proofId}-section`} className="mt-1 text-lg font-semibold">{application?.request_type === 'RENEWAL' ? 'Student renewal' : correction ? 'Update your application' : application && state.status !== 'CANCELLED' ? `${DISCOUNT_CATEGORIES[application.requested_type]} application` : 'Start an application'}</h2></div>
              {(() => { const { className, Icon } = statusTone[state.status] ?? statusTone.NOT_APPLIED; return <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${className}`}><Icon size={16} aria-hidden="true" className="shrink-0" />{APPLICATION_LABELS[state.status]}</span>; })()}
            </div>
            {application && <dl className="grid gap-x-6 gap-y-4 border-b border-white/10 py-5 light:border-gray-200 sm:grid-cols-2">
              <div><dt className="text-xs text-white/50 light:text-gray-500">Current account</dt><dd className="mt-1 text-sm font-medium">{DISCOUNT_CATEGORIES[state.commuter_type as DiscountCategory] ?? 'Regular'}</dd></div>
              <div><dt className="text-xs text-white/50 light:text-gray-500">Submitted</dt><dd className="mt-1 text-sm font-medium">{date(application.submitted_at)}</dd></div>
              {application.requested_type === 'STUDENT' && <><div><dt className="text-xs text-white/50 light:text-gray-500">School</dt><dd className="mt-1 wrap-break-word text-sm font-medium">{application.school_name}</dd></div><div><dt className="text-xs text-white/50 light:text-gray-500">Education</dt><dd className="mt-1 text-sm font-medium">{educationSummary(application)} · {schoolYearSummary(application)}</dd></div></>}
            </dl>}
            {application?.reason && <div className="my-5 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 light:border-amber-200 light:bg-amber-50 text-sm leading-relaxed"><p className="font-semibold text-amber-200 light:text-amber-800">Note from the reviewer</p><p className="mt-1 wrap-break-word text-white/80 light:text-gray-700">{application.reason}</p></div>}
            {/* Application corrections have no deadline; the request stays open until resubmitted. */}
            {correction && <div className="my-5"><p className="text-sm leading-relaxed text-amber-200 light:text-amber-800">Send your corrected supporting document below whenever you are ready. The discount category cannot be changed for this request; to apply under a different category, cancel this application first.</p>{cancelButton}</div>}
            {application?.request_type === 'RENEWAL' ? <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white/70 light:border-gray-200 light:bg-white light:text-gray-600">You have an outstanding Student renewal. Complete that request before starting a new discount application. <Link href="/student-renewal" className="mt-2 inline-flex min-h-10 items-center gap-1 font-semibold text-[#99C1F1] hover:text-white light:text-[#1A5FB4] light:hover:text-[#164A8F]">View Student renewal <ArrowRight size={15} aria-hidden="true" /></Link></p>
            : state.can_submit ? <form id={`${proofId}-form`} onSubmit={submit} className="pt-6">
              <fieldset disabled={busy || correction}>
                <legend className="text-sm font-semibold">{correction ? 'Application category' : 'Choose your discount category'}</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {categoryOptions.map(({ value, label, detail, Icon }) => <label key={value} className={`relative flex min-h-28 cursor-pointer flex-col justify-between rounded-xl border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#99C1F1] ${category === value ? 'border-[#62A0EA] bg-[#1A5FB4]/20 shadow-lg shadow-[#1A5FB4]/10 light:border-[#1A5FB4] light:bg-[#1A5FB4]/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06] light:border-gray-200 light:bg-white light:hover:border-gray-300 light:hover:bg-gray-50'} ${busy || correction ? 'cursor-not-allowed opacity-70' : ''}`}>
                    <input type="radio" name="discount_category" required value={value} checked={category === value} onChange={() => { setCategory(value); proof.setDocument(null); }} className="sr-only" />
                    <Icon size={20} aria-hidden="true" className={category === value ? 'text-[#99C1F1] light:text-[#1A5FB4]' : 'text-white/55 light:text-gray-400'} />
                    <span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs leading-relaxed text-white/55 light:text-gray-500">{detail}</span></span>
                  </label>)}
                </div>
              </fieldset>
              {category && <div className="mt-7 border-t border-white/10 pt-6 light:border-gray-200">
                <div className="mb-5"><h3 className="text-base font-semibold">Supporting document</h3><p className="mt-1 text-sm leading-relaxed text-white/65 light:text-gray-600">{state.document_required ? (student ? 'Use a school ID showing the current school year or another document proving current enrollment.' : `Upload your ${DISCOUNT_CATEGORIES[category]} ID/card. The name should match your verified commuter account.`) : 'Document upload is disabled for local workflow testing. No file will be sent or stored.'}</p></div>
                <DiscountProofFields proof={proof} busy={busy} proofId={proofId} year={new Date().getFullYear()} student={student} studentSectionSpacing={student} showDocument={state.document_required} documentLabel={student ? 'Enrollment proof' : `${DISCOUNT_CATEGORIES[category]} ID/card`} />
              </div>}
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#62A0EA]/20 bg-[#62A0EA]/[0.07] p-4 text-sm leading-relaxed text-white/75 light:border-[#1A5FB4]/20 light:bg-[#F0F7FF] light:text-gray-700 lg:hidden"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#99C1F1] light:text-[#1A5FB4]" aria-hidden="true" /><p>Your fare stays Regular while the team checks your document. Once approved, your new classification is used by the existing fare discount process. Student discounts require annual renewal.</p></div>
              <button type="submit" disabled={busy || incomplete} className={`${button} mt-6 w-full sm:w-auto sm:min-w-56 lg:hidden`}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy ? 'Submitting...' : correction ? 'Submit corrected documents' : 'Submit application'}{!busy && <ArrowRight size={16} aria-hidden="true" />}</button>
            </form> : <div className="py-7">
              <p className="max-w-2xl text-sm leading-relaxed text-white/70 light:text-gray-600">{state.status === 'PENDING' ? 'Your supporting document is being verified. Your account stays Regular until approval. We will send the result to Rewards & Updates.' : state.status === 'APPROVED' ? 'Your discount application was approved. Your current commuter classification is shown above.' : 'New discount applications are available to active Regular commuter accounts.'}</p>
              {state.commuter_type === 'STUDENT' && state.discount_expires_at && <p className="mt-4 text-sm text-white/70 light:text-gray-600">Your Student discount expires {date(state.discount_expires_at)} Philippine time. <Link href="/student-renewal" className="font-semibold text-[#99C1F1] underline light:text-[#1A5FB4] underline-offset-4">View annual renewal</Link></p>}
              <div className="flex flex-wrap items-center gap-x-6">
                {cancelButton}
                <button type="button" onClick={() => void load()} className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#99C1F1] hover:text-white light:text-[#1A5FB4] light:hover:text-[#164A8F]">Refresh status <ArrowRight size={15} aria-hidden="true" /></button>
              </div>
            </div>}
          </section>
          <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.035] light:border-gray-200 light:bg-white p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#99C1F1] light:text-[#1A5FB4]">What happens next</p>
            <ol className="mt-5">
              {[['01', 'Send your proof', 'Choose the category and upload a clear document.'], ['02', 'Admin verification', 'A reviewer checks that the document is valid.'], ['03', 'Classification update', 'If approved, the discount is applied to future eligible fares.']].map(([step, title, description], index) => <li key={step} className={`relative flex gap-4 ${index < 2 ? 'pb-6' : ''}`}>
                {index < 2 && <span aria-hidden="true" className="absolute bottom-0 left-3 top-7 w-px bg-white/10 light:bg-gray-200" />}
                <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${index === 0 ? 'border-[#62A0EA]/50 bg-[#62A0EA]/10 text-[#99C1F1] light:text-[#1A5FB4]' : 'border-white/15 text-white/50 light:border-gray-300 light:text-gray-400'}`}>{index === 0 && state.status === 'APPROVED' ? <Check size={13} aria-hidden="true" /> : step}</span>
                <div className="min-w-0"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-relaxed text-white/55 light:text-gray-500">{description}</p></div>
              </li>)}
            </ol>
            <div className="mt-6 border-t border-white/10 pt-5 light:border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45 light:text-gray-500">Before you submit</p>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/60 light:text-gray-600"><li>Use a clear, complete photo or PDF.</li><li>Files must be JPG, PNG, WebP, or PDF and no larger than 5 MB.</li><li>Only authorized reviewers can access your document.</li></ul>
            </div>
            {state.can_submit && <div className="mt-6 hidden items-center gap-3 lg:flex">
              <button type="submit" form={`${proofId}-form`} disabled={busy || incomplete} className={`${button} min-w-0 flex-1`}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy ? 'Submitting...' : correction ? 'Submit corrected documents' : 'Submit application'}{!busy && <ArrowRight size={16} aria-hidden="true" />}</button>
              <span className="group relative shrink-0">
                <button type="button" aria-label="Why does my fare stay Regular?" aria-describedby={`${proofId}-fare-tip`} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/65 transition-colors hover:border-[#99C1F1] hover:text-[#99C1F1] light:border-gray-300 light:text-gray-500 light:hover:border-[#1A5FB4] light:hover:text-[#1A5FB4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#99C1F1]"><CircleHelp size={18} aria-hidden="true" /></button>
                <span id={`${proofId}-fare-tip`} role="tooltip" className="invisible absolute bottom-full right-0 z-20 mb-2 w-64 rounded-lg border border-white/15 bg-[#10253B] p-3 text-left text-xs leading-relaxed text-white/85 light:border-gray-200 light:bg-white light:text-gray-700 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">Your fare stays Regular while the team checks your document. Once approved, your new classification is used by the existing fare discount process. Student discounts require annual renewal.</span>
              </span>
            </div>}
          </aside>
        </div>}
      </div>
    </main>
    <Modal themed isOpen={confirmSubmit} onClose={() => { if (!busy) setConfirmSubmit(false); }} maxWidth="max-w-md">
      <h2 className="pr-8 text-lg font-bold">{correction ? 'Submit corrected documents?' : 'Submit discount application?'}</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/70 light:text-gray-600">You are applying for the {category ? DISCOUNT_CATEGORIES[category] : 'selected'} commuter discount. The details and document will be sent to an admin for verification. Your account remains Regular until approval.</p>
      {state?.document_required === false ? <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs leading-relaxed text-amber-100/80 light:border-amber-200 light:bg-amber-50 light:text-amber-800">Local workflow testing only: no document will be sent or stored.</p> : proof.document && <p className="mt-3 truncate rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 light:border-gray-200 light:bg-gray-50 light:text-gray-600">Document: {proof.document.name}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={busy} onClick={() => setConfirmSubmit(false)} className={secondaryButton}>Go back</button>
        <button type="button" disabled={busy} onClick={() => void submitConfirmed()} className={button}>{busy && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}{busy ? 'Submitting...' : 'Confirm submission'}</button>
      </div>
    </Modal>
    <Modal themed isOpen={confirmCancel} onClose={() => { if (!busy) setConfirmCancel(false); }} maxWidth="max-w-md">
      <h2 className="pr-8 text-lg font-bold">Cancel this application?</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/70 light:text-gray-600">Your {application ? DISCOUNT_CATEGORIES[application.requested_type] : ''} application will be withdrawn and will not be reviewed. Your account stays Regular. You can start a new application, in any category, at any time.</p>
      {cancelError && <p role="alert" className="mt-4 text-sm text-red-300 light:text-red-600">{cancelError}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={busy} onClick={() => setConfirmCancel(false)} className={secondaryButton}>Keep application</button>
        <button type="button" disabled={busy} onClick={() => void cancelConfirmed()} className={button}>{busy && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}{busy ? 'Cancelling...' : 'Cancel application'}</button>
      </div>
    </Modal>
  </div>;
}
