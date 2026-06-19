import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapDriver, mapArray } from "@/lib/conductor/server/mappers";

export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/drivers");

  if (!result.ok) {
    return jsonError(
      result.message ?? "Unable to load drivers.",
      result.status
    );
  }

  const drivers = mapArray(result.data, mapDriver);
  return jsonData(drivers);
}
