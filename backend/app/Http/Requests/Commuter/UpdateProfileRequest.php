<?php

namespace App\Http\Requests\Commuter;

use App\Rules\PhilippineMobileNumber;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PUT /api/v1/commuter/profile.
 *
 * Shape/type validation only. Authorization is enforced at the route level
 * (auth:sanctum + role:COMMUTER), so authorize() returns true.
 *
 * SECURITY / MASS-ASSIGNMENT: only the genuinely editable, non-identity
 * fields are listed in rules(). Identity fields verified against the valid ID
 * (first_name, surname, birthdate, gender, commuter_type) and the login email
 * are deliberately absent — even if the client sends them they will NOT appear
 * in validated(), and the controller passes only validated() to the service.
 *
 * `sometimes` allows partial updates (send one field or both).
 */
class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'contact_number' => ['sometimes', 'required', 'string', new PhilippineMobileNumber],
            'language_preference' => ['sometimes', 'required', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'contact_number.required'    => 'Contact number cannot be empty',
            'language_preference.required' => 'Language preference cannot be empty',
            'language_preference.max'    => 'Language preference is too long',
        ];
    }
}
