<?php

namespace App\Http\Requests\Commuter;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the payload for POST /api/commuter/hails (commuter hail creation).
 *
 * Shape/type validation only — business logic (active shift check, 1KM radius
 * enforcement) lives in HailService::createHail().
 *
 * Authorization is handled at the route level via the `role:COMMUTER`
 * middleware, so authorize() returns true here.
 *
 * Pattern matches StartShiftRequest / UpdateLocationRequest exactly.
 */
class CreateHailRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'vehicle_id'   => 'required|uuid|exists:vehicles,id',
            'commuter_lat' => 'required|numeric|between:-90,90',
            'commuter_lng' => 'required|numeric|between:-180,180',
        ];
    }

    public function messages(): array
    {
        return [
            'vehicle_id.required'   => 'Vehicle is required',
            'vehicle_id.exists'     => 'Vehicle not found',
            'commuter_lat.required' => 'Commuter latitude is required',
            'commuter_lat.between'  => 'Latitude must be between -90 and 90',
            'commuter_lng.required' => 'Commuter longitude is required',
            'commuter_lng.between'  => 'Longitude must be between -180 and 180',
        ];
    }
}
