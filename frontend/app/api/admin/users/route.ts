import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonError, jsonData } from "@/lib/conductor/server/response";

/**
 * GET /api/admin/users
 *
 * Proxies to Laravel `GET /api/v1/admin/users` with query-string
 * passthrough for role filter, search, and pagination:
 *
 *   ?role=COMMUTER|ADMIN|CONDUCTOR   (optional, exact match)
 *   ?search=<term>                    (optional, LIKE on email/name/username)
 *   ?per_page=<int>                   (default 15, clamped 1..100 server-side)
 *   ?page=<int>                       (default 1)
 *
 * Laravel returns a LengthAwarePaginator:
 *   { data: [...users], current_page, per_page, total, last_page, from, to, ... }
 *
 * The paginator object is forwarded verbatim so the frontend can render
 * page controls with accurate totals. The proxy does NOT flatten the
 * paginator — the service layer handles the shape mapping.
 *
 * Backend (S5-T3): AdminUserController::index → AdminService::listUsers
 */
export async function GET(request: NextRequest) {
  // Forward the full query string so Laravel's paginator receives every
  // filter the UI sends. NextRequest.url already contains the search params.
  const url = new URL(request.url);
  const path = `/admin/users${url.search}`;

  const result = await proxyToLaravel(request, path, { method: "GET" });

  if (!result.ok) {
    return jsonError(result.message ?? "Failed to load users.", result.status);
  }

  // Laravel's paginator is the `data` field of the ApiResponse envelope.
  // Forward it directly — the service layer maps it to the frontend shape.
  return jsonData(result.data);
}
