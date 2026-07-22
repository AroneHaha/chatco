'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, CheckCircle, Info, Megaphone } from 'lucide-react';
import {
  unreadCount as fetchUnreadCount,
  list as listAnnouncements,
  markRead as markAnnouncementRead,
  AnnouncementOperationError,
  type Announcement,
} from '@/lib/shared/services/announcement.service';
import { AnnouncementDetailModal } from '@/components/shared/announcement-detail-modal';

// ─── Types ─────────────────────────────────────────────────────────────

/** Polling interval for the bell badge (per the S6-T9 spec). */
const POLL_INTERVAL_MS = 30_000;
/** Max unread items to show in the dropdown (per the S6-T9 spec). */
const DROPDOWN_LIMIT = 5;

// ─── Helper: format relative time ──────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Helper: get icon + color by backend `type` string ─────────────────

/**
 * The backend `type` column is a free-form string (max 20, e.g. 'holiday',
 * 'route', 'system', 'safety', 'promo', 'maintenance'). Map it heuristically
 * to the bell's three visual styles. Unknown/blank → info (blue).
 */
function getNotificationStyle(type: string) {
  const t = (type ?? '').toLowerCase();
  if (['safety', 'warning', 'maintenance', 'alert', 'sos'].some((k) => t.includes(k))) {
    return { Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' };
  }
  if (['promo', 'success', 'holiday', 'reward'].some((k) => t.includes(k))) {
    return { Icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  }
  return { Icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' };
}

// ─── Component ─────────────────────────────────────────────────────────

/**
 * Sprint 6 (S6-T9) — Admin notification bell, wired to the real announcement
 * backend.
 *
 *   unreadCount() → GET /api/v1/announcements/unread-count (polled every 30s)
 *   list({ unreadOnly: true }) → GET /api/v1/announcements?unread_only=1
 *   markRead(id) → POST /api/v1/announcements/{id}/read
 *
 * Flow:
 *   - Badge shows the polled unread count (capped at '99+' for display).
 *   - Clicking the bell opens a dropdown of the top 5 unread announcements
 *     (title + first 100 chars of message + time-ago).
 *   - Clicking an unread item → markRead(id) → badge decrements → the item
 *     is removed from the dropdown → the detail modal opens with the full body.
 *   - "Mark all read" iterates the visible unread items + calls markRead for
 *     each, then refetches the count.
 *   - "View all" links to the admin /announcements management page.
 *
 * The bell is role-agnostic on the client (the backend route is open to any
 * authenticated role), but it's only mounted in the admin layout today.
 */
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [detailItem, setDetailItem] = useState<Announcement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Poll unread count on mount + every 30s ──────────────────────────
  const refreshCount = useCallback(async () => {
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      // Silent fail on poll — the bell just shows the last known count.
      // 401 (session expired) is handled globally by the auth redirect.
      if (err instanceof AnnouncementOperationError && err.code === 'unauthenticated') {
        setUnreadCount(0);
      }
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const id = setInterval(() => void refreshCount(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshCount]);

  // ─── Fetch the dropdown list when the bell opens ─────────────────────
  const refreshList = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const result = await listAnnouncements({ unreadOnly: true, perPage: DROPDOWN_LIMIT });
      setItems(result.items);
    } catch (err) {
      setListError(
        err instanceof AnnouncementOperationError
          ? err.message
          : 'Unable to load announcements.'
      );
      setItems([]);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void refreshList();
  }, [isOpen, refreshList]);

  // ─── Close dropdown when clicking outside ────────────────────────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Click an unread item → markRead + open detail modal ──────────────
  const handleClickItem = useCallback(
    async (item: Announcement) => {
      // Optimistic: remove from the dropdown immediately.
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setUnreadCount((c) => Math.max(0, c - 1));
      setMarkingIds((prev) => new Set(prev).add(item.id));
      try {
        await markAnnouncementRead(item.id);
      } catch {
        // On failure, restore the item + count (best-effort).
        setItems((prev) => [item, ...prev]);
        setUnreadCount((c) => c + 1);
      } finally {
        setMarkingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
      // Open the detail modal with the full body.
      setDetailItem(item);
      setIsOpen(false);
    },
    []
  );

  // ─── Mark all visible unread as read ─────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    const targets = items.filter((i) => !markingIds.has(i.id));
    if (targets.length === 0) return;
    // Optimistic: clear the list + zero the visible count contribution.
    const targetIds = new Set(targets.map((t) => t.id));
    setItems((prev) => prev.filter((i) => !targetIds.has(i.id)));
    setUnreadCount((c) => Math.max(0, c - targets.length));
    setMarkingIds((prev) => new Set([...prev, ...targetIds]));
    try {
      await Promise.all(targets.map((t) => markAnnouncementRead(t.id)));
      // Re-sync the authoritative count from the server.
      void refreshCount();
    } catch {
      // Restore on failure + re-sync.
      setItems((prev) => [...targets, ...prev]);
      void refreshCount();
    } finally {
      setMarkingIds(new Set());
    }
  }, [items, markingIds, refreshCount]);

  const displayedBadge = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={18} />
        {/* Static, not animate-pulse. A permanently pulsing badge reads as a
            live alert and never settles — it also fades the digits in and out,
            which made the count hard to read. The ring separates it from the
            button edge instead of letting it bleed into the border. */}
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center tabular-nums ring-2 ring-[#0B1120]"
          >
            {displayedBadge}
          </span>
        )}
      </button>

      {/* Dropdown Panel. The bell is mounted fixed near the viewport's right
          edge, so a hard 320px panel ran off-screen on narrow phones — the
          width is clamped to what's available and grows back at sm. */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-[calc(100vw-1.5rem)] max-w-[20rem] sm:w-96 sm:max-w-none bg-[#0D1424] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Announcements</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">
                  {unreadCount} New
                </span>
              )}
            </div>
            {items.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingIds.size > 0}
                className="text-[11px] font-medium text-[#62A0EA] hover:text-[#7AB8F4] transition-colors disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/[0.04]">
            {isLoadingList ? (
              <div className="px-4 py-12 text-center">
                <div className="w-6 h-6 border-2 border-white/10 border-t-[#62A0EA] rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-white/30">Loading…</p>
              </div>
            ) : listError ? (
              <div className="px-4 py-10 text-center">
                <AlertTriangle size={28} className="mx-auto text-red-400/60 mb-2" />
                <p className="text-sm text-red-400/80 mb-3">{listError}</p>
                <button
                  onClick={() => void refreshList()}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#62A0EA] text-white"
                >
                  Try again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell size={32} className="mx-auto text-white/10 mb-2" />
                <p className="text-sm text-white/30">You&apos;re all caught up</p>
              </div>
            ) : (
              items.map((item) => {
                const { Icon, color, bg } = getNotificationStyle(item.type);
                const preview =
                  item.message.length > 100
                    ? `${item.message.slice(0, 100)}…`
                    : item.message;
                return (
                  <button
                    key={item.id}
                    onClick={() => void handleClickItem(item)}
                    disabled={markingIds.has(item.id)}
                    className="group w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors relative disabled:opacity-60"
                  >
                    {/* Unread dot */}
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#62A0EA]" />

                    <div className="flex items-start gap-3 pl-3">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon size={16} className={color} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-white/90 truncate">
                            {item.title}
                          </p>
                          <span className="text-[10px] text-white/30 flex-shrink-0">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5 leading-relaxed line-clamp-2">
                          {preview}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer — link to the admin management page */}
          <div className="px-4 py-3 border-t border-white/5">
            <Link
              href="/announcements"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-white/40 hover:text-white/70 transition-colors py-1"
            >
              <Megaphone size={12} />
              View all announcements
            </Link>
          </div>
        </div>
      )}

      {/* Detail modal — opens when an unread item is clicked */}
      <AnnouncementDetailModal
        announcement={detailItem}
        isOpen={detailItem !== null}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}
