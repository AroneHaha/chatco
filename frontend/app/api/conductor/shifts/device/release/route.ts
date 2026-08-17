import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapShiftLog } from "@/lib/conductor/server/mappers";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.shiftId || !body?.deviceId) return jsonError("Shift and device are required.", 422);
  const result = await proxyToLaravel(request, "/conductor/shifts/device/release", {
    method: "POST",
    body: { shift_id: body.shiftId, device_id: body.deviceId, device_type: body.deviceType ?? "WEB" },
  });
  return result.ok
    ? jsonData(mapShiftLog(result.data))
    : jsonError(result.message ?? "Unable to release this shift.", result.status);
}
