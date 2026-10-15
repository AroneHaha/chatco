// components/admin/lost-found/claims-list-modal.tsx
'use client';

import { useState, type ReactNode } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { ApproveClaimModal } from '@/components/admin/lost-found/approve-claim-modal';
import type { PickupSchedule } from '@/lib/shared/services/lost-found.service';
import {
  CalendarX2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PackageCheck,
  RotateCcw,
  UserPlus,
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
  }) => Promise<void>;
}

/** Status as coloured text + icon (no badge). Unknown values fall back to
 * neutral slate, never to a success colour. */
function getClaimStatusMeta(claim: Claim): { label: string; className: string; icon: LucideIcon } {
  if (claim.noShowAt) return { label: 'Did not proceed', className: 'text-slate-300', icon: CalendarX2 };
  switch (claim.status) {
    case 'Pending':
      return { label: 'Pending review', className: 'text-amber-300', icon: Clock3 };
    case 'Approved':
      return { label: 'Approved', className: 'text-emerald-300', icon: CheckCircle2 };
    case 'Released':
    case 'Returned':
      return { label: claim.status, className: 'text-[#8CB9F0]', icon: PackageCheck };
    case 'Rejected':
      return { label: 'Rejected', className: 'text-red-300', icon: XCircle };
    default:
      return { label: claim.status, className: 'text-slate-300', icon: Clock3 };
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
    { label: 'Submitted', date: claim.claimDate, tone: 'text-slate-300', by: null },
    { label: 'Approved', date: claim.approvedAt ?? null, tone: 'text-emerald-300', by: claim.reviewedByName ?? null },
    // A no-show is closed by the daily job, not an admin, so it has no "by".
    claim.noShowAt
      ? { label: 'Not collected', date: claim.noShowAt, tone: 'text-slate-300', by: 'System' }
      : { label: 'Rejected', date: claim.rejectedAt ?? null, tone: 'text-red-300', by: claim.reviewedByName ?? null },
    { label: 'Released', date: claim.releasedAt ?? null, tone: 'text-[#8CB9F0]', by: releasedByName ?? null },
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
  Release: 'bg-[#62A0EA] text-white hover:bg-[#4A8BD4]',
  Reject: 'border border-red-400/30 text-red-300 hover:bg-red-500/10 hover:text-red-200',
};

function SectionLabel({ children }: { children: ReactNode }) {
  return <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</h4>;
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm ${value ? 'font-semibold text-slate-100' : 'text-slate-500'}`}>{value || 'N/A'}</dd>
    </div>
  );
}

export function ClaimsListModal({ isOpen, onClose, itemId, claims, releasedByName, onClaimAction, onRecordManualClaim }: ClaimsListModalProps) {
  const [pendingAction, setPendingAction] = useState<{ claimId: string; action: ClaimAction } | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', contact: '', email: '', proof: '' });
  const [manualError, setManualError] = useState<string | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);
  // Account claimant awaiting the pickup-schedule step before approval.
  const [approveTarget, setApproveTarget] = useState<Claim | null>(null);
  const orderedClaims = [...claims].sort((a, b) => {
    if (isAcceptedStatus(a.status) !== isAcceptedStatus(b.status)) {
      return isAcceptedStatus(a.status) ? -1 : 1;
    }
    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
    return new Date(b.claimDate).getTime() - new Date(a.claimDate).getTime();
  });
  const pendingCount = claims.filter((claim) => claim.status === 'Pending').length;

  const handleAction = async (claimId: string, action: ClaimAction) => {
    // Account claimants only learn the pickup details through the app, so
    // approving them goes through the schedule step first. Walk-ins are
    // already at the desk and approve directly.
    const target = claims.find((claim) => claim.id === claimId);
    if (action === 'Approve' && target?.linkedAccount) {
      setApproveTarget(target);
      return;
    }
    setPendingAction({ claimId, action });
    try {
      await onClaimAction(itemId, action, claimId);
      onClose();
    } catch {
      // Parent surfaces the error; keep the modal open for retry.
    } finally {
      setPendingAction(null);
    }
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
      setManualError('Enter a phone number or email address.');
      return;
    }
    setManualError(null);
    setIsSavingManual(true);
    try {
      await onRecordManualClaim(itemId, {
        name: manualForm.name.trim(),
        contact: manualForm.contact.trim() || undefined,
        email: manualForm.email.trim() || undefined,
        proof: manualForm.proof.trim(),
      });
      setManualForm({ name: '', contact: '', email: '', proof: '' });
      setShowManualForm(false);
    } catch (error) {
      setManualError(error instanceof Error ? error.message : 'Unable to record claimant.');
    } finally {
      setIsSavingManual(false);
    }
  };

  const inputClasses = 'block h-10 w-full rounded-lg border border-white/10 bg-[#0E1628] px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[#62A0EA] focus:ring-2 focus:ring-[#62A0EA]/15 disabled:cursor-not-allowed disabled:opacity-60';
  const labelClasses = 'mb-1.5 block text-xs font-semibold text-slate-300';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" rounded="rounded-xl" height="h-[min(760px,88vh)]">
      <header className="flex flex-col gap-4 pr-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8CB9F0]">
            <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
            Claim desk
          </p>
          <h2 className="text-xl font-bold leading-tight text-white sm:text-2xl">Claims for Item</h2>
          <p className="mt-1 text-sm text-slate-500">
            {claims.length} claim {claims.length === 1 ? 'record' : 'records'}
            {pendingCount > 0 && <span className="text-amber-300"> &middot; {pendingCount} awaiting review</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowManualForm((current) => !current)}
          aria-expanded={showManualForm}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#FF6D3A] px-4 text-sm font-bold text-white transition-colors hover:bg-[#e55a2b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Walk-in claimant
        </button>
      </header>

      {showManualForm && (
        <form onSubmit={handleManualSubmit} className="mt-6 rounded-xl border border-[#62A0EA]/25 bg-[#0E1628]/60 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-white">Record a claimant without an account</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Add contact details and proof before approving a handover.</p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="walkin-name" className={labelClasses}>Full name<span className="ml-0.5 text-red-400">*</span></label>
              <input id="walkin-name" required maxLength={100} value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} disabled={isSavingManual} className={inputClasses} />
            </div>
            <div>
              <label htmlFor="walkin-phone" className={labelClasses}>Phone number</label>
              <input id="walkin-phone" type="tel" maxLength={20} value={manualForm.contact} onChange={(e) => setManualForm({ ...manualForm, contact: e.target.value })} disabled={isSavingManual} className={inputClasses} />
            </div>
            <div>
              <label htmlFor="walkin-email" className={labelClasses}>Email address</label>
              <input id="walkin-email" type="email" maxLength={255} value={manualForm.email} onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })} disabled={isSavingManual} className={inputClasses} />
            </div>
            <p className="-mt-2 text-xs text-slate-500 sm:col-span-2">A phone number or an email address is required.</p>
            <div className="sm:col-span-2">
              <label htmlFor="walkin-proof" className={labelClasses}>Proof of ownership<span className="ml-0.5 text-red-400">*</span></label>
              <textarea
                id="walkin-proof"
                required
                minLength={10}
                maxLength={500}
                rows={3}
                value={manualForm.proof}
                onChange={(e) => setManualForm({ ...manualForm, proof: e.target.value })}
                disabled={isSavingManual}
                placeholder="What the claimant described or showed to prove it's theirs"
                className={`${inputClasses} h-auto resize-none py-2.5 leading-6`}
              />
            </div>
          </div>

          {manualError && <p role="alert" className="mt-3 text-xs font-medium text-red-300">{manualError}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowManualForm(false)} disabled={isSavingManual} className="inline-flex h-9 items-center rounded-lg border border-white/10 px-4 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSavingManual} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#62A0EA] px-4 text-xs font-bold text-white transition-colors hover:bg-[#4A8BD4] disabled:opacity-50">
              {isSavingManual && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />}
              {isSavingManual ? 'Saving...' : 'Save claimant'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {orderedClaims.length > 0 ? orderedClaims.map((claim) => {
          const actions = availableActions(claim.status);
          const isAccepted = isAcceptedStatus(claim.status);
          const timeline = getProcessTimeline(claim, releasedByName);
          const status = getClaimStatusMeta(claim);
          const StatusIcon = status.icon;
          const account = claim.linkedAccount;

          return (
            <article
              key={claim.id}
              className={`rounded-xl border bg-[#0E1628] ${isAccepted ? 'border-emerald-500/35' : 'border-white/10'}`}
            >
              <header className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-5">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold leading-tight text-white">{claim.claimantName}</h3>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {account
                      ? `${account.name} · @${account.username} · ${account.accountStatus}`
                      : 'Walk-in claimant, no app account'}
                  </p>
                </div>
                <p className={`flex shrink-0 items-center gap-1.5 text-sm font-semibold ${status.className}`}>
                  <StatusIcon className="h-4 w-4" aria-hidden="true" />
                  {status.label}
                </p>
              </header>

              <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
                  <Fact label="Submitted" value={formatClaimDate(claim.claimDate)} />
                  <Fact label="Phone" value={claim.claimantContact} />
                  <Fact label="Email" value={claim.claimantEmail} />
                </dl>
              </div>

              {claim.pickupLocation && (
                <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
                  <SectionLabel>Pickup schedule</SectionLabel>
                  <p className="text-sm font-semibold text-slate-100">
                    {claim.pickupLocation}
                    {claim.pickupAt && <span className="font-normal text-slate-400"> &middot; {formatClaimDate(claim.pickupAt)}</span>}
                  </p>
                  {claim.pickupReminder && <p className="mt-1 text-xs leading-5 text-slate-400">{claim.pickupReminder}</p>}
                </div>
              )}

              {claim.proof && (
                <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
                  <SectionLabel>Proof of ownership</SectionLabel>
                  <p className="max-w-[65ch] whitespace-pre-line break-words text-sm leading-6 text-slate-200">{claim.proof}</p>
                  {claim.proofPhotos && claim.proofPhotos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {claim.proofPhotos.map((photo, index) => (
                        <a
                          key={photo.id}
                          href={photo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-20 w-20 overflow-hidden rounded-lg border border-white/10 transition-colors hover:border-[#62A0EA]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]"
                          title="Open full size"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.url} alt={`Proof photo ${index + 1}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {timeline.length > 0 && (
                <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
                  <SectionLabel>History</SectionLabel>
                  <dl className="divide-y divide-white/[0.06]">
                    {timeline.map((step) => (
                      <div key={`${claim.id}-${step.label}`} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-0.5 py-2 first:pt-0 last:pb-0 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]">
                        <dt className={`text-xs font-semibold ${step.tone}`}>{step.label}</dt>
                        <dd className="text-xs tabular-nums text-slate-300">{step.date ? formatClaimDate(step.date) : '-'}</dd>
                        <dd className="col-start-2 text-xs text-slate-500 sm:col-start-auto sm:text-right">{step.by ? `by ${step.by}` : ''}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {actions.length > 0 && (
                <footer className="flex flex-wrap justify-end gap-2 border-t border-white/[0.06] px-4 py-3 sm:px-5">
                  {[...actions].reverse().map((action) => {
                    const isPending = pendingAction?.claimId === claim.id && pendingAction.action === action;
                    return (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleAction(claim.id, action)}
                        disabled={pendingAction !== null}
                        className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] disabled:cursor-not-allowed disabled:opacity-50 ${actionButtonClasses[action]}`}
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
            </article>
          );
        }) : (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-12 text-center">
            <p className="text-sm font-semibold text-slate-300">No claims yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">If the owner is at the office without an app account, record them with Walk-in claimant.</p>
          </div>
        )}
      </div>

      <ApproveClaimModal
        isOpen={approveTarget !== null}
        claimantName={approveTarget?.claimantName ?? ''}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleConfirmApproval}
      />
    </Modal>
  );
}
