// lib/commuter/services/sos.service.ts
// Commuter SOS alert service — API-first with mock fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { COMMUTER_API } from "../commuter/endpoints";
import { shouldUseCommuterApi } from "./api-mode";
import type { SOSAlert } from "../commuter/types";

export async function createSOSAlert(
  alert: Omit<SOSAlert, "id" | "status" | "createdAt">
): Promise<{ alert: SOSAlert | null; error: string | null }> {
  if (shouldUseCommuterApi()) {
    try {
      const response = await api.post<{ data: SOSAlert }>(
        COMMUTER_API.sos.create,
        alert
      );
      return { alert: response.data ?? null, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { alert: null, error: "Failed to send SOS. Please try again." };
      }
      throw error;
    }
  }

  return { alert: null, error: "SOS is unavailable until the backend is connected." };
}
