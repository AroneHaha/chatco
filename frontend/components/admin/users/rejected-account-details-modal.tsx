// components/admin/users/rejected-account-details-modal.tsx
'use client';

import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { AlertTriangle, XCircle } from 'lucide-react';
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
 */
export function RejectedAccountDetailsModal({ isOpen, onClose, request }: RejectedAccountDetailsModalProps) {
  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <h2 className="text-xl font-bold text-white mb-6">Rejected Account Details</h2>

      <div className="space-y-6">
        {/* Repeat-applicant history, same as the review modal — still relevant
            context for a rejected record. */}
        {request.rejectionCount > 0 && (
          <div className="space-y-3 p-3 bg-amber-400/10 border border-amber-400/30 rounded-md">
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

        {/* ID Image */}
        <div className="flex justify-center">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={request.idImageUrl} alt="Uploaded ID" className="w-64 h-40 object-cover rounded-md border-2 border-[#1E2D45] shadow-lg" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center py-1 rounded-b-md">
              <span className="text-xs text-slate-300">Uploaded Valid ID</span>
            </div>
          </div>
        </div>

        {/* Applicant details — same field set as the review modal. */}
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
            <p className="text-white font-medium mt-1 truncate">{formatDate(request.birthdate)}</p>
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

        {/* Rejection details — the reason in full, both dates, and who
            rejected it. */}
        <div className="p-4 bg-red-400/10 border border-red-400/30 rounded-md space-y-3">
          <div className="flex items-start space-x-2 text-red-300">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Rejection Reason</p>
              <p className="text-sm text-white mt-1 wrap-break-word">{request.rejectionReason}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 border-t border-red-400/20">
            <div className="min-w-0">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Submitted</p>
              <p className="text-white font-medium mt-1 truncate">{formatDate(request.createdAt, true)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Rejected</p>
              <p className="text-white font-medium mt-1 truncate">{formatDate(request.rejectedAt, true)}</p>
            </div>
            <div className="col-span-2 min-w-0">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Rejected By</p>
              <p className="text-white font-medium mt-1 truncate">{request.rejectedByName || '—'}</p>
              {request.rejectedByEmail && (
                <p className="text-xs text-slate-500 truncate">{request.rejectedByEmail}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-[#1E2D45] text-slate-300 rounded-md hover:bg-[#131C2E] transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
