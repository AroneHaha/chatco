import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id === "undefined") return jsonError("Route ID is missing.", 400);

  const result = await proxyToLaravel(request, `/admin/routes/${id}/versions`, { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load route versions.", result.status);

  return jsonData(result.data);
}
