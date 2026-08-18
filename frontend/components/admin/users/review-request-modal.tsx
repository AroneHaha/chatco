// components/admin/users/review-request-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, LoaderCircle } from 'lucide-react';
import type { PendingRequest } from '@/app/(admin)/users/data/users-data';

function formatBirthdate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const REJECTION_REASONS = [
  'Blurry image',
  'ID does not match the filled details',
  'The ID does not match the role applied for',
  'The ID is expired',
  'The ID does not show the entire front',
] as const;

const OTHER_REASON = 'Other';

interface ReviewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PendingRequest | null;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isProcessing?: boolean;
}

export function ReviewRequestModal({ isOpen, onClose, request, onApprove, onReject, isProcessing = false }: ReviewRequestModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  // Reset internal state whenever the modal is closed or a different
  // request is opened — prevents a stale rejection reason from a previous
  // review bleeding into the next one.
  if (!request) return null;

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
      resetRejectState();
    }
  };

  const showingConfirm = showRejectConfirm || showApproveConfirm;

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!isProcessing) onClose(); }} maxWidth="max-w-lg">
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

        {/* User Details Grid — every field the applicant filled in on the
            sign-up form, aside from the password.
            `min-w-0` on each cell is required for `truncate` to work inside
            a grid track (grid items default to min-width:auto, which lets
            long, unbroken strings like emails/usernames blow the column out
            instead of ellipsizing). Long values still show in full via the
            `title` tooltip on hover. Email + Username get their own full-width
            row since they're the fields most likely to run long. */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-[#0E1628] p-4 rounded-md border border-[#1E2D45]">
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider">First Name</p>
            <p className="text-white font-medium mt-1 truncate" title={request.firstName}>{request.firstName}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Middle Name</p>
            <p className="text-white font-medium mt-1 truncate" title={request.middleName || undefined}>{request.middleName || '—'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Surname</p>
            <p className="text-white font-medium mt-1 truncate" title={request.surname}>{request.surname}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Birthdate</p>
            <p className="text-white font-medium mt-1 truncate">{formatBirthdate(request.birthdate)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Gender</p>
            <p className="text-white font-medium mt-1 truncate">{request.gender}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Phone Number</p>
            <p className="text-white font-medium mt-1 truncate" title={request.phoneNumber}>{request.phoneNumber}</p>
          </div>
          <div className="col-span-2 min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Username</p>
            <p className="text-white font-medium mt-1 truncate" title={request.username}>{request.username}</p>
          </div>
          <div className="col-span-2 min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Email</p>
            <p className="text-white font-medium mt-1 truncate" title={request.email}>{request.email}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Commuter Type</p>
            <p className="mt-1"><Badge variant="info">{request.commuterType}</Badge></p>
          </div>
        </div>

        {/* Rejection Reason Input (Hidden until clicked) */}
        {showRejectConfirm && (
          <div className="p-4 bg-red-400/10 border border-red-400/30 rounded-md">
            <div className="flex items-center space-x-2 mb-2 text-red-400">
              <AlertTriangle size={16} />
              <span className="text-sm font-semibold">Select the reason for rejection:</span>
            </div>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              disabled={isProcessing}
              className="w-full bg-black/30 border border-[#1E2D45] rounded-md text-white text-sm p-2 focus:outline-none focus:ring-1 focus:ring-red-400 [color-scheme:dark]"
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
                className="mt-2 w-full bg-black/30 border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 p-2 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
              />
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={resetRejectState}
                disabled={isProcessing}
                className="px-4 py-2 border border-[#1E2D45] text-slate-300 rounded-md hover:bg-[#131C2E] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectClick}
                disabled={!effectiveReason || isProcessing}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? <LoaderCircle size={18} className="animate-spin" /> : <XCircle size={18} />}
                <span>{isProcessing ? 'Processing...' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Approval Confirmation (Hidden until "Approve Account" is clicked) */}
        {showApproveConfirm && (
          <div className="p-4 bg-sky-400/10 border border-sky-400/30 rounded-md">
            <div className="flex items-start space-x-2 mb-3 text-sky-300">
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
                className="px-4 py-2 border border-[#1E2D45] text-slate-300 rounded-md hover:bg-[#131C2E] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onApprove}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? <LoaderCircle size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                <span>{isProcessing ? 'Processing...' : 'Confirm Approval'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showingConfirm && (
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
              onClick={() => setShowApproveConfirm(true)}
              disabled={isProcessing}
              className="flex items-center space-x-2 px-5 py-2.5 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/25 font-medium"
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
