<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class PublishRouteVersionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'effective_from' => ['nullable', 'date'],
            'effective_until' => ['bail', 'nullable', 'date', 'after:now', 'after:effective_from'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Both `after` rules express one requirement: the detour must end after
     * it starts (a detour with no explicit start begins now). Without this,
     * Laravel's generic "must be a date after ..." text was returned instead
     * of the wording the controller uses for the same check.
     */
    public function messages(): array
    {
        return [
            'effective_until.after' => 'The detour expiration must be after its start time.',
        ];
    }
}
