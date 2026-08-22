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
import { getEcho } from "@/lib/echo";
import type { Announcement, AnnouncementType } from "@/types";
import {
  list as listAnnouncements,
  markRead as markAnnouncementRead,
  markAllRead as markAllAnnouncementsRead,
  unreadCount as fetchUnreadCount,
  AnnouncementOperationError,
  type Announcement as ServiceAnnouncement,
} from "@/lib/shared/services/announcement.service";

/** Matches the admin notification bell, so both badges refresh in step. */
const POLL_INTERVAL_MS = 30_000;

/** How many feed items to pull for the rewards panel. */
const FEED_PAGE_SIZE = 15;

/**
 * Backend `type` values a Lost & Found claim status-change announcement can
 * carry (set by LostItemService::notifyUser at approve/reject/release). The
 * single source of truth for what counts as a "claim update" — used both to
 * bucket a row into the canonical CLAIM_UPDATE type below and to scope the
 * Lost & Found Claims tab's dedicated unread count / mark-all-read call.
 */
const CLAIM_UPDATE_TYPES = ["claim_approved", "claim_rejected", "claim_released"];

/**
 * Map the backend's free-form `type` string (max 20, e.g. 'holiday', 'route',
 * 'system', 'safety', 'promo', 'maintenance', 'claim_approved') to a canonical
 * AnnouncementType values the rewards panel's announcementConfig expects.
 * An empty/blank type, or one that explicitly says "system", is SYSTEM; a
 * non-empty type that doesn't match any known bucket (e.g. a custom category
 * typed via the admin's "Other" option) falls to CUSTOM, which the UI shows
 * using the original raw text rather than a generic label.
 */
function mapType(rawType: string): AnnouncementType {
  const t = (rawType ?? "").toLowerCase().trim();
  if (!t || t.includes("system")) {
    return "SYSTEM";
  }
  if (CLAIM_UPDATE_TYPES.some((type) => t.includes(type))) {
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
  return "CUSTOM";
}

/** Map a service Announcement → the canonical Announcement the UI consumes. */
function toCanonical(a: ServiceAnnouncement): Announcement {
  return {
    id: a.id,
    type: mapType(a.type),
    rawType: a.type ?? "",
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
  /**
   * Authoritative unread total for Lost & Found claim status updates —
   * powers the Lost & Found nav badge and the Claims tab badge. A subset of
   * `unreadCount`, tracked separately since the Rewards feed only holds the
   * latest 15 announcements (of any type), which isn't enough to know the
   * true claim-update total once other announcements crowd it out.
   */
  claimUpdatesUnreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  /** Marks every unread claim status-update announcement as read — called when the commuter opens the Claims tab. */
  markClaimUpdatesRead: () => void;
  refresh: () => Promise<void>;
}

const AnnouncementsContext = createContext<AnnouncementsContextValue | null>(null);

export function AnnouncementsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [claimUpdatesUnreadCount, setClaimUpdatesUnreadCount] = useState(0);

  // Guards the poll against overwriting a just-applied optimistic decrement
  // with an in-flight response that was issued before the mark-read landed.
  const pendingWrites = useRef(0);
  // Same guard, scoped to the claim-updates count — a separate counter since
  // marking claim updates read (or reading a single claim item) touches
  // `unreadCount` and `claimUpdatesUnreadCount` independently.
  const pendingClaimWrites = useRef(0);

  // Last unread total seen by the count poll — lets it notice a *rise* (a
  // new announcement, e.g. a claim just got approved) versus a fall (the
  // user read something), so the feed only gets refetched when there's
  // actually something new to show.
  const lastSeenUnreadRef = useRef(0);
  const lastSeenClaimUnreadRef = useRef(0);

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

  const refreshClaimUpdatesCount = useCallback(async () => {
    try {
      const count = await fetchUnreadCount({ types: CLAIM_UPDATE_TYPES });
      if (pendingClaimWrites.current === 0) {
        setClaimUpdatesUnreadCount(count);
        if (count > lastSeenClaimUnreadRef.current) {
          void refresh();
        }
        lastSeenClaimUnreadRef.current = count;
      }
    } catch {
      // Silent — same as refreshCount.
    }
  }, [refresh]);

  // Only fetch once auth has resolved and the user is signed in — an anonymous
  // request would 401 on every poll.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setAnnouncements([]);
      setUnreadCount(0);
      setClaimUpdatesUnreadCount(0);
      setIsLoading(false);
      return;
    }

    void refresh();
    void refreshCount();
    void refreshClaimUpdatesCount();
    const id = setInterval(() => {
      void refreshCount();
      void refreshClaimUpdatesCount();
    }, POLL_INTERVAL_MS);

    // Real-time: the instant an admin publishes a new announcement, refresh
    // the feed + badge immediately instead of waiting for the next poll tick.
    // The 30s poll above stays as a fallback if the socket is unavailable.
    // (Claim status-update announcements are created via notifyUser(), which
    // doesn't fire this event today, so their badge relies on the poll.)
    let echo: ReturnType<typeof getEcho> | null = null;
    try {
      echo = getEcho();
      // Leading dot = listen for the exact broadcastAs name
      // ('AnnouncementCreated') rather than Echo's namespaced default.
      echo.channel("announcements").listen(".AnnouncementCreated", () => {
        void refresh();
        void refreshCount();
        void refreshClaimUpdatesCount();
      });
    } catch (err) {
      console.warn("Echo subscription failed for announcements, falling back to polling:", err);
    }

    return () => {
      clearInterval(id);
      echo?.channel("announcements").stopListening(".AnnouncementCreated");
    };
  }, [authLoading, isAuthenticated, refresh, refreshCount, refreshClaimUpdatesCount]);

  const markAsRead = useCallback(
    (id: string) => {
      // Read the current flag from the rendered list, not from inside the state
      // updater — see markAllAsRead below for why updaters must stay pure.
      const target = announcements.find((a) => a.id === id);
      // Already read (or unknown) → nothing to decrement, and no need to re-hit the backend.
      if (!target || target.isRead) return;
      const isClaimUpdate = target.type === "CLAIM_UPDATE";

      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      pendingWrites.current += 1;
      if (isClaimUpdate) {
        setClaimUpdatesUnreadCount((c) => Math.max(0, c - 1));
        pendingClaimWrites.current += 1;
      }

      markAnnouncementRead(id)
        .catch(() => {
          // Roll back both the item and the badge(s).
          setAnnouncements((prev) =>
            prev.map((a) => (a.id === id ? { ...a, isRead: false } : a))
          );
          setUnreadCount((c) => c + 1);
          if (isClaimUpdate) setClaimUpdatesUnreadCount((c) => c + 1);
        })
        .finally(() => {
          pendingWrites.current -= 1;
          if (isClaimUpdate) pendingClaimWrites.current -= 1;
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
    const claimTargetCount = targets.filter((t) => t.type === "CLAIM_UPDATE").length;
    setAnnouncements((prev) =>
      prev.map((a) => (targetIds.has(a.id) ? { ...a, isRead: true } : a))
    );
    setUnreadCount((c) => Math.max(0, c - targets.length));
    pendingWrites.current += 1;
    if (claimTargetCount > 0) {
      setClaimUpdatesUnreadCount((c) => Math.max(0, c - claimTargetCount));
      pendingClaimWrites.current += 1;
    }

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
        if (claimTargetCount > 0) pendingClaimWrites.current -= 1;
        // Reconcile against the server: unread items beyond this page are
        // untouched by "mark all", so the badge may legitimately stay > 0.
        void refreshCount();
        if (claimTargetCount > 0) void refreshClaimUpdatesCount();
      });
  }, [announcements, refreshCount, refreshClaimUpdatesCount]);

  /**
   * Marks every unread claim status-update announcement as read in one
   * request — called when the commuter opens the Lost & Found Claims tab.
   * Scoped to CLAIM_UPDATE only, so unrelated unread announcements (promos,
   * safety alerts, etc.) are left untouched.
   *
   * Uses the dedicated backend count/endpoint (not just the locally-loaded
   * feed) since the Rewards feed only holds the latest 15 announcements of
   * any type — a claim update could be unread but pushed off that page by
   * newer, unrelated announcements.
   */
  const markClaimUpdatesRead = useCallback(() => {
    const targets = announcements.filter((a) => a.type === "CLAIM_UPDATE" && !a.isRead);
    const amount = claimUpdatesUnreadCount;
    if (amount === 0 && targets.length === 0) return;

    const targetIds = new Set(targets.map((t) => t.id));
    setAnnouncements((prev) =>
      prev.map((a) => (targetIds.has(a.id) ? { ...a, isRead: true } : a))
    );
    setClaimUpdatesUnreadCount(0);
    setUnreadCount((c) => Math.max(0, c - amount));
    pendingWrites.current += 1;
    pendingClaimWrites.current += 1;

    markAllAnnouncementsRead({ types: CLAIM_UPDATE_TYPES })
      .catch(() => {
        setAnnouncements((prev) =>
          prev.map((a) => (targetIds.has(a.id) ? { ...a, isRead: false } : a))
        );
        setClaimUpdatesUnreadCount(amount);
        setUnreadCount((c) => c + amount);
      })
      .finally(() => {
        pendingWrites.current -= 1;
        pendingClaimWrites.current -= 1;
        // Reconcile against the server (authoritative total, not just this page).
        void refreshCount();
        void refreshClaimUpdatesCount();
      });
  }, [announcements, claimUpdatesUnreadCount, refreshCount, refreshClaimUpdatesCount]);

  const value = useMemo(
    () => ({
      announcements,
      isLoading,
      unreadCount,
      claimUpdatesUnreadCount,
      markAsRead,
      markAllAsRead,
      markClaimUpdatesRead,
      refresh,
    }),
    [
      announcements,
      isLoading,
      unreadCount,
      claimUpdatesUnreadCount,
      markAsRead,
      markAllAsRead,
      markClaimUpdatesRead,
      refresh,
    ]
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
