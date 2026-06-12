// lib/admin/services/remittance.service.ts
// Admin remittance service — API-first with mock fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { ADMIN_API } from "../admin/endpoints";
import { shouldUseAdminApi } from "./api-mode";
import type { AdminRemittance } from "../admin/types";

export async function fetchRemittances(): Promise<{
  remittances: AdminRemittance[];
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminRemittance[] }>(
        ADMIN_API.remittances.list
      );
      return { remittances: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { remittances: [], error: "Unable to load remittances." };
      }
      throw error;
    }
  }

  return { remittances: [], error: "Remittances are unavailable until the backend is connected." };
}

export async function verifyRemittance(id: string): Promise<{ success: boolean; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      await api.post(ADMIN_API.remittances.verify(id));
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { success: false, error: "Failed to verify remittance." };
      }
      throw error;
    }
  }

  return { success: false, error: "Unavailable until the backend is connected." };
}

export async function flagRemittance(id: string, reason: string): Promise<{ success: boolean; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      await api.post(ADMIN_API.remittances.flag(id), { reason });
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { success: false, error: "Failed to flag remittance." };
      }
      throw error;
    }
  }

  return { success: false, error: "Unavailable until the backend is connected." };
}
