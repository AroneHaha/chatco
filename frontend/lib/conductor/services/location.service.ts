import { api } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "@/lib/conductor/persistence/device.store";

export interface ConductorLocationInput {
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  fix_timestamp?: string | null;
}

/**
 * Push the conductor's current GPS to the backend (via the Next proxy, which
 * carries the session cookie). The backend writes it to vehicle_locations for
 * the active shift's vehicle and broadcasts VehicleLocationUpdated so commuters
 * see the vehicle move in real time.
 */
export async function updateConductorLocation(
  input: ConductorLocationInput
): Promise<void> {
  await api.post(CONDUCTOR_API.location, {
    ...input,
    deviceId: getConductorDeviceId(),
    deviceType: CONDUCTOR_DEVICE_TYPE,
  });
}
