import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/** Read-only proxy for conductor-safe receipt configuration. */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/receipt-settings", {
    method: "GET",
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Failed to load receipt settings.", result.status);
  }

  return jsonData(result.data);
}
