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