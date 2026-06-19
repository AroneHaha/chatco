import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapShiftLog } from "@/lib/conductor/server/mappers";

export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/shift");

  if (!result.ok) {
    return jsonError(
      result.message ?? "Unable to check active shift.",
      result.status
    );
  }

  if (!result.data) {
    return jsonData(null);
  }

  const shift = mapShiftLog(result.data);
  return jsonData(shift);
}
