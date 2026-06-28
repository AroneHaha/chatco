<?php

namespace App\Http\Requests\Qr;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/qr/generate.
 *
 * Admin-only (enforced by route middleware role:ADMIN). The admin selects a
 * vehicle (jeepney unit) and the service issues an HMAC-signed QR token that
 * encodes the vehicle_id + TTL.
 *
 * Authorization is handled at the route level via role:ADMIN, so authorize()
 * returns true here.
 */
class GenerateQrRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'vehicle_id' => 'required|string|exists:vehicles,id',
        ];
    }

    public function messages(): array
    {
        return [
            'vehicle_id.required' => 'Vehicle ID is required',
            'vehicle_id.exists'   => 'The selected vehicle does not exist',
        ];
    }
}
