import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await proxyToLaravel(request, `/conductor/sos/${encodeURIComponent(id)}/stop`, { method: "PATCH" });
  if (!result.ok) return jsonError(result.message ?? "Unable to stop SOS.", result.status);
  return jsonData(result.data);
}
