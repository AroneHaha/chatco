import { NextRequest } from "next/server";
import { getConductorSession } from "@/lib/conductor/server/auth";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { mapRemittance } from "@/lib/conductor/server/mappers";
import * as store from "@/lib/conductor/server/store";
import type { RemittanceRecord } from "@/lib/conductor/persistence/remittance.store";

export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, `/conductor/remittances${new URL(request.url).search}`, { method: "GET" });
  if (result.ok) {
    // Laravel returns a paginator: { data: [...rows], current_page, ... }.
    // Unwrap the inner array (tolerating a bare array too) and map each raw
    // Remittance model to the frontend's RemittanceRecord shape. Returning
    // the paginator OBJECT directly would make the client's `history` a
    // non-array, crashing the end-of-day page on `history.filter(...)`.
    const raw = result.data as { data?: unknown } | unknown[] | null;
    const rows = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { data?: unknown })?.data)
        ? ((raw as { data: unknown[] }).data)
        : [];
    return jsonData(rows.map(mapRemittance));
  }

  return jsonError(result.message ?? "Unable to load remittances.", result.status);
}

/**
 * POST /api/conductor/remittances
 *
 * Proxies to Laravel `POST /api/v1/conductor/remittances`, which runs
 * `endShiftViaRemittance`: it writes a `remittances` row AND flips the
 * `shift_log` to ENDED — so the end-of-shift is persisted to the DB. Laravel
 * ALSO clears the vehicle's current driver/conductor/active_shift assignment
 * (ShiftService::endShiftViaRemittance). On success we mirror the record into
 * the local conductor store so the frontend's remittance-history modal stays
 * consistent.
 *
 * Cash declaration is no longer the conductor's job — they only submit.
 * `total_collected` is sent (currently ignored server-side; the backend
 * always recomputes the authoritative cash total from Transaction rows).
 * The shift always resolves to PENDING when cash is owed, and stays that
 * way until an admin declares the physical cash count via
 * POST /admin/remittances/{shiftId}/cash-declaration.
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
      cash_total: cashTotal,
      gcash_total: gcashTotal,
      device_id: record.deviceId,
      device_type: record.deviceType,
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

  return jsonError(result.message ?? "Unable to submit remittance.", result.status);
}
