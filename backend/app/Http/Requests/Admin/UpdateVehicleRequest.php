<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates PUT/PATCH /api/v1/admin/vehicles/{id}.
 *
 * Same rules as StoreVehicleRequest, but uniqueness checks exclude the
 * current vehicle's ID so you can save without changing the plate/unit.
 * All fields are optional on update (partial update supported).
 */
class UpdateVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role:ADMIN middleware on the route handles authorization
    }

    public function rules(): array
    {
        $vehicleId = $this->route('id') ?? $this->route('vehicle');

        return [
            'unit_number'      => ['sometimes', 'string', 'max:20', Rule::unique('vehicles', 'unit_number')->ignore($vehicleId)],
            'plate_number'     => ['sometimes', 'string', 'max:20', Rule::unique('vehicles', 'plate_number')->ignore($vehicleId)],
            'vehicle_type'     => 'nullable|string|max:50|in:Jeepney,Bus,Van,UV Express',
            'route_id'         => 'nullable|uuid|exists:routes,id',
            'driver_id'        => 'nullable|uuid|exists:drivers,id',
            'conductor_id'     => 'nullable|uuid|exists:conductor_profiles,id',
            'status'           => 'nullable|string|in:ACTIVE,MAINTENANCE,INACTIVE',
            'capacity_status'  => 'nullable|string|in:AVAILABLE,STANDING,FULL',
        ];
    }

    public function messages(): array
    {
        return [
            'unit_number.unique'  => 'The unit number has already been taken.',
            'plate_number.unique' => 'The plate number has already been taken.',
            'vehicle_type.in'     => 'The vehicle type must be one of: Jeepney, Bus, Van, UV Express.',
            'capacity_status.in'  => 'The capacity status must be one of: AVAILABLE, STANDING, FULL.',
        ];
    }
}
