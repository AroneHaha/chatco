export interface UnitCrewDetails {
  name: string;
  photo_url: string | null;
  average_rating: number | null;
  rating_count: number;
}

export interface CommuterUnitDetails {
  vehicle_id: string;
  shift_id: string;
  unit_number: string;
  plate_number: string;
  vehicle_type: string;
  route_name: string | null;
  location_updated_at: string | null;
  driver: UnitCrewDetails | null;
  conductor: UnitCrewDetails | null;
}

export async function fetchUnitDetails(vehicleId: string, signal: AbortSignal): Promise<CommuterUnitDetails | null> {
  const response = await fetch(`/api/commuter/vehicles/${encodeURIComponent(vehicleId)}/details`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (response.status === 404) return null;
  const body = await response.json();
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.message || "Unable to load unit details.");
  }
  return body.data;
}
