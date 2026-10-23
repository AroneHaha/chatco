// components/admin/users/rejected-account-details-modal.tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from '@/components/admin/ui/modal';
import { UserAvatar } from '@/components/admin/ui/user-avatar';
import type { RejectedRequest } from '@/app/(admin)/users/data/users-data';
import styles from './commuter-details.module.css';
import { StatusReasonHint } from './status-reason-hint';

function formatDate(value: string | null, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
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
 * double-clicking a row in the Rejected tab. No approve/reject actions —
 * the account is a closed record.
 *
 * Uses the Commuter Details identity-rail layout (same stylesheet): the
 * person on the left, the record on the right. The rejection reason sits
 * behind the "?" on the photo, like a suspension reason does.
 */
export function RejectedAccountDetailsModal({ isOpen, onClose, request }: RejectedAccountDetailsModalProps) {
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  if (!request) return null;

  const personal = [
    { label: 'First name', value: request.firstName },
    { label: 'Middle name', value: request.middleName },
    { label: 'Last name', value: request.surname },
    { label: 'Birthdate', value: request.birthdate ? formatDate(request.birthdate) : null },
    { label: 'Gender', value: request.gender },
  ];

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose} maxWidth="max-w-md sm:max-w-3xl">
      <div className={styles.sheet}>
        <aside className={styles.rail} aria-label="Applicant identity">
          <div className={styles.railIdentity}>
            <span className="relative shrink-0">
              <UserAvatar alt="" className="h-14 w-14 sm:h-22 sm:w-22" iconClassName="h-6 w-6 sm:h-9 sm:w-9" />
              <StatusReasonHint title="Rejection reason" reason={request.rejectionReason || 'No reason recorded.'} label="Why this account was rejected" />
            </span>
            <div className={styles.railIdentityText}>
              <h2 className={styles.kicker}>Rejected account</h2>
              <p className={styles.personName}>{request.name}</p>
              <p className={styles.personMeta}>
                <span>
                  Rejected
                </span>
                {request.commuterType && <span>{request.commuterType}</span>}
              </p>
            </div>
          </div>

          <dl className={styles.timeline}>
            <div><dt>Submitted</dt><dd>{formatDate(request.createdAt, true)}</dd></div>
            <div><dt>Rejected</dt><dd>{formatDate(request.rejectedAt, true)}</dd></div>
            <div>
              <dt>Rejected by</dt>
              <dd className={request.rejectedByName ? undefined : styles.muted}>{request.rejectedByName || 'Not recorded'}</dd>
              {request.rejectedByEmail && <dd className={styles.muted}>{request.rejectedByEmail}</dd>}
            </div>
          </dl>
        </aside>

        <div className={styles.record}>
          {/* Repeat-applicant history: still relevant context on a closed record. */}
          {request.rejectionCount > 0 && (
            <section className={styles.recordSection}>
              <h3 className={styles.sectionTitle}>Previous attempts</h3>
              <p className={styles.attemptSummary}>
                Rejected {request.rejectionCount} {request.rejectionCount === 1 ? 'time' : 'times'} in total.
                {request.blockedUntil && ` Registration is restricted until ${formatDate(request.blockedUntil, true)}.`}
              </p>
              {request.rejectionHistory.length > 0 && (
                <ol className={styles.attemptList}>
                  {request.rejectionHistory.map((entry) => (
                    <li key={`${entry.attemptNumber}-${entry.rejectedAt}`}>
                      <span>Attempt {entry.attemptNumber}</span>
                      <span>{entry.reason}</span>
                      <time dateTime={entry.rejectedAt}>{formatDate(entry.rejectedAt)}</time>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          <section className={styles.recordSection}>
            <h3 className={styles.sectionTitle}>Personal information</h3>
            <dl className={styles.fieldGrid}>
              {personal.map(detail => (
                <div key={detail.label} className={styles.field}>
                  <dt>{detail.label}</dt>
                  <dd className={detail.value ? undefined : styles.muted}>{detail.value || 'Not provided'}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={styles.recordSection}>
            <h3 className={styles.sectionTitle}>Contact and account</h3>
            <dl className={styles.fieldRows}>
              <div className={styles.field}><dt>Username</dt><dd className={request.username ? undefined : styles.muted}>{request.username || 'Not provided'}</dd></div>
              <div className={styles.field}><dt>Email</dt><dd>{request.email}</dd></div>
              <div className={styles.field}><dt>Phone number</dt><dd>{request.phoneNumber}</dd></div>
            </dl>
          </section>

          <section className={styles.recordSection}>
            <h3 className={styles.sectionTitle}>Uploaded ID</h3>
            {request.idImageUrl ? (
              <div className={styles.idRow}>
                <button type="button" onClick={() => setIsImageExpanded(true)} className={`${styles.idThumb} cursor-zoom-in`} aria-label={`View the uploaded ID for ${request.name} full size`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={request.idImageUrl} alt="" loading="lazy" />
                </button>
                <button type="button" onClick={() => setIsImageExpanded(true)} className={styles.idLink}>View full-size ID</button>
              </div>
            ) : <p className={styles.idEmpty}>No ID uploaded.</p>}
          </section>
        </div>

        <footer className={styles.sheetActions}>
          <button type="button" onClick={onClose} className={styles.actionClose}>Close</button>
        </footer>
      </div>

      {/* Full-size ID image lightbox — sits above the modal (z-60 vs the
          modal's z-50) so it isn't clipped by the panel's own scroll area. */}
      {isImageExpanded && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsImageExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setIsImageExpanded(false)}
            className="absolute right-4 top-4 rounded-md border border-[#2A3A55] bg-[#131C2E] p-2 text-slate-200 transition-colors hover:bg-[#1A2540] hover:text-white"
            aria-label="Close full-size image"
          >
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={request.idImageUrl}
            alt={`Uploaded ID for ${request.name} (full size)`}
            className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Modal>
  );
}
