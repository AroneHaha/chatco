import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { API_V1, proxyToLaravel } from "@/lib/commuter/server/proxy";

/**
 * POST /api/commuter/hail
 *
 * Proxies to Laravel `POST /api/v1/commuter/hail` (guarded by
 * `auth:sanctum` + `role:COMMUTER` + `throttle:commuter-hail`).
 *
 * REQUEST
 * -------
 * The browser sends `{ vehicle_id, commuter_lat, commuter_lng }`, which is
 * exactly what Laravel's `CreateHailRequest` validates. We parse it here only
 * to fail fast on a malformed payload before spending a backend round-trip;
 * Laravel remains the source of truth for full validation.
 *
 * RESPONSE
 * --------
 * The commuter proxy (S3-T9) forwards Laravel's status + body verbatim, so:
 *   - 201 success → ApiResponse envelope `{ data: hail, ... }`
 *   - 422 outside radius → `{ error: 'outside_radius', distance_m }` is passed
 *     through INTACT (the spec-mandated discriminator shape — re-wrapping it
 *     would drop `distance_m`, which the client's isOutsideRadiusError needs)
 *   - 409 duplicate / 422 validation → forwarded as-is
 *   - 401 when the `chatco_session` cookie is missing (handled by the proxy)
 *
 * Pattern note: this mirrors app/api/conductor/shifts/start/route.ts, adapted
 * to the commuter proxy, which returns a NextResponse directly rather than a
 * `{ ok, data }` result — so we return its response instead of jsonData().
 */
export async function POST(request: NextRequest) {
  let body: {
    vehicle_id?: unknown;
    commuter_lat?: unknown;
    commuter_lng?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const { vehicle_id, commuter_lat, commuter_lng } = body;

  // `commuter_lat`/`commuter_lng` can legitimately be 0 (equator / prime
  // meridian), so test for a finite number rather than truthiness.
  if (
    typeof vehicle_id !== "string" ||
    vehicle_id.trim() === "" ||
    !Number.isFinite(commuter_lat as number) ||
    !Number.isFinite(commuter_lng as number)
  ) {
    return NextResponse.json(
      { message: "vehicle_id, commuter_lat, and commuter_lng are required." },
      { status: 422 }
    );
  }

  return proxyToLaravel(request, `${API_V1}/commuter/hail`, {
    method: "POST",
    body: JSON.stringify({ vehicle_id, commuter_lat, commuter_lng }),
  });
}
