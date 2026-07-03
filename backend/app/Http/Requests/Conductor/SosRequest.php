<?php

namespace App\Http\Requests\Conductor;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/conductor/sos.
 *
 * Same shape as the commuter SOS: lat/lng required (the alert is useless
 * without a location), note optional. The conductor_id is derived from
 * auth()->id() in the service — NEVER accepted from the client.
 */
class SosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lat'  => 'required|numeric|between:-90,90',
            'lng'  => 'required|numeric|between:-180,180',
            'note' => 'nullable|string|max:500',
        ];
    }
}
