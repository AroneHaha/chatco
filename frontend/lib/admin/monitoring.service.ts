// lib/admin/services/monitoring.service.ts
// Admin monitoring service — live vehicles, SOS, overspeeding, demand zones.
// API-first with mock fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { ADMIN_API } from "../admin/endpoints";
import { shouldUseAdminApi } from "./api-mode";
import type { AdminLiveVehicle, AdminSOSAlert, AdminDemandZone } from "../admin/types";

export async function fetchLiveVehicles(): Promise<{
  vehicles: AdminLiveVehicle[];
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminLiveVehicle[] }>(
        ADMIN_API.monitoring.live
      );
      return { vehicles: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { vehicles: [], error: "Unable to load live vehicles." };
      }
      throw error;
    }
  }

  return { vehicles: [], error: "Live tracking is unavailable until the backend is connected." };
}

export async function fetchSOSAlerts(): Promise<{
  alerts: AdminSOSAlert[];
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminSOSAlert[] }>(
        ADMIN_API.monitoring.sos
      );
      return { alerts: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { alerts: [], error: "Unable to load SOS alerts." };
      }
      throw error;
    }
  }

  return { alerts: [], error: "SOS alerts are unavailable until the backend is connected." };
}

export async function resolveSOS(id: string): Promise<{ success: boolean; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      await api.post(ADMIN_API.monitoring.resolveSos(id));
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { success: false, error: "Failed to resolve SOS." };
      }
      throw error;
    }
  }

  return { success: false, error: "Unavailable until the backend is connected." };
}

export async function fetchDemandZones(): Promise<{
  zones: AdminDemandZone[];
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminDemandZone[] }>(
        ADMIN_API.monitoring.demandZones
      );
      return { zones: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { zones: [], error: "Unable to load demand zones." };
      }
      throw error;
    }
  }

  return { zones: [], error: "Demand zones are unavailable until the backend is connected." };
}
