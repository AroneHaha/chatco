<?php

namespace App\Http\Requests\Commuter;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the payload for POST /api/commuter/receipts/claim.
 *
 * The commuter scans the QR printed on a paper cash receipt and sends the
 * opaque qr_token to bind that ride to their account, so it counts toward
 * the free-ride reward cycle. This request validates ONLY the qr_token.
 *
 * Shape/type validation only — business logic (locating the cash row, the
 * receipt TTL check, single-claim enforcement, passenger binding) lives in
 * TransactionService::claimCashReceipt().
 *
 * Authorization is handled at the route level via the `role:COMMUTER`
 * middleware, so authorize() returns true here.
 *
 * SECURITY: The qr_token is the ONLY client-supplied field. The commuter
 * being bound is taken from the authenticated user, never from the request,
 * so a caller cannot credit a ride to someone else's account.
 *
 * Pattern matches ClaimGcashRequest.
 */
class ClaimReceiptRequest extends FormRequest
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
            'qr_token.required' => 'Receipt QR token is required',
            'qr_token.string'   => 'Receipt QR token must be text',
        ];
    }
}
