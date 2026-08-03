<?php

namespace App\Http\Requests\Qr;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/qr/validate AND POST /api/v1/qr/scan.
 *
 * Both endpoints accept the same single field — the signed token string
 * issued by /qr/generate. The difference is the response:
 *   - /validate returns only the validity + vehicle_id + expiry (pre-check)
 *   - /scan     additionally resolves today's driver + conductor from shift_logs
 *
 * Commuter-only (enforced by route middleware role:COMMUTER).
 */
class ValidateQrRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => 'required|string',
        ];
    }

    public function messages(): array
    {
        return [
            'token.required' => 'QR token is required',
            'token.string'   => 'QR token must be a string',
        ];
    }
}
