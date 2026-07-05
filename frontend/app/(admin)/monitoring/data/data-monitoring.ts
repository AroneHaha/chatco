// app/(admin)/monitoring/data/data-monitoring.ts
//
// Sprint 6 (S6-T10) — admin monitoring data.
//
// SOS alerts + history are now REAL (polling /api/admin/sos → Laravel
// GET /api/v1/admin/sos). The rest (overspeed history, demand zones) remains
// mock — those endpoints don't exist yet and are out of scope for the SOS fix.
//
// The live fleet (vehicles with active shifts) is fetched separately by
// useFleetPoll() in lib/admin/services/monitoring.service.ts — that hook
// polls /api/admin/monitoring and is unaffected by this file.

import { useState, useEffect, useCallback, useRef } from "react";

/* ─── INTERFACES (API contracts) ─── */

export type SosSenderRole = "COMMUTER" | "CONDUCTOR";

export interface SosAlert {
  id: string;
  /** Display name of whoever raised the alert (commuter OR conductor). */
  sender: string;
  senderRole: SosSenderRole;
  note: string;
  time: string;
  triggeredDate: string;
  coordinates: [number, number];
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface SosHistoryLog {
  id: string;
  sender: string;
  senderRole: SosSenderRole;
  note: string;
  triggeredAt: string;
  resolvedAt: string;
  triggeredDate: string;
  coordinates: [number, number];
}

export interface OverspeedLog {
  id: string;
  unit: string;
  driver: string;
  speed: number;
  zone: string;
  loggedAt: string;
  loggedDate: string;
}

export interface DemandZone {
  id: string;
  coords: [number, number];
  radiusMeters: number;
  commuterCount: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
}

export interface MonitoringData {
  sosAlerts: SosAlert[];
  sosHistory: SosHistoryLog[];
  overspeedHistory: OverspeedLog[];
  demandZones: DemandZone[];
}

/* ─── MOCK DATA (non-SOS — still mock until those endpoints land) ─── */

export const MOCK_OVERSPEED_HISTORY: OverspeedLog[] = [
  { id: "ov-001", unit: "VMY 9183", driver: "Mark Arone Dela Cruz", speed: 72, zone: "Malolos–Meycauayan", loggedAt: "Nov 15, 2023 - 09:12 AM", loggedDate: "2023-11-15" },
  { id: "ov-002", unit: "TNB 8462", driver: "Nardong Putik", speed: 68, zone: "Meycauayan–Calumpit", loggedAt: "Nov 14, 2023 - 04:30 PM", loggedDate: "2023-11-14" },
  { id: "ov-003", unit: "VMY 9183", driver: "Mark Arone Dela Cruz", speed: 65, zone: "Calumpit", loggedAt: "Nov 10, 2023 - 08:45 AM", loggedDate: "2023-11-10" },
];

export const MOCK_DEMAND_ZONES: DemandZone[] = [
  { id: "zone-1", coords: [14.88645, 120.78596], radiusMeters: 400, commuterCount: 120, intensity: "HIGH" },
  { id: "zone-2", coords: [14.84941, 120.82352], radiusMeters: 300, commuterCount: 85, intensity: "MEDIUM" },
  { id: "zone-3", coords: [14.81816, 120.906], radiusMeters: 500, commuterCount: 150, intensity: "HIGH" },
  { id: "zone-4", coords: [14.77813, 120.93709], radiusMeters: 250, commuterCount: 40, intensity: "LOW" },
  { id: "zone-5", coords: [14.743, 120.95912], radiusMeters: 350, commuterCount: 95, intensity: "MEDIUM" },
];

/* ─── HELPERS ─── */

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function dateKey(iso: string): string {
  return new Date(iso).toISOString().split("T")[0];
}

/* ─── BACKEND → FRONTEND MAPPERS ─── */

interface BackendCommuter {
  first_name: string | null;
  middle_name: string | null;
  surname: string | null;
}

interface BackendConductor {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
}

interface BackendAlert {
  id: string;
  sender_role?: "COMMUTER" | "CONDUCTOR" | null;
  commuter_id: string | null;
  conductor_id?: string | null;
  lat: string | number;
  lng: string | number;
  note: string | null;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  commuter: BackendCommuter | null;
  conductor?: BackendConductor | null;
}

/** Resolve the sender's role, defaulting to COMMUTER for legacy rows. */
function senderRole(raw: BackendAlert): SosSenderRole {
  return raw.sender_role === "CONDUCTOR" ? "CONDUCTOR" : "COMMUTER";
}

/** Resolve the sender's display name (commuter uses surname, conductor last_name). */
function senderName(raw: BackendAlert): string {
  if (senderRole(raw) === "CONDUCTOR") {
    const c = raw.conductor;
    const parts = c ? [c.first_name, c.last_name].filter(Boolean) : [];
    return parts.length > 0 ? parts.join(" ").trim() : "Unknown Conductor";
  }
  const c = raw.commuter;
  const parts = c ? [c.first_name, c.surname].filter(Boolean) : [];
  return parts.length > 0 ? parts.join(" ").trim() : "Unknown Commuter";
}

function defaultNote(raw: BackendAlert): string {
  return senderRole(raw) === "CONDUCTOR"
    ? "Emergency SOS triggered by conductor."
    : "Emergency SOS triggered by commuter.";
}

function mapAlert(raw: BackendAlert): SosAlert {
  return {
    id: raw.id,
    sender: senderName(raw),
    senderRole: senderRole(raw),
    note: raw.note ?? defaultNote(raw),
    time: formatRelativeTime(raw.created_at),
    triggeredDate: dateKey(raw.created_at),
    coordinates: [parseFloat(String(raw.lat)), parseFloat(String(raw.lng))],
    status: raw.status,
    acknowledgedAt: raw.acknowledged_at,
    createdAt: raw.created_at,
  };
}

function mapHistory(raw: BackendAlert): SosHistoryLog {
  return {
    id: raw.id,
    sender: senderName(raw),
    senderRole: senderRole(raw),
    note: raw.note ?? defaultNote(raw),
    triggeredAt: formatAbsoluteTime(raw.created_at),
    resolvedAt: raw.resolved_at ? formatAbsoluteTime(raw.resolved_at) : "—",
    triggeredDate: dateKey(raw.created_at),
    coordinates: [parseFloat(String(raw.lat)), parseFloat(String(raw.lng))],
  };
}

/* ─── DATA HOOK ─── */

const POLL_INTERVAL_MS = 5000;

export function useMonitoringData() {
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
  const [sosHistory, setSosHistory] = useState<SosHistoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track in-flight resolves so the poll doesn't clobber an optimistic update
  // with stale server data before the PATCH lands.
  const resolvingIds = useRef<Set<string>>(new Set());

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sos?status=ACTIVE&per_page=100", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawAlerts = (data.data ?? []) as BackendAlert[];
      const mapped = rawAlerts
        .filter((a) => !resolvingIds.current.has(a.id))
        .map(mapAlert);
      setSosAlerts(mapped);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SOS alerts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sos?status=RESOLVED&per_page=50", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      const rawAlerts = (data.data ?? []) as BackendAlert[];
      setSosHistory(rawAlerts.map(mapHistory));
    } catch {
      // History is best-effort on poll; don't surface as a hard error.
    }
  }, []);

  // Initial fetch + polling.
  useEffect(() => {
    void Promise.all([fetchActive(), fetchHistory()]);
    const id = setInterval(() => {
      void fetchActive();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchActive, fetchHistory]);

  // ── Actions ──

  const acknowledgeSos = useCallback(
    async (alertId: string) => {
      // Optimistic: flip status locally so the UI reacts instantly.
      setSosAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, status: "ACKNOWLEDGED" as const, acknowledgedAt: new Date().toISOString() }
            : a
        )
      );
      try {
        const res = await fetch(`/api/admin/sos/${alertId}/acknowledge`, {
          method: "PATCH",
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? "Failed to acknowledge SOS.");
        }
        // Re-sync from server.
        void fetchActive();
      } catch (err) {
        // Rollback: refetch authoritative state.
        void fetchActive();
        setError(err instanceof Error ? err.message : "Failed to acknowledge SOS.");
      }
    },
    [fetchActive]
  );

  const resolveSos = useCallback(
    async (alertId: string) => {
      // Mark as resolving so the next poll doesn't resurrect it before the
      // server has processed the PATCH.
      resolvingIds.current.add(alertId);
      // Optimistic: remove from active list immediately.
      setSosAlerts((prev) => prev.filter((a) => a.id !== alertId));
      try {
        const res = await fetch(`/api/admin/sos/${alertId}/resolve`, {
          method: "PATCH",
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? "Failed to resolve SOS.");
        }
        // Pull the resolved alert into history.
        void fetchHistory();
        void fetchActive();
      } catch (err) {
        // Rollback: refetch both lists.
        resolvingIds.current.delete(alertId);
        void fetchActive();
        void fetchHistory();
        setError(err instanceof Error ? err.message : "Failed to resolve SOS.");
      } finally {
        resolvingIds.current.delete(alertId);
      }
    },
    [fetchActive, fetchHistory]
  );

  const data: MonitoringData = {
    sosAlerts,
    sosHistory,
    overspeedHistory: MOCK_OVERSPEED_HISTORY,
    demandZones: MOCK_DEMAND_ZONES,
  };

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      void fetchActive();
      void fetchHistory();
    },
    acknowledgeSos,
    resolveSos,
  };
}
