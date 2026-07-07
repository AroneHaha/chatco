'use client';

import { Modal } from '@/components/shared/modal';
import { AlertTriangle, CheckCircle, Info, Megaphone } from 'lucide-react';
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

// ─── Component ───────────────────────────────────────────────────────

interface AnnouncementDetailModalProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
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
}: AnnouncementDetailModalProps) {
  if (!announcement) {
    // Render nothing when there's no announcement; the parent controls
    // visibility via `isOpen` but we still guard against null.
    return null;
  }

  const { Icon, color, bg, label } = getStyle(announcement.type);

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Type badge + timestamp */}
        <div className="flex items-center justify-between gap-3">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${bg} ${color}`}>
            <Icon size={12} />
            {announcement.type || label}
          </div>
          <span className="text-[11px] text-slate-500">
            {formatRelativeTime(announcement.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
          {announcement.title}
        </h2>

        {/* Meta — author + status (admin context only) */}
        {(announcement.createdBy || announcement.status) && (
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            {announcement.createdBy && (
              <span>
                Posted by <span className="text-slate-300">{announcement.createdBy}</span>
              </span>
            )}
            {announcement.status && (
              <span className={`px-2 py-0.5 rounded-full border ${
                announcement.status === 'ARCHIVED'
                  ? 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              }`}>
                {announcement.displayStatus}
              </span>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-white/5" />

        {/* Body — preserve whitespace + wrap long content */}
        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words max-h-[55vh] overflow-y-auto pr-1">
          {announcement.message}
        </div>
      </div>
    </Modal>
  );
}
