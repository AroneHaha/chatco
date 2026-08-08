// contexts/announcements-context.tsx
//
// Shared commuter announcement state: the "Latest Updates" feed on the rewards
// page AND the unread badge on the Rewards tab in the commuter layout.
//
// Why a context rather than each consumer calling useAnnouncements():
// the hook owns fetched state, so two call sites meant two independent fetches
// and two independent copies of `isRead`. Opening an announcement on the
// rewards page would flip that page's copy but leave the layout's badge stale
// until a full reload. One provider above both keeps a single source of truth,
// so marking something read decrements the badge in the same render.
//
//   list()        → GET  /api/announcements            (feed + per-user is_read)
//   unreadCount() → GET  /api/announcements/unread-count
//   markRead(id)  → POST /api/announcements/{id}/read  (idempotent)
//
// The badge count comes from the dedicated unread-count endpoint rather than
// from `announcements.filter(!isRead).length`: the feed is paginated (15
// items), so counting locally silently caps the badge once a user has more
// unread than one page.

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/contexts/auth-context";
import type { Announcement, AnnouncementType } from "@/types";
import {
  list as listAnnouncements,
  markRead as markAnnouncementRead,
  unreadCount as fetchUnreadCount,
  AnnouncementOperationError,
  type Announcement as ServiceAnnouncement,
} from "@/lib/shared/services/announcement.service";

/** Matches the admin notification bell, so both badges refresh in step. */
const POLL_INTERVAL_MS = 30_000;

/** How many feed items to pull for the rewards panel. */
const FEED_PAGE_SIZE = 15;

/**
 * Map the backend's free-form `type` string (max 20, e.g. 'holiday', 'route',
 * 'system', 'safety', 'promo', 'maintenance', 'claim_approved') to a canonical
 * AnnouncementType values the rewards panel's announcementConfig expects.
 */
function mapType(rawType: string): AnnouncementType {
  const t = (rawType ?? "").toLowerCase();
  if (["claim_approved", "claim_rejected", "claim_released"].some((type) => t.includes(type))) {
    return "CLAIM_UPDATE";
  }
  if (["safety", "alert", "sos", "warning"].some((k) => t.includes(k))) {
    return "SAFETY";
  }
  if (["promo", "holiday", "reward", "deal"].some((k) => t.includes(k))) {
    return "PROMO";
  }
  if (
    ["maintenance", "route", "schedule", "construction", "detour", "advisory"].some(
      (k) => t.includes(k)
    )
  ) {
    return "MAINTENANCE";
  }
  return "SYSTEM";
}

/** Map a service Announcement → the canonical Announcement the UI consumes. */
function toCanonical(a: ServiceAnnouncement): Announcement {
  return {
    id: a.id,
    type: mapType(a.type),
    title: a.title,
    message: a.message,
    createdAt: a.createdAt,
    isRead: a.isRead,
  };
}

interface AnnouncementsContextValue {
  announcements: Announcement[];
  isLoading: boolean;
  /** Authoritative unread total for the tab badge (0 = no badge). */
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refresh: () => Promise<void>;
}

const AnnouncementsContext = createContext<AnnouncementsContextValue | null>(null);

export function AnnouncementsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Guards the poll against overwriting a just-applied optimistic decrement
  // with an in-flight response that was issued before the mark-read landed.
  const pendingWrites = useRef(0);

  // Last unread total seen by the count poll — lets it notice a *rise* (a
  // new announcement, e.g. a claim just got approved) versus a fall (the
  // user read something), so the feed only gets refetched when there's
  // actually something new to show.
  const lastSeenUnreadRef = useRef(0);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listAnnouncements({ perPage: FEED_PAGE_SIZE });
      setAnnouncements(result.items.map(toCanonical));
    } catch (err) {
      // Silent fail — the panel shows its empty state. Distinguishing the
      // cause doesn't change what we render, so both branches clear the feed.
      if (err instanceof AnnouncementOperationError) {
        setAnnouncements([]);
      } else {
        setAnnouncements([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshCount = useCallback(async () => {
    try {
      const count = await fetchUnreadCount();
      // A poll that started before an optimistic update would roll the badge
      // back to the pre-click value; skip it and let the next tick correct.
      if (pendingWrites.current === 0) {
        setUnreadCount(count);
        // Unread total went up since the last tick — a new announcement
        // landed (e.g. an admin just approved a claim). Pull the feed so it
        // shows up in "Latest Updates" without the commuter reloading.
        if (count > lastSeenUnreadRef.current) {
          void refresh();
        }
        lastSeenUnreadRef.current = count;
      }
    } catch {
      // Silent — the badge keeps its last known value. A 401 is handled by
      // the global auth redirect, and the provider unmounts with the layout.
    }
  }, [refresh]);

  // Only fetch once auth has resolved and the user is signed in — an anonymous
  // request would 401 on every poll.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setAnnouncements([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    void refresh();
    void refreshCount();
    const id = setInterval(() => void refreshCount(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [authLoading, isAuthenticated, refresh, refreshCount]);

  const markAsRead = useCallback(
    (id: string) => {
      // Read the current flag from the rendered list, not from inside the state
      // updater — see markAllAsRead below for why updaters must stay pure.
      // Already read → nothing to decrement, and no need to re-hit the backend.
      if (!announcements.some((a) => a.id === id && !a.isRead)) return;

      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      pendingWrites.current += 1;

      markAnnouncementRead(id)
        .catch(() => {
          // Roll back both the item and the badge.
          setAnnouncements((prev) =>
            prev.map((a) => (a.id === id ? { ...a, isRead: false } : a))
          );
          setUnreadCount((c) => c + 1);
        })
        .finally(() => {
          pendingWrites.current -= 1;
        });
    },
    [announcements]
  );

  // Derives its targets from the rendered list rather than from inside a state
  // updater: updaters must stay pure (React double-invokes them in StrictMode),
  // and firing the mark-read requests in there would send each one twice.
  const markAllAsRead = useCallback(() => {
    const targets = announcements.filter((a) => !a.isRead);
    if (targets.length === 0) return;

    const targetIds = new Set(targets.map((t) => t.id));
    setAnnouncements((prev) =>
      prev.map((a) => (targetIds.has(a.id) ? { ...a, isRead: true } : a))
    );
    setUnreadCount((c) => Math.max(0, c - targets.length));
    pendingWrites.current += 1;

    Promise.allSettled(targets.map((t) => markAnnouncementRead(t.id)))
      .then((results) => {
        const failedIds = new Set(
          results
            .map((r, i) => (r.status === "rejected" ? targets[i].id : null))
            .filter((id): id is string => id !== null)
        );
        if (failedIds.size > 0) {
          setAnnouncements((cur) =>
            cur.map((a) => (failedIds.has(a.id) ? { ...a, isRead: false } : a))
          );
        }
      })
      .finally(() => {
        pendingWrites.current -= 1;
        // Reconcile against the server: unread items beyond this page are
        // untouched by "mark all", so the badge may legitimately stay > 0.
        void refreshCount();
      });
  }, [announcements, refreshCount]);

  const value = useMemo(
    () => ({ announcements, isLoading, unreadCount, markAsRead, markAllAsRead, refresh }),
    [announcements, isLoading, unreadCount, markAsRead, markAllAsRead, refresh]
  );

  return (
    <AnnouncementsContext.Provider value={value}>
      {children}
    </AnnouncementsContext.Provider>
  );
}

/**
 * Read the shared announcement state. Must be called under
 * <AnnouncementsProvider>, which the commuter layout mounts.
 */
export function useAnnouncements(): AnnouncementsContextValue {
  const ctx = useContext(AnnouncementsContext);
  if (!ctx) {
    throw new Error("useAnnouncements must be used within an AnnouncementsProvider");
  }
  return ctx;
}
