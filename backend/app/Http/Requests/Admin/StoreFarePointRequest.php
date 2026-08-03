<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/admin/fare-points.
 */
class StoreFarePointRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role:ADMIN middleware handles authorization
    }

    public function rules(): array
    {
        return [
            'route_id' => ['required', 'uuid', 'exists:routes,id'],
            'point_number' => ['required', 'integer', 'min:1'],
            'code' => ['required', 'string', 'max:10'],
            'name' => ['required', 'string', 'max:100'],
            'landmarks' => ['nullable', 'string', 'max:500'],
            'sub_stops' => ['nullable', 'string', 'max:500'],
            'regular_fare' => ['required', 'numeric', 'min:0'],
            'discounted_fare' => ['required', 'numeric', 'min:0'],
            'latitude' => ['nullable', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'required_with:latitude', 'numeric', 'between:-180,180'],
        ];
    }

    public function messages(): array
    {
        return [
            'route_id.required' => 'A route must be selected.',
            'route_id.exists' => 'The selected route does not exist.',
            'point_number.required' => 'The point number is required.',
            'code.required' => 'The fare code is required.',
            'name.required' => 'The stop name is required.',
            'regular_fare.required' => 'The regular fare is required.',
            'discounted_fare.required' => 'The discounted fare is required.',
        ];
    }
}
