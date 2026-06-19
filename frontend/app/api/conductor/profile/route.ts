import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

const API_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) {
    return jsonError("Unauthorized. Conductor session required.", 401);
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/conductor/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return jsonError(
        "Unable to load conductor profile. Please try again.",
        res.status
      );
    }

    const body = await res.json();
    return jsonData(body?.data ?? null);
  } catch {
    return jsonError(
      "Unable to reach the conductor profile service. Please try again.",
      502
    );
  }
}
