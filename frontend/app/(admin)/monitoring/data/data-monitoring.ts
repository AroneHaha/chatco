// app/(admin)/monitoring/data/data-monitoring.ts
//
// Admin Monitoring data layer.
// All mock data removed. Data is fetched from the Laravel API via BFF.
// Includes 30-second auto-refresh for live monitoring.
// API responses are auto-transformed from snake_case to camelCase by lib/api.ts.
//
// DB tables referenced: vehicles, drivers, conductor_profiles, sos_alerts,
//   overspeed_logs, demand_zones, shift_logs

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

// ── Interfaces matching DB tables (camelCase) ────────────────────────

// vehicles + joined driver/conductor names
export interface LiveVehicleTracking {
  id: string;                      // uuid
  unitNumber: string;              // varchar(20)
  plateNumber: string;             // varchar(20)
  routeId?: string | null;         // uuid
  driverId?: string | null;        // uuid
  conductorId?: string | null;     // uuid
  status: string | null;           // varchar(30)
  speed: number | null;            // int
  capacityStatus?: string | null;  // varchar(20)
  latitude?: number | null;        // decimal(10,7)
  longitude?: number | null;       // decimal(10,7)
  lastLocationUpdate?: string | null; // timestamp
  // Joined names for display
  driverName?: string | null;
  conductorName?: string | null;
  routeName?: string | null;
  // Legacy aliases used by page component
  unit: string;                    // alias for unitNumber
  driver?: string | null;          // alias for driverName
  zone?: string | null;            // alias for routeName
}

// sos_alerts
export interface SosAlert {
  id: string;                      // uuid PK
  reportedById?: string;           // uuid NOT NULL
  reportedByRole?: string;         // varchar(20) NOT NULL
  vehicleId?: string | null;       // uuid
  vehiclePlate?: string | null;    // varchar(20)
  message: string | null;          // text
  latitude?: number | null;        // decimal(10,7)
  longitude?: number | null;       // decimal(10,7)
  status?: string | null;          // varchar(20)
  triggeredAt: string;             // timestamp NOT NULL
  resolvedAt?: string | null;      // timestamp
  resolvedById?: string | null;    // uuid
  createdAt?: string;
  // Joined for display
  reportedByName?: string | null;
  conductorName?: string | null;
  // Legacy aliases used by page component
  conductor?: string | null;       // alias for conductorName
  vehicle?: string | null;         // alias for vehiclePlate
  time?: string;                   // alias for triggeredAt
  triggeredDate?: string;          // alias for triggeredAt (date only)
  coordinates: [number, number];   // alias for [latitude, longitude]
}

// sos_alerts (resolved, for history tab)
export interface SosHistoryLog {
  id: string;
  reportedById?: string;
  reportedByRole?: string;
  vehicleId?: string | null;
  vehiclePlate?: string | null;
  message?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: string | null;
  triggeredAt: string;
  resolvedAt: string | null;
  resolvedById?: string | null;
  createdAt?: string;
  reportedByName?: string | null;
  conductorName?: string | null;
  // Legacy aliases used by page component
  conductor?: string | null;       
  vehicle?: string | null;        
  triggeredDate?: string;          
  coordinates: [number, number];   
}

// overspeed_logs
export interface OverspeedLog {
  id: string;                     
  vehicleId?: string;              
  driverId?: string;              
  driverName?: string | null;     
  speed: number | null;           
  zone?: string | null;            
  createdAt?: string;
 
  unitNumber?: string | null;
  plateNumber?: string | null;

  unit: string;                   
  driver?: string | null;        
  loggedAt?: string;               
  loggedDate?: string;            
}

// demand_zones

export interface DemandZone {
  id: string;                     
  name?: string | null;          
  routeId?: string | null;       
  latitude?: number | null;      
  longitude?: number | null;       
  radiusMeters: number;            
  commuterCount: number;        
  intensity: 'LOW' | 'MEDIUM' | 'HIGH'; 
  createdAt?: string;
  updatedAt?: string;
  coords: [number, number];      
}

export interface MonitoringData {
  liveVehicles: LiveVehicleTracking[];
  sosAlerts: SosAlert[];
  sosHistory: SosHistoryLog[];
  overspeedHistory: OverspeedLog[];
  demandZones: DemandZone[];
}

// ── API response shape ────────────────────────────────────────────────

interface MonitoringApiResponse {
  liveVehicles: LiveVehicleTracking[];
  sosAlerts: SosAlert[];
  sosHistory: SosHistoryLog[];
  overspeedHistory: OverspeedLog[];
  demandZones: DemandZone[];
}

// ── Hook ──────────────────────────────────────────────────────────────

const EMPTY_DATA: MonitoringData = {
  liveVehicles: [],
  sosAlerts: [],
  sosHistory: [],
  overspeedHistory: [],
  demandZones: [],
};

export function useMonitoringData() {
  const [data, setData] = useState<MonitoringData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<MonitoringApiResponse>('/api/admin/monitoring');
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load monitoring data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Auto-refresh every 30 seconds for live monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  return { data, isLoading, error, refetch };
}