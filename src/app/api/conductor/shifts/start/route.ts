import { NextRequest } from "next/server";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import * as store from "@/lib/conductor/server/store";

export async function POST(request: NextRequest) {
  const session = getConductorSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { conductorName, unitNumber, route, driverName } = body ?? {};

    if (!conductorName || !unitNumber || !route || !driverName) {
      return jsonError("conductorName, unitNumber, route, and driverName are required.");
    }

    const shift = store.startShift(session.userId, {
      conductorName,
      unitNumber,
      route,
      driverName,
    });

    return jsonData(shift, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to start shift.",
      409
    );
  }
}
