// components/admin/lost-found/claims-list-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { User, Phone, Mail, CheckCircle, XCircle, RotateCcw, UserPlus } from 'lucide-react';
import type { Claim, ClaimStatus } from '@/app/(admin)/lost-found/data/lost-found-data';

/**
 * Sprint 6 (S6-T8) — Admin claims review modal, wired to the real backend.
 *
 * Actions map to the backend's claim lifecycle:
 *   Approve → PATCH /admin/lost-items/{id}/claims/{cid}/approve (PENDING → APPROVED)
 *   Release → PATCH /admin/lost-items/{id}/claims/{cid}/release (APPROVED → RELEASED, handover)
 *   Reject  → PATCH /admin/lost-items/{id}/claims/{cid}/reject  (PENDING/APPROVED → REJECTED)
 *
 * `onClaimAction` is async — the modal awaits it and shows a loading state
 * on the clicked button. The modal closes only on success; on error the
 * parent surfaces an inline banner and the modal stays open.
 */
type ClaimAction = 'Approve' | 'Release' | 'Reject';

interface ClaimsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  claims: Claim[];
  onClaimAction: (itemId: string, action: ClaimAction, claimId: string) => Promise<void>;
  onRecordManualClaim: (itemId: string, input: {
    name: string;
    contact?: string;
    email?: string;
    proof: string;
  }) => Promise<void>;
}

export function ClaimsListModal({ isOpen, onClose, itemId, claims, onClaimAction, onRecordManualClaim }: ClaimsListModalProps) {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ClaimAction | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', contact: '', email: '', proof: '' });
  const [manualError, setManualError] = useState<string | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);

  const handleSelectClaim = (claimId: string) => {
    setSelectedClaimId(claimId === selectedClaimId ? null : claimId);
  };

  const handleAction = async (action: ClaimAction) => {
    if (!selectedClaimId) return;
    setPendingAction(action);
    try {
      await onClaimAction(itemId, action, selectedClaimId);
      // Parent closes the modal on success; if we're still mounted, reset.
      setSelectedClaimId(null);
    } catch {
      // Parent surfaces the error; stay open so the admin can retry.
    } finally {
      setPendingAction(null);
    }
  };

  const getActionIcon = (action: ClaimAction) => {
    switch (action) {
      case 'Approve': return <CheckCircle size={18} className="text-emerald-400" />;
      case 'Release': return <RotateCcw size={18} className="text-sky-400" />;
      case 'Reject': return <XCircle size={18} className="text-red-400" />;
    }
  };

  const getBadgeVariant = (status: ClaimStatus): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'Approved': case 'Released': case 'Returned': return 'success';
      case 'Pending': return 'warning';
      case 'Rejected': return 'danger';
      default: return 'info';
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

  // Which actions are valid for the selected claim's current status.
  const availableActions = (): ClaimAction[] => {
    const claim = claims.find((c) => c.id === selectedClaimId);
    if (!claim) return [];
    switch (claim.status) {
      case 'Pending': return ['Approve', 'Reject'];
      case 'Approved': return ['Release', 'Reject'];
      default: return []; // Released/Rejected/Returned — no further actions
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" height="h-[min(700px,85vh)]">
      <div className="flex items-center justify-between mb-5 pr-8">
        <h2 className="text-lg sm:text-xl font-bold text-white">Claims for Item</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{claims.length} claim(s)</span>
          <button
            type="button"
            onClick={() => setShowManualForm((current) => !current)}
            className="flex items-center gap-1.5 rounded-md bg-[#62A0EA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4A8BD4]"
          >
            <UserPlus size={14} /> Walk-in claimant
          </button>
        </div>
      </div>

      {showManualForm && (
        <form onSubmit={handleManualSubmit} className="mb-4 space-y-3 rounded-lg border border-[#62A0EA]/30 bg-[#62A0EA]/5 p-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Record claimant without an account</h3>
            <p className="mt-1 text-xs text-slate-500">Keep their contact details and proof before approving a handover.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input required maxLength={100} value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} placeholder="Full name *" className="rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm text-white" />
            <input maxLength={20} value={manualForm.contact} onChange={(e) => setManualForm({ ...manualForm, contact: e.target.value })} placeholder="Phone number" className="rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm text-white" />
            <input type="email" maxLength={255} value={manualForm.email} onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })} placeholder="Email address" className="rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm text-white" />
            <input required minLength={10} maxLength={500} value={manualForm.proof} onChange={(e) => setManualForm({ ...manualForm, proof: e.target.value })} placeholder="Proof of ownership *" className="rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm text-white" />
          </div>
          {manualError && <p className="text-xs text-red-400">{manualError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowManualForm(false)} className="rounded-md border border-[#1E2D45] px-3 py-2 text-xs text-slate-300">Cancel</button>
            <button disabled={isSavingManual} className="rounded-md bg-[#62A0EA] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{isSavingManual ? 'Saving…' : 'Save claimant'}</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {claims.length > 0 ? claims.map((claim: Claim) => (
          <div
            key={claim.id}
            className={`p-4 border rounded-md cursor-pointer transition-all ${
              selectedClaimId === claim.id
                ? 'border-[#62A0EA] bg-[#62A0EA]/10'
                : 'border-[#1E2D45] bg-[#0E1628] hover:bg-[#131C2E]'
            }`}
            onClick={() => handleSelectClaim(claim.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#131C2E] rounded-full">
                  <User size={20} className="text-slate-300" />
                </div>
                <div>
                  <p className="text-white font-medium">{claim.claimantName}</p>
                  {claim.linkedAccount ? (
                    <p className="text-xs text-emerald-400">Account: @{claim.linkedAccount.username}</p>
                  ) : (
                    <p className="text-xs text-slate-500">Walk-in (no account)</p>
                  )}
                </div>
              </div>
              <Badge variant={getBadgeVariant(claim.status)}>
                {claim.status}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-slate-300">
              <p className="flex items-center"><Phone size={12} className="mr-1" /> {claim.claimantContact}</p>
              <p className="flex items-center"><Mail size={12} className="mr-1" /> {claim.claimantEmail || 'N/A'}</p>
              {claim.proof && (
                <p className="mt-2 pt-2 border-t border-[#1E2D45] text-slate-400 italic">&ldquo;{claim.proof}&rdquo;</p>
              )}
            </div>
          </div>
        )) : (
          <p className="text-center text-slate-500 py-8">No claims found for this item.</p>
        )}
      </div>

      {selectedClaimId && availableActions().length > 0 && (
        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45] mt-4">
          {availableActions().map((action) => (
            <button
              key={action}
              onClick={() => handleAction(action)}
              disabled={pendingAction !== null}
              className={`flex items-center space-x-2 px-3 py-2 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                action === 'Approve' ? 'bg-emerald-500 hover:bg-emerald-600'
                  : action === 'Release' ? 'bg-sky-500 hover:bg-sky-600'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {pendingAction === action ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : getActionIcon(action)}
              <span>{action}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
