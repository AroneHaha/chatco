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
  resolvedBy: string | null;
  status: "RESOLVED" | "CANCELLED";
  triggeredDate: string;
  coordinates: [number, number];
}

export interface OverspeedLog {
  id: string;
  unit: string;
  driver: string;
  conductor: string;
  speed: number;
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
  sosHistoryTotal: number;
  sosHistoryLastPage: number;
  overspeedHistory: OverspeedLog[];
  overspeedTotal: number;
  overspeedLastPage: number;
  demandZones: DemandZone[];
}

export type SafetyHistorySort = "recent" | "oldest";
export type SosHistoryOutcome = "ALL" | "RESOLVED" | "CANCELLED";

/** One server-side page of SOS History; filtered and paginated in SQL. */
export interface SosHistoryQuery {
  page: number;
  date: string;
  outcome: SosHistoryOutcome;
}

export const SOS_HISTORY_PER_PAGE = 10;
const DEFAULT_SOS_HISTORY_QUERY: SosHistoryQuery = { page: 1, date: "", outcome: "ALL" };

/* ─── MOCK DATA removed — overspeed now fetched from real API ─── */
/* Demand zones require commuter location tracking which doesn't exist yet —
   returns empty array until that feature is built. */

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
  // Use the same local calendar day as the date picker and displayed timestamps.
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
  resolver?: {
    email: string;
    admin_profile: { first_name: string | null; last_name: string | null } | null;
  } | null;
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
  const senderId = senderRole(raw) === "CONDUCTOR" ? raw.conductor_id : raw.commuter_id;
  const isCancelled = raw.resolved_by != null && raw.resolved_by === senderId;
  const adminName = raw.resolver?.admin_profile
    ? [raw.resolver.admin_profile.first_name, raw.resolver.admin_profile.last_name].filter(Boolean).join(" ").trim()
    : "";
  return {
    id: raw.id,
    sender: senderName(raw),
    senderRole: senderRole(raw),
    note: raw.note ?? defaultNote(raw),
    triggeredAt: formatAbsoluteTime(raw.created_at),
    resolvedAt: raw.resolved_at ? formatAbsoluteTime(raw.resolved_at) : "—",
    resolvedBy: isCancelled ? null : adminName || raw.resolver?.email || null,
    status: isCancelled ? "CANCELLED" : "RESOLVED",
    triggeredDate: dateKey(raw.created_at),
    coordinates: [parseFloat(String(raw.lat)), parseFloat(String(raw.lng))],
  };
}

/* ─── DATA HOOK ─── */

const POLL_INTERVAL_MS = 5000;

export function useMonitoringData(
  overspeedPage = 1,
  overspeedDate = "",
  historySort: SafetyHistorySort = "recent",
  sosHistoryQuery: SosHistoryQuery = DEFAULT_SOS_HISTORY_QUERY,
) {
  const { page: sosHistoryPage, date: sosHistoryDate, outcome: sosHistoryOutcome } = sosHistoryQuery;
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
  const [sosHistory, setSosHistory] = useState<SosHistoryLog[]>([]);
  const [sosHistoryTotal, setSosHistoryTotal] = useState(0);
  const [sosHistoryLastPage, setSosHistoryLastPage] = useState(1);
  const [overspeedHistory, setOverspeedHistory] = useState<OverspeedLog[]>([]);
  const [overspeedTotal, setOverspeedTotal] = useState(0);
  const [overspeedLastPage, setOverspeedLastPage] = useState(1);
  const [demandZones, setDemandZones] = useState<DemandZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track in-flight resolves so the poll doesn't clobber an optimistic update
  // with stale server data before the PATCH lands.
  const resolvingIds = useRef<Set<string>>(new Set());
  const closedIds = useRef<Set<string>>(new Set());
  const activeRequestId = useRef(0);
  const historyRequestId = useRef(0);
  const overspeedRequestId = useRef(0);
  const retryAtRef = useRef(0);

  const requestMonitoring = useCallback(async (url: string) => {
    if (Date.now() < retryAtRef.current) return null;
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    if (res.status === 429) {
      const retrySeconds = Number(res.headers.get("Retry-After")) || 60;
      retryAtRef.current = Date.now() + Math.max(1, retrySeconds) * 1000;
    }
    return res;
  }, []);

  const fetchActive = useCallback(async () => {
    const requestId = ++activeRequestId.current;
    try {
      const res = await requestMonitoring("/api/admin/sos?status=ACTIVE&per_page=100");
      if (!res) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (requestId !== activeRequestId.current) return;
      const rawAlerts = (data.data ?? []) as BackendAlert[];
      const mapped = rawAlerts
        .filter((a) => (a.status === "ACTIVE" || a.status === "ACKNOWLEDGED")
          && !resolvingIds.current.has(a.id) && !closedIds.current.has(a.id))
        .map(mapAlert);
      setSosAlerts(mapped);
      setError(null);
    } catch (err) {
      if (requestId !== activeRequestId.current) return;
      setError(err instanceof Error ? err.message : "Failed to load SOS alerts.");
    } finally {
      if (requestId === activeRequestId.current) setIsLoading(false);
    }
  }, [requestMonitoring]);

  const fetchHistory = useCallback(async () => {
    const requestId = ++historyRequestId.current;
    try {
      // Date, outcome and sort are applied in SQL across all history, not
      // within one fetched batch, so an older day, a narrow filter or
      // "Oldest first" still finds every match and the totals are exact.
      const params = new URLSearchParams({
        status: "RESOLVED",
        page: String(sosHistoryPage),
        per_page: String(SOS_HISTORY_PER_PAGE),
        sort: historySort,
      });
      if (sosHistoryDate) params.set("date", sosHistoryDate);
      if (sosHistoryOutcome !== "ALL") params.set("outcome", sosHistoryOutcome);
      const res = await requestMonitoring(`/api/admin/sos?${params}`);
      if (!res) return;
      if (!res.ok) return;
      const data = await res.json();
      if (requestId !== historyRequestId.current) return;
      const rawAlerts = ((data.data ?? []) as BackendAlert[]).filter((a) => a.status === "RESOLVED");
      // A closed alert stays out of attention even if an older live response lands later.
      rawAlerts.forEach((a) => closedIds.current.add(a.id));
      setSosAlerts((prev) => prev.filter((a) => !closedIds.current.has(a.id)));
      setSosHistory(rawAlerts.map(mapHistory));
      setSosHistoryTotal(Number(data.meta?.total ?? rawAlerts.length));
      setSosHistoryLastPage(Math.max(1, Number(data.meta?.last_page ?? 1)));
    } catch {
      // History is best-effort on poll; don't surface as a hard error.
    }
  }, [historySort, requestMonitoring, sosHistoryDate, sosHistoryOutcome, sosHistoryPage]);

  const fetchOverspeed = useCallback(async () => {
    const requestId = ++overspeedRequestId.current;
    try {
      const params = new URLSearchParams({ page: String(overspeedPage), per_page: "10", sort: historySort });
      if (overspeedDate) params.set("date", overspeedDate);
      const res = await requestMonitoring(`/api/admin/monitoring/overspeed?${params}`);
      if (!res) return;
      if (!res.ok) return;
      const data = await res.json();
      if (requestId !== overspeedRequestId.current) return;
      const paginator = data.data ?? {};
      const raw = (paginator.data ?? []) as Array<{
        id: string; unit: string; plate: string; speed: number;
        driver: string | null; conductor: string | null;
        date: string | null; last_update: string | null;
      }>;
      const mapped: OverspeedLog[] = raw.map(v => ({
        id: v.id,
        // Unit identified by plate number (per requirement), falling back to unit no.
        unit: v.plate ?? v.unit ?? '—',
        driver: v.driver ?? '—',
        conductor: v.conductor ?? '—',
        speed: v.speed,
        loggedAt: v.last_update ? formatRelativeTime(v.last_update) : '—',
        loggedDate: v.date ?? (v.last_update ? new Date(v.last_update).toISOString().split('T')[0] : ''),
      }));
      setOverspeedHistory(mapped);
      setOverspeedTotal(Number(paginator.total ?? mapped.length));
      setOverspeedLastPage(Number(paginator.last_page ?? 1));
    } catch {
      // Overspeed is best-effort
    }
  }, [historySort, overspeedDate, overspeedPage, requestMonitoring]);

  const fetchDemandZones = useCallback(async () => {
    try {
      const res = await requestMonitoring("/api/admin/monitoring/demand-zones");
      if (!res) return;
      if (!res.ok) return;
      const body = await res.json();
      const raw = (body.data ?? []) as Array<{
        id: string;
        lat: number | string;
        lng: number | string;
        commuter_count: number;
        intensity: "LOW" | "MEDIUM" | "HIGH";
        radius_meters: number;
      }>;
      setDemandZones(raw.map((zone) => ({
        id: zone.id,
        coords: [Number(zone.lat), Number(zone.lng)],
        commuterCount: zone.commuter_count,
        intensity: zone.intensity,
        radiusMeters: zone.radius_meters,
      })));
    } catch {
      // Demand overlay is best-effort; other monitoring remains live.
    }
  }, [requestMonitoring]);

  // Pagination/date changes fetch only the affected feed, without restarting
  // the SOS/demand polling loop or refetching its unrelated endpoints.
  const fetchOverspeedRef = useRef(fetchOverspeed);
  useEffect(() => {
    fetchOverspeedRef.current = fetchOverspeed;
    void fetchOverspeed();
  }, [fetchOverspeed]);
  const fetchHistoryRef = useRef(fetchHistory);
  useEffect(() => {
    fetchHistoryRef.current = fetchHistory;
    void fetchHistory();
  }, [fetchHistory]);

  // Initial fetch + polling. Coalesce focus/online/visibility events and let
  // slow refreshes finish before issuing the next batch.
  useEffect(() => {
    let inFlight = false;
    let lastRefreshAt = 0;
    // The filtered history feeds already fetched on mount via their own
    // effects, so the first pass skips them.
    const refreshAll = (includeHistoryFeeds = true) => {
      if (document.visibilityState !== "visible") return;
      if (inFlight || Date.now() - lastRefreshAt < 1000) return;
      inFlight = true;
      lastRefreshAt = Date.now();
      void Promise.all([
        fetchActive(), fetchDemandZones(),
        ...(includeHistoryFeeds ? [fetchHistoryRef.current(), fetchOverspeedRef.current()] : []),
      ]).finally(() => { inFlight = false; });
    };

    refreshAll(false);
    const onRefresh = () => refreshAll();
    const id = setInterval(onRefresh, POLL_INTERVAL_MS);
    window.addEventListener("focus", onRefresh);
    window.addEventListener("online", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);

    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("online", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
    };
  }, [fetchActive, fetchDemandZones]);

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
        closedIds.current.add(alertId);
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
    sosHistoryTotal,
    sosHistoryLastPage,
    overspeedHistory,
    overspeedTotal,
    overspeedLastPage,
    demandZones,
  };

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      void fetchActive();
      void fetchHistory();
      void fetchOverspeed();
      void fetchDemandZones();
    },
    acknowledgeSos,
    resolveSos,
  };
}
