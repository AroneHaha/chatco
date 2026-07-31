// lib/admin/services/monitoring.service.ts
//
// Frontend service for the admin live monitoring dashboard.
// Fetches the live fleet (vehicles with active shifts) from
// GET /api/admin/monitoring and exposes a 5-second polling hook.

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────

export type VehicleCapacity = "AVAILABLE" | "STANDING" | "FULL";

export interface FleetVehicle {
  id: string;
  unit_number: string;
  plate_number: string;
  vehicle_type: string | null;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  heading: number | null;
  capacity_status: VehicleCapacity;
  route_name: string | null;
  driver_name: string | null;
  conductor_name: string | null;
  last_update: string | null;
  minutes_since_update: number | null;
  is_on_break: boolean;
  break_started_at: string | null;
  /** False when the unit is on shift but has never posted a GPS ping. */
  has_gps: boolean;
  is_stale: boolean;
}

export interface MonitoringState {
  fleet: FleetVehicle[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

// ─── Fetch helper ─────────────────────────────────────────────────────

/**
 * Fetch the live fleet from /api/admin/monitoring.
 * Returns an array of FleetVehicle (vehicles with active shifts).
 * Throws on non-2xx or network failure.
 */
export async function getFleet(signal?: AbortSignal): Promise<FleetVehicle[]> {
  const res = await fetch("/api/admin/monitoring", {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Failed to fetch fleet (HTTP ${res.status})`);
  }

  const json = await res.json();
  return (json.data ?? []) as FleetVehicle[];
}

// ─── Polling hook ─────────────────────────────────────────────────────

/**
 * useFleetPoll — fetches the live fleet on mount and re-fetches every
 * `intervalMs` milliseconds (default 5000 = 5 seconds).
 *
 * - `isLoading` is true only on the very first fetch (full skeleton).
 * - `isRefreshing` is true on background polls (subtle indicator, no flicker).
 * - On error, the last successful fleet data is retained (not cleared).
 * - The interval is paused when the document is hidden (tab switched away).
 */
export function useFleetPoll(intervalMs: number = 5000): MonitoringState {
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchFleet = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await getFleet(controller.signal);
      setFleet(data);
      setError(null);
      setLastFetchedAt(new Date());
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load fleet");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();

    const intervalId = setInterval(() => {
      if (document.hidden) return;
      setIsRefreshing(true);
      fetchFleet();
    }, intervalMs);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        setIsRefreshing(true);
        fetchFleet();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      abortRef.current?.abort();
    };
  }, [fetchFleet, intervalMs]);

  return {
    fleet,
    isLoading,
    isRefreshing,
    error,
    lastFetchedAt,
    refetch: fetchFleet,
  };
}
