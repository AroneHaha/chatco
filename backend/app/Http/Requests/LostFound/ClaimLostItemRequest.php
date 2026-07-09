<?php

namespace App\Http\Requests\LostFound;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/lost-found/{itemId}/claim (commuter claims an item).
 *
 * The claimant_name/contact/email are derived from the auth user's commuter
 * profile in the service — NOT accepted from the client. Only proof (the
 * commuter's description of identifying details) + optional contact override
 * come from the request body.
 */
class ClaimLostItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'proof'           => 'required|string|max:1000',
            'claimant_contact'=> 'nullable|string|max:20',
            'claimant_email'  => 'nullable|string|email|max:255',
        ];
    }
}
