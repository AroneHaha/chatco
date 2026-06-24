import { NextRequest } from "next/server";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import * as store from "@/lib/conductor/server/store";
import type { RemittanceRecord } from "@/lib/conductor/persistence/remittance.store";

// GET stays on the local store — there is no conductor-side remittance history
// endpoint on the backend yet (only POST /conductor/remittances exists).
export async function GET(request: NextRequest) {
  const session = await getConductorSession(request);
  if (!session) return unauthorizedResponse();

  return jsonData(store.listRemittances(session.userId));
}

/**
 * POST /api/conductor/remittances
 *
 * Proxies to Laravel `POST /api/v1/conductor/remittances`, which runs
 * `endShiftViaRemittance`: it writes a `remittances` row AND flips the
 * `shift_log` to ENDED — so the end-of-shift is persisted to the DB.
 *
 * Cash-focused remittance: the conductor is accountable for the cash they
 * collected and remits all of it (GCash/voucher are already digital), so
 * `total_collected` and `remitted_amount` both map to the cash total
 * (backend then computes shortage = 0).
 */
export async function POST(request: NextRequest) {
  let record: RemittanceRecord;
  try {
    record = (await request.json()) as RemittanceRecord;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  if (!record?.shiftId) {
    return jsonError("A valid remittance record with shiftId is required.", 422);
  }

  const cashTotal = Number(record.cashTotal) || 0;
  const gcashTotal = Number(record.gcashTotal) || 0;

  const result = await proxyToLaravel(request, "/conductor/remittances", {
    method: "POST",
    body: {
      shift_id: record.shiftId,
      total_collected: cashTotal,
      remitted_amount: cashTotal,
      cash_total: cashTotal,
      gcash_total: gcashTotal,
    },
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Unable to submit remittance.", result.status);
  }

  // The backend returns the ended ShiftLog; the frontend service only needs a
  // truthy data array for its local history, so echo back the submitted record.
  return jsonData([record], 201);
}
