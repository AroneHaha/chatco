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
            'effective_until' => ['nullable', 'date', 'after:now', 'after:effective_from'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
