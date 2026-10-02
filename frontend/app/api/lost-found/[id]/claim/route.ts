import { NextRequest, NextResponse } from "next/server";
import { API_URL, API_V1, getCommuterToken, unauthorizedResponse } from "@/lib/commuter/server/proxy";

/**
 * POST /api/lost-found/{itemId}/claim
 *
 * Forwards the multipart claim (proof text + optional `images[]`) to Laravel.
 * Can't use proxyToLaravel — it forces a JSON Content-Type, and multipart
 * needs fetch to set its own boundary (same as the admin photos route).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") {
    return NextResponse.json({ message: "Item ID is required." }, { status: 400 });
  }

  const token = getCommuterToken(request);
  if (!token) {
    return unauthorizedResponse();
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Request body must be multipart form data." }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}${API_V1}/lost-found/${id}/claim`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });

    const body = await res.json().catch(() => null);
    return NextResponse.json(
      body ?? { success: false, message: "Request failed.", data: null, errors: null, meta: null },
      { status: res.status }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to connect to the server.", data: null, errors: null, meta: null },
      { status: 502 }
    );
  }
}
