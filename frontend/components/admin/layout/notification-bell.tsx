'use client';

import { useState, useRef, useEffect, useCallback, useId } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, CheckCircle, Info, Megaphone, X, ArrowUpRight } from 'lucide-react';
import {
  unreadCount as fetchUnreadCount,
  list as listAnnouncements,
  markRead as markAnnouncementRead,
  markAllRead as markAllAnnouncementsRead,
  AnnouncementOperationError,
  type Announcement,
} from '@/lib/shared/services/announcement.service';
import { AnnouncementDetailModal } from '@/components/shared/announcement-detail-modal';
import { ADMIN_NOTIFICATIONS_CHANGED } from '@/lib/admin/notification-events';

// ─── Types ─────────────────────────────────────────────────────────────

/** Polling fallback for the bell badge and open feed when live delivery is unavailable. */
const POLL_INTERVAL_MS = 30_000;
/** Items fetched per page — the dropdown loads 10 initially, then 10 more each time the user scrolls to the bottom. */
const PAGE_SIZE = 10;
/** Trigger the next page fetch once the user scrolls within this many px of the bottom. */
const LOAD_MORE_THRESHOLD_PX = 48;

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
 * System notification types get a clear activity label. Admin-published
 * announcements retain the generic Announcement label, while unknown types
 * remain neutral instead of being guessed as a system event.
 */
function getNotificationStyle(type: string) {
  const t = (type ?? '').toLowerCase();
  const label = t.includes('sos') ? 'SOS'
    : t.includes('overspeed') ? 'Overspeeding'
    : t.includes('remittance') ? 'Remittance'
    : t.startsWith('shift_') ? 'Shift'
    : t === 'vehicle_status_changed' ? 'Vehicle Status'
    : t.startsWith('discount_application') ? 'Discount Application'
    : t.startsWith('student_renewal') ? 'Student Renewal'
    : t.includes('registration') ? 'Registration'
    : t.includes('claim') || t.startsWith('saved_item_') ? 'Lost & Found'
    : t.startsWith('voucher_') ? 'Voucher'
    : 'Announcement';
  if (t === 'sos_triggered') {
    return { Icon: AlertTriangle, color: 'text-red-400 admin-light:text-red-600', label };
  }
  if (t === 'discount_application_waiting') {
    return { Icon: AlertTriangle, color: 'text-amber-400 admin-light:text-amber-700', label };
  }
  if (t === 'vehicle_status_changed') {
    return { Icon: Info, color: 'text-[#8CB9F0] admin-light:text-[#1A5FB4]', label };
  }
  if (['sos_resolved', 'remittance_completed', 'shift_ended'].includes(t)) {
    return { Icon: CheckCircle, color: 'text-emerald-400 admin-light:text-emerald-700', label };
  }
  if (t.startsWith('discount_application') || t.startsWith('student_renewal') || t.startsWith('registration')) {
    return { Icon: Info, color: 'text-[#8CB9F0] admin-light:text-[#1A5FB4]', label };
  }
  if (t.startsWith('new_registration') || t === 'registration_waiting' || t === 'new_claim') {
    return { Icon: Info, color: 'text-[#8CB9F0] admin-light:text-[#1A5FB4]', label };
  }
  if (t.startsWith('claim_approved') || t.startsWith('claim_released') || t.startsWith('voucher_')) {
    return { Icon: CheckCircle, color: 'text-emerald-400 admin-light:text-emerald-700', label };
  }
  if (['safety', 'warning', 'maintenance', 'alert', 'sos', 'overspeed', 'overdue', 'waiting', 'service', 'weather'].some((k) => t.includes(k))) {
    return { Icon: AlertTriangle, color: 'text-amber-400 admin-light:text-amber-700', label };
  }
  if (['promo', 'success', 'holiday', 'reward'].some((k) => t.includes(k))) {
    return { Icon: CheckCircle, color: 'text-emerald-400 admin-light:text-emerald-700', label };
  }
  return { Icon: label === 'Announcement' ? Megaphone : Info, color: 'text-white/50 admin-light:text-slate-500', label };
}

// ─── Component ─────────────────────────────────────────────────────────

/**
 * Sprint 6 (S6-T9) — Admin notification bell, wired to the real announcement
 * backend.
 *
 *   unreadCount() → GET /api/v1/announcements/unread-count (polled every 30s)
 *   list({ unreadOnly }) → GET /api/v1/announcements?unread_only=0|1
 *   markRead(id) → POST /api/v1/announcements/{id}/read
 *
 * Flow:
 *   - Private admin live signals refresh the count and open feed; 30s polling is the fallback.
 *   - Badge shows the unread count (capped at '99+' for display).
 *   - Unread and All views load notifications (including read history) 10
 *     at a time (title + two-line message preview + time-ago). Scrolling to
 *     the bottom of the currently loaded list fetches the next page of 10 and
 *     appends it — the already-rendered items are never replaced or reloaded.
 *   - Clicking an unread item → markRead(id) → badge decrements → the item
 *     leaves Unread but remains in All → opens the full message before optional navigation.
 *   - "Mark all read" uses the existing bulk endpoint, including unloaded pages,
 *     then refreshes the feed and count.
 *   - "View all" links to the admin /announcements management page.
 *
 * The bell is role-agnostic on the client (the backend route is open to any
 * authenticated role), but it's only mounted in the admin layout today.
 */
// Light-mode bell button per surface: on the CHATCO-blue sidebar, or on white
// (the mobile bell floats over the page).
const BELL_LIGHT = 'admin-light:bg-[#F8FAFC] admin-light:border-[#E2E8F0] admin-light:text-slate-600 admin-light:hover:bg-slate-100 admin-light:hover:text-slate-900 admin-light:focus-visible:ring-[#1A5FB4]';
const BELL_LIGHT_ON_BRAND = 'admin-light:bg-white/10 admin-light:border-white/20 admin-light:text-white admin-light:hover:bg-white/20 admin-light:hover:text-white admin-light:focus-visible:ring-white';

export function NotificationBell({ onBrand = false }: { onBrand?: boolean }) {
  const popupId = useId();
  const bellRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [detailItem, setDetailItem] = useState<Announcement | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  // Next page to fetch + whether the server has more pages, per the last
  // list()/loadMore() response. A ref (not state) so loadMore's scroll
  // handler always reads the latest value without re-subscribing on every
  // page bump, and so a burst of scroll events can't race past the in-flight
  // guard below and double-fetch the same page.
  const paginationRef = useRef({ nextPage: 2, hasMore: false });
  const isFetchingRef = useRef(false);
  const feedGenerationRef = useRef(0);
  const countRequestRef = useRef(0);
  const invalidateFeed = useCallback(() => { feedGenerationRef.current++; }, []);

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  // ─── Poll unread count on mount + every 30s ──────────────────────────
  const refreshCount = useCallback(async () => {
    const request = ++countRequestRef.current;
    try {
      const count = await fetchUnreadCount();
      if (request === countRequestRef.current) setUnreadCount(count);
    } catch (err) {
      // Silent fail on poll — the bell just shows the last known count.
      // 401 (session expired) is handled globally by the auth redirect.
      if (request === countRequestRef.current && err instanceof AnnouncementOperationError && err.code === 'unauthenticated') {
        setUnreadCount(0);
      }
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const id = setInterval(() => void refreshCount(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshCount]);

  // ─── Fetch page 1 when the bell opens ─────────────────────────────────
  const refreshList = useCallback(async (background = false) => {
    const loadedPages = background ? Math.max(1, paginationRef.current.nextPage - 1) : 1;
    const generation = ++feedGenerationRef.current;
    isFetchingRef.current = true;
    if (!background) setIsLoadingList(true);
    setIsLoadingMore(false);
    setListError(null);
    try {
      const result = await listAnnouncements({ unreadOnly, page: 1, perPage: PAGE_SIZE });
      if (generation !== feedGenerationRef.current) return;
      const pageCount = Math.max(1, Math.min(loadedPages, result.lastPage));
      const remaining = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) =>
        listAnnouncements({ unreadOnly, page: index + 2, perPage: PAGE_SIZE })));
      if (generation !== feedGenerationRef.current) return;
      const unique = new Map([result, ...remaining].flatMap(page => page.items).map(item => [item.id, item]));
      setItems([...unique.values()]);
      paginationRef.current = { nextPage: pageCount + 1, hasMore: pageCount < result.lastPage };
    } catch (err) {
      if (generation !== feedGenerationRef.current) return;
      if (!background) {
        setListError(
          err instanceof AnnouncementOperationError ? err.message : 'Unable to load announcements.'
        );
        setItems([]);
        paginationRef.current = { nextPage: 2, hasMore: false };
      }
    } finally {
      if (generation === feedGenerationRef.current) {
        setIsLoadingList(false);
        isFetchingRef.current = false;
      }
    }
  }, [unreadOnly]);

  useEffect(() => {
    if (isOpen) {
      void refreshList();
      // A fresh open always starts scrolled to the top of the new page-1 list.
      listScrollRef.current?.scrollTo({ top: 0 });
    }
    return invalidateFeed;
  }, [isOpen, refreshList, invalidateFeed]);

  useEffect(() => {
    const refreshOpenList = () => {
      if (isOpen && !isMarkingAll && markingIds.size === 0) void refreshList(true);
    };
    const onUpdate = () => { void refreshCount(); refreshOpenList(); };
    window.addEventListener(ADMIN_NOTIFICATIONS_CHANGED, onUpdate);
    window.addEventListener('focus', onUpdate);
    // Refresh the open list as well as the count if the live connection drops.
    const timer = window.setInterval(refreshOpenList, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(ADMIN_NOTIFICATIONS_CHANGED, onUpdate);
      window.removeEventListener('focus', onUpdate);
    };
  }, [isOpen, isMarkingAll, markingIds, refreshCount, refreshList]);

  // ─── Fetch the next page and append it once the user nears the bottom ──
  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !paginationRef.current.hasMore) return;
    isFetchingRef.current = true;
    const generation = feedGenerationRef.current;
    setIsLoadingMore(true);
    const { nextPage } = paginationRef.current;
    try {
      const result = await listAnnouncements({ unreadOnly, page: nextPage, perPage: PAGE_SIZE });
      if (generation !== feedGenerationRef.current) return;
      // Guard against a page the server already gave us (e.g. a duplicate
      // scroll-triggered call that slipped past isFetchingRef) landing twice.
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        const fresh = result.items.filter((i) => !seen.has(i.id));
        return [...prev, ...fresh];
      });
      paginationRef.current = { nextPage: nextPage + 1, hasMore: result.page < result.lastPage };
    } catch {
      // Leave hasMore as-is so scrolling back to the bottom retries the same page.
    } finally {
      if (generation === feedGenerationRef.current) {
        setIsLoadingMore(false);
        isFetchingRef.current = false;
      }
    }
  }, [unreadOnly]);

  const handleListScroll = useCallback(() => {
    const el = listScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= LOAD_MORE_THRESHOLD_PX) void loadMore();
  }, [loadMore]);

  // If a loaded page doesn't fill the scrollable panel (e.g. a short first
  // page), there's nothing for the user to scroll — so the handler above
  // would never fire even though more pages exist. Top up until the panel
  // is actually scrollable or there's nothing left to fetch.
  useEffect(() => {
    const el = listScrollRef.current;
    if (!isOpen || !el || isLoadingList || isLoadingMore) return;
    if (paginationRef.current.hasMore && el.scrollHeight <= el.clientHeight) {
      void loadMore();
    }
  }, [isOpen, items, isLoadingList, isLoadingMore, loadMore]);

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

  // ─── Click an unread item → markRead + open detail modal (or deep-link) ─
  const handleClickItem = useCallback(
    async (item: Announcement) => {
      if (markingIds.has(item.id) || isMarkingAll) return;
      setDetailError(null);
      setDetailItem(item);
      setIsOpen(false);
      setMarkingIds((prev) => new Set(prev).add(item.id));
      try {
        if (!item.isRead) {
          await markAnnouncementRead(item.id);
          setItems((prev) => unreadOnly
            ? prev.filter((i) => i.id !== item.id)
            : prev.map((i) => i.id === item.id ? { ...i, isRead: true } : i));
          void refreshCount();
          setDetailItem((current) => current?.id === item.id ? { ...current, isRead: true } : current);
        }
      } catch {
        setDetailError('Unable to mark this update as read. You can still view its message.');
        return;
      } finally {
        setMarkingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [unreadOnly, refreshCount, markingIds, isMarkingAll]
  );

  // ─── Mark all recipient-visible notifications read in one request ────
  const handleMarkAllRead = useCallback(async () => {
    if (isMarkingAll || markingIds.size > 0) return;
    setIsMarkingAll(true);
    try {
      await markAllAnnouncementsRead();
      await refreshList();
      void refreshCount();
    } catch {
      setListError('Unable to mark notifications as read. Please try again.');
      void refreshCount();
    } finally {
      setIsMarkingAll(false);
    }
  }, [isMarkingAll, markingIds, refreshCount, refreshList]);

  const displayedBadge = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={(event) => {
      if (event.key === 'Escape' && isOpen) {
        event.stopPropagation();
        setIsOpen(false);
        bellRef.current?.focus();
      }
    }}>
      {/* Bell Button */}
      <button
        ref={bellRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] ${onBrand ? BELL_LIGHT_ON_BRAND : BELL_LIGHT}`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? popupId : undefined}
        aria-haspopup="dialog"
      >
        <Bell size={18} />
        {/* Static, not animate-pulse. A permanently pulsing badge reads as a
            live alert and never settles — it also fades the digits in and out,
            which made the count hard to read. The ring separates it from the
            button edge instead of letting it bleed into the border. */}
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center tabular-nums ring-2 ring-[#0B1120] ${onBrand ? 'admin-light:ring-[#143C8C]' : 'admin-light:ring-white'}`}
          >
            {displayedBadge}
          </span>
        )}
      </button>

      {/* Dropdown Panel. The bell is mounted fixed near the viewport's right
          edge, so a hard 320px panel ran off-screen on narrow phones — the
          width is clamped to what's available and grows back at sm. */}
      {isOpen && (
        <div id={popupId} role="dialog" aria-label="Notifications" className="absolute right-0 top-12 z-50 flex w-[calc(100vw-1.5rem)] max-w-[26rem] max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-xl border border-[#2A3A52] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white md:left-full md:right-auto md:top-0 md:ml-3 md:w-[26rem] md:max-h-[calc(100dvh-3rem)]">
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-4">
            <div>
              <h3 className="text-base font-semibold text-white admin-light:text-slate-900">Notifications</h3>
              <p className="mt-1 text-xs text-white/50 admin-light:text-slate-500">{unreadCount > 0 ? `${unreadCount} unread ${unreadCount === 1 ? 'update' : 'updates'}` : 'No unread updates'}</p>
            </div>
            <button ref={closeButtonRef} type="button" aria-label="Close notifications" onClick={() => { setIsOpen(false); bellRef.current?.focus(); }} className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white/50 admin-light:text-slate-500 transition-colors hover:bg-white/5 admin-light:hover:bg-[#F8FAFC] hover:text-white admin-light:hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4]"><X size={16} aria-hidden="true" /></button>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#1E2D45] admin-light:border-[#E2E8F0] px-5">
            <div role="group" aria-label="Notification filter" className="flex gap-5">
              {([{ label: 'Unread', value: true }, { label: 'All', value: false }]).map(({ label, value }) => (
              <button
                key={label}
                type="button"
                aria-pressed={unreadOnly === value}
                disabled={isMarkingAll || markingIds.size > 0}
                onClick={() => setUnreadOnly(value)}
                className={`min-h-10 border-b-2 px-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] disabled:opacity-50 ${unreadOnly === value ? 'border-[#62A0EA] admin-light:border-[#1A5FB4] text-white admin-light:text-slate-900' : 'border-transparent text-white/50 admin-light:text-slate-500 hover:text-white admin-light:hover:text-slate-900'}`}
              >
                {label}
              </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead} disabled={markingIds.size > 0 || isMarkingAll || isLoadingList || isLoadingMore} className="min-h-9 rounded-md px-2 text-xs font-medium text-[#62A0EA] admin-light:text-[#1A5FB4] transition-colors hover:bg-white/5 admin-light:hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] disabled:opacity-50">{isMarkingAll ? 'Marking…' : 'Mark all read'}</button>
            )}
          </div>

          {/* List */}
          <div
            ref={listScrollRef}
            onScroll={handleListScroll}
            aria-busy={isLoadingList || isLoadingMore}
            className="min-h-0 max-h-[420px] flex-1 overflow-y-auto overscroll-contain modal-scroll"
          >
            {isLoadingList ? (
              <div role="status" className="px-5 py-12 text-center">
                <div className="w-6 h-6 border-2 border-white/10 admin-light:border-[#E2E8F0] border-t-[#62A0EA] admin-light:border-t-[#1A5FB4] rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-white/60 admin-light:text-slate-600">Loading notifications…</p>
              </div>
            ) : listError ? (
              <div role="alert" className="px-5 py-10 text-center">
                <AlertTriangle size={28} className="mx-auto text-red-400/60 admin-light:text-red-500 mb-2" />
                <p className="text-sm text-red-400/80 admin-light:text-red-600 mb-3">{listError}</p>
                <button
                  type="button"
                  onClick={() => void refreshList()}
                  className="min-h-9 px-3 py-2 rounded-md text-xs font-semibold bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-[#0B1120] admin-light:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#131C2E] admin-light:focus-visible:ring-offset-white"
                >
                  Try again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-white/80 admin-light:text-slate-700">{unreadOnly ? 'You’re all caught up' : 'No notifications yet'}</p>
                <p className="mt-2 text-xs leading-relaxed text-white/50 admin-light:text-slate-500">{unreadOnly ? 'Read updates are available in All.' : 'Fleet and account updates will appear here.'}</p>
              </div>
            ) : (
              <>
              <ul aria-label="Notification updates" className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
              {items.map((item) => {
                const { Icon, color, label } = getNotificationStyle(item.type);
                return (
                  <li key={item.id}>
                  <button
                    type="button"
                    aria-label={`${item.isRead ? '' : 'Unread: '}${item.title}`}
                    onClick={() => void handleClickItem(item)}
                    disabled={markingIds.has(item.id) || isMarkingAll || isLoadingMore}
                    className={`w-full border-l-2 px-[18px] py-4 text-left transition-colors hover:bg-white/5 admin-light:hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] disabled:opacity-60 ${item.isRead ? 'border-transparent' : 'border-[#62A0EA] admin-light:border-[#1A5FB4] bg-[#62A0EA]/[0.04]'}`}
                  >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`flex min-w-0 items-center gap-1.5 text-[11px] font-medium ${color}`}><Icon size={13} aria-hidden="true" className="shrink-0" /><span className="truncate">{label}</span></span>
                        <time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()} className="shrink-0 text-[11px] text-white/40 admin-light:text-slate-500 tabular-nums">{formatRelativeTime(item.createdAt)}</time>
                      </div>
                      <p title={item.title} className={`mt-2 line-clamp-2 text-sm leading-5 [overflow-wrap:anywhere] ${item.isRead ? 'font-medium text-white/70 admin-light:text-slate-600' : 'font-semibold text-white admin-light:text-slate-900'}`}>{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/50 admin-light:text-slate-500 [overflow-wrap:anywhere]">{item.message}</p>
                  </button>
                  </li>
                );
              })}
              </ul>
              {isLoadingMore && (
                <div role="status" aria-label="Loading more notifications" className="px-5 py-4 text-center">
                  <div className="w-4 h-4 border-2 border-white/10 admin-light:border-[#E2E8F0] border-t-[#62A0EA] admin-light:border-t-[#1A5FB4] rounded-full animate-spin mx-auto" />
                </div>
              )}
              </>
            )}
          </div>

          {/* Footer — link to the admin management page */}
          <div className="shrink-0 px-5 py-3 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#101A2B] admin-light:bg-[#F8FAFC]">
            <Link
              href="/announcements"
              onClick={() => setIsOpen(false)}
              className="flex min-h-9 items-center justify-between gap-3 rounded-md text-xs font-medium text-white/70 admin-light:text-slate-600 transition-colors hover:text-white admin-light:hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4]"
            >
              View all updates
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      {/* Detail modal — opens when an unread item is clicked */}
      <AnnouncementDetailModal
        managementView
        showUpdatesCenterLink
        errorMessage={detailError}
        announcement={detailItem}
        isOpen={detailItem !== null}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}
