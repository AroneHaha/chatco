'use client';

import { Modal } from '@/components/shared/modal';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, Info, Megaphone, Bell, ArrowUpRight } from 'lucide-react';
import type { Announcement } from '@/lib/shared/services/announcement.service';
import styles from './announcement-detail.module.css';

// ─── Helpers ─────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStyle(type: string) {
  const t = (type ?? '').toLowerCase();
  if (['safety', 'warning', 'maintenance', 'alert', 'sos'].some((k) => t.includes(k))) {
    return { Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Advisory' };
  }
  if (['promo', 'success', 'holiday', 'reward'].some((k) => t.includes(k))) {
    return { Icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Promo' };
  }
  if (['system', 'route', 'schedule'].some((k) => t.includes(k))) {
    return { Icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'System' };
  }
  return { Icon: Megaphone, color: 'text-slate-300', bg: 'bg-white/5', label: 'Announcement' };
}

function formatCategory(value: string): string {
  const text = value.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Announcement';
}

// ─── Component ───────────────────────────────────────────────────────

interface AnnouncementDetailModalProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
  managementView?: boolean;
  showUpdatesCenterLink?: boolean;
  errorMessage?: string | null;
}

function relatedAction(announcement: Announcement): { label: string; href: string } | null {
  if (!announcement.recipientId || !announcement.referenceId) return null;
  const id = encodeURIComponent(announcement.referenceId);
  switch (announcement.type) {
    case 'NEW_REGISTRATION':
    case 'REGISTRATION_WAITING': return { label: 'Review registration', href: `/users?tab=pending&registrationId=${id}` };
    case 'NEW_CLAIM': return { label: 'Review claims', href: `/lost-found?itemId=${id}` };
    case 'SHIFT_STARTED': return { label: 'View vehicle', href: `/vehicles?vehicleId=${id}` };
    case 'SHIFT_ENDED':
    case 'REMITTANCE_COMPLETED':
    case 'REMITTANCE_OVERDUE': return { label: 'View remittance', href: `/remittance?shiftId=${id}` };
    case 'SOS_TRIGGERED': return { label: 'View SOS alert', href: `/monitoring?sosId=${id}` };
    case 'SOS_RESOLVED': return { label: 'View resolved SOS', href: `/monitoring?resolvedSosId=${id}` };
    case 'OVERSPEED_FLAGGED': return { label: 'View overspeeding event', href: `/monitoring?overspeedId=${id}` };
    default: return null;
  }
}

/**
 * Sprint 6 (S6-T9) — shared full-body announcement view modal.
 *
 * Used by:
 *   - The admin notification bell (opens when an unread item is clicked,
 *     AFTER markRead has fired).
 *   - The admin /announcements management table (click a row to read the
 *     full body without editing).
 *
 * Presentation-only: no service calls. The caller owns the read-state
 * lifecycle (the bell marks-read before opening; the admin table is
 * read-only on existing rows).
 */
export function AnnouncementDetailModal({
  announcement,
  isOpen,
  onClose,
  managementView = false,
  showUpdatesCenterLink = false,
  errorMessage,
}: AnnouncementDetailModalProps) {
  if (!announcement) {
    // Render nothing when there's no announcement; the parent controls
    // visibility via `isOpen` but we still guard against null.
    return null;
  }

  const { Icon, color, bg, label } = getStyle(announcement.type);
  const isNotification = Boolean(announcement.recipientId);
  const HeaderIcon = isNotification ? Bell : Megaphone;
  const action = managementView || showUpdatesCenterLink ? relatedAction(announcement) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth={managementView ? 'max-w-lg lg:max-w-2xl' : 'max-w-lg'}>
      <div className={`space-y-4 ${managementView ? styles.management : ''}`}>
        {managementView && (
          <div className={`hidden lg:flex items-center gap-3 ${styles.header}`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#62A0EA]/15 text-[#62A0EA]">
              <HeaderIcon size={22} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{isNotification ? 'Notification Details' : 'Announcement Details'}</h2>
              <p className="mt-1 text-sm text-slate-400">{isNotification ? 'Operational update and related record' : 'Published announcement and posting information'}</p>
            </div>
          </div>
        )}
        {/* Type badge + timestamp. pr-8 keeps the timestamp clear of Modal's
            absolutely-positioned close button, which sits at top-3 right-3 and
            was printing straight over it. */}
        <div className={`flex items-center justify-between gap-3 pr-8 ${styles.summary}`}>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${bg} ${color} ${styles.category}`}>
            <Icon size={12} aria-hidden="true" />
            {formatCategory(announcement.type || label)}
          </div>
          <span className="text-[11px] text-slate-500" title={new Date(announcement.createdAt).toLocaleString()}>
            {formatRelativeTime(announcement.createdAt)}
            {managementView && <span className="hidden lg:block mt-1 text-xs text-slate-400">{new Date(announcement.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
          </span>
        </div>

        {/* Title */}
        <h2 className={`text-lg sm:text-xl font-bold text-white leading-tight ${styles.title}`}>
          {announcement.title}
        </h2>

        {/* Meta — author + status (admin context only) */}
        {(announcement.createdBy || announcement.status) && (
          <div className={`flex flex-wrap items-center gap-3 text-[11px] text-slate-500 ${styles.metadata}`}>
            {announcement.createdBy && (
              <span>
                Posted by <span className="text-slate-300">{announcement.createdBy}</span>
              </span>
            )}
            {announcement.status && (
              <span data-status={announcement.status} className={`${styles.status} px-2 py-0.5 rounded-full border ${
                announcement.status === 'ARCHIVED'
                  ? 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              }`}>
                {isNotification ? (announcement.isRead ? 'Read' : 'Unread') : announcement.displayStatus}
              </span>
            )}
          </div>
        )}

        {/* Divider */}
        <div className={`border-t border-white/5 ${styles.divider}`} />

        {/* Body — preserve whitespace + wrap long content.
            No inner max-height/scroller: capping this at 55vh made a second,
            nested scroll region inside the Modal's own one, so a long notice
            was squeezed into just over half the panel while the rest of it sat
            empty. Letting it grow lets the Modal's single scroll region use the
            full 90vh. */}
        <div className={`text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words ${styles.message}`}>
          {announcement.message}
        </div>
        {errorMessage && <p role="alert" className="rounded-md border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300">{errorMessage}</p>}
        {(managementView || showUpdatesCenterLink) && (
          <div className={`flex flex-wrap justify-end gap-2 ${styles.footer}`}>
            <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-[#1E2D45] px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5">Done</button>
            {showUpdatesCenterLink && (
              <Link href={`/announcements?tab=${isNotification ? 'notifications' : 'announcements'}&updateId=${encodeURIComponent(announcement.id)}`} onClick={onClose} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#62A0EA]/40 px-4 py-2.5 text-sm font-medium text-[#62A0EA] transition-colors hover:bg-[#62A0EA]/10">
                View in Updates Center <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            )}
            {action && <Link href={action.href} onClick={onClose} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#62A0EA] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4A8BD4]">{action.label}<ArrowUpRight size={15} aria-hidden="true" /></Link>}
          </div>
        )}
      </div>
    </Modal>
  );
}
