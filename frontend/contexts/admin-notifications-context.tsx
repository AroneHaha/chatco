// contexts/admin-notifications-context.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { unreadCount as fetchUnreadCount, markAllRead as markAllAnnouncementsRead } from "@/lib/shared/services/announcement.service";

/** Matches the admin bell's poll cadence (see notification-bell.tsx). */
const POLL_INTERVAL_MS = 30_000;

/**
 * Backend `type`s that count toward the Remittance nav badge: a conductor
 * starting a new active shift (ShiftService::startShift) and a shift's
 * remittance reaching a terminal state (ShiftCloseoutService) — both are
 * "new activity in the Remittance module" the admin hasn't looked at yet.
 */
const REMITTANCE_MODULE_TYPES = ["SHIFT_STARTED", "REMITTANCE_COMPLETED"];

/**
 * Backend `type`s that count toward the Monitoring nav badge: an SOS firing
 * (SosService::notifySosToAdmins) and a new overspeeding episode starting
 * (LocationService::recordOverspeedAtomic) — both are "new activity in
 * Monitoring" the admin hasn't looked at yet.
 */
const MONITORING_MODULE_TYPES = ["SOS_TRIGGERED", "OVERSPEED_FLAGGED"];

interface ModuleBadge {
  /** Unread count for this module's notification types. */
  count: number;
  /** Marks every unread notification in this module's types read. Call when the module opens. */
  markRead: () => void;
}

interface AdminNotificationsContextValue {
  remittance: ModuleBadge;
  monitoring: ModuleBadge;
}

const AdminNotificationsContext = createContext<AdminNotificationsContextValue | null>(null);

/**
 * Polls unread-count for one set of announcement types and exposes a
 * mark-all-read for them — the shared logic behind every module badge below.
 * Fetch-on-mount + poll, identical to notification-bell.tsx's refreshCount
 * effect. The setState only happens after `await`, so it's genuinely async,
 * not synchronous — this experimental lint rule doesn't model that (see the
 * identical, unflagged pattern in notification-bell.tsx).
 */
function useModuleBadge(types: string[]): ModuleBadge {
  const [count, setCount] = useState(0);
  // Bumped on every refresh() call and by markRead(). A refresh() only
  // commits its result if it's still the most recent one in flight — without
  // this, the provider's own mount/30s-poll refresh() can land *after*
  // markRead()'s optimistic setCount(0) but *before* its mark-all-read
  // request finishes server-side, restamping the badge with the still-unread
  // count it just fetched (and, on a slow network, that stale response can
  // even resolve after markRead's own follow-up refresh, leaving the badge
  // wrong until the next 30s poll). Opening the module (e.g. landing
  // directly on /remittance) mounts the provider and the page in the same
  // pass, so this race isn't rare — this is what made the nav badge look
  // like it doesn't clear on click.
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const result = await fetchUnreadCount({ types });
      if (requestId === requestIdRef.current) {
        setCount(result);
      }
    } catch {
      // Silent fail on poll — badge just keeps showing the last known count.
    }
    // types is a module-level constant array — safe to omit from deps
    // (an inline array literal would otherwise re-create this callback,
    // and the effect below, on every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const markRead = useCallback(() => {
    // Invalidate any refresh() already in flight so it can't clobber the
    // optimistic zero below with a stale (pre-mark-all-read) count.
    requestIdRef.current++;
    setCount(0);
    void markAllAnnouncementsRead({ types }).finally(() => {
      void refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  return { count, markRead };
}

/**
 * Admin-side counterpart to the commuter `claimUpdatesUnreadCount` pattern
 * (contexts/announcements-context.tsx) — one badge per module (Remittance,
 * Monitoring). Rides the existing announcement unread-count/mark-all-read
 * endpoints; no separate tracking system.
 */
export function AdminNotificationsProvider({ children }: { children: ReactNode }) {
  const remittance = useModuleBadge(REMITTANCE_MODULE_TYPES);
  const monitoring = useModuleBadge(MONITORING_MODULE_TYPES);

  return (
    <AdminNotificationsContext.Provider value={{ remittance, monitoring }}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}

export function useAdminNotifications(): AdminNotificationsContextValue {
  const ctx = useContext(AdminNotificationsContext);
  if (!ctx) throw new Error("useAdminNotifications must be used within AdminNotificationsProvider");
  return ctx;
}

/** "9" → "9", "10" → "9+" — a module badge never shows a literal 2-digit count. */
export function formatAdminBadgeCount(count: number): string {
  return count >= 10 ? "9+" : String(count);
}
