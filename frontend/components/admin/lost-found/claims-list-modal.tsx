// components/admin/lost-found/claims-list-modal.tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { ApproveClaimModal } from '@/components/admin/lost-found/approve-claim-modal';
import ProofPhotoPicker from '@/components/commuter/lost-and-found/proof-photo-picker';
import type { PickupSchedule } from '@/lib/shared/services/lost-found.service';
import {
  CalendarX2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  ExternalLink,
  ImageIcon,
  PackageCheck,
  RotateCcw,
  UserPlus,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { Claim, ClaimStatus } from '@/app/(admin)/lost-found/data/lost-found-data';

type ClaimAction = 'Approve' | 'Release' | 'Reject';

interface ClaimsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  claims: Claim[];
  /** Admin who released/closed the item — the "Released" timeline step lives
   * on the item (closed_by), not the claim, since release closes the item. */
  releasedByName?: string | null;
  /** `pickup` is required when approving an account claimant (see ApproveClaimModal). */
  onClaimAction: (itemId: string, action: ClaimAction, claimId: string, pickup?: PickupSchedule) => Promise<void>;
  onRecordManualClaim: (itemId: string, input: {
    name: string;
    contact?: string;
    email?: string;
    proof: string;
    /** Proof photos picked at the desk. Not uploaded yet: the parent's
     * recordManualClaim() ignores them until the walk-in photo upload
     * endpoint exists. */
    images?: File[];
  }) => Promise<void>;
}

/** Status as coloured text + icon (no badge). Unknown values fall back to
 * neutral slate, never to a success colour. */
function getClaimStatusMeta(claim: Claim): { label: string; className: string; icon: LucideIcon } {
  if (claim.noShowAt) return { label: 'Did not proceed', className: 'text-slate-300 admin-light:text-slate-700', icon: CalendarX2 };
  switch (claim.status) {
    case 'Pending':
      return { label: 'Pending review', className: 'text-amber-300 admin-light:text-amber-700', icon: Clock3 };
    case 'Approved':
      return { label: 'Approved', className: 'text-emerald-300 admin-light:text-emerald-700', icon: CheckCircle2 };
    case 'Released':
    case 'Returned':
      return { label: claim.status, className: 'text-[#8CB9F0] admin-light:text-[#1A5FB4]', icon: PackageCheck };
    case 'Rejected':
      return { label: 'Rejected', className: 'text-red-300 admin-light:text-red-700', icon: XCircle };
    default:
      return { label: claim.status, className: 'text-slate-300 admin-light:text-slate-700', icon: Clock3 };
  }
}

function formatClaimDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getProcessTimeline(
  claim: Claim,
  releasedByName: string | null | undefined
): { label: string; date: string | null; tone: string; by: string | null }[] {
  return [
    { label: 'Submitted', date: claim.claimDate, tone: 'text-slate-300 admin-light:text-slate-700', by: null },
    { label: 'Approved', date: claim.approvedAt ?? null, tone: 'text-emerald-300 admin-light:text-emerald-700', by: claim.reviewedByName ?? null },
    // A no-show is closed by the daily job, not an admin, so it has no "by".
    claim.noShowAt
      ? { label: 'Not collected', date: claim.noShowAt, tone: 'text-slate-300 admin-light:text-slate-700', by: 'System' }
      : { label: 'Rejected', date: claim.rejectedAt ?? null, tone: 'text-red-300 admin-light:text-red-700', by: claim.reviewedByName ?? null },
    { label: 'Released', date: claim.releasedAt ?? null, tone: 'text-[#8CB9F0] admin-light:text-[#1A5FB4]', by: releasedByName ?? null },
  ].filter((step) => Boolean(step.date));
}

function availableActions(status: ClaimStatus): ClaimAction[] {
  switch (status) {
    case 'Pending':
      return ['Approve', 'Reject'];
    case 'Approved':
      return ['Release', 'Reject'];
    default:
      return [];
  }
}

function isAcceptedStatus(status: ClaimStatus): boolean {
  return status === 'Approved' || status === 'Released' || status === 'Returned';
}

function getActionIcon(action: ClaimAction) {
  switch (action) {
    case 'Approve':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'Release':
      return <RotateCcw className="h-4 w-4" />;
    case 'Reject':
      return <XCircle className="h-4 w-4" />;
  }
}

// One solid action per claim; Reject stays secondary so it never competes
// with the move the desk usually makes.
const actionButtonClasses: Record<ClaimAction, string> = {
  Approve: 'bg-emerald-500 text-white hover:bg-emerald-600',
  Release: 'bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F]',
  Reject: 'border border-red-400/30 text-red-300 admin-light:text-red-700 hover:bg-red-500/10 hover:text-red-200 admin-light:hover:text-red-800',
};

// Every decision goes through a confirmation; this is what each one says.
// Release closes the item outright, so its copy asks for the handover checks.
const confirmationCopy: Record<ClaimAction, { title: string; lead: string; effect: string; confirm: string; button: string }> = {
  Approve: {
    title: 'Approve this claim?',
    lead: 'Approve the claim submitted by ',
    effect: 'This approves the claimant and rejects the other pending claims. Release the item separately after handing it over.',
    confirm: 'Confirm approve',
    button: 'bg-emerald-500 hover:bg-emerald-600',
  },
  Release: {
    title: 'Release this item?',
    lead: 'Hand the item over to ',
    effect: "Only confirm once you've checked their valid ID and proof and the item is in their hands. This closes the claim and the item, moves it to History and notifies the claimant. It can't be undone.",
    confirm: 'Confirm release',
    button: 'bg-[#62A0EA] admin-light:bg-[#1A5FB4] hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F]',
  },
  Reject: {
    title: 'Reject this claim?',
    lead: 'Reject the claim submitted by ',
    effect: 'This marks the claim as rejected. This claimant will not be authorized to collect the item.',
    confirm: 'Confirm reject',
    button: 'bg-red-600 hover:bg-red-700',
  },
};

function SectionLabel({ children }: { children: ReactNode }) {
  return <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</h4>;
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm ${value ? 'font-semibold text-slate-100 admin-light:text-slate-900' : 'text-slate-500'}`}>{value || 'N/A'}</dd>
    </div>
  );
}

export function ClaimsListModal({ isOpen, onClose, itemId, claims, releasedByName, onClaimAction, onRecordManualClaim }: ClaimsListModalProps) {
  const [pendingAction, setPendingAction] = useState<{ claimId: string; action: ClaimAction } | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', contact: '', email: '', proof: '' });
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualPhotos, setManualPhotos] = useState<File[]>([]);
  // Set when neither a phone nor an email was given, so both fields show it.
  const [isContactMissing, setIsContactMissing] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);
  // Account claimant awaiting the pickup-schedule step before approval.
  const [approveTarget, setApproveTarget] = useState<Claim | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ claim: Claim; action: ClaimAction } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const actionInFlight = useRef(false);
  const cancelActionRef = useRef<HTMLButtonElement>(null);
  const orderedClaims = [...claims].sort((a, b) => {
    if (isAcceptedStatus(a.status) !== isAcceptedStatus(b.status)) {
      return isAcceptedStatus(a.status) ? -1 : 1;
    }
    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
    return new Date(b.claimDate).getTime() - new Date(a.claimDate).getTime();
  });
  const pendingCount = claims.filter((claim) => claim.status === 'Pending').length;

  // Which claim rows are open. Each time the modal opens on an item (or its
  // first claim arrives), the top claim starts open: with the pending/accepted
  // ordering above, that's the one the desk acts on next. Reset during render
  // rather than in an effect, so the first paint already has it open.
  const [expandedClaimIds, setExpandedClaimIds] = useState<Set<string>>(new Set());
  const expansionKey = isOpen && orderedClaims.length > 0 ? itemId : null;
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  if (expansionKey !== expandedFor) {
    setExpandedFor(expansionKey);
    setExpandedClaimIds(new Set(expansionKey ? [orderedClaims[0].id] : []));
  }
  // The walk-in draft belongs to one item. The modal stays mounted between
  // items, so without this a half-filled form for one item could be saved
  // against the next item the desk opens.
  const formKey = isOpen ? itemId : null;
  const [formFor, setFormFor] = useState<string | null>(null);
  if (formKey !== formFor) {
    setFormFor(formKey);
    setShowManualForm(false);
    setManualForm({ name: '', contact: '', email: '', proof: '' });
    setManualPhotos([]);
    setManualError(null);
    setIsContactMissing(false);
    setApproveTarget(null);
    setConfirmTarget(null);
    setActionError(null);
  }

  useEffect(() => {
    if (showManualForm) nameInputRef.current?.focus({ preventScroll: true });
  }, [showManualForm]);

  useEffect(() => {
    if (confirmTarget) cancelActionRef.current?.focus({ preventScroll: true });
  }, [confirmTarget]);

  const toggleClaim = (claimId: string) => {
    setExpandedClaimIds((current) => {
      const next = new Set(current);
      if (next.has(claimId)) next.delete(claimId);
      else next.add(claimId);
      return next;
    });
  };

  const handleAction = async (claimId: string, action: ClaimAction) => {
    if (actionInFlight.current) return;
    setActionError(null);
    // Account approvals already have a pickup-schedule confirmation step.
    const target = claims.find((claim) => claim.id === claimId);
    if (!target) return;
    if (action === 'Approve' && target?.linkedAccount) {
      setApproveTarget(target);
      return;
    }
    setConfirmTarget({ claim: target, action });
  };

  const submitAction = async (claimId: string, action: ClaimAction) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setActionError(null);
    setPendingAction({ claimId, action });
    try {
      await onClaimAction(itemId, action, claimId);
      setConfirmTarget(null);
      onClose();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to process this claim. Please try again.');
    } finally {
      actionInFlight.current = false;
      setPendingAction(null);
    }
  };

  const closeConfirmation = () => {
    if (actionInFlight.current) return;
    setConfirmTarget(null);
    setActionError(null);
  };

  const handleConfirmApproval = async (pickup: PickupSchedule) => {
    if (!approveTarget) return;
    // Errors propagate so ApproveClaimModal can show them inline.
    await onClaimAction(itemId, 'Approve', approveTarget.id, pickup);
    setApproveTarget(null);
    onClose();
  };

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualForm.contact.trim() && !manualForm.email.trim()) {
      setIsContactMissing(true);
      setManualError(null);
      return;
    }
    setIsContactMissing(false);
    setManualError(null);
    setIsSavingManual(true);
    try {
      await onRecordManualClaim(itemId, {
        name: manualForm.name.trim(),
        contact: manualForm.contact.trim() || undefined,
        email: manualForm.email.trim() || undefined,
        proof: manualForm.proof.trim(),
        images: manualPhotos,
      });
      setManualForm({ name: '', contact: '', email: '', proof: '' });
      setManualPhotos([]);
      setShowManualForm(false);
    } catch (error) {
      setManualError(error instanceof Error ? error.message : 'Unable to record claimant.');
    } finally {
      setIsSavingManual(false);
    }
  };

  // Same field treatment as the other admin forms: #1E2D45 hairline, the
  // darkest admin tone for the well, a soft Sky Blue ring on focus.
  const inputClasses = 'block h-10 w-full rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0B1120] admin-light:bg-white px-3 text-sm text-white admin-light:text-slate-900 outline-none transition-colors placeholder:text-slate-600 admin-light:placeholder:text-slate-400 focus:border-[#62A0EA]/50 admin-light:focus:border-[#1A5FB4]/50 focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30 disabled:cursor-not-allowed disabled:opacity-60';
  const invalidInputClasses = 'border-red-500/50 bg-red-500/5 focus:border-red-400/60 focus:ring-red-400/30';
  const labelClasses = 'mb-1.5 block text-xs font-semibold text-slate-300 admin-light:text-slate-700';
  const closeManualForm = () => {
    setShowManualForm(false);
    setManualError(null);
    setIsContactMissing(false);
  };

  return (
    <Modal adminThemed isOpen={isOpen} onClose={() => { if (!actionInFlight.current && !confirmTarget && !approveTarget) onClose(); }} maxWidth="max-w-3xl" rounded="rounded-xl" height="h-[min(760px,88vh)]">
      <header className="flex flex-col gap-4 pr-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8CB9F0] admin-light:text-[#1A5FB4]">
            <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
            Claim desk
          </p>
          <h2 className="text-xl font-bold leading-tight text-white admin-light:text-slate-900 sm:text-2xl">Claims for Item</h2>
          <p className="mt-1 text-sm text-slate-500">
            {claims.length} claim {claims.length === 1 ? 'record' : 'records'}
            {pendingCount > 0 && <span className="text-amber-300 admin-light:text-amber-700"> &middot; {pendingCount} awaiting review</span>}
          </p>
        </div>
        {/* Toggles the form below: solid Sky Blue like the other admin "add"
            actions while closed, the quieter pressed state while open. */}
        <button
          type="button"
          onClick={() => (showManualForm ? closeManualForm() : setShowManualForm(true))}
          aria-expanded={showManualForm}
          aria-controls="walkin-form-panel"
          disabled={isSavingManual}
          className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] active:scale-[0.98] disabled:opacity-50 ${
            showManualForm
              ? 'border border-[#62A0EA]/40 admin-light:border-[#1A5FB4]/40 bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10 text-[#8CB9F0] admin-light:text-[#1A5FB4] hover:bg-[#62A0EA]/15 admin-light:hover:bg-[#1A5FB4]/15'
              : 'bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F]'
          }`}
        >
          {showManualForm ? <X className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
          {showManualForm ? 'Close form' : 'Walk-in claimant'}
        </button>
      </header>

      {actionError && !confirmTarget && <p role="alert" className="mt-4 text-sm text-red-300 admin-light:text-red-700">{actionError}</p>}

      {/* Opens in place with the same slide as the claim rows; `inert` keeps
          the closed form out of the tab order. */}
      <div
        id="walkin-form-panel"
        inert={!showManualForm}
        className={`grid transition-[grid-template-rows,margin] duration-300 ease-out motion-reduce:transition-none ${showManualForm ? 'mt-6 grid-rows-[1fr]' : 'mt-0 grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <form onSubmit={handleManualSubmit} className="overflow-hidden rounded-xl border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F8FAFC]">
            <div className="flex items-start gap-3 border-b border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white px-4 py-3.5 sm:px-5">
              <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-[#62A0EA] admin-light:text-[#1A5FB4]" aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white admin-light:text-slate-900">Record a claimant without an account</h3>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">Add contact details and proof before approving a handover.</p>
              </div>
            </div>

            <div className="space-y-5 px-4 py-4 sm:px-5">
              <div>
                <label htmlFor="walkin-name" className={labelClasses}>Full name<span className="ml-0.5 text-red-400 admin-light:text-red-600">*</span></label>
                <input ref={nameInputRef} id="walkin-name" required maxLength={100} autoComplete="off" value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} disabled={isSavingManual} className={inputClasses} />
              </div>

              <fieldset aria-describedby="walkin-contact-help">
                <legend className="sr-only">Contact details</legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="walkin-phone" className={labelClasses}>Phone number</label>
                    <input
                      id="walkin-phone"
                      type="tel"
                      inputMode="tel"
                      maxLength={20}
                      autoComplete="off"
                      value={manualForm.contact}
                      onChange={(e) => { setManualForm({ ...manualForm, contact: e.target.value }); setIsContactMissing(false); }}
                      disabled={isSavingManual}
                      aria-invalid={isContactMissing}
                      className={`${inputClasses} ${isContactMissing ? invalidInputClasses : ''}`}
                    />
                  </div>
                  <div>
                    <label htmlFor="walkin-email" className={labelClasses}>Email address</label>
                    <input
                      id="walkin-email"
                      type="email"
                      maxLength={255}
                      autoComplete="off"
                      value={manualForm.email}
                      onChange={(e) => { setManualForm({ ...manualForm, email: e.target.value }); setIsContactMissing(false); }}
                      disabled={isSavingManual}
                      aria-invalid={isContactMissing}
                      className={`${inputClasses} ${isContactMissing ? invalidInputClasses : ''}`}
                    />
                  </div>
                </div>
                <p id="walkin-contact-help" role={isContactMissing ? 'alert' : undefined} className={`mt-2 text-xs ${isContactMissing ? 'font-medium text-red-300 admin-light:text-red-700' : 'text-slate-500'}`}>
                  {isContactMissing ? 'Enter a phone number or email address.' : 'A phone number or an email address is required.'}
                </p>
              </fieldset>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <label htmlFor="walkin-proof" className="block text-xs font-semibold text-slate-300 admin-light:text-slate-700">Proof of ownership<span className="ml-0.5 text-red-400 admin-light:text-red-600">*</span></label>
                  <span className="text-[11px] tabular-nums text-slate-500" aria-hidden="true">{manualForm.proof.length}/500</span>
                </div>
                <textarea
                  id="walkin-proof"
                  required
                  minLength={10}
                  maxLength={500}
                  rows={4}
                  value={manualForm.proof}
                  onChange={(e) => setManualForm({ ...manualForm, proof: e.target.value })}
                  disabled={isSavingManual}
                  aria-describedby="walkin-proof-help"
                  placeholder="What the claimant described or showed to prove it's theirs"
                  className={`${inputClasses} h-auto resize-none py-2.5 leading-6`}
                />
                <p id="walkin-proof-help" className="mt-2 text-xs text-slate-500">At least 10 characters.</p>
              </div>

              {/* Same picker and limits as the commuter claim form. */}
              <ProofPhotoPicker
                variant="admin"
                files={manualPhotos}
                onChange={setManualPhotos}
                disabled={isSavingManual}
                helperText="Up to 3 photos, such as the claimant's ID, a receipt, or the item with its owner. JPG, PNG, or WEBP, 5 MB each."
              />
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              {manualError
                ? <p role="alert" className="text-xs font-medium text-red-300 admin-light:text-red-700">{manualError}</p>
                : <span className="hidden sm:block" />}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeManualForm} disabled={isSavingManual} className="inline-flex h-9 items-center rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] px-4 text-xs font-semibold text-slate-300 admin-light:text-slate-700 transition-colors hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] hover:text-white admin-light:hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSavingManual} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-4 text-xs font-bold text-white transition-colors hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1628] admin-light:focus-visible:ring-offset-white active:scale-[0.98] disabled:opacity-50">
                  {isSavingManual && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />}
                  {isSavingManual ? 'Saving...' : 'Save claimant'}
                </button>
              </div>
            </footer>
          </form>
        </div>
      </div>

      {/* One expandable row per claim: the summary line is enough to scan the
          desk, and the full record (contacts, proof and its photos, history,
          actions) opens underneath on demand. */}
      <div className="mt-6">
        {orderedClaims.length > 0 ? (
          <ul className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0] overflow-hidden rounded-xl border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white">
            {orderedClaims.map((claim) => {
              const actions = availableActions(claim.status);
              const isAccepted = isAcceptedStatus(claim.status);
              const timeline = getProcessTimeline(claim, releasedByName);
              const status = getClaimStatusMeta(claim);
              const StatusIcon = status.icon;
              const account = claim.linkedAccount;
              const photos = claim.proofPhotos ?? [];
              const isExpanded = expandedClaimIds.has(claim.id);
              const panelId = `claim-panel-${claim.id}`;

              return (
                <li key={claim.id} className={isAccepted ? 'shadow-[inset_3px_0_0_0_rgba(16,185,129,0.6)]' : undefined}>
                  <h3>
                    <button
                      type="button"
                      onClick={() => toggleClaim(claim.id)}
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#62A0EA]/60 admin-light:focus-visible:ring-[#1A5FB4]/60 sm:gap-4 sm:px-5 ${isExpanded ? 'bg-[#131C2E] admin-light:bg-[#F8FAFC]' : 'hover:bg-[#131C2E]/70 admin-light:hover:bg-[#F8FAFC]'}`}
                    >
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-300 ease-out motion-reduce:transition-none ${isExpanded ? 'rotate-180 text-slate-300 admin-light:text-slate-700' : ''}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold leading-tight text-white admin-light:text-slate-900 sm:text-base">{claim.claimantName}</span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {account
                            ? `${account.name} · @${account.username}`
                            : 'Walk-in claimant, no app account'}
                        </span>
                      </span>
                      <span className="hidden shrink-0 flex-col items-end gap-1 text-right text-xs text-slate-400 admin-light:text-slate-500 sm:flex">
                        <span className="tabular-nums">{formatClaimDate(claim.claimDate)}</span>
                        <span className={`inline-flex items-center gap-1 ${photos.length > 0 ? 'text-slate-300 admin-light:text-slate-700' : 'text-slate-600 admin-light:text-slate-400'}`}>
                          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          {photos.length > 0 ? `${photos.length} proof photo${photos.length === 1 ? '' : 's'}` : 'No photos'}
                        </span>
                      </span>
                      <span className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold sm:w-36 sm:justify-end sm:text-sm ${status.className}`}>
                        <StatusIcon className="h-4 w-4" aria-hidden="true" />
                        {status.label}
                      </span>
                    </button>
                  </h3>

                  {/* grid-rows 0fr -> 1fr animates the open/close without
                      measuring heights; `inert` keeps the collapsed panel's
                      buttons and links out of the tab order. */}
                  <div
                    id={panelId}
                    role="region"
                    aria-label={`Claim by ${claim.claimantName}`}
                    inert={!isExpanded}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="border-t border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0B1120]/40 admin-light:bg-[#F8FAFC]">
                        <div className="px-4 py-4 sm:px-5">
                          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
                            <Fact label="Submitted" value={formatClaimDate(claim.claimDate)} />
                            <Fact label="Phone" value={claim.claimantContact} />
                            <Fact label="Email" value={claim.claimantEmail} />
                          </dl>
                        </div>

                        {claim.pickupLocation && (
                          <div className="border-t border-[#1E2D45] admin-light:border-[#E2E8F0] px-4 py-4 sm:px-5">
                            <SectionLabel>Pickup schedule</SectionLabel>
                            <p className="text-sm font-semibold text-slate-100 admin-light:text-slate-900">
                              {claim.pickupLocation}
                              {claim.pickupAt && <span className="font-normal text-slate-400 admin-light:text-slate-500"> &middot; {formatClaimDate(claim.pickupAt)}</span>}
                            </p>
                            {claim.pickupReminder && <p className="mt-1 text-xs leading-5 text-slate-400 admin-light:text-slate-500">{claim.pickupReminder}</p>}
                          </div>
                        )}

                        <div className="border-t border-[#1E2D45] admin-light:border-[#E2E8F0] px-4 py-4 sm:px-5">
                          <SectionLabel>Proof of ownership</SectionLabel>
                          {claim.proof
                            ? <p className="max-w-[65ch] whitespace-pre-line break-words text-sm leading-6 text-slate-200 admin-light:text-slate-800">{claim.proof}</p>
                            : <p className="text-sm text-slate-500">No written proof.</p>}

                          <p className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-400 admin-light:text-slate-500">
                            <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            Proof photos {photos.length > 0 && <span className="tabular-nums text-slate-500">({photos.length})</span>}
                          </p>
                          {photos.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {photos.map((photo, index) => (
                                <a
                                  key={photo.id}
                                  href={photo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open full size"
                                  aria-label={`Open proof photo ${index + 1} of ${photos.length} full size`}
                                  className="group/photo relative aspect-square overflow-hidden rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-[#F1F5F9] transition-colors hover:border-[#62A0EA]/60 admin-light:hover:border-[#1A5FB4]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4]"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={photo.url} alt={`Proof photo ${index + 1}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover/photo:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover/photo:scale-100" />
                                  <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-[#0B1120]/80 text-white opacity-0 transition-opacity group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100">
                                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                  </span>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-lg border border-dashed border-[#1E2D45] admin-light:border-[#E2E8F0] px-3 py-4 text-center text-xs text-slate-500">No photos attached to this claim.</p>
                          )}
                        </div>

                        {timeline.length > 0 && (
                          <div className="border-t border-[#1E2D45] admin-light:border-[#E2E8F0] px-4 py-4 sm:px-5">
                            <SectionLabel>History</SectionLabel>
                            <dl className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
                              {timeline.map((step) => (
                                <div key={`${claim.id}-${step.label}`} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-0.5 py-2 first:pt-0 last:pb-0 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]">
                                  <dt className={`text-xs font-semibold ${step.tone}`}>{step.label}</dt>
                                  <dd className="text-xs tabular-nums text-slate-300 admin-light:text-slate-700">{step.date ? formatClaimDate(step.date) : '-'}</dd>
                                  <dd className="col-start-2 text-xs text-slate-500 sm:col-start-auto sm:text-right">{step.by ? `by ${step.by}` : ''}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}

                        {actions.length > 0 && (
                          <footer className="flex flex-wrap justify-end gap-2 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] px-4 py-3 sm:px-5">
                            {[...actions].reverse().map((action) => {
                              const isPending = pendingAction?.claimId === claim.id && pendingAction.action === action;
                              return (
                                <button
                                  key={action}
                                  type="button"
                                  onClick={() => handleAction(claim.id, action)}
                                  disabled={pendingAction !== null}
                                  className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] disabled:cursor-not-allowed disabled:opacity-50 ${actionButtonClasses[action]}`}
                                >
                                  {isPending ? (
                                    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
                                  ) : getActionIcon(action)}
                                  {action}
                                </button>
                              );
                            })}
                          </footer>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 admin-light:border-[#E2E8F0] px-4 py-12 text-center">
            <p className="text-sm font-semibold text-slate-300 admin-light:text-slate-700">No claims yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">If the owner is at the office without an app account, record them with Walk-in claimant.</p>
          </div>
        )}
      </div>

      <ApproveClaimModal
        key={approveTarget?.id ?? 'closed'}
        isOpen={isOpen && approveTarget !== null}
        claimantName={approveTarget?.claimantName ?? ''}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleConfirmApproval}
      />

      <Modal adminThemed isOpen={isOpen && confirmTarget !== null} onClose={closeConfirmation} maxWidth="max-w-md">
        {confirmTarget && <div className="space-y-5" onKeyDown={event => {
          if (event.key === 'Escape') { event.stopPropagation(); closeConfirmation(); }
        }}>
          <div className="pr-8">
            <h2 className="text-lg font-bold text-white admin-light:text-slate-900">{confirmationCopy[confirmTarget.action].title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300 admin-light:text-slate-700">
              {confirmationCopy[confirmTarget.action].lead}
              <span className="font-semibold text-white admin-light:text-slate-900">{confirmTarget.claim.claimantName}</span>?
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-400 admin-light:text-slate-500">{confirmationCopy[confirmTarget.action].effect}</p>
          </div>
          {actionError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 admin-light:text-red-700">{actionError}</p>}
          <div className="flex justify-end gap-2 border-t border-white/10 admin-light:border-[#E2E8F0] pt-4">
            <button ref={cancelActionRef} type="button" onClick={closeConfirmation} disabled={pendingAction !== null} className="min-h-10 rounded-lg border border-white/10 admin-light:border-[#E2E8F0] px-4 text-sm font-semibold text-slate-300 admin-light:text-slate-700 hover:bg-white/5 admin-light:hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] admin-light:focus-visible:outline-[#1A5FB4] disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => void submitAction(confirmTarget.claim.id, confirmTarget.action)} disabled={pendingAction !== null} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] admin-light:focus-visible:outline-[#1A5FB4] disabled:opacity-50 ${confirmationCopy[confirmTarget.action].button}`}>
              {pendingAction ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : getActionIcon(confirmTarget.action)}
              {pendingAction ? 'Processing...' : confirmationCopy[confirmTarget.action].confirm}
            </button>
          </div>
        </div>}
      </Modal>
    </Modal>
  );
}
