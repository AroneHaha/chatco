<?php

namespace App\Http\Requests\Commuter;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * Validates POST /api/v1/commuter/change-password.
 *
 * Field contract (frontend maps its own field names onto these):
 *   - current_password         the user's existing password
 *   - password                 the new password
 *   - password_confirmation    must match `password` ('confirmed' rule)
 *
 * The actual current-password check (Hash::check) is done in CommuterService
 * so a wrong password returns a field-level 422 rather than leaking timing via
 * a DB lookup here. Authorization is enforced by route middleware.
 */
class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required' => 'Your current password is required',
            'password.required'         => 'A new password is required',
            'password.confirmed'        => 'The new password confirmation does not match',
        ];
    }
}
