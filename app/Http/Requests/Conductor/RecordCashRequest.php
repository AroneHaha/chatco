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
            'payment_method' => 'required|string|in:CASH,VOUCHER',
            'final_amount' => 'required_without_all:passengers,group_passengers|nullable|numeric|min:0',
            'pickup_name' => 'required_without:passengers|nullable|string|max:100',
            'dropoff_name' => 'required_without:passengers|nullable|string|max:100',
            'base_fare' => 'nullable|numeric|min:0',
            'distance' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'passenger_name' => 'nullable|string|max:100',
            'passenger_id' => 'nullable|uuid|exists:commuter_profiles,id',
            'passenger_role' => 'nullable|string|max:20',
            'pickup_stop_id' => 'nullable|uuid|exists:fare_points,id',
            'dropoff_stop_id' => 'nullable|uuid|exists:fare_points,id',
            'idempotency_key' => 'nullable|string|max:100',
            // ShiftLog uses the existing string primary key; this is used by
            // offline retries to target the originating shift safely.
            'shift_id' => 'nullable|string|max:20',
            'voucher_code' => 'nullable|string|required_if:payment_method,VOUCHER|max:50',
            'passengers' => 'nullable|array|min:1|max:4|required_with:pickup_stop_id,dropoff_stop_id',
            'passengers.*.passenger_type' => 'required_with:passengers|string|in:REGULAR,STUDENT,SENIOR,SENIOR_CITIZEN,PWD',
            'passengers.*.quantity' => 'required_with:passengers|integer|min:1|max:50',
            'pickup_stop_id' => 'required_with:passengers|nullable|uuid|exists:fare_points,id',
            'dropoff_stop_id' => 'required_with:passengers|nullable|uuid|exists:fare_points,id',
            'group_passengers' => 'nullable|array|min:1|max:50',
            'group_passengers.*.type' => 'required_with:group_passengers|string|in:REGULAR,SENIOR_CITIZEN,STUDENT,PWD',
            'group_passengers.*.quantity' => 'required_with:group_passengers|integer|min:1|max:50',
            'group_passengers.*.final_amount' => 'required_with:group_passengers|numeric|min:0',
            'group_passengers.*.base_fare' => 'nullable|numeric|min:0',
            'group_passengers.*.discount_amount' => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'payment_method.required' => 'Payment method is required',
            'payment_method.in' => 'Payment method must be CASH for this endpoint',
            'final_amount.required' => 'Final amount is required',
            'final_amount.numeric' => 'Final amount must be a number',
            'final_amount.min' => 'Final amount cannot be negative',
            'pickup_name.required' => 'Pickup point is required',
            'pickup_name.string' => 'Pickup point must be text',
            'dropoff_name.required' => 'Dropoff point is required',
            'dropoff_name.string' => 'Dropoff point must be text',
            'base_fare.numeric' => 'Base fare must be a number',
            'distance.numeric' => 'Distance must be a number',
            'discount_amount.numeric' => 'Discount amount must be a number',
            'pickup_stop_id.uuid' => 'Pickup stop ID must be a valid UUID',
            'pickup_stop_id.exists' => 'Pickup stop not found',
            'dropoff_stop_id.uuid' => 'Dropoff stop ID must be a valid UUID',
            'dropoff_stop_id.exists' => 'Dropoff stop not found',
        ];
    }
}
