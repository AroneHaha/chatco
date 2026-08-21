<?php

namespace App\Http\Requests\Conductor;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'speed' => 'nullable|numeric|between:0,160',
            'heading' => 'nullable|numeric|between:0,360',
            'accuracy' => 'nullable|numeric|between:0,1000',
            'fix_timestamp' => 'nullable|date',
            'capacity_status' => 'nullable|string|in:AVAILABLE,STANDING,FULL',
            'device_id' => 'nullable|string|min:16|max:100|regex:/^[A-Za-z0-9._:-]+$/',
            'device_type' => 'nullable|required_with:device_id|string|in:WEB,MOBILE',
        ];
    }

    public function messages(): array
    {
        return [
            'lat.required' => 'Latitude is required',
            'lat.between' => 'Latitude must be between -90 and 90',
            'lng.required' => 'Longitude is required',
            'lng.between' => 'Longitude must be between -180 and 180',
            'heading.between' => 'Heading must be between 0 and 360',
            'capacity_status.in' => 'Capacity status must be: AVAILABLE, STANDING, or FULL',
        ];
    }
}
