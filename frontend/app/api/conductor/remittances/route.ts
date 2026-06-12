import { NextRequest } from "next/server";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import * as store from "@/lib/conductor/server/store";
import type { RemittanceRecord } from "@/lib/conductor/persistence/remittance.store";

export async function GET(request: NextRequest) {
  const session = getConductorSession(request);
  if (!session) return unauthorizedResponse();

  return jsonData(store.listRemittances(session.userId));
}

export async function POST(request: NextRequest) {
  const session = getConductorSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const record = (await request.json()) as RemittanceRecord;
    if (!record?.shiftId) {
      return jsonError("A valid remittance record with shiftId is required.");
    }

    const records = store.addRemittance(session.userId, record);
    return jsonData(records, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to submit remittance."
    );
  }
}
