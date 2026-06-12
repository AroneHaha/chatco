// lib/commuter/services/lost-found.service.ts
// Commuter lost-and-found service — API-first with mock fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { COMMUTER_API } from "../commuter/endpoints";
import { shouldUseCommuterApi } from "./api-mode";
import type { CommuterLostItem, CommuterClaimData } from "../commuter/types";

export async function fetchLostItems(): Promise<{
  items: CommuterLostItem[];
  error: string | null;
}> {
  if (shouldUseCommuterApi()) {
    try {
      const response = await api.get<{ data: CommuterLostItem[] }>(
        COMMUTER_API.lostFound.list
      );
      return { items: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return {
          items: [],
          error: "Unable to load lost items. Please try again.",
        };
      }
      throw error;
    }
  }

  return {
    items: [],
    error: "Lost items are unavailable until the backend is connected.",
  };
}

export async function submitClaim(
  claim: CommuterClaimData
): Promise<{ success: boolean; error: string | null }> {
  if (shouldUseCommuterApi()) {
    try {
      await api.post(COMMUTER_API.lostFound.claim, claim);
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { success: false, error: "Failed to submit claim. Please try again." };
      }
      throw error;
    }
  }

  return { success: false, error: "Unavailable until the backend is connected." };
}
