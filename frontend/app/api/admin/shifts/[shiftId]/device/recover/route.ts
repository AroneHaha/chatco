import { NextRequest } from "next/server";
import {
  jsonData,
  jsonError,
  jsonValidationError,
} from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  const { shiftId } = await params;
  if (!shiftId || shiftId === "undefined") {
    return jsonError("Shift ID is missing.", 400);
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return jsonError("Recovery details are required.", 400);
  }

  const result = await proxyToLaravel(
    request,
    `/admin/shifts/${encodeURIComponent(shiftId)}/device/recover`,
    { method: "POST", body }
  );

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(
        result.message ?? "Check the recovery details and try again.",
        result.errors
      );
    }
    return jsonError(result.message ?? "Unable to recover the operating device.", result.status);
  }

  return jsonData(result.data);
}
