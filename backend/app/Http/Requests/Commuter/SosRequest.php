<?php

namespace App\Http\Requests\Commuter;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/commuter/sos.
 *
 * lat/lng are required (the alert is useless without location). note is
 * optional free-text context (e.g. 'Medical emergency', 'Feeling unsafe').
 * The commuter_id is derived from auth()->id() in the service — NEVER
 * accepted from the client.
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
