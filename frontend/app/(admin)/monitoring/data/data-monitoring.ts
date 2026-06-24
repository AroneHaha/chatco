// app/(admin)/monitoring/data/data-monitoring.ts

import { useState, useEffect, useCallback } from "react";
import { Gauge, Clock, MapPin } from "lucide-react";

/* ─── INTERFACES (API Contracts — keep these) ─── */

export interface LiveVehicleTracking {
  unit: string;
  driver: string;
  speed: number;
  status: "normal" | "overspeeding" | "idle";
  zone: string;
}

export interface SosAlert {
  id: string;
  conductor: string;
  vehicle: string;
  message: string;
  time: string;
  triggeredDate: string;
  coordinates: [number, number];
}

export interface SosHistoryLog {
  id: string;
  conductor: string;
  vehicle: string;
  message: string;
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

// ─── S4-T11: Real Shift Log type (from backend) ────────────────────────

export interface ShiftLog {
  shift_id: string;
  conductor_name: string;
  driver_name: string;
  unit_number: string;
  plate_number: string;
  route_name: string | null;
  time_in: string;
  time_out: string | null;
  status: string; // ACTIVE | ENDED
  vehicle?: { unit_number: string; plate_number: string } | null;
  driver?: { first_name: string; last_name: string } | null;
  route?: { name: string } | null;
}

export interface MonitoringData {
  liveVehicles: LiveVehicleTracking[];
  sosAlerts: SosAlert[];
  sosHistory: SosHistoryLog[];
  overspeedHistory: OverspeedLog[];
  demandZones: DemandZone[];
  shiftLogs: ShiftLog[];
}

/* ─── DATA HOOK ─── */

export function useMonitoringData() {
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShiftLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shift-logs", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch shift logs");
      const json = await res.json();
      setShiftLogs(json.data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load monitoring data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShiftLogs();

    // Auto-poll every 10 seconds for real-time updates
    const interval = setInterval(() => {
      fetchShiftLogs();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchShiftLogs]);

  // Map shift logs to LiveVehicleTracking format for the existing UI
  const liveVehicles: LiveVehicleTracking[] = shiftLogs
    .filter((log) => log.status === "ACTIVE")
    .map((log) => ({
      unit: log.vehicle?.unit_number ?? log.unit_number,
      driver: log.driver?.first_name
        ? `${log.driver.first_name} ${log.driver.last_name}`
        : log.driver_name,
      speed: 0, // Speed not tracked in shift_logs; would come from vehicle_locations
      status: "normal" as const,
      zone: log.route?.name ?? log.route_name ?? "—",
    }));

  return {
    data: {
      liveVehicles,
      sosAlerts: [] as SosAlert[], // SOS not implemented yet
      sosHistory: [] as SosHistoryLog[],
      overspeedHistory: [] as OverspeedLog[],
      demandZones: [] as DemandZone[],
      shiftLogs,
    },
    isLoading,
    error,
    refetch: fetchShiftLogs,
  };
}