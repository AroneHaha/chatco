// lib/commuter/services/profile.service.ts
// Commuter profile service — same pattern as conductor shift.service.ts.
// API-first with fallback to auth context mock data.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { COMMUTER_API } from "../commuter/endpoints";
import { shouldUseCommuterApi } from "./api-mode";
import type { CommuterProfileData } from "../commuter/types";

export async function fetchCommuterProfile(): Promise<{
  profile: CommuterProfileData | null;
  error: string | null;
}> {
  if (shouldUseCommuterApi()) {
    try {
      const response = await api.get<{ data: CommuterProfileData }>(
        COMMUTER_API.profile
      );
      return { profile: response.data ?? null, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return {
          profile: null,
          error: "Unable to load profile. Please try again.",
        };
      }
      throw error;
    }
  }

  return {
    profile: null,
    error: "Profile is unavailable until the backend is connected.",
  };
}

export async function updateCommuterProfile(
  updates: Partial<CommuterProfileData>
): Promise<{ profile: CommuterProfileData | null; error: string | null }> {
  if (shouldUseCommuterApi()) {
    try {
      const response = await api.patch<{ data: CommuterProfileData }>(
        COMMUTER_API.profile,
        updates
      );
      return { profile: response.data ?? null, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return {
          profile: null,
          error: "Unable to update profile. Please try again.",
        };
      }
      throw error;
    }
  }

  return {
    profile: null,
    error: "Profile updates are unavailable until the backend is connected.",
  };
}
