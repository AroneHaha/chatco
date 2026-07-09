import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { mapArray, mapTransaction } from "@/lib/conductor/server/mappers";
import type { Transaction } from "@/lib/conductor/persistence/transactions.store";

/**
 * GET /api/conductor/transactions?shift_id={id}
 *
 * Proxies to Laravel GET /api/v1/conductor/transactions?shift_id={id}.
 * Laravel's TransactionService::getShiftTransactions() enforces that
 * the shift belongs to the authenticated conductor (403 otherwise).
 *
 * Returns the transactions in the frontend's Transaction shape (camelCase,
 * mapped payment_method, etc.) so the dashboard / end-of-day logic needs
 * no changes.
 */
export async function GET(request: NextRequest) {
  const shiftId = request.nextUrl.searchParams.get("shift_id");

  if (!shiftId) {
    return jsonError("shift_id query parameter is required.");
  }

  const result = await proxyToLaravel(
    request,
    `/conductor/transactions?shift_id=${encodeURIComponent(shiftId)}`,
    { method: "GET" }
  );

  if (!result.ok) {
    return jsonError(result.message ?? "Failed to load transactions.", result.status);
  }

  const transactions = mapArray<Transaction>(result.data, mapTransaction);
  return jsonData(transactions);
}

/**
 * POST /api/conductor/transactions
 *
 * Proxies to Laravel POST /api/v1/conductor/transactions.
 * Laravel's TransactionService::recordCashFare() handles:
 *   - Active shift resolution (422 if none)
 *   - Idempotency check (natural key within 60s window)
 *   - Denormalization of conductor_name/unit_number/driver_name
 *   - Payment method must be CASH (enforced by RecordCashRequest)
 *
 * The request body is forwarded as-is (with shift_id stripped — Laravel
 * resolves the shift from the authenticated conductor's active shift).
 *
 * Returns 201 with the created transaction in the frontend's Transaction shape.
 *
 * NOTE: This endpoint is CASH-ONLY. GCash fares must go through
 * /api/conductor/payments/gcash/initiate (which creates a PENDING transaction
 * with a qr_token + PayMongo intent). Forwarding payment_method=GCASH here
 * would be rejected by RecordCashRequest (which only accepts CASH).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Strip shiftId — Laravel resolves the shift from the conductor's
    // active shift (not from the request body). This prevents a conductor
    // from recording fares on another conductor's shift.
    const { shiftId: _ignored, ...txnBody } = body;

    // Laravel expects snake_case field names + payment_method=CASH
    // (RecordCashRequest validates `in:CASH` — GCash is rejected here).
    // GCash fares must go through the /payments/gcash/initiate endpoint.
    const payload = {
      payment_method: "CASH",
      final_amount: txnBody.finalAmount ?? txnBody.final_amount,
      pickup_name: txnBody.from ?? txnBody.pickup_name,
      dropoff_name: txnBody.to ?? txnBody.dropoff_name,
      base_fare: txnBody.baseFare ?? txnBody.base_fare,
      distance: txnBody.distance,
      discount_amount: txnBody.discountAmount ?? txnBody.discount_amount,
      passenger_name: txnBody.passengerName ?? txnBody.passenger_name,
      passenger_role: txnBody.passengerRole ?? txnBody.passenger_role,
      idempotency_key: txnBody.idempotencyKey ?? txnBody.idempotency_key,
    };

    const result = await proxyToLaravel(request, "/conductor/transactions", {
      method: "POST",
      body: payload,
    });

    if (!result.ok) {
      return jsonError(result.message ?? "Failed to record transaction.", result.status);
    }

    const transaction = mapTransaction(result.data);
    return jsonData(transaction, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to save transaction."
    );
  }
}
