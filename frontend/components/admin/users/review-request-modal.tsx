// components/admin/users/review-request-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { CheckCircle, XCircle, AlertTriangle, LoaderCircle, ZoomIn, X, IdCard, User } from 'lucide-react';
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
  const [isImageExpanded, setIsImageExpanded] = useState(false);

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
  const initials = `${request.firstName?.[0] ?? ''}${request.surname?.[0] ?? ''}`.toUpperCase() || '—';
  const sectionClasses = 'rounded-xl border border-white/10 bg-white/[0.035] p-4';
  const fieldLabelClasses = 'text-[10px] font-semibold uppercase tracking-wider text-slate-500';
  const fieldValueClasses = 'mt-1 truncate text-sm font-medium text-white';

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!isProcessing) onClose(); }} maxWidth="max-w-2xl">
      <div className="pr-8">
        <h2 className="text-xl font-bold text-white sm:text-2xl">Review Registration Request</h2>
        <p className="mt-1 text-sm text-slate-500">Verify the applicant&apos;s details against their uploaded ID before deciding.</p>
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
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Commuter Type</p>
            <p className="text-sm font-semibold text-[#8CB9F0]">{request.commuterType}</p>
          </div>
        </div>

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
            instead of a long single-column scroll. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[13rem_1fr]">
          <section className={sectionClasses}>
            <div className="mb-3 flex items-center gap-2">
              <IdCard className="h-4 w-4 text-[#62A0EA]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">ID Document</h3>
            </div>
            {/* Click to view full size, since the thumbnail is too small to
                actually verify text/photo details against. */}
            <button
              type="button"
              onClick={() => setIsImageExpanded(true)}
              className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-white/10"
              aria-label="View full-size ID image"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={request.idImageUrl} alt="Uploaded ID" className="aspect-3/4 w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                <ZoomIn size={20} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">Uploaded Valid ID · tap to enlarge</p>
          </section>

          {/* `min-w-0` on each cell is required for `truncate` to work inside
              a grid track (grid items default to min-width:auto, which lets
              long, unbroken strings like emails/usernames blow the column out
              instead of ellipsizing). Long values still show in full via the
              `title` tooltip on hover. Username + Email get their own
              full-width row since they're the fields most likely to run long. */}
          <section className={sectionClasses}>
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-[#62A0EA]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Applicant Details</h3>
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
                <p className={fieldValueClasses}>{formatBirthdate(request.birthdate)}</p>
              </div>
              <div className="min-w-0">
                <p className={fieldLabelClasses}>Gender</p>
                <p className={fieldValueClasses}>{request.gender}</p>
              </div>
              <div className="min-w-0">
                <p className={fieldLabelClasses}>Phone Number</p>
                <p className={fieldValueClasses} title={request.phoneNumber}>{request.phoneNumber}</p>
              </div>
              <div className="col-span-2 min-w-0">
                <p className={fieldLabelClasses}>Username</p>
                <p className={fieldValueClasses} title={request.username}>{request.username}</p>
              </div>
              <div className="col-span-2 min-w-0">
                <p className={fieldLabelClasses}>Email</p>
                <p className={fieldValueClasses} title={request.email}>{request.email}</p>
              </div>
            </div>
          </section>
        </div>

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
        {!showingConfirm && (
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
            alt="Uploaded ID (full size)"
            className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Modal>
  );
}
