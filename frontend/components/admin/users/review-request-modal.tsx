// components/admin/users/review-request-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { PendingRequest } from '@/app/(admin)/users/data/users-data';

interface ReviewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PendingRequest | null;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export function ReviewRequestModal({ isOpen, onClose, request, onApprove, onReject }: ReviewRequestModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  if (!request) return null;

  const handleRejectClick = () => {
    if (rejectionReason.trim()) {
      onReject(rejectionReason);
      setRejectionReason('');
      setShowRejectConfirm(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-6">Review Registration Request</h2>
      
      <div className="space-y-6">
        {/* ID Image Display */}
        <div className="flex justify-center">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={request.idImageUrl} alt="Uploaded ID" className="w-64 h-40 object-cover rounded-lg border-2 border-white/20 shadow-lg" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center py-1 rounded-b-lg">
              <span className="text-xs text-gray-300">Uploaded Valid ID</span>
            </div>
          </div>
        </div>

        {/* User Details Grid */}
        <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Full Name</p>
            <p className="text-white font-medium mt-1">{request.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Email</p>
            <p className="text-white font-medium mt-1">{request.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Phone Number</p>
            <p className="text-white font-medium mt-1">{request.phoneNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Commuter Type</p>
            <p className="mt-1"><Badge variant="info">{request.commuterType}</Badge></p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Language Preference</p>
            <p className="text-white font-medium mt-1">{request.languagePreference}</p>
          </div>
        </div>

        {/* Rejection Reason Input (Hidden until clicked) */}
        {showRejectConfirm && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-2 text-red-400">
              <AlertTriangle size={16} />
              <span className="text-sm font-semibold">Please state the reason for rejection:</span>
            </div>
            <textarea 
              value={rejectionReason} 
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={2}
              placeholder="e.g., ID is blurry, Name does not match..."
              className="w-full bg-black/30 border border-white/20 rounded-md text-white text-sm placeholder-gray-500 p-2 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
            />
            <button 
              onClick={handleRejectClick} 
              disabled={!rejectionReason.trim()}
              className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <XCircle size={18} />
              <span>Confirm Rejection</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {!showRejectConfirm && (
          <div className="flex justify-end space-x-4 pt-2">
            <button 
              onClick={() => setShowRejectConfirm(true)} 
              className="flex items-center space-x-2 px-5 py-2.5 border-2 border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors font-medium"
            >
              <XCircle size={18} />
              <span>Reject</span>
            </button>
            <button 
              onClick={onApprove} 
              className="flex items-center space-x-2 px-5 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-lg shadow-green-500/25 font-medium"
            >
              <CheckCircle size={18} />
              <span>Approve Account</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}