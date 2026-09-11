// components/admin/users/rejected-account-details-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { AlertTriangle, XCircle, ZoomIn, X, IdCard, User } from 'lucide-react';
import type { RejectedRequest } from '@/app/(admin)/users/data/users-data';

function formatDate(value: string | null, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
  });
}

interface RejectedAccountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * The row to show. Passed straight through from the already-loaded page
   * data (the same array the table renders) — opening this modal never
   * triggers its own network request.
   */
  request: RejectedRequest | null;
}

/**
 * Read-only detail view for a rejected registration, opened by
 * double-clicking a row in the Rejected tab. Purely a richer view of data
 * already present on the row — no approve/reject actions here (the account
 * is a closed record).
 *
 * Shares its visual language with ReviewRequestModal (identity strip,
 * bordered sections, ID-document zoom/lightbox) so the two feel like the
 * same flow at different stages rather than two different designs.
 */
export function RejectedAccountDetailsModal({ isOpen, onClose, request }: RejectedAccountDetailsModalProps) {
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  if (!request) return null;

  const initials = `${request.firstName?.[0] ?? ''}${request.surname?.[0] ?? ''}`.toUpperCase() || '—';
  const sectionClasses = 'rounded-xl border border-white/10 bg-white/[0.035] p-4';
  const fieldLabelClasses = 'text-[10px] font-semibold uppercase tracking-wider text-slate-500';
  const fieldValueClasses = 'mt-1 truncate text-sm font-medium text-white';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="pr-8">
        <h2 className="text-xl font-bold text-white sm:text-2xl">Rejected Account Details</h2>
        <p className="mt-1 text-sm text-slate-500">A closed registration record — read-only.</p>
      </div>

      <div className="mt-5 space-y-4">
        {/* Applicant identity strip — mirrors ReviewRequestModal's. */}
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

        {/* Repeat-applicant history, same as the review modal — still relevant
            context for a rejected record. */}
        {request.rejectionCount > 0 && (
          <div className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-300">
                This applicant has been rejected{' '}
                <span className="font-semibold">
                  {request.rejectionCount} {request.rejectionCount === 1 ? 'time' : 'times'}
                </span>{' '}
                total.
                {request.blockedUntil && ` Registration is restricted until ${formatDate(request.blockedUntil, true)}.`}
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

        {/* ID document + applicant fields, side by side on sm+ — same split
            as ReviewRequestModal so the image and the data it's checked
            against sit in one glance instead of a long single-column scroll. */}
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
                <p className={fieldValueClasses}>{formatDate(request.birthdate)}</p>
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
              <div className="col-span-2">
                <p className={fieldLabelClasses}>Commuter Type</p>
                <p className="mt-1"><Badge variant="info">{request.commuterType}</Badge></p>
              </div>
            </div>
          </section>
        </div>

        {/* Rejection details — the reason in full, both dates, and who
            rejected it. Kept in its own red-tinted panel (same rounded-xl /
            bordered-panel language as the sections above) since this is the
            one thing that makes this record different from a pending one. */}
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 space-y-3">
          <div className="flex items-start space-x-2 text-red-300">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400">Rejection Reason</p>
              <p className="text-sm text-white mt-1 wrap-break-word">{request.rejectionReason}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2 border-t border-red-400/20">
            <div className="min-w-0">
              <p className={fieldLabelClasses}>Submitted</p>
              <p className={fieldValueClasses}>{formatDate(request.createdAt, true)}</p>
            </div>
            <div className="min-w-0">
              <p className={fieldLabelClasses}>Rejected</p>
              <p className={fieldValueClasses}>{formatDate(request.rejectedAt, true)}</p>
            </div>
            <div className="col-span-2 min-w-0">
              <p className={fieldLabelClasses}>Rejected By</p>
              <p className={fieldValueClasses}>{request.rejectedByName || '—'}</p>
              {request.rejectedByEmail && (
                <p className="text-xs text-slate-500 truncate">{request.rejectedByEmail}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#1E2D45] text-slate-300 hover:bg-[#131C2E] transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {/* Full-size ID image lightbox — sits above the modal (z-60 vs the
          modal's z-50) so it isn't clipped by the panel's own scroll area. */}
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
