import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/commuter/profile
 *
 * Proxies to Laravel `GET /api/v1/commuter/profile` (cookie auth via
 * `chatco_session`). The Laravel envelope (incl. 401 / 404 cases) is passed
 * through verbatim — the service layer maps snake_case → camelCase.
 *
 * Backend (S5-T1): CommuterController::profile → CommuterService::getProfile
 */
export async function GET(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/profile`, {
    method: "GET",
  });
}

/**
 * PUT /api/commuter/profile
 *
 * Body: `{ contact_number?, language_preference? }` (only editable fields;
 * identity fields like name/birthdate/commuter_type are server-enforced
 * immutable via UpdateProfileRequest).
 *
 * The Laravel envelope (incl. 401 / 404 / 422 validation) is passed through
 * verbatim. On success, returns the updated profile so the client can
 * re-render with fresh data without an extra GET round-trip.
 */
export async function PUT(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/profile`, {
    method: "PUT",
    body: await request.text(),
  });
}
