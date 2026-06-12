// lib/commuter/services/announcements.service.ts
// Commuter announcements service — API-first with mock fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { COMMUTER_API } from "../commuter/endpoints";
import { shouldUseCommuterApi } from "./api-mode";
import type { CommuterAnnouncement } from "../commuter/types";

export async function fetchAnnouncements(): Promise<{
  announcements: CommuterAnnouncement[];
  error: string | null;
}> {
  if (shouldUseCommuterApi()) {
    try {
      const response = await api.get<{ data: CommuterAnnouncement[] }>(
        COMMUTER_API.announcements.list
      );
      return { announcements: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return {
          announcements: [],
          error: "Unable to load announcements. Please try again.",
        };
      }
      throw error;
    }
  }

  return {
    announcements: [],
    error: "Announcements are unavailable until the backend is connected.",
  };
}

export async function markAnnouncementRead(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  if (shouldUseCommuterApi()) {
    try {
      await api.post(COMMUTER_API.announcements.markRead(id));
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { success: false, error: "Failed to mark as read." };
      }
      throw error;
    }
  }

  return { success: false, error: "Unavailable until the backend is connected." };
}
