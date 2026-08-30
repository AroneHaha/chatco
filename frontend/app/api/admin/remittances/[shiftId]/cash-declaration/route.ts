import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/admin/remittances/{shiftId}/cash-declaration
 *
 * The admin's physical cash count for a conductor's ended, still-PENDING
 * remittance — see components/admin/remittance/cash-declaration-modal.tsx.
 * Proxies to Laravel POST /api/v1/admin/remittances/{shiftId}/cash-declaration,
 * which resolves the remittance to COMPLETE/SHORTAGE/OVERAGE.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 * 409 if this remittance's cash was already declared. 404 if shift_id
 * doesn't correspond to a real Remittance row (e.g. a still-active shift).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  const { shiftId } = await params;
  if (!shiftId || shiftId === "undefined") return jsonError("Shift ID is required.", 400);

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/remittances/${shiftId}/cash-declaration`, {
    method: "POST",
    body: { cash_declared: Number(body.cash_declared) || 0 },
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to record cash declaration.", result.status);
  }
  return jsonData(result.data);
}
