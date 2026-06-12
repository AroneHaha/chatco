import { api, NetworkError } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import type {
  ConductorDriver,
  ConductorProfile,
  ConductorUnit,
} from "@/lib/conductor/types";

function hasRemoteApi(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL);
}

export async function fetchConductorProfile(): Promise<{
  profile: ConductorProfile | null;
  error: string | null;
}> {
  if (hasRemoteApi()) {
    try {
      const response = await api.get<{ data: ConductorProfile }>(
        CONDUCTOR_API.profile
      );
      return { profile: response.data ?? null, error: null };
    } catch (error) {
      if (error instanceof NetworkError) {
        return {
          profile: null,
          error: "Unable to load conductor profile. Please try again.",
        };
      }
      throw error;
    }
  }

  return {
    profile: null,
    error: "Conductor profile is unavailable until the backend is connected.",
  };
}

export async function fetchUnits(): Promise<{
  units: ConductorUnit[];
  error: string | null;
}> {
  if (hasRemoteApi()) {
    try {
      const response = await api.get<{ data: ConductorUnit[] }>(
        CONDUCTOR_API.units
      );
      return { units: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError) {
        return {
          units: [],
          error: "Unable to load units. Please check your connection and try again.",
        };
      }
      throw error;
    }
  }

  return {
    units: [],
    error: "Units are unavailable until the backend is connected.",
  };
}

export async function fetchDrivers(): Promise<{
  drivers: ConductorDriver[];
  error: string | null;
}> {
  if (hasRemoteApi()) {
    try {
      const response = await api.get<{ data: ConductorDriver[] }>(
        CONDUCTOR_API.drivers
      );
      return { drivers: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError) {
        return {
          drivers: [],
          error: "Unable to load drivers. Please check your connection and try again.",
        };
      }
      throw error;
    }
  }

  return {
    drivers: [],
    error: "Drivers are unavailable until the backend is connected.",
  };
}

export type { ConductorUnit, ConductorDriver, ConductorProfile };
