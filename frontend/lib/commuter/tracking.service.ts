// lib/commuter/services/tracking.service.ts
// Commuter tracking service — API-first for nearby vehicles and hailing.
// Currently most tracking runs client-side (use-commuter-tracking hook),
// but this service provides the API layer for when Laravel backend
// handles GPS position broadcasting.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { COMMUTER_API } from "../commuter/endpoints";
import { shouldUseCommuterApi } from "./api-mode";
import type { NearbyVehicle } from "../shared/geo/nearby-detector";

export async function fetchNearbyVehicles(
  lat: number,
  lng: number
): Promise<{
  vehicles: NearbyVehicle[];
  error: string | null;
}> {
  if (shouldUseCommuterApi()) {
    try {
      const response = await api.get<{ data: NearbyVehicle[] }>(
        `${COMMUTER_API.tracking.nearby}?lat=${lat}&lng=${lng}`
      );
      return { vehicles: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return {
          vehicles: [],
          error: "Unable to fetch nearby vehicles. Please try again.",
        };
      }
      throw error;
    }
  }

  // In local mode, tracking is handled by use-commuter-tracking hook
  return { vehicles: [], error: null };
}

export async function hailVehicle(
  vehicleId: string,
  lat: number,
  lng: number
): Promise<{ success: boolean; error: string | null }> {
  if (shouldUseCommuterApi()) {
    try {
      await api.post(COMMUTER_API.tracking.hail, { vehicleId, lat, lng });
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { success: false, error: "Failed to hail vehicle. Please try again." };
      }
      throw error;
    }
  }

  return { success: false, error: "Hailing is unavailable until the backend is connected." };
}

export async function cancelHail(
  vehicleId: string
): Promise<{ success: boolean; error: string | null }> {
  if (shouldUseCommuterApi()) {
    try {
      await api.post(COMMUTER_API.tracking.cancelHail, { vehicleId });
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { success: false, error: "Failed to cancel hail. Please try again." };
      }
      throw error;
    }
  }

  return { success: false, error: "Unavailable until the backend is connected." };
}
