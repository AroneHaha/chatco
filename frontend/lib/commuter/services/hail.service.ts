/**
 * Client-side commuter hail service.
 *
 * Calls the Next.js API routes (which proxy to Laravel via
 * lib/commuter/server/proxy.ts) — never calls Laravel directly from the
 * browser. This keeps the Sanctum bearer token server-side only.
 *
 * Endpoints (defined in lib/commuter/endpoints.ts):
 *   POST   /api/commuter/hail       -> createHail()
 *   DELETE /api/commuter/hail/{id}  -> cancelHail()
 *
 * Backend contract (Laravel):
 *   - 201 Created on successful hail creation
 *   - 422 with { error: 'outside_radius', distance_m: N } if > 1KM
 *   - 409 if duplicate pending hail exists for the commuter
 *   - 200 with status=CANCELLED on successful cancel
 *   - 403 if non-owner attempts cancel
 *
 * Error handling pattern matches lib/conductor/services/shift.service.ts:
 *   - NetworkError / ApiError from the shared API client are rethrown
 *   - Caller (usually a React hook) decides how to surface errors to UI
 */

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { COMMUTER_API } from "@/lib/commuter/endpoints";
import type { CommuterHailData, HailStatus } from "@/lib/commuter/types";

export type { CommuterHailData };

// ─── Response Shapes ─────────────────────────────────────────────────

/**
 * Standard Laravel ApiResponse envelope (matches App\Traits\ApiResponse).
 * Used for all successful responses and most error responses.
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors: unknown;
  meta: unknown;
}

/**
 * Special-case error shape for the 1KM radius rule.
 * Backend returns this INSTEAD of the standard envelope so the frontend
 * can branch on the `error` discriminator field.
 *
 * Returned by HailController::store() when HailService::createHail()
 * throws OutsideRadiusException.
 */
export interface OutsideRadiusError {
  error: "outside_radius";
  distance_m: number;
}

// ─── Raw API shape + mapper ──────────────────────────────────────────

/**
 * The raw Hail row as Laravel serializes it (snake_case; decimals as strings).
 * The proxy forwards this verbatim, so we map it to the camelCase
 * CommuterHailData the app uses — otherwise fields like `vehicleId`/`distanceM`
 * would be `undefined` at runtime despite the (previously mismatched) types.
 */
interface RawHail {
  id: string;
  vehicle_id: string;
  conductor_id: string | null;
  status: HailStatus;
  distance_m: number | string | null;
  expires_at: string;
  created_at: string;
}

function mapCommuterHail(raw: RawHail): CommuterHailData {
  return {
    id: raw.id,
    vehicleId: raw.vehicle_id,
    conductorId: raw.conductor_id ?? null,
    status: raw.status,
    distanceM: raw.distance_m != null ? Number(raw.distance_m) : 0,
    expiresAt: raw.expires_at,
    createdAt: raw.created_at,
  };
}

// ─── Type Guard ──────────────────────────────────────────────────────

/**
 * Runtime check: does this error body match the OutsideRadiusError shape?
 *
 * Used by callers to distinguish "you're too far" from other 422 errors
 * (e.g., validation failures) so the UI can show the right message.
 */
export function isOutsideRadiusError(body: unknown): body is OutsideRadiusError {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    (body as { error: unknown }).error === "outside_radius" &&
    "distance_m" in body &&
    typeof (body as { distance_m: unknown }).distance_m === "number"
  );
}

// ─── Service Functions ───────────────────────────────────────────────

/**
 * Create a new hail for the authenticated commuter against a vehicle.
 *
 * Server-side (HailService::createHail) enforces:
 *   - Commuter role check (403 if not a commuter)
 *   - Duplicate pending hail check (409 if one already exists)
 *   - Vehicle active shift check (422 if vehicle not on duty)
 *   - 1KM radius rule via GeoHelper::haversineMeters() (422 outside_radius)
 *
 * @param vehicleId  UUID of the target vehicle
 * @param lat        Commuter's current latitude (degrees, -90 to 90)
 * @param lng        Commuter's current longitude (degrees, -180 to 180)
 *
 * @throws {ApiError} with status=422 and body=OutsideRadiusError if > 1KM
 * @throws {ApiError} with status=422 if validation fails (bad lat/lng, missing vehicle)
 * @throws {ApiError} with status=409 if commuter already has a pending hail
 * @throws {ApiError} with status=403 if authenticated user is not a commuter
 * @throws {NetworkError} if Laravel is unreachable
 */
export async function createHail(
  vehicleId: string,
  lat: number,
  lng: number
): Promise<CommuterHailData> {
  const response = await api.post<ApiResponse<RawHail>>(
    COMMUTER_API.tracking.hail,
    {
      vehicle_id: vehicleId,
      commuter_lat: lat,
      commuter_lng: lng,
    }
  );

  return mapCommuterHail(response.data);
}

/**
 * Cancel a pending hail owned by the authenticated commuter.
 *
 * Server-side (HailService::cancelHail) enforces:
 *   - Ownership check (403 if commuter is not the hail owner)
 *   - Pending status check (422 if hail is not in PENDING status)
 *
 * @param hailId  UUID of the hail to cancel
 *
 * @returns The cancelled hail with status='cancelled'
 *
 * @throws {ApiError} with status=403 if not the hail owner
 * @throws {ApiError} with status=422 if hail is not pending (already accepted/rejected/expired)
 * @throws {ApiError} with status=404 if hail does not exist
 * @throws {NetworkError} if Laravel is unreachable
 */
export async function cancelHail(hailId: string): Promise<CommuterHailData> {
  const response = await api.delete<ApiResponse<RawHail>>(
    COMMUTER_API.tracking.cancelHail(hailId)
  );

  return mapCommuterHail(response.data);
}
