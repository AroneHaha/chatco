import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id === "undefined") return jsonError("Voucher ID is missing.", 400);

  const result = await proxyToLaravel(request, `/admin/vouchers/${id}`, { method: "DELETE" });
  if (!result.ok) return jsonError(result.message ?? "Failed to delete voucher.", result.status);
  return jsonData(result.data);
}
