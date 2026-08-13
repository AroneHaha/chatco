// components/admin/lost-found/claims-list-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  RotateCcw,
  UserPlus,
  UserRound,
  XCircle,
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
  onClaimAction: (itemId: string, action: ClaimAction, claimId: string) => Promise<void>;
  onRecordManualClaim: (itemId: string, input: {
    name: string;
    contact?: string;
    email?: string;
    proof: string;
  }) => Promise<void>;
}

function getBadgeVariant(status: ClaimStatus): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'Approved':
    case 'Released':
    case 'Returned':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Rejected':
      return 'danger';
    default:
      return 'info';
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
    { label: 'Rejected', date: claim.rejectedAt ?? null, tone: 'text-red-300', by: claim.reviewedByName ?? null },
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

export function ClaimsListModal({ isOpen, onClose, itemId, claims, releasedByName, onClaimAction, onRecordManualClaim }: ClaimsListModalProps) {
  const [pendingAction, setPendingAction] = useState<{ claimId: string; action: ClaimAction } | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', contact: '', email: '', proof: '' });
  const [manualError, setManualError] = useState<string | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const orderedClaims = [...claims].sort((a, b) => {
    if (isAcceptedStatus(a.status) !== isAcceptedStatus(b.status)) {
      return isAcceptedStatus(a.status) ? -1 : 1;
    }
    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
    return new Date(b.claimDate).getTime() - new Date(a.claimDate).getTime();
  });

  const handleAction = async (claimId: string, action: ClaimAction) => {
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" height="h-[min(760px,88vh)]">
      <div className="mb-5 flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#62A0EA]/20 bg-[#1A5FB4]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8CB9F0]">
            <UserRound className="h-3.5 w-3.5" />
            Claim desk
          </div>
          <h2 className="text-lg font-bold text-white sm:text-xl">Claims for Item</h2>
          <p className="mt-1 text-xs text-slate-500">{claims.length} claim records</p>
        </div>
        <button
          type="button"
          onClick={() => setShowManualForm((current) => !current)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF6D3A] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#e55a2b]"
        >
          <UserPlus className="h-4 w-4" />
          Walk-in claimant
        </button>
      </div>

      {showManualForm && (
        <form onSubmit={handleManualSubmit} className="mb-4 space-y-3 rounded-xl border border-[#62A0EA]/25 bg-[#1A5FB4]/10 p-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Record claimant without an account</h3>
            <p className="mt-1 text-xs text-slate-500">Add contact details and proof before approving a handover.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input required maxLength={100} value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} placeholder="Full name *" className="rounded-lg border border-white/10 bg-[#0E1628] px-3 py-2 text-sm text-white outline-none focus:border-[#62A0EA]" />
            <input maxLength={20} value={manualForm.contact} onChange={(e) => setManualForm({ ...manualForm, contact: e.target.value })} placeholder="Phone number" className="rounded-lg border border-white/10 bg-[#0E1628] px-3 py-2 text-sm text-white outline-none focus:border-[#62A0EA]" />
            <input type="email" maxLength={255} value={manualForm.email} onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })} placeholder="Email address" className="rounded-lg border border-white/10 bg-[#0E1628] px-3 py-2 text-sm text-white outline-none focus:border-[#62A0EA]" />
            <input required minLength={10} maxLength={500} value={manualForm.proof} onChange={(e) => setManualForm({ ...manualForm, proof: e.target.value })} placeholder="Proof of ownership *" className="rounded-lg border border-white/10 bg-[#0E1628] px-3 py-2 text-sm text-white outline-none focus:border-[#62A0EA]" />
          </div>
          {manualError && <p className="text-xs text-red-400">{manualError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowManualForm(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5">Cancel</button>
            <button disabled={isSavingManual} className="rounded-lg bg-[#62A0EA] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{isSavingManual ? 'Saving...' : 'Save claimant'}</button>
          </div>
        </form>
      )}

      <div className="space-y-3 overflow-y-auto pr-1">
        {orderedClaims.length > 0 ? orderedClaims.map((claim) => {
          const actions = availableActions(claim.status);
          const isAccepted = isAcceptedStatus(claim.status);
          const timeline = getProcessTimeline(claim, releasedByName);
          return (
            <article key={claim.id} className={`rounded-xl border p-4 ${
              isAccepted ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-white/10 bg-[#0E1628]'
            }`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                      <UserRound className="h-5 w-5 text-slate-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{claim.claimantName}</p>
                      <p className="text-xs text-slate-500">
                        {claim.linkedAccount ? `Account: @${claim.linkedAccount.username}` : 'Walk-in claimant'}
                      </p>
                    </div>
                  </div>
                </div>
                <Badge variant={getBadgeVariant(claim.status)}>{claim.status}</Badge>
              </div>

              {isAccepted && (
                <div className="mt-3 w-fit max-w-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200/70">Accepted claimant</p>
                  <p className="truncate text-sm font-semibold text-emerald-100">{claim.claimantName}</p>
                  {claim.linkedAccount ? (
                    <p className="mt-1 truncate text-xs text-emerald-100/70">
                      {claim.linkedAccount.name} | @{claim.linkedAccount.username} | {claim.linkedAccount.accountStatus}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-emerald-100/70">Walk-in claimant without linked account</p>
                  )}
                </div>
              )}

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-white/5 bg-white/[0.04] p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Submitted
                  </div>
                  <p className="text-xs font-medium text-slate-300">{formatClaimDate(claim.claimDate)}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.04] p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                    Phone
                  </div>
                  <p className="truncate text-xs font-medium text-slate-300">{claim.claimantContact || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.04] p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </div>
                  <p className="truncate text-xs font-medium text-slate-300">{claim.claimantEmail || 'N/A'}</p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.04] p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  Process timeline
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {timeline.map((step) => (
                    <div key={`${claim.id}-${step.label}`} className="flex items-start justify-between gap-3 rounded-md bg-black/15 px-2.5 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{step.label}</span>
                      <span className="text-right">
                        <span className={`block text-xs font-semibold ${step.tone}`}>{step.date ? formatClaimDate(step.date) : '-'}</span>
                        {step.by && <span className="block text-[10px] text-slate-500">by {step.by}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {claim.proof && (
                <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.04] p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Proof of ownership</p>
                  <p className="text-xs leading-5 text-slate-300">{claim.proof}</p>
                </div>
              )}

              {actions.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3">
                  {actions.map((action) => {
                    const isPending = pendingAction?.claimId === claim.id && pendingAction.action === action;
                    return (
                      <button
                        key={action}
                        onClick={() => handleAction(claim.id, action)}
                        disabled={pendingAction !== null}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50 ${
                          action === 'Approve'
                            ? 'bg-emerald-500 hover:bg-emerald-600'
                            : action === 'Release'
                              ? 'bg-[#1A5FB4] hover:bg-[#164c92]'
                              : 'bg-red-500 hover:bg-red-600'
                        }`}
                      >
                        {isPending ? (
                          <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : getActionIcon(action)}
                        {action}
                      </button>
                    );
                  })}
                </div>
              )}
            </article>
          );
        }) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0E1628] px-4 py-10 text-center">
            <UserRound className="mb-3 h-8 w-8 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No claims found</p>
            <p className="mt-1 text-xs text-slate-500">Use walk-in claimant if the owner is at the office without an app account.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
