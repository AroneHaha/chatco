import { NextRequest } from "next/server";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { jsonData } from "@/lib/conductor/server/response";
import * as store from "@/lib/conductor/server/store";

export async function GET(request: NextRequest) {
  const session = await getConductorSession(request);
  if (!session) return unauthorizedResponse();

  return jsonData(store.listDrivers());
}
