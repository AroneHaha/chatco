<?php

namespace App\Http\Requests\Conductor;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the payload for POST /api/conductor/payments/gcash/initiate.
 *
 * Shape/type validation only — business logic (active shift resolution,
 * qr_token generation, PayMongo intent creation) lives in
 * TransactionService::initiateGcashFare().
 *
 * Authorization is handled at the route level via the `role:CONDUCTOR`
 * middleware, so authorize() returns true here.
 *
 * SECURITY: Server-generated fields (qr_token, status, paymongo_intent_id,
 * paymongo_checkout_url, paid_at, passenger_id) are NEVER accepted from
 * the client. They are NOT listed in rules(), so they will NOT appear in
 * the validated() output — even if the client sends them. The controller
 * must use $request->validated() (not $request->all()) to ensure
 * mass-assignment safety.
 *
 * The minimum amount is 1 (₱1.00 = 100 centavos) because PayMongo's
 * minimum transaction amount is ₱1.00. Amounts below this will be
 * rejected by PayMongo at the API level.
 *
 * Pattern matches StartShiftRequest / RecordCashRequest.
 */
class InitiateGcashRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_method' => 'required|string|in:GCASH',
            // Accepted for backwards compatibility only; the server ignores
            // client monetary values and calculates from the fare matrix.
            'final_amount' => 'nullable|numeric|min:0',
            'pickup_name' => 'required_without:passengers|nullable|string|max:100',
            'dropoff_name' => 'required_without:passengers|nullable|string|max:100',
            'base_fare' => 'nullable|numeric|min:0',
            'distance' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'device_id' => 'nullable|string|min:16|max:100|regex:/^[A-Za-z0-9._:-]+$/',
            'device_type' => 'nullable|required_with:device_id|string|in:WEB,MOBILE',
            'passengers' => 'nullable|array|min:1|max:4',
            'passengers.*.passenger_type' => 'required_with:passengers|string|in:REGULAR,STUDENT,SENIOR,SENIOR_CITIZEN,PWD',
            'passengers.*.quantity' => 'required_with:passengers|integer|min:1|max:50',
            'pickup_stop_id' => 'required_with:passengers|nullable|uuid|exists:fare_points,id',
            'dropoff_stop_id' => 'required_with:passengers|nullable|uuid|exists:fare_points,id',
            'group_passengers' => 'nullable|array|min:1|max:50',
            'group_passengers.*.type' => 'required_with:group_passengers|string|in:REGULAR,SENIOR_CITIZEN,STUDENT,PWD',
            'group_passengers.*.quantity' => 'required_with:group_passengers|integer|min:1|max:50',
            'group_passengers.*.final_amount' => 'nullable|numeric|min:0',
            'group_passengers.*.base_fare' => 'nullable|numeric|min:0',
            'group_passengers.*.discount_amount' => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'payment_method.required' => 'Payment method is required',
            'payment_method.in' => 'Payment method must be GCASH for this endpoint',
            'final_amount.required' => 'Final amount is required',
            'final_amount.numeric' => 'Final amount must be a number',
            'final_amount.min' => 'Final amount must be at least ₱1.00 (PayMongo minimum)',
            'pickup_name.required' => 'Pickup point is required',
            'pickup_name.string' => 'Pickup point must be text',
            'dropoff_name.required' => 'Dropoff point is required',
            'dropoff_name.string' => 'Dropoff point must be text',
            'base_fare.numeric' => 'Base fare must be a number',
            'distance.numeric' => 'Distance must be a number',
            'discount_amount.numeric' => 'Discount amount must be a number',
        ];
    }
}
