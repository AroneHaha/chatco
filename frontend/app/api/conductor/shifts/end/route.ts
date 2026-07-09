import { NextRequest } from "next/server";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { jsonData } from "@/lib/conductor/server/response";
import * as store from "@/lib/conductor/server/store";

export async function POST(request: NextRequest) {
  const session = await getConductorSession(request);
  if (!session) return unauthorizedResponse();

  const shift = store.endShift(session.userId);
  return jsonData(shift);
}
