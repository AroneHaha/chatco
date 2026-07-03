import { NextRequest } from "next/server";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import * as store from "@/lib/conductor/server/store";
import type { RemittanceRecord } from "@/lib/conductor/persistence/remittance.store";
import {
  endShiftViaRemittanceInMemory,
  listMyRemittancesInMemory,
} from "@/lib/shared/server/inmemory-backend";

// GET stays on the local store — there is no conductor-side remittance history
// endpoint on the backend yet (only POST /conductor/remittances exists).
export async function GET(request: NextRequest) {
  const session = await getConductorSession(request);
  if (!session) return unauthorizedResponse();

  // ─── Try Laravel first ─────────────────────────────────────────────
  const result = await proxyToLaravel(request, "/conductor/remittances", { method: "GET" });
  if (result.ok) {
    return jsonData(result.data);
  }

  // Laravel unreachable (502) → fall back to the SQLite-backed remittance
  // history so the conductor's EOD history persists across restarts.
  if (result.status === 502) {
    const remittances = listMyRemittancesInMemory(session.userId);
    return jsonData(remittances);
  }

  return jsonError(result.message ?? "Unable to load remittances.", result.status);
}

/**
 * POST /api/conductor/remittances
 *
 * PRIMARY: proxies to Laravel `POST /api/v1/conductor/remittances`, which runs
 * `endShiftViaRemittance`: it writes a `remittances` row AND flips the
 * `shift_log` to ENDED — so the end-of-shift is persisted to the DB. Laravel
 * ALSO clears the vehicle's current driver/conductor/active_shift assignment
 * (ShiftService::endShiftViaRemittance).
 *
 * FALLBACK: when Laravel is unreachable, runs `endShiftViaRemittanceInMemory`
 * against the SQLite store — which mirrors the Laravel service exactly: writes
 * a remittance row, ends the shift_log, AND clears the vehicle's current
 * driver + conductor + active_shift assignment so the unit becomes available
 * again. Historical records (shift_logs, remittances, transactions, feedback)
 * are NEVER deleted — only the CURRENT assignment is cleared.
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

  if (result.ok) {
    // Laravel succeeded — also mirror into the local conductor store so the
    // frontend's remittance history modal (which reads from the local store
    // when the API mode is off) stays consistent.
    const session = await getConductorSession(request);
    if (session) store.addRemittance(session.userId, record);
    return jsonData([record], 201);
  }

  // Laravel rejected with a real error (not a network failure) — surface it.
  if (result.status !== 502) {
    return jsonError(result.message ?? "Unable to submit remittance.", result.status);
  }

  // ─── SQLite fallback (Laravel unreachable) ──────────────────────────
  // Mirror ShiftService::endShiftViaRemittance: end the shift, write a
  // remittance record, AND clear the vehicle's current driver + conductor +
  // active_shift assignment so the unit becomes available again.
  const session = await getConductorSession(request);
  if (!session) return unauthorizedResponse();

  try {
    endShiftViaRemittanceInMemory(session.userId, {
      shiftId: record.shiftId,
      totalCollected: cashTotal,
      remittedAmount: cashTotal,
      cashTotal,
      gcashTotal,
      totalPassengers: Number(record.totalPassengers) || 0,
    });

    // Also mirror into the local conductor store for the frontend modal.
    store.addRemittance(session.userId, record);

    return jsonData([record], 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to submit remittance.",
      422
    );
  }
}
