<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PUT/PATCH /api/v1/admin/fare-points/{id}.
 * All fields are optional (partial update supported).
 */
class UpdateFarePointRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'route_id' => ['sometimes', 'uuid', 'exists:routes,id'],
            'point_number' => ['sometimes', 'integer', 'min:1'],
            'code' => ['sometimes', 'string', 'max:10'],
            'name' => ['sometimes', 'string', 'max:100'],
            'landmarks' => ['nullable', 'string', 'max:500'],
            'sub_stops' => ['nullable', 'string', 'max:500'],
            'regular_fare' => ['sometimes', 'numeric', 'min:0'],
            'discounted_fare' => ['sometimes', 'numeric', 'min:0'],
            'latitude' => ['nullable', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'required_with:latitude', 'numeric', 'between:-180,180'],
        ];
    }
}
