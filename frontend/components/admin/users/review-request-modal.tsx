// components/admin/users/review-request-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, LoaderCircle } from 'lucide-react';
import type { PendingRequest } from '@/app/(admin)/users/data/users-data';

interface ReviewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PendingRequest | null;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isProcessing?: boolean;
}

export function ReviewRequestModal({ isOpen, onClose, request, onApprove, onReject, isProcessing = false }: ReviewRequestModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  // Reset internal state whenever the modal is closed or a different
  // request is opened — prevents stale rejection reason from a previous
  // review bleeding into the next one.
  if (!request) return null;

  const handleRejectClick = () => {
    if (rejectionReason.trim()) {
      onReject(rejectionReason);
      setRejectionReason('');
      setShowRejectConfirm(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!isProcessing) onClose(); }}>
      <h2 className="text-xl font-bold text-white mb-6">Review Registration Request</h2>

      <div className="space-y-6">
        {/* Repeat-applicant warning — this identity (email/contact) has been
            rejected before. Helps the admin spot applicants nearing the
            re-registration cooldown threshold. */}
        {request.rejectionCount > 0 && (
          <div className="space-y-3 p-3 bg-amber-400/10 border border-amber-400/30 rounded-md">
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

        {/* ID Image Display */}
        <div className="flex justify-center">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={request.idImageUrl} alt="Uploaded ID" className="w-64 h-40 object-cover rounded-md border-2 border-[#1E2D45] shadow-lg" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center py-1 rounded-b-md">
              <span className="text-xs text-slate-300">Uploaded Valid ID</span>
            </div>
          </div>
        </div>

        {/* User Details Grid */}
        <div className="grid grid-cols-2 gap-4 bg-[#0E1628] p-4 rounded-md border border-[#1E2D45]">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Full Name</p>
            <p className="text-white font-medium mt-1 wrap-break-word">{request.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Email</p>
            <p className="text-white font-medium mt-1 wrap-break-word">{request.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Phone Number</p>
            <p className="text-white font-medium mt-1 wrap-break-word">{request.phoneNumber}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Commuter Type</p>
            <p className="mt-1"><Badge variant="info">{request.commuterType}</Badge></p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Language Preference</p>
            <p className="text-white font-medium mt-1 wrap-break-word">{request.languagePreference}</p>
          </div>
        </div>

        {/* Rejection Reason Input (Hidden until clicked) */}
        {showRejectConfirm && (
          <div className="p-4 bg-red-400/10 border border-red-400/30 rounded-md">
            <div className="flex items-center space-x-2 mb-2 text-red-400">
              <AlertTriangle size={16} />
              <span className="text-sm font-semibold">Please state the reason for rejection:</span>
            </div>
            <textarea 
              value={rejectionReason} 
              onChange={(e) => setRejectionReason(e.target.value)}
              disabled={isProcessing}
              rows={2}
              placeholder="e.g., ID is blurry, Name does not match..."
              className="w-full bg-black/30 border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 p-2 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
            />
            <button 
              onClick={handleRejectClick} 
              disabled={!rejectionReason.trim() || isProcessing}
              className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? <LoaderCircle size={18} className="animate-spin" /> : <XCircle size={18} />}
              <span>{isProcessing ? 'Processing...' : 'Confirm Rejection'}</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {!showRejectConfirm && (
          <div className="flex justify-end space-x-4 pt-2">
            <button 
              onClick={() => setShowRejectConfirm(true)} 
              disabled={isProcessing}
              className="flex items-center space-x-2 px-5 py-2.5 border-2 border-red-400/50 text-red-400 rounded-md hover:bg-red-400/10 transition-colors font-medium"
            >
              <XCircle size={18} />
              <span>Reject</span>
            </button>
            <button 
              onClick={onApprove} 
              disabled={isProcessing}
              className="flex items-center space-x-2 px-5 py-2.5 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/25 font-medium"
            >
              {isProcessing ? <LoaderCircle size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              <span>{isProcessing ? 'Processing...' : 'Approve Account'}</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
