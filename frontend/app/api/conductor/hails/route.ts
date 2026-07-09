import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapArray, mapConductorHail } from "@/lib/conductor/server/mappers";

/**
 * GET /api/conductor/hails
 *
 * Proxies to Laravel `GET /api/v1/conductor/hails` and maps the result to the
 * frontend's `ConductorHailRequest[]` shape that `useConductorHails` consumes.
 *
 * We do NOT use the plain `proxyGet` helper here because the raw Laravel `Hail`
 * payload is snake_case with `commuter_lat`/`commuter_lng` serialized as
 * STRINGS (decimal casts). The conductor map feeds those values straight into
 * Leaflet markers + distance math, which require numbers — so the response
 * must be mapped, not forwarded verbatim.
 *
 * When the conductor has no active shift, Laravel returns `data: null`; the
 * proxy surfaces that as `null`, and `mapArray(null, …)` yields `[]`, so the
 * hook simply renders an empty (not errored) state.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/hails", {
    method: "GET",
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Unable to load hail requests.", result.status);
  }

  return jsonData(mapArray(result.data, mapConductorHail));
}
