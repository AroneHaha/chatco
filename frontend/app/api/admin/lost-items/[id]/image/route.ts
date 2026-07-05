import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:8000";

/**
 * POST /api/admin/lost-items/{itemId}/image
 *
 * Sprint 6 (S6-T8) — admin uploads/replaces the photo of a lost item.
 *
 * Forwards the multipart body (field `image`: jpg/jpeg/png/webp, max 5MB) to
 * Laravel POST /api/v1/admin/lost-items/{itemId}/image. The backend stores the
 * file on the public disk, saves the URL to lost_items.image_url (deleting any
 * previous file), and returns the fresh LostItem row.
 *
 * This route can't use the JSON proxy helpers — multipart needs the FormData
 * passed through so fetch sets the boundary header itself.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") {
    return NextResponse.json({ message: "Item ID is required." }, { status: 400 });
  }

  const token = request.cookies.get("chatco_session")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized. Admin session required." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Request body must be multipart form data." }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/admin/lost-items/${id}/image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        // No Content-Type — fetch sets the multipart boundary itself.
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
      { success: false, message: "Unable to reach the backend service. Please try again.", data: null, errors: null, meta: null },
      { status: 502 }
    );
  }
}
