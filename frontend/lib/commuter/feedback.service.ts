// lib/commuter/services/feedback.service.ts
// Commuter feedback service — API-first with mock fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { COMMUTER_API } from "../commuter/endpoints";
import { shouldUseCommuterApi } from "./api-mode";
import type { CommuterFeedback } from "../commuter/types";

export async function submitFeedback(
  feedback: CommuterFeedback
): Promise<{ success: boolean; error: string | null }> {
  if (shouldUseCommuterApi()) {
    try {
      await api.post(COMMUTER_API.feedback.submit, feedback);
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { success: false, error: "Failed to submit feedback. Please try again." };
      }
      throw error;
    }
  }

  return { success: false, error: "Unavailable until the backend is connected." };
}
