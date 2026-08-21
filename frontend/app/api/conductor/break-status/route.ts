import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

export async function POST(request: NextRequest) {
  let body: { is_on_break?: unknown; deviceId?: unknown; deviceType?: unknown };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  if (typeof body.is_on_break !== "boolean") {
    return jsonError("is_on_break must be a boolean.", 422);
  }

  const result = await proxyToLaravel(request, "/conductor/break-status", {
    method: "POST",
    body: {
      is_on_break: body.is_on_break,
      device_id: typeof body.deviceId === "string" ? body.deviceId : undefined,
      device_type: body.deviceType === "WEB" || body.deviceType === "MOBILE" ? body.deviceType : undefined,
    },
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Unable to update break status.", result.status);
  }

  return jsonData(result.data);
}
