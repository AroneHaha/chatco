// components/admin/users/review-request-modal.tsx
'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { CheckCircle, XCircle, AlertTriangle, LoaderCircle, ZoomIn, X, IdCard, User, FileText, GraduationCap, ExternalLink, ChevronDown, Check } from 'lucide-react';
import type { PendingRequest } from '@/app/(admin)/users/data/users-data';
import { DISCOUNT_CATEGORIES, discountStatusLabel, educationSummary, schoolYearSummary, type DiscountApplication, type RenewalStatus } from '@/lib/shared/services/student-renewal.service';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Same clock as formatDate (the viewer's), so the date and time always agree.
function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const REJECTION_REASONS = [
  'Blurry image',
  'ID does not match the filled details',
  'The ID does not match the role applied for',
  'The ID is expired',
  'The ID does not show the entire front',
] as const;

const RENEWAL_REASONS = [
  'Blurry document',
  'Document does not match the commuter',
  'Current school year or enrollment is not shown',
  'Enrollment proof is expired',
] as const;

const OTHER_REASON = 'Other';

// Same limit as the backend review rule for a renewal reason.
const RENEWAL_REASON_MAX = 500;

// Statuses without an entry fall back to neutral, never to success.
const RENEWAL_STATUS_COLOR: Partial<Record<RenewalStatus, string>> = {
  PENDING: 'text-[#8CB9F0]', NEEDS_CORRECTION: 'text-amber-300', APPROVED: 'text-emerald-400', REJECTED: 'text-red-400',
};

// The three outcomes of a renewal review, each with what it does to the
// commuter so the admin reads the consequence before choosing, not after.
const RENEWAL_DECISIONS = [
  { value: 'APPROVED', label: 'Approve', outcome: 'The student discount is renewed until next year’s renewal deadline.', confirm: 'Approve Renewal' },
  { value: 'NEEDS_CORRECTION', label: 'Request corrections', outcome: 'The commuter is sent your reason and has seven days to submit new proof.', confirm: 'Request Corrections' },
  { value: 'REJECTED', label: 'Reject', outcome: 'The commuter is sent your reason and becomes a Regular commuter.', confirm: 'Reject Renewal' },
] as const;

type RenewalDecision = typeof RENEWAL_DECISIONS[number]['value'];

/**
 * Select-styled picker for the renewal decision.
 *
 * The list opens upward, over the sections above it, so choosing never
 * changes the modal's height. It cannot open downward: the picker sits at
 * the bottom of the modal's scrolling body, which would clip it. Keyboard
 * handling follows RowActionsMenu (arrows, Home/End, Esc returns focus to
 * the trigger).
 */
function RenewalDecisionSelect({ value, onChange, options }: { value: RenewalDecision | ''; onChange: (value: RenewalDecision) => void; options: ReadonlyArray<{ value: RenewalDecision; label: string; outcome: string; confirm: string }> }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  // The list can open above the visible part of the scrolled modal, so bring
  // it into view and hand focus to the current choice (or the first one).
  useEffect(() => {
    const list = listRef.current;
    if (!isOpen || !list) return;
    list.scrollIntoView({ block: 'nearest' });
    (list.querySelector<HTMLButtonElement>('[aria-selected="true"]') ?? list.querySelector<HTMLButtonElement>('[role="option"]'))?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  const close = () => { setIsOpen(false); triggerRef.current?.focus(); };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();

    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'Tab') setIsOpen(false);
    else if (event.key === 'ArrowDown') { event.preventDefault(); focusAt(index + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); focusAt(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); focusAt(0); }
    else if (event.key === 'End') { event.preventDefault(); focusAt(items.length - 1); }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Decision: ${selected?.label ?? 'not selected'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        className={`flex w-full items-center justify-between gap-3 rounded-md border bg-[#0E1628] px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#62A0EA] ${isOpen ? 'border-[#62A0EA]' : 'border-[#1E2D45]'}`}
      >
        <span className={selected ? 'font-medium text-white' : 'text-slate-400'}>{selected?.label ?? 'Select a decision'}</span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div ref={listRef} id={listId} role="listbox" aria-label="Decision" onKeyDown={onListKeyDown} className="absolute inset-x-0 bottom-full z-10 mb-1 rounded-md border border-[#1E2D45] bg-[#111A2B] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => { onChange(option.value); close(); }}
              className="flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[#172238] focus:bg-[#172238] focus:outline-none"
            >
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-medium ${option.value === 'REJECTED' ? 'text-red-400' : 'text-white'}`}>{option.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{option.outcome}</span>
              </span>
              {option.value === value && <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[#62A0EA]" />}
            </button>
          ))}
        </div>
      )}

      {/* The chosen outcome keeps its consequence on screen. */}
      {selected && <p className="mt-2 text-sm text-slate-400">{selected.outcome}</p>}
    </div>
  );
}

interface ReviewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PendingRequest | null;
  onApprove: () => void;
  onReject: (reason: string, finalRejection?: boolean) => void;
  isProcessing?: boolean;
  /** The application under review when this is a student renewal, not a
   * registration. Anything but a PENDING one is shown read-only. */
  renewal?: DiscountApplication | null;
  errorMessage?: string;
}

export function ReviewRequestModal({ isOpen, onClose, request, onApprove, onReject, isProcessing = false, renewal = null, errorMessage }: ReviewRequestModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [decision, setDecision] = useState<RenewalDecision | ''>('');

  // Reset internal state whenever the modal is closed or a different
  // request is opened — prevents a stale rejection reason from a previous
  // review bleeding into the next one.
  if (!request) return null;

  const isDiscountRequest = renewal !== null;
  const isApplication = renewal?.request_type === 'APPLICATION';
  const isStudentProof = renewal?.requested_type === 'STUDENT';
  const requestName = isApplication ? 'application' : 'renewal';
  const decisions = RENEWAL_DECISIONS.map(option => !isApplication ? option : {
    ...option,
    outcome: option.value === 'APPROVED' ? `The account becomes ${DISCOUNT_CATEGORIES[renewal.requested_type]}. The verified discount becomes available.` : option.value === 'REJECTED' ? 'The commuter is sent your reason. Their account remains Regular.' : 'The commuter is sent your reason and can submit new proof at any time. Their account remains Regular until approved.',
    confirm: option.value === 'APPROVED' ? 'Approve Application' : option.value === 'REJECTED' ? 'Reject Application' : option.confirm,
  });
  const readOnly = isDiscountRequest && renewal.status !== 'PENDING';
  const documentIsPdf = renewal?.document_mime === 'application/pdf';

  if (isProcessing) {
    return (
      <Modal isOpen={isOpen} onClose={() => {}} maxWidth="max-w-md">
        <div role="status" aria-live="polite" className="flex flex-col items-center px-2 py-6 text-center">
          <LoaderCircle size={36} className="mb-4 animate-spin text-[#62A0EA]" aria-hidden="true" />
          <h2 className="text-xl font-bold text-white">
            {isDiscountRequest
              ? decision === 'APPROVED' ? `Approving ${requestName}...` : decision === 'NEEDS_CORRECTION' ? 'Requesting corrections...' : `Rejecting ${requestName}...`
              : showRejectConfirm ? 'Rejecting registration...' : 'Approving registration...'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">Processing {request.name}&apos;s submission. Please wait.</p>
        </div>
      </Modal>
    );
  }

  const isOtherReason = selectedReason === OTHER_REASON;
  const effectiveReason = isOtherReason ? customReason.trim() : selectedReason;
  const resetRejectState = () => {
    setShowRejectConfirm(false);
    setSelectedReason('');
    setCustomReason('');
  };

  const handleRejectClick = () => {
    if (effectiveReason) {
      onReject(effectiveReason);
    }
  };

  // Approval needs no reason; the other two outcomes send one to the commuter.
  const decisionNeedsReason = decision === 'NEEDS_CORRECTION' || decision === 'REJECTED';
  const handleDecisionConfirm = () => {
    if (decision === 'APPROVED') onApprove();
    else if (decisionNeedsReason && effectiveReason) onReject(effectiveReason, decision === 'REJECTED');
  };

  const showingConfirm = showRejectConfirm || showApproveConfirm;
  const initials = `${request.firstName?.[0] ?? ''}${request.surname?.[0] ?? ''}`.toUpperCase() || '—';
  const sectionClasses = 'rounded-xl border border-white/10 bg-white/[0.035] p-4';
  const fieldLabelClasses = 'text-[10px] font-semibold uppercase tracking-wider text-slate-500';
  const fieldValueClasses = 'mt-1 truncate text-sm font-medium text-white';
  // `min-w-0` on each cell is required for `truncate` to work inside
  // a grid track (grid items default to min-width:auto, which lets
  // long, unbroken strings like emails/usernames blow the column out
  // instead of ellipsizing). Long values still show in full via the
  // `title` tooltip on hover. Username + Email get their own
  // full-width row since they're the fields most likely to run long.
  const detailsSection = (
    <section className={sectionClasses}>
      <div className="mb-3 flex items-center gap-2">
        <User className="h-4 w-4 text-[#62A0EA]" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">{isDiscountRequest ? 'Commuter Details' : 'Applicant Details'}</h3>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className={fieldLabelClasses}>First Name</p>
          <p className={fieldValueClasses} title={request.firstName}>{request.firstName}</p>
        </div>
        <div className="min-w-0">
          <p className={fieldLabelClasses}>Middle Name</p>
          <p className={fieldValueClasses} title={request.middleName || undefined}>{request.middleName || '—'}</p>
        </div>
        <div className="min-w-0">
          <p className={fieldLabelClasses}>Surname</p>
          <p className={fieldValueClasses} title={request.surname}>{request.surname}</p>
        </div>
        <div className="min-w-0">
          <p className={fieldLabelClasses}>Birthdate</p>
          <p className={fieldValueClasses}>{formatDate(request.birthdate)}</p>
        </div>
        <div className="min-w-0">
          <p className={fieldLabelClasses}>Gender</p>
          <p className={fieldValueClasses}>{request.gender}</p>
        </div>
        <div className="min-w-0">
          <p className={fieldLabelClasses}>Phone Number</p>
          <p className={fieldValueClasses} title={request.phoneNumber}>{request.phoneNumber}</p>
        </div>
        {/* A renewal shows its submission date with the enrollment details
            and the email in the identity strip, so neither repeats here. */}
        {!isDiscountRequest && (
          <div className="col-span-2 min-w-0">
            <p className={fieldLabelClasses}>Date Applied</p>
            <p className={fieldValueClasses}>{formatDate(request.createdAt)}</p>
          </div>
        )}
        <div className="col-span-2 min-w-0">
          <p className={fieldLabelClasses}>Username</p>
          <p className={fieldValueClasses} title={request.username}>{request.username}</p>
        </div>
        {!isDiscountRequest && (
          <div className="col-span-2 min-w-0">
            <p className={fieldLabelClasses}>Email</p>
            <p className={fieldValueClasses} title={request.email}>{request.email}</p>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!isProcessing) onClose(); }} maxWidth="max-w-2xl">
      <div className="pr-8">
        <h2 className="text-xl font-bold text-white sm:text-2xl">{!isDiscountRequest ? 'Review Registration Request' : readOnly ? (isApplication ? 'Application Details' : 'Renewal Details') : (isApplication ? 'Review Discount Application' : 'Review Renewal')}</h2>
        <p className="mt-1 text-sm text-slate-500">{!isDiscountRequest ? 'Verify the applicant’s details against their uploaded ID before deciding.' : readOnly ? `No review action is available for this ${requestName}.` : (isStudentProof ? 'Verify current enrollment and school year against the account details.' : 'Verify the requested category and ID/card against the account details.')}</p>
      </div>

      <div className="mt-5 space-y-4">
        {/* Applicant identity strip — the one place a human name/email/type
            summary lives, so the admin doesn't have to scan the field grid
            below just to know who they're looking at. */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#62A0EA]/15 text-sm font-bold text-[#8CB9F0]">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white" title={request.name}>{request.name}</p>
              <p className="truncate text-xs text-slate-500" title={request.email}>{request.email}</p>
            </div>
          </div>
          {/* Every renewal is a student's, so the strip carries the one thing
              that differs between them: where the application stands. */}
          {isDiscountRequest ? (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</p>
              <p className={`text-sm font-semibold ${RENEWAL_STATUS_COLOR[renewal.status] ?? 'text-slate-300'}`}>{discountStatusLabel(renewal)}</p>
            </div>
          ) : (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Commuter Type</p>
              <p className="text-sm font-semibold text-[#8CB9F0]">{request.commuterType}</p>
            </div>
          )}
        </div>

        {/* What the previous reviewer told the commuter, kept above the
            documents so a returning admin reads it before re-checking. */}
        {isDiscountRequest && (renewal.reason || renewal.correction_due_at) && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm">
            {renewal.reason && <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Review Note</p>
              <p className="mt-1 wrap-break-word text-slate-200">{renewal.reason}</p>
            </>}
            {renewal.correction_due_at && (
              <p className={`text-amber-300 ${renewal.reason ? 'mt-3' : ''}`}>
                Correction deadline: {new Date(renewal.correction_due_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' })} (Philippine time)
              </p>
            )}
          </div>
        )}

        {/* Repeat-applicant warning — this identity (email/contact) has been
            rejected before. Helps the admin spot applicants nearing the
            re-registration cooldown threshold. */}
        {request.rejectionCount > 0 && (
          <div className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-300">
                This applicant has been rejected{' '}
                <span className="font-semibold">
                  {request.rejectionCount} {request.rejectionCount === 1 ? 'time' : 'times'}
                </span>{' '}
                before.
                {request.blockedUntil && ` Registration is restricted until ${new Date(request.blockedUntil).toLocaleString()}.`}
              </p>
            </div>
            {request.rejectionHistory.length > 0 && (
              <div className="max-h-32 space-y-2 overflow-y-auto border-t border-amber-400/20 pt-2">
                {request.rejectionHistory.map((entry) => (
                  <div key={`${entry.attemptNumber}-${entry.rejectedAt}`} className="text-xs text-slate-300">
                    <span className="font-semibold text-amber-300">Attempt {entry.attemptNumber}</span>
                    {' - '}{entry.reason}
                    <span className="ml-2 text-slate-500">{new Date(entry.rejectedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ID document + applicant fields, side by side on sm+ so the image
            and the data an admin cross-checks it against sit in one glance
            instead of a long single-column scroll. A renewal gets a wider
            document column: the proof is the thing being judged. */}
        <div className={`grid grid-cols-1 gap-4 ${isDiscountRequest ? 'sm:grid-cols-[15rem_1fr]' : 'sm:grid-cols-[13rem_1fr]'}`}>
          <section className={sectionClasses}>
            <div className="mb-3 flex items-center gap-2">
              {isDiscountRequest ? <FileText className="h-4 w-4 text-[#62A0EA]" /> : <IdCard className="h-4 w-4 text-[#62A0EA]" />}
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">{isDiscountRequest ? (isStudentProof ? 'Enrollment Proof' : 'Supporting Document') : 'ID Document'}</h3>
            </div>
            {/* A REGULAR applicant may register without an ID while the
                "Force Valid ID Upload" setting is off. */}
            {!request.idImageUrl ? (
              <p className="rounded-lg border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
                {isDiscountRequest ? 'No supporting document was attached to this application.' : 'No ID uploaded. ID upload was optional for this registration.'}
              </p>
            ) : documentIsPdf ? (
              // A PDF cannot be previewed inline, so it keeps the image's
              // frame and opens in a new tab instead.
              <div className="flex aspect-3/4 w-full flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 text-center">
                <FileText size={28} className="text-[#62A0EA]" aria-hidden="true" />
                <p className="text-sm font-medium text-white">PDF document</p>
                <a href={request.idImageUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#62A0EA]/30 bg-[#62A0EA]/10 px-3 text-sm font-semibold text-[#99C1F1] transition-colors hover:bg-[#62A0EA]/15">
                  Open Document<ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            ) : (
            <>
            {/* Click to view full size, since the thumbnail is too small to
                actually verify text/photo details against. */}
            <button
              type="button"
              onClick={() => setIsImageExpanded(true)}
              className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-white/10"
              aria-label={isDiscountRequest ? 'View full-size supporting document' : 'View full-size ID image'}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={request.idImageUrl} alt={isDiscountRequest ? 'Uploaded supporting document' : 'Uploaded ID'} className="aspect-3/4 w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                <ZoomIn size={20} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">{isDiscountRequest ? 'Uploaded proof · tap to enlarge' : 'Uploaded Valid ID · tap to enlarge'}</p>
            </>
            )}
          </section>

          {isDiscountRequest ? (
            <div className="min-w-0 space-y-4">
              {/* What the commuter claimed, next to the proof it is checked
                  against. The school name wraps instead of truncating because
                  it has to be read in full. */}
              <section className={sectionClasses}>
                <div className="mb-3 flex items-center gap-2">
                  {isStudentProof ? <GraduationCap className="h-4 w-4 text-[#62A0EA]" /> : <IdCard className="h-4 w-4 text-[#62A0EA]" />}
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">{isStudentProof ? 'Enrollment Details' : 'Application Details'}</h3>
                  {renewal.revision > 1 && <span className="ml-auto text-xs text-slate-400">Resubmission {renewal.revision - 1}</span>}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="col-span-2"><p className={fieldLabelClasses}>Requested category</p><p className={fieldValueClasses}>{DISCOUNT_CATEGORIES[renewal.requested_type]}</p></div>
                  {isStudentProof && <>
                  <div className="col-span-2 min-w-0">
                    <p className={fieldLabelClasses}>School</p>
                    <p className="mt-1 wrap-break-word text-sm font-medium text-white">{renewal.school_name}</p>
                  </div>
                  <div className="min-w-0">
                    <p className={fieldLabelClasses}>Level</p>
                    <p className={fieldValueClasses} title={educationSummary(renewal)}>{educationSummary(renewal)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className={fieldLabelClasses}>School Year / Term</p>
                    <p className={fieldValueClasses} title={schoolYearSummary(renewal)}>{schoolYearSummary(renewal)}</p>
                  </div>
                  </>}
                  {renewal.cycle_year !== null && <>
                  <div className="min-w-0">
                    <p className={fieldLabelClasses}>Renewal Cycle</p>
                    <p className={fieldValueClasses}>{renewal.cycle_year}</p>
                  </div>
                  </>}
                  <div className="min-w-0">
                    <p className={fieldLabelClasses}>Submitted</p>
                    <p className={fieldValueClasses}>{formatDate(renewal.submitted_at)}</p>
                    <p className="text-xs text-slate-400">{formatTime(renewal.submitted_at)}</p>
                  </div>
                </div>
              </section>
              {detailsSection}
            </div>
          ) : detailsSection}
        </div>

        {/* Sits with the decision controls, not at the top of the modal: a
            failed review leaves the admin at the bottom of a scrolled panel. */}
        {errorMessage && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{errorMessage}</p>}

        {/* Rejection Reason Input (Hidden until clicked) */}
        {showRejectConfirm && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4">
            <div className="flex items-center space-x-2 mb-2 text-red-400">
              <AlertTriangle size={16} />
              <span className="text-sm font-semibold">Select the reason for rejection:</span>
            </div>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              disabled={isProcessing}
              className="w-full bg-black/30 border border-[#1E2D45] rounded-lg text-white text-sm p-2 focus:outline-none focus:ring-1 focus:ring-red-400 [color-scheme:dark]"
            >
              <option value="" disabled className="bg-gray-800">Select a reason...</option>
              {REJECTION_REASONS.map((reason) => (
                <option key={reason} value={reason} className="bg-gray-800">{reason}</option>
              ))}
              <option value={OTHER_REASON} className="bg-gray-800">{OTHER_REASON}</option>
            </select>

            {/* Free-text box only appears when "Other" is selected. */}
            {isOtherReason && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                disabled={isProcessing}
                rows={2}
                autoFocus
                placeholder="Describe the reason for rejection..."
                className="mt-2 w-full bg-black/30 border border-[#1E2D45] rounded-lg text-white text-sm placeholder-slate-500 p-2 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
              />
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={resetRejectState}
                disabled={isProcessing}
                className="px-4 py-2 border border-[#1E2D45] text-slate-300 rounded-xl hover:bg-[#131C2E] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectClick}
                disabled={!effectiveReason || isProcessing}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? <LoaderCircle size={18} className="animate-spin" /> : <XCircle size={18} />}
                <span>{isProcessing ? 'Processing...' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Approval Confirmation (Hidden until "Approve Account" is clicked) */}
        {showApproveConfirm && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
            <div className="flex items-start space-x-2 mb-3 text-emerald-300">
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
              <p className="text-sm">
                Approve <span className="font-semibold text-white">{request.name}</span>&apos;s registration as a{' '}
                <span className="font-semibold">{request.commuterType}</span> commuter? They will be able to log in immediately.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowApproveConfirm(false)}
                disabled={isProcessing}
                className="px-4 py-2 border border-[#1E2D45] text-slate-300 rounded-xl hover:bg-[#131C2E] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onApprove}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? <LoaderCircle size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                <span>{isProcessing ? 'Processing...' : 'Confirm Approval'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons — both tonal (border + low-opacity fill) so they
            read as part of the same flat, bordered panel system as the
            sections above, rather than a bright solid bar dropped on top of
            it. Equal width keeps the pair reading as one balanced decision.
            Each escalates to a solid confirm button only once the admin has
            actually committed, in the panel below. */}
        {!showingConfirm && !isDiscountRequest && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowRejectConfirm(true)}
              disabled={isProcessing}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 font-semibold text-red-400 transition-colors hover:border-red-500/30 hover:bg-red-500/15"
            >
              <XCircle size={18} />
              <span>Reject</span>
            </button>
            <button
              onClick={() => setShowApproveConfirm(true)}
              disabled={isProcessing}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 font-semibold text-emerald-400 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/15"
            >
              <CheckCircle size={18} />
              <span>Approve Account</span>
            </button>
          </div>
        )}

        {/* Renewal decision — one picker instead of a button per outcome. Each
            choice states what it does to the commuter, the reason field only
            appears for the two outcomes that send one, and a single button
            carries the chosen action. Picking an outcome and then pressing
            that button is the confirmation, so there is no second prompt. */}
        {isDiscountRequest && !readOnly && (
          <div className="border-t border-white/10 pt-4">
            <p className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Decision</p>
            <RenewalDecisionSelect options={decisions} value={decision} onChange={setDecision} />

            {decisionNeedsReason && (
              <div className="mt-4">
                <label htmlFor="renewal-reason" className="text-sm font-medium text-slate-200">Reason sent to the commuter</label>
                <select
                  id="renewal-reason"
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="mt-2 block w-full rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2.5 text-sm text-white transition-colors scheme-dark focus:outline-none focus:ring-1 focus:ring-[#62A0EA]"
                >
                  <option value="" disabled className="bg-gray-800">Select a reason...</option>
                  {(isStudentProof ? RENEWAL_REASONS : REJECTION_REASONS).map((reason) => (
                    <option key={reason} value={reason} className="bg-gray-800">{reason}</option>
                  ))}
                  <option value={OTHER_REASON} className="bg-gray-800">{OTHER_REASON}</option>
                </select>
                {isOtherReason && (
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    rows={2}
                    autoFocus
                    maxLength={RENEWAL_REASON_MAX}
                    aria-label="Other reason"
                    placeholder={decision === 'NEEDS_CORRECTION' ? 'Describe what needs to be corrected...' : 'Describe the reason for rejection...'}
                    className="mt-2 block w-full resize-none rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA]"
                  />
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleDecisionConfirm}
                disabled={!decision || (decisionNeedsReason && !effectiveReason)}
                className={`w-full rounded-md px-5 py-2.5 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${decision === 'REJECTED' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#62A0EA] hover:bg-[#4A8BD4]'}`}
              >
                {decisions.find((option) => option.value === decision)?.confirm ?? 'Confirm Decision'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full-size ID image lightbox — sits above the review modal (z-60 vs
          the modal's z-50) so it isn't clipped by the panel's own scroll area. */}
      {isImageExpanded && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setIsImageExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setIsImageExpanded(false)}
            className="absolute top-4 right-4 p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close full-size image"
          >
            <X size={24} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={request.idImageUrl}
            alt={isDiscountRequest ? 'Uploaded supporting document (full size)' : 'Uploaded ID (full size)'}
            className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Modal>
  );
}
