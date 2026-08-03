<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class SaveRouteDraftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'geometry' => ['required', 'array', 'min:2', 'max:5000'],
            'geometry.*' => ['required', 'array', 'size:2'],
            'geometry.*.0' => ['required', 'numeric', 'between:-90,90'],
            'geometry.*.1' => ['required', 'numeric', 'between:-180,180'],
            'waypoints' => ['required', 'array', 'min:2', 'max:100'],
            'waypoints.*' => ['required', 'array', 'size:2'],
            'waypoints.*.0' => ['required', 'numeric', 'between:-90,90'],
            'waypoints.*.1' => ['required', 'numeric', 'between:-180,180'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
