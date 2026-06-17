import { NextRequest } from "next/server";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import * as store from "@/lib/conductor/server/store";

export async function GET(request: NextRequest) {
  const session = await getConductorSession(request);
  if (!session) return unauthorizedResponse();

  const shiftId =
    request.nextUrl.searchParams.get("shift_id") ??
    request.nextUrl.searchParams.get("shiftId");

  if (!shiftId) {
    return jsonError("shift_id query parameter is required.");
  }

  return jsonData(store.listRatings(session.userId, shiftId));
}
