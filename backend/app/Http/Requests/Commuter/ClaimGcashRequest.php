<?php

namespace App\Http\Requests\Commuter;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the payload for POST /api/commuter/payments/claim (GCash claim).
 *
 * The commuter scans the conductor's binding QR and sends the opaque
 * qr_token to claim the GCash transaction. This request validates ONLY
 * the qr_token — all other fields are ignored.
 *
 * Shape/type validation only — business logic (finding the PENDING
 * transaction, expiry check, passenger binding, idempotency) lives in
 * TransactionService::claimGcash().
 *
 * Authorization is handled at the route level via the `role:COMMUTER`
 * middleware, so authorize() returns true here.
 *
 * SECURITY: The qr_token is the ONLY client-supplied field. All other
 * transaction fields (status, passenger_id, paymongo_*, paid_at) are
 * server-controlled and NEVER accepted from the client.
 *
 * Pattern matches CreateHailRequest.
 */
class ClaimGcashRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'qr_token' => 'required|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'qr_token.required' => 'QR token is required',
            'qr_token.string'   => 'QR token must be text',
        ];
    }
}
