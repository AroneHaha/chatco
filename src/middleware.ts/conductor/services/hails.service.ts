import { api, ApiError, NetworkError } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import { shouldUseConductorApi } from "@/lib/conductor/services/api-mode";
import type { ConductorHailRequest } from "@/lib/conductor/types";

export async function fetchActiveHails(): Promise<{
  hails: ConductorHailRequest[];
  error: string | null;
}> {
  if (shouldUseConductorApi()) {
    try {
      const response = await api.get<{ data: ConductorHailRequest[] }>(
        CONDUCTOR_API.hails
      );
      return { hails: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return {
          hails: [],
          error: "Unable to load hail requests. Please try again.",
        };
      }
      throw error;
    }
  }

  return { hails: [], error: null };
}

export type { ConductorHailRequest };
