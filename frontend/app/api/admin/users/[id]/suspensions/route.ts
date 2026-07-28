import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await proxyToLaravel(request, `/admin/users/${id}/suspensions`, {
    method: "GET",
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Failed to load suspension history.", result.status);
  }

  return jsonData(result.data);
}
