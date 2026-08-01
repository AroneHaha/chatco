import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/conductor/payments/gcash/initiate
 *
 * Starts a GCash fare: proxies pickup/dropoff + amount to Laravel
 * POST /api/v1/conductor/payments/gcash/initiate, which creates a PENDING
 * transaction and returns the binding-QR payload
 * { transaction_id, qr_token, checkout_url, amount, expires_at }.
 *
 * checkout_url is null when no real provider is configured (FakeGateway) —
 * the UI then shows the dev-simulation control instead of a redirect.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const payload = {
      payment_method: "GCASH",
      final_amount: body.finalAmount ?? body.final_amount,
      pickup_name: body.from ?? body.pickup_name,
      dropoff_name: body.to ?? body.dropoff_name,
      base_fare: body.baseFare ?? body.base_fare,
      distance: body.distance,
      discount_amount: body.discountAmount ?? body.discount_amount,
      pickup_stop_id: body.pickupStopId ?? body.pickup_stop_id ?? undefined,
      dropoff_stop_id: body.dropoffStopId ?? body.dropoff_stop_id ?? undefined,
      passengers: body.passengers ?? undefined,
      group_passengers: body.groupPassengers ?? body.group_passengers ?? undefined,
    };

    const result = await proxyToLaravel(request, "/conductor/payments/gcash/initiate", {
      method: "POST",
      body: payload,
    });

    if (!result.ok) {
      return jsonError(result.message ?? "Failed to start GCash payment.", result.status);
    }

    return jsonData(result.data, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to start GCash payment."
    );
  }
}
