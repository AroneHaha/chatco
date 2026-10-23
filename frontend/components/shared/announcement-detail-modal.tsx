'use client';

import { Modal } from '@/components/shared/modal';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Info, Megaphone, Bell, ArrowUpRight } from 'lucide-react';
import type { Announcement } from '@/lib/shared/services/announcement.service';

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

// Type is told apart by its label and icon only (UI rule: no colour coding).
function getStyle(type: string) {
  const t = (type ?? '').toLowerCase();
  if (['safety', 'warning', 'maintenance', 'alert', 'sos', 'service', 'weather'].some((k) => t.includes(k))) {
    return { Icon: AlertTriangle, label: 'Advisory' };
  }
  if (['promo', 'success', 'holiday', 'reward'].some((k) => t.includes(k))) {
    return { Icon: CheckCircle, label: 'Promo' };
  }
  if (['system', 'route', 'schedule', 'fare'].some((k) => t.includes(k))) {
    return { Icon: Info, label: 'System' };
  }
  return { Icon: Megaphone, label: 'Announcement' };
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
    case 'DISCOUNT_APPLICATION_WAITING':
    case 'DISCOUNT_APPLICATION_NEW': return { label: 'Review application', href: `/users?tab=discounts&applicationId=${id}` };
    case 'DISCOUNT_APPLICATION_DONE': return { label: 'View discount application', href: '/discount-application' };
    case 'STUDENT_RENEWAL_NEW': return { label: 'Review renewal', href: `/users?tab=discounts&applicationId=${id}` };
    case 'NEW_REGISTRATION':
    case 'REGISTRATION_WAITING': return { label: 'Review registration', href: `/users?tab=pending&registrationId=${id}` };
    case 'NEW_CLAIM': return { label: 'Review claims', href: `/lost-found?itemId=${id}` };
    case 'VEHICLE_STATUS_CHANGED':
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

  const { Icon, label } = getStyle(announcement.type);
  const isNotification = Boolean(announcement.recipientId);
  const HeaderIcon = isNotification ? Bell : Megaphone;
  const action = managementView || showUpdatesCenterLink ? relatedAction(announcement) : null;
  const created = new Date(announcement.createdAt);
  const hasDate = !Number.isNaN(created.getTime());
  const details: { label: string; value: ReactNode }[] = [
    {
      label: 'Type',
      value: (
        <span className="inline-flex items-center gap-1.5">
          <Icon size={14} aria-hidden="true" className="shrink-0 text-slate-400 admin-light:text-slate-500" />
          {formatCategory(announcement.type || label)}
        </span>
      ),
    },
    ...(announcement.status && !isNotification ? [{ label: 'Status', value: announcement.displayStatus }] : []),
    ...(announcement.createdBy ? [{ label: 'Posted by', value: announcement.createdBy }] : []),
    ...(hasDate ? [{
      label: isNotification ? 'Received' : 'Published',
      value: `${created.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} · ${formatRelativeTime(announcement.createdAt)}`,
    }] : []),
  ];
  const secondaryButton = 'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-[#2A3A55] bg-[#131C2E] px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-[#0E1628] min-[380px]:flex-none admin-light:border-[#CBD5E1] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:bg-slate-50';

  return (
    <Modal isOpen={isOpen} onClose={onClose} adminThemed maxWidth={managementView ? 'max-w-lg lg:max-w-2xl' : 'max-w-lg'}>
      <header className="flex items-start gap-3 border-b border-[#2A3A55] pb-5 pr-8 admin-light:border-[#E2E8F0]">
        <HeaderIcon size={28} aria-hidden="true" className="shrink-0 text-[#62A0EA] admin-light:text-[#1A5FB4]" />
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-white admin-light:text-slate-900">{isNotification ? 'Notification details' : 'Announcement details'}</h2>
          <p className="mt-1 text-sm text-slate-400 admin-light:text-slate-500">{isNotification ? 'Operational update and related record' : 'Published announcement and posting information'}</p>
        </div>
      </header>

      <dl className="mt-4 divide-y divide-[#2A3A55] border-b border-[#2A3A55] text-sm admin-light:divide-[#E2E8F0] admin-light:border-[#E2E8F0]">
        {details.map((row) => (
          <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
            <dt className="shrink-0 text-slate-400 admin-light:text-slate-500">{row.label}</dt>
            <dd className="min-w-0 text-right font-medium break-words text-slate-200 admin-light:text-slate-800">{row.value}</dd>
          </div>
        ))}
      </dl>

      {/* No inner max-height/scroller: a nested scroll region squeezed long
          notices into half the panel. The Modal's own body scrolls instead. */}
      <article className="mt-4 rounded-lg border border-[#2A3A55] bg-[#131C2E] p-4 admin-light:border-[#E2E8F0] admin-light:bg-[#F8FAFC]">
        <h3 className="text-base font-semibold leading-snug break-words text-white sm:text-lg admin-light:text-slate-900">{announcement.title}</h3>
        <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-300 admin-light:text-slate-700">{announcement.message}</p>
      </article>

      {errorMessage && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm leading-relaxed text-red-400 admin-light:text-red-600">
          <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          {errorMessage}
        </p>
      )}

      {/* Notifications close with the modal's X; Done stays on announcements. */}
      {(managementView || showUpdatesCenterLink) && (!isNotification || showUpdatesCenterLink || action) && (
        <div className="mt-5 flex flex-col-reverse gap-2 min-[380px]:flex-row min-[380px]:flex-wrap min-[380px]:justify-end">
          {!isNotification && <button type="button" onClick={onClose} className={secondaryButton}>Done</button>}
          {showUpdatesCenterLink && (
            <Link href={`/announcements?tab=${isNotification ? 'notifications' : 'announcements'}&updateId=${encodeURIComponent(announcement.id)}`} onClick={onClose} className={secondaryButton}>
              View in Updates Center <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          )}
          {action && (
            <Link href={action.href} onClick={onClose} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-[#62A0EA] bg-[#62A0EA] px-4 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#85B6F0] min-[380px]:flex-none admin-light:border-[#1A5FB4] admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F]">
              {action.label}<ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </Modal>
  );
}
