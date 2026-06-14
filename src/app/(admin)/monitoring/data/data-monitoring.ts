// app/(admin)/monitoring/data/data-monitoring.ts

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

export interface MonitoringData {
  liveVehicles: LiveVehicleTracking[];
  sosAlerts: SosAlert[];
  sosHistory: SosHistoryLog[];
  overspeedHistory: OverspeedLog[];
  demandZones: DemandZone[];
}

/* ─── CONSOLIDATED MOCK DATA (delete when API is ready) ─── */

export const MOCK_MONITORING_DATA: MonitoringData = {
  liveVehicles: [
    { unit: "XQJ 4728", driver: "Mhaku Jose Manalili", speed: 28, status: "normal", zone: "Malolos" },
    { unit: "VMY 9183", driver: "Mark Arone Dela Cruz", speed: 62, status: "overspeeding", zone: "Malolos–Meycauayan" },
    { unit: "RZP 6041", driver: "Rod Erick Dulalia", speed: 25, status: "normal", zone: "Meycauayan" },
    { unit: "LKW 3579", driver: "Marinel Carbonel", speed: 0, status: "idle", zone: "Meycauayan" },
    { unit: "TNB 8462", driver: "Nardong Putik", speed: 68, status: "overspeeding", zone: "Meycauayan–Calumpit" },
    { unit: "JHX 7905", driver: "Karding Dela Paz", speed: 30, status: "normal", zone: "Calumpit" },
    { unit: "PVR 6894", driver: "Nikola Tekla", speed: 27, status: "normal", zone: "Calumpit" },
    { unit: "QFD 2316", driver: "Alden Recharge", speed: 32, status: "normal", zone: "Malolos–Meycauayan" },
  ],

  sosAlerts: [], // Populated dynamically in useMonitoringData with today's date

  sosHistory: [
    { id: "sos-old-001", conductor: "Mario Speedwagon", vehicle: "DEF-456", message: "Panic button triggered by conductor!", triggeredAt: "Oct 24, 2023 - 10:15 AM", resolvedAt: "Oct 24, 2023 - 10:22 AM", triggeredDate: "2023-10-24", coordinates: [14.598, 120.983] },
    { id: "sos-old-002", conductor: "Crisostomo Ibarra", vehicle: "GHI-789", message: "Medical emergency reported.", triggeredAt: "Oct 23, 2023 - 02:40 PM", resolvedAt: "Oct 23, 2023 - 03:10 PM", triggeredDate: "2023-10-23", coordinates: [14.601, 120.986] },
    { id: "sos-old-003", conductor: "Sisa Doe", vehicle: "JKL-012", message: "Panic button triggered by conductor!", triggeredAt: "Oct 22, 2023 - 08:05 AM", resolvedAt: "Oct 22, 2023 - 08:12 AM", triggeredDate: "2023-10-22", coordinates: [14.597, 120.981] },
  ],

  overspeedHistory: [
    { id: "ov-001", unit: "VMY 9183", driver: "Mark Arone Dela Cruz", speed: 72, zone: "Malolos–Meycauayan", loggedAt: "Nov 15, 2023 - 09:12 AM", loggedDate: "2023-11-15" },
    { id: "ov-002", unit: "TNB 8462", driver: "Nardong Putik", speed: 68, zone: "Meycauayan–Calumpit", loggedAt: "Nov 14, 2023 - 04:30 PM", loggedDate: "2023-11-14" },
    { id: "ov-003", unit: "VMY 9183", driver: "Mark Arone Dela Cruz", speed: 65, zone: "Calumpit", loggedAt: "Nov 10, 2023 - 08:45 AM", loggedDate: "2023-11-10" },
  ],

  demandZones: [
    { id: "zone-1", coords: [14.88645, 120.78596], radiusMeters: 400, commuterCount: 120, intensity: "HIGH" },
    { id: "zone-2", coords: [14.84941, 120.82352], radiusMeters: 300, commuterCount: 85, intensity: "MEDIUM" },
    { id: "zone-3", coords: [14.81816, 120.906], radiusMeters: 500, commuterCount: 150, intensity: "HIGH" },
    { id: "zone-4", coords: [14.77813, 120.93709], radiusMeters: 250, commuterCount: 40, intensity: "LOW" },
    { id: "zone-5", coords: [14.743, 120.95912], radiusMeters: 350, commuterCount: 95, intensity: "MEDIUM" },
  ],
};

/* ─── DATA HOOK ─── */

export function useMonitoringData() {
  // TODO: Replace MOCK_MONITORING_DATA with API call
  // e.g. const { data, isLoading, error } = useSWR('/api/admin/monitoring', fetcher);

  const today = new Date().toISOString().split("T")[0];

  // Inject a live SOS alert for demo purposes (remove when API is ready)
  const liveSosAlerts: SosAlert[] = [
    {
      id: "sos-001",
      conductor: "Juan Dela Cruz",
      vehicle: "ABC-123",
      message: "Panic button triggered by conductor!",
      time: "Just now",
      triggeredDate: today,
      coordinates: [14.5995, 120.9842],
    },
  ];

  return {
    data: {
      ...MOCK_MONITORING_DATA,
      sosAlerts: liveSosAlerts,
    },
    isLoading: false,
    error: null as string | null,
    refetch: () => {
      // TODO: trigger SWR mutate or refetch
    },
  };
}