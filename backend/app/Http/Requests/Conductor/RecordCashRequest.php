<?php

namespace App\Http\Requests\Conductor;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the payload for POST /api/conductor/transactions (cash fare).
 *
 * Shape/type validation only — business logic (active shift resolution,
 * idempotency check, denormalization) lives in
 * TransactionService::recordCashFare().
 *
 * Authorization is handled at the route level via the `role:CONDUCTOR`
 * middleware, so authorize() returns true here.
 *
 * SECURITY: Server-generated fields (qr_token, status, paymongo_intent_id,
 * paymongo_checkout_url, paid_at) are NEVER accepted from the client.
 * They are NOT listed in rules(), so they will NOT appear in the
 * validated() output — even if the client sends them. The controller
 * must use $request->validated() (not $request->all()) to ensure
 * mass-assignment safety.
 *
 * Pattern matches StartShiftRequest / CreateHailRequest.
 */
class RecordCashRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_method'   => 'required|string|in:CASH,VOUCHER',

            // Single-passenger fare. NOT required when group_passengers is
            // present — the mobile app's group payment derives each row's
            // final_amount from the group payload instead.
            'final_amount'     => 'required_without:group_passengers|nullable|numeric|min:0',

            'pickup_name'      => 'required|string|max:100',
            'dropoff_name'     => 'required|string|max:100',
            'base_fare'        => 'nullable|numeric|min:0',
            'distance'         => 'nullable|numeric|min:0',
            'discount_amount'  => 'nullable|numeric|min:0',
            'passenger_name'   => 'nullable|string|max:100',
            'passenger_role'   => 'nullable|string|max:20',
            'pickup_stop_id'   => 'nullable|uuid|exists:fare_points,id',
            'dropoff_stop_id'  => 'nullable|uuid|exists:fare_points,id',
            'idempotency_key'  => 'nullable|string|max:100',
            'voucher_code'     => 'nullable|string|required_if:payment_method,VOUCHER|max:50',

            // ─── Group cash fare (chatco-mobile multi-passenger payment) ──
            // One cash payment covering N passengers. The service expands
            // this into one transaction row per seat, sharing a group_id
            // and multiple_payment_reference.
            'group_passengers'              => ['nullable', 'array', 'min:1', 'max:30'],
            'group_passengers.*.type'       => ['required_with:group_passengers', 'string', 'in:REGULAR,SENIOR_CITIZEN,STUDENT,PWD'],
            'group_passengers.*.quantity'   => ['required_with:group_passengers', 'integer', 'min:1'],
            'group_passengers.*.final_amount' => ['required_with:group_passengers', 'numeric', 'min:0'],
            'group_passengers.*.base_fare'  => ['nullable', 'numeric', 'min:0'],
            'group_passengers.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'payment_method.required'  => 'Payment method is required',
            'payment_method.in'        => 'Payment method must be CASH for this endpoint',
            'final_amount.required'    => 'Final amount is required',
            'final_amount.numeric'     => 'Final amount must be a number',
            'final_amount.min'         => 'Final amount cannot be negative',
            'pickup_name.required'     => 'Pickup point is required',
            'pickup_name.string'       => 'Pickup point must be text',
            'dropoff_name.required'    => 'Dropoff point is required',
            'dropoff_name.string'      => 'Dropoff point must be text',
            'base_fare.numeric'        => 'Base fare must be a number',
            'distance.numeric'         => 'Distance must be a number',
            'discount_amount.numeric'  => 'Discount amount must be a number',
            'pickup_stop_id.uuid'      => 'Pickup stop ID must be a valid UUID',
            'pickup_stop_id.exists'    => 'Pickup stop not found',
            'dropoff_stop_id.uuid'     => 'Dropoff stop ID must be a valid UUID',
            'dropoff_stop_id.exists'   => 'Dropoff stop not found',
            'final_amount.required_without' => 'Final amount is required unless group passengers are provided',
            'group_passengers.*.type.in'    => 'Passenger type must be REGULAR, SENIOR_CITIZEN, STUDENT or PWD',
            'group_passengers.*.quantity.min' => 'Each passenger row needs at least 1 passenger',
        ];
    }
}
