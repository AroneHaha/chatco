<?php

namespace App\Http\Requests\Conductor;

use Illuminate\Foundation\Http\FormRequest;

class StartShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'vehicle_id' => 'required|uuid|exists:vehicles,id',
            'driver_id' => 'required|uuid|exists:drivers,id',
            'route_id' => 'nullable|uuid|exists:routes,id',
            'device_id' => 'nullable|string|min:16|max:100|regex:/^[A-Za-z0-9._:-]+$/',
            'device_type' => 'nullable|required_with:device_id|string|in:WEB,MOBILE',
        ];
    }

    public function messages(): array
    {
        return [
            'vehicle_id.required' => 'Vehicle is required',
            'vehicle_id.exists' => 'Vehicle not found',
            'driver_id.required' => 'Driver is required',
            'driver_id.exists' => 'Driver not found',
            'route_id.exists' => 'Route not found',
        ];
    }
}
