import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * DELETE /api/admin/vehicles/{id}
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const result = await proxyToLaravel(request, `/admin/vehicles/${params.id}`, {
    method: "DELETE",
  });

  if (!result.ok) return jsonError(result.message ?? "Failed to delete vehicle.", result.status);
  return jsonData(result.data);
}
