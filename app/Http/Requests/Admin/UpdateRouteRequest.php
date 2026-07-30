<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRouteRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'in:ACTIVE,INACTIVE'],
            'waypoints' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
