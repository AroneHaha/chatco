// contexts/admin-notifications-context.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { unreadCount as fetchUnreadCount, markAllRead as markAllAnnouncementsRead } from "@/lib/shared/services/announcement.service";

/** Matches the admin bell's poll cadence (see notification-bell.tsx). */
const POLL_INTERVAL_MS = 30_000;

/** Backend `type` for a conductor starting a new active shift (ShiftService::startShift). */
const SHIFT_STARTED_TYPES = ["SHIFT_STARTED"];

interface AdminNotificationsContextValue {
  /** Unread SHIFT_STARTED count — new active shifts the admin hasn't seen in Remittance yet. */
  remittanceBadgeCount: number;
  /** Marks every unread SHIFT_STARTED announcement read. Call when the Remittance module opens. */
  markRemittanceNotificationsRead: () => void;
}

const AdminNotificationsContext = createContext<AdminNotificationsContextValue | null>(null);

/**
 * Admin-side counterpart to the commuter `claimUpdatesUnreadCount` pattern
 * (contexts/announcements-context.tsx) — scoped to just the Remittance
 * module's "new active shift" badge. Rides the existing announcement
 * unread-count/mark-all-read endpoints; no separate tracking system.
 */
export function AdminNotificationsProvider({ children }: { children: ReactNode }) {
  const [remittanceBadgeCount, setRemittanceBadgeCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const count = await fetchUnreadCount({ types: SHIFT_STARTED_TYPES });
      setRemittanceBadgeCount(count);
    } catch {
      // Silent fail on poll — badge just keeps showing the last known count.
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount + poll, identical to notification-bell.tsx's
    // refreshCount effect. The setState only happens after `await`, so it's
    // genuinely async, not synchronous — this experimental lint rule doesn't
    // model that (see the identical, unflagged pattern in notification-bell.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const markRemittanceNotificationsRead = useCallback(() => {
    setRemittanceBadgeCount(0);
    void markAllAnnouncementsRead({ types: SHIFT_STARTED_TYPES }).finally(() => {
      void refresh();
    });
  }, [refresh]);

  return (
    <AdminNotificationsContext.Provider value={{ remittanceBadgeCount, markRemittanceNotificationsRead }}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}

export function useAdminNotifications(): AdminNotificationsContextValue {
  const ctx = useContext(AdminNotificationsContext);
  if (!ctx) throw new Error("useAdminNotifications must be used within AdminNotificationsProvider");
  return ctx;
}

/** "9" → "9", "10" → "9+" — the Remittance badge never shows a literal 2-digit count. */
export function formatAdminBadgeCount(count: number): string {
  return count >= 10 ? "9+" : String(count);
}
