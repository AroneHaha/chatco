<?php

namespace App\Http\Requests\Qr;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/qr/scan-public.
 *
 * Commuter-only (enforced by route middleware role:COMMUTER). The commuter
 * scans the PERMANENT unit-QR printed inside the jeepney — which encodes a
 * stable JSON payload with the vehicle's id — and the frontend sends just
 * the `vehicle_id` here. The service resolves TODAY's driver + conductor
 * from shift_logs (no token signature/expiry to check, since the QR is
 * permanent by design).
 *
 * Authorization is handled at the route level via role:COMMUTER, so
 * authorize() returns true here.
 */
class ScanPublicQrRequest extends FormRequest
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
