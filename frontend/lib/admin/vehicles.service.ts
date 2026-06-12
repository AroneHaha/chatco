// lib/admin/services/vehicles.service.ts
// Admin vehicle & personnel management service — API-first with mock fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { ADMIN_API } from "../admin/endpoints";
import { shouldUseAdminApi } from "./api-mode";
import type { AdminVehicle, AdminPersonnel } from "../admin/types";

export async function fetchVehicles(): Promise<{
  vehicles: AdminVehicle[];
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminVehicle[] }>(
        ADMIN_API.vehicles.list
      );
      return { vehicles: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { vehicles: [], error: "Unable to load vehicles." };
      }
      throw error;
    }
  }

  return { vehicles: [], error: "Vehicles are unavailable until the backend is connected." };
}

export async function createVehicle(
  data: Omit<AdminVehicle, "id">
): Promise<{ vehicle: AdminVehicle | null; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.post<{ data: AdminVehicle }>(
        ADMIN_API.vehicles.create,
        data
      );
      return { vehicle: response.data ?? null, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { vehicle: null, error: "Failed to create vehicle." };
      }
      throw error;
    }
  }

  return { vehicle: null, error: "Unavailable until the backend is connected." };
}

export async function fetchPersonnel(): Promise<{
  personnel: AdminPersonnel[];
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminPersonnel[] }>(
        ADMIN_API.personnel.list
      );
      return { personnel: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { personnel: [], error: "Unable to load personnel." };
      }
      throw error;
    }
  }

  return { personnel: [], error: "Personnel are unavailable until the backend is connected." };
}
