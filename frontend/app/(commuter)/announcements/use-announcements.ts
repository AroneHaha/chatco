// app/(commuter)/announcements/use-announcements.ts
//
// Sprint 6 (S6-T9) — commuter announcements hook, wired to the real backend.
//
//   list()    → GET /api/v1/announcements (ACTIVE feed with is_read flag)
//   markRead() → POST /api/v1/announcements/{id}/read (idempotent)
//
// State machine:
//   mount → fetch active feed → render top N in the rewards panel
//   click an unread item → markRead(id) → optimistic isRead=true →
//     401/404 → rollback
//
// The hook returns the SAME shape the rewards page already consumes
// ({ announcements, isLoading, markAsRead, markAllAsRead, unreadCount }) so
// the panel didn't need rewriting. The service's free-form `type` string is
// mapped to the canonical AnnouncementType ("SYSTEM"|"PROMO"|"MAINTENANCE"|
// "SAFETY") so the existing announcementConfig badge map keeps working.

import { useState, useEffect, useCallback } from "react";
import { Announcement as CanonicalAnnouncement, AnnouncementType } from "./types";
import {
  list as listAnnouncements,
  markRead as markAnnouncementRead,
  AnnouncementOperationError,
  type Announcement as ServiceAnnouncement,
} from "@/lib/shared/services/announcement.service";

/**
 * Map the backend's free-form `type` string (max 20, e.g. 'holiday', 'route',
 * 'system', 'safety', 'promo', 'maintenance') to one of the 4 canonical
 * AnnouncementType values the rewards panel's announcementConfig expects.
 */
function mapType(rawType: string): AnnouncementType {
  const t = (rawType ?? "").toLowerCase();
  if (["safety", "alert", "sos", "warning"].some((k) => t.includes(k))) {
    return "SAFETY";
  }
  if (["promo", "holiday", "reward", "deal"].some((k) => t.includes(k))) {
    return "PROMO";
  }
  if (["maintenance", "route", "schedule", "construction", "detour", "advisory"].some((k) => t.includes(k))) {
    return "MAINTENANCE";
  }
  return "SYSTEM";
}

/** Map a service Announcement → the canonical Announcement the UI consumes. */
function toCanonical(a: ServiceAnnouncement): CanonicalAnnouncement {
  return {
    id: a.id,
    type: mapType(a.type),
    title: a.title,
    message: a.message,
    createdAt: a.createdAt,
    isRead: a.isRead,
  };
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<CanonicalAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the active feed (ACTIVE announcements, newest first, with is_read).
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listAnnouncements({ perPage: 15 });
      setAnnouncements(result.items.map(toCanonical));
    } catch (err) {
      // Silent fail — the panel shows an empty state. A 401 here means the
      // session expired; the global auth redirect handles it.
      if (err instanceof AnnouncementOperationError && err.code === "unauthenticated") {
        setAnnouncements([]);
      } else {
        setAnnouncements([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Mark a single announcement as read (real backend call + optimistic update).
  const markAsRead = useCallback((id: string) => {
    // Optimistic: flip isRead locally so the UI reacts instantly.
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
    );
    // Fire-and-forget the backend call; rollback on failure.
    markAnnouncementRead(id).catch(() => {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: false } : a))
      );
    });
  }, []);

  // Mark all loaded announcements as read (iterate the backend calls).
  const markAllAsRead = useCallback(() => {
    const targets = announcements.filter((a) => !a.isRead);
    if (targets.length === 0) return;
    // Optimistic: flip all to read.
    const targetIds = new Set(targets.map((t) => t.id));
    setAnnouncements((prev) =>
      prev.map((a) => (targetIds.has(a.id) ? { ...a, isRead: true } : a))
    );
    // Fire-and-forget; rollback the failed ones only.
    Promise.allSettled(targets.map((t) => markAnnouncementRead(t.id))).then((results) => {
      const failedIds = new Set(
        results
          .map((r, i) => (r.status === "rejected" ? targets[i].id : null))
          .filter((id): id is string => id !== null)
      );
      if (failedIds.size > 0) {
        setAnnouncements((prev) =>
          prev.map((a) => (failedIds.has(a.id) ? { ...a, isRead: false } : a))
        );
      }
    });
  }, [announcements]);

  const unreadCount = announcements.filter((a) => !a.isRead).length;

  return { announcements, isLoading, markAsRead, markAllAsRead, unreadCount };
}
