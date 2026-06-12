import { api, NetworkError } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import type { ConductorHailRequest } from "@/lib/conductor/types";

function hasRemoteApi(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL);
}

export async function fetchActiveHails(): Promise<{
  hails: ConductorHailRequest[];
  error: string | null;
}> {
  if (hasRemoteApi()) {
    try {
      const response = await api.get<{ data: ConductorHailRequest[] }>(
        CONDUCTOR_API.hails
      );
      return { hails: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError) {
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
