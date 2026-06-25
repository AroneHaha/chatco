import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * PUT/PATCH /api/admin/vehicles/{id}
 * Proxies to Laravel PUT/PATCH /api/v1/admin/vehicles/{id}.
 *
 * Body must contain: unit_number, plate_number, route_id (all required).
 * Optional: driver_id, conductor_id, status.
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/vehicles/${params.id}`, {
    method: "PUT",
    body,
  });

  if (!result.ok) return jsonError(result.message ?? "Failed to update vehicle.", result.status);
  return jsonData(result.data);
}

// PATCH mirrors PUT — same controller method on Laravel side.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/vehicles/${params.id}`, {
    method: "PATCH",
    body,
  });

  if (!result.ok) return jsonError(result.message ?? "Failed to update vehicle.", result.status);
  return jsonData(result.data);
}

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
