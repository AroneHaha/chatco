// components/admin/lost-found/claims-list-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { User, Phone, Mail, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
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
}

export function ClaimsListModal({ isOpen, onClose, itemId, claims, onClaimAction }: ClaimsListModalProps) {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ClaimAction | null>(null);

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
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg sm:text-xl font-bold text-white">Claims for Item</h2>
        <span className="text-sm text-slate-500">{claims.length} claim(s)</span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
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
                  <p className="text-xs text-slate-500">Claimant</p>
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
