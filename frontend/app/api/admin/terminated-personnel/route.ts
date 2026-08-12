import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/terminated-personnel
 *
 * Lists all terminated personnel records (drivers + conductors who were
 * removed via the Fleet Management "Remove Personnel" flow), newest first.
 * Each record includes: name, role, contact, reason, termination_type,
 * terminated_date, last_vehicle.
 *
 * Powers the "Separated Personnel" section of the Records & History tab.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, `/admin/terminated-personnel${request.nextUrl.search}`, {
    method: "GET",
  });

  if (!result.ok) {
    return jsonError(
      result.message ?? "Failed to load terminated personnel.",
      result.status
    );
  }

  // Pass through the backend's paginator or count-only payload directly.
  return jsonData(result.data);
}
