// components/admin/lost-found/claims-list-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { User, Phone, Mail, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import type { Claim, ClaimStatus } from '@/app/(admin)/lost-found/data/lost-found-data';

type ClaimAction = 'Release' | 'Return' | 'Reject';

interface ClaimsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  claims: Claim[];
  onClaimAction: (itemId: string, action: ClaimAction, claimantName: string) => void;
}

export function ClaimsListModal({ isOpen, onClose, itemId, claims, onClaimAction }: ClaimsListModalProps) {
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);

  const handleSelectClaim = (claimId: number) => {
    setSelectedClaimId(claimId === selectedClaimId ? null : claimId);
  };

  const handleAction = (action: ClaimAction) => {
    if (!selectedClaimId) return;
    const claim = claims.find((c: Claim) => c.id === selectedClaimId);
    if (claim) {
      onClaimAction(itemId, action, claim.claimantName);
      onClose();
    }
  };

  const getActionIcon = (action: ClaimAction) => {
    switch (action) {
      case 'Release': return <CheckCircle size={18} className="text-sky-400" />;
      case 'Return': return <RotateCcw size={18} className="text-[#62A0EA]" />;
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

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg sm:text-xl font-bold text-white">Claims for Item {itemId}</h2>
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
            </div>
          </div>
        )) : (
          <p className="text-center text-slate-500 py-8">No claims found for this item.</p>
        )}
      </div>

      {selectedClaimId && (
        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45] mt-4">
          <button
            onClick={() => handleAction('Release')}
            className="flex items-center space-x-2 px-3 py-2 bg-sky-500 text-white text-sm font-medium rounded-md hover:bg-sky-600"
          >
            {getActionIcon('Release')}
            <span>Release</span>
          </button>
          <button
            onClick={() => handleAction('Return')}
            className="flex items-center space-x-2 px-3 py-2 bg-[#62A0EA] text-white text-sm font-medium rounded-md hover:bg-[#4A8BD4]"
          >
            {getActionIcon('Return')}
            <span>Return</span>
          </button>
          <button
            onClick={() => handleAction('Reject')}
            className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600"
          >
            {getActionIcon('Reject')}
            <span>Reject</span>
          </button>
        </div>
      )}
    </Modal>
  );
}