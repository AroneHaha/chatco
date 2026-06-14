import { NextRequest } from "next/server";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import * as store from "@/lib/conductor/server/store";
import type { Transaction } from "@/lib/conductor/persistence/transactions.store";

function getShiftId(request: NextRequest): string | null {
  const { searchParams } = request.nextUrl;
  return searchParams.get("shift_id") ?? searchParams.get("shiftId");
}

export async function GET(request: NextRequest) {
  const session = getConductorSession(request);
  if (!session) return unauthorizedResponse();

  const shiftId = getShiftId(request);
  if (!shiftId) {
    return jsonError("shift_id query parameter is required.");
  }

  return jsonData(store.listTransactions(session.userId, shiftId));
}

export async function POST(request: NextRequest) {
  const session = getConductorSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const shiftId = body?.shiftId as string | undefined;

    if (!shiftId) {
      return jsonError("shiftId is required.");
    }

    const activeShift = store.getActiveShift(session.userId);
    if (!activeShift || activeShift.shiftId !== shiftId) {
      return jsonError("No active shift matches the provided shiftId.", 409);
    }

    const { shiftId: _ignored, ...txnBody } = body;
    const txn = store.addTransaction(
      session.userId,
      shiftId,
      txnBody as Omit<Transaction, "transactionId" | "timestamp">
    );

    return jsonData(txn, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to save transaction."
    );
  }
}
