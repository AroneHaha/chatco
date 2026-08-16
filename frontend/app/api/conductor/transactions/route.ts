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

  const page = request.nextUrl.searchParams.get("page");
  const perPage = request.nextUrl.searchParams.get("per_page");
  const paymentMethod = request.nextUrl.searchParams.get("payment_method");
  const dateFrom = request.nextUrl.searchParams.get("date_from");
  const dateTo = request.nextUrl.searchParams.get("date_to");
  const params = new URLSearchParams({ shift_id: shiftId });
  if (page) params.set("page", page);
  if (perPage) params.set("per_page", perPage);
  if (paymentMethod) params.set("payment_method", paymentMethod);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);

  const result = await proxyToLaravel(
    request,
    `/conductor/transactions?${params.toString()}`,
    { method: "GET" }
  );

  if (!result.ok) {
    return jsonError(result.message ?? "Failed to load transactions.", result.status);
  }

  const raw = result.data as {
    data?: unknown;
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
    total_amount?: number;
  } | unknown[] | null;
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : [];
  const transactions = mapArray<Transaction>(rows, mapTransaction);

  if (!Array.isArray(raw)) {
    return jsonData({
      transactions,
      currentPage: Number(raw?.current_page) || 1,
      perPage: Number(raw?.per_page) || transactions.length,
      total: Number(raw?.total) || transactions.length,
      totalPages: Number(raw?.last_page) || 1,
      totalAmount: Number(raw?.total_amount) || 0,
    });
  }

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
 * The originating shift ID is forwarded when present. Laravel verifies that
 * it belongs to the authenticated conductor and remains writable; omitting it
 * preserves the normal active-shift resolution for online requests.
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

    // Keep shiftId for offline retries. Laravel performs the ownership and
    // active-shift checks; the browser cannot choose another conductor's row.
    const { shiftId, ...txnBody } = body;

    // Laravel expects snake_case field names. payment_method can be CASH or
    // VOUCHER (RecordCashRequest validates `in:CASH,VOUCHER`). GCash goes
    // through /payments/gcash/initiate. For VOUCHER, voucher_code is required.
    const payload = {
      payment_method: txnBody.paymentMethod === "Voucher" ? "VOUCHER" : "CASH",
      final_amount: txnBody.finalAmount ?? txnBody.final_amount,
      pickup_name: txnBody.from ?? txnBody.pickup_name,
      dropoff_name: txnBody.to ?? txnBody.dropoff_name,
      base_fare: txnBody.baseFare ?? txnBody.base_fare,
      distance: txnBody.distance,
      discount_amount: txnBody.discountAmount ?? txnBody.discount_amount,
      passenger_name: txnBody.passengerName ?? txnBody.passenger_name,
      passenger_id: txnBody.passengerId || txnBody.passenger_id || undefined,
      passenger_role: txnBody.passengerRole ?? txnBody.passenger_role,
      idempotency_key: txnBody.idempotencyKey ?? txnBody.idempotency_key,
      shift_id: shiftId ?? txnBody.shift_id ?? undefined,
      voucher_code: txnBody.voucherCode ?? txnBody.voucher_code ?? undefined,
      pickup_stop_id: txnBody.pickupStopId ?? txnBody.pickup_stop_id ?? undefined,
      dropoff_stop_id: txnBody.dropoffStopId ?? txnBody.dropoff_stop_id ?? undefined,
      passengers: txnBody.passengers ?? undefined,
      group_passengers: txnBody.groupPassengers ?? txnBody.group_passengers ?? undefined,
    };

    const result = await proxyToLaravel(request, "/conductor/transactions", {
      method: "POST",
      body: payload,
    });

    if (!result.ok) {
      return jsonError(result.message ?? "Failed to record transaction.", result.status);
    }

    const group = result.data as { transactions?: unknown[]; [key: string]: unknown };
    if (Array.isArray(group?.transactions)) {
      return jsonData({
        ...group,
        transactions: group.transactions.map(mapTransaction),
      }, 201);
    }

    return jsonData(mapTransaction(result.data), 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to save transaction."
    );
  }
}
