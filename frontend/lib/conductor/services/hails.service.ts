import { api, ApiError, NetworkError } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import { shouldUseConductorApi } from "@/lib/conductor/services/api-mode";
import type { ConductorHailRequest } from "@/lib/conductor/types";
import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "@/lib/conductor/persistence/device.store";

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

/**
 * Accept a pending hail for the conductor's active shift.
 *
 * POSTs to the Next.js accept proxy, which forwards to Laravel
 * `POST /api/v1/conductor/hails/{id}/accept`. The route maps the updated hail
 * to `ConductorHailRequest`.
 *
 * Errors (403 not your shift, 422 not pending/expired, network) propagate as
 * `ApiError` / `NetworkError` so the caller can surface them; the polling list
 * then reconciles on its next tick.
 */
export async function acceptHail(hailId: string): Promise<ConductorHailRequest> {
  const response = await api.post<{ data: ConductorHailRequest }>(
    CONDUCTOR_API.hailAccept(hailId),
    { deviceId: getConductorDeviceId(), deviceType: CONDUCTOR_DEVICE_TYPE }
  );
  return response.data;
}

/**
 * Reject a pending hail for the conductor's active shift.
 *
 * POSTs to the Next.js reject proxy, which forwards to Laravel
 * `POST /api/v1/conductor/hails/{id}/reject`. The route maps the updated hail
 * to `ConductorHailRequest`. Errors propagate as `ApiError` / `NetworkError`.
 */
export async function rejectHail(hailId: string): Promise<ConductorHailRequest> {
  const response = await api.post<{ data: ConductorHailRequest }>(
    CONDUCTOR_API.hailReject(hailId),
    { deviceId: getConductorDeviceId(), deviceType: CONDUCTOR_DEVICE_TYPE }
  );
  return response.data;
}

export type { ConductorHailRequest };
