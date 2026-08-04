<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRouteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'in:ACTIVE,INACTIVE'],
            'waypoints' => ['nullable', 'array', 'max:100'],
            'waypoints.*' => ['array', 'size:2'],
            'waypoints.*.0' => ['numeric', 'between:-90,90'],
            'waypoints.*.1' => ['numeric', 'between:-180,180'],
        ];
    }
}
