import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapVehicle, mapArray } from "@/lib/conductor/server/mappers";

export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/units");

  if (!result.ok) {
    return jsonError(
      result.message ?? "Unable to load units.",
      result.status
    );
  }

  const units = mapArray(result.data, mapVehicle);
  return jsonData(units);
}
