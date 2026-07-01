// src/app/(admin)/monitoring/data/data-monitoring.ts
//
// Monitoring data hook.
//
// SOS alerts + history are now REAL (polling /api/admin/sos). The rest
// (live vehicles, demand zones, overspeed history) remains mock for now —
// those are out of scope for the SOS fix and will be wired when the
// corresponding backend endpoints land.

import { useState, useEffect, useCallback, useRef } from "react";

/* ─── INTERFACES (API contracts) ─── */

export interface LiveVehicleTracking {
  unit: string;
  driver: string;
  speed: number;
  status: "normal" | "overspeeding" | "idle";
  zone: string;
}

export interface SosAlert {
  id: string;
  commuter: string;
  message: string;
  time: string;
  triggeredDate: string;
  coordinates: [number, number];
  approximate: boolean;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface SosHistoryLog {
  id: string;
  commuter: string;
  message: string;
  triggeredAt: string;
  resolvedAt: string;
  triggeredDate: string;
  coordinates: [number, number];
  approximate: boolean;
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
  liveVehicles: LiveVehicleTracking[];
  sosAlerts: SosAlert[];
  sosHistory: SosHistoryLog[];
  overspeedHistory: OverspeedLog[];
  demandZones: DemandZone[];
}

/* ─── MOCK DATA (non-SOS — still mock until those endpoints land) ─── */

const MOCK_LIVE_VEHICLES: LiveVehicleTracking[] = [
  { unit: "XQJ 4728", driver: "Mhaku Jose Manalili", speed: 28, status: "normal", zone: "Malolos" },
  { unit: "VMY 9183", driver: "Mark Arone Dela Cruz", speed: 62, status: "overspeeding", zone: "Malolos–Meycauayan" },
  { unit: "RZP 6041", driver: "Rod Erick Dulalia", speed: 25, status: "normal", zone: "Meycauayan" },
  { unit: "LKW 3579", driver: "Marinel Carbonel", speed: 0, status: "idle", zone: "Meycauayan" },
  { unit: "TNB 8462", driver: "Nardong Putik", speed: 68, status: "overspeeding", zone: "Meycauayan–Calumpit" },
  { unit: "JHX 7905", driver: "Karding Dela Paz", speed: 30, status: "normal", zone: "Calumpit" },
  { unit: "PVR 6894", driver: "Nikola Tekla", speed: 27, status: "normal", zone: "Calumpit" },
  { unit: "QFD 2316", driver: "Alden Recharge", speed: 32, status: "normal", zone: "Malolos–Meycauayan" },
];

const MOCK_OVERSPEED_HISTORY: OverspeedLog[] = [
  { id: "ov-001", unit: "VMY 9183", driver: "Mark Arone Dela Cruz", speed: 72, zone: "Malolos–Meycauayan", loggedAt: "Nov 15, 2023 - 09:12 AM", loggedDate: "2023-11-15" },
  { id: "ov-002", unit: "TNB 8462", driver: "Nardong Putik", speed: 68, zone: "Meycauayan–Calumpit", loggedAt: "Nov 14, 2023 - 04:30 PM", loggedDate: "2023-11-14" },
  { id: "ov-003", unit: "VMY 9183", driver: "Mark Arone Dela Cruz", speed: 65, zone: "Calumpit", loggedAt: "Nov 10, 2023 - 08:45 AM", loggedDate: "2023-11-10" },
];

const MOCK_DEMAND_ZONES: DemandZone[] = [
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

interface BackendAlert {
  id: string;
  commuterId: string;
  commuterName: string;
  lat: number;
  lng: number;
  approximate: boolean;
  message: string | null;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

function mapAlert(raw: BackendAlert): SosAlert {
  return {
    id: raw.id,
    commuter: raw.commuterName,
    message: raw.message ?? "Emergency SOS triggered by commuter.",
    time: formatRelativeTime(raw.createdAt),
    triggeredDate: dateKey(raw.createdAt),
    coordinates: [raw.lat, raw.lng],
    approximate: raw.approximate ?? false,
    status: raw.status,
    acknowledgedAt: raw.acknowledgedAt,
    createdAt: raw.createdAt,
  };
}

function mapHistory(raw: BackendAlert): SosHistoryLog {
  return {
    id: raw.id,
    commuter: raw.commuterName,
    message: raw.message ?? "Emergency SOS triggered by commuter.",
    triggeredAt: formatAbsoluteTime(raw.createdAt),
    resolvedAt: raw.resolvedAt ? formatAbsoluteTime(raw.resolvedAt) : "—",
    triggeredDate: dateKey(raw.createdAt),
    coordinates: [raw.lat, raw.lng],
    approximate: raw.approximate ?? false,
  };
}

/* ─── DATA HOOK ─── */

const POLL_INTERVAL_MS = 5000;

export function useMonitoringData() {
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
  const [sosHistory, setSosHistory] = useState<SosHistoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track in-flight resolves/acknowledges so the poll doesn't clobber an
  // optimistic update with stale server data.
  const resolvingIds = useRef<Set<string>>(new Set());

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sos?status=ACTIVE", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const mapped: SosAlert[] = (data.alerts as BackendAlert[])
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
      const res = await fetch("/api/admin/sos?status=RESOLVED", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setSosHistory((data.alerts as BackendAlert[]).map(mapHistory));
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

  const acknowledgeSos = useCallback(async (alertId: string) => {
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
  }, [fetchActive]);

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
    liveVehicles: MOCK_LIVE_VEHICLES,
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
