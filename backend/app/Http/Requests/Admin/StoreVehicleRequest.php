<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/admin/vehicles.
 *
 * plate_number must be unique (422 on dup). Unit numbers are server-generated.
 * brand + model are required.
 * vehicle_type, capacity_status, route_id, driver_id, conductor_id, status
 * are optional but validated for format/existence when present.
 */
class StoreVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role:ADMIN middleware on the route handles authorization
    }

    public function rules(): array
    {
        return [
            'unit_number'      => 'prohibited',
            'plate_number'     => 'required|string|max:20|unique:vehicles,plate_number',
            'brand'            => 'required|string|max:50',
            'model'            => 'required|string|max:50',
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
            'unit_number.prohibited' => 'The unit number is generated automatically.',
            'plate_number.unique' => 'The plate number has already been taken.',
            'vehicle_type.in'     => 'The vehicle type must be one of: Jeepney, Bus, Van, UV Express.',
            'capacity_status.in'  => 'The capacity status must be one of: AVAILABLE, STANDING, FULL.',
        ];
    }
}
