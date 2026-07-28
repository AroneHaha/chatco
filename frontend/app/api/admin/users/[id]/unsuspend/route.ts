import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await proxyToLaravel(request, `/admin/users/${id}/unsuspend`, {
    method: "POST",
    body: {},
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Failed to reactivate account.", result.status);
  }

  return jsonData(result.data);
}
