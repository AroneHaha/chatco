<?php

namespace App\Http\Requests\Commuter;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * Validates POST /api/v1/commuter/change-password/confirm.
 *
 * Same field contract as ChangePasswordRequest (current_password, password,
 * password_confirmation) plus the 6-digit `code` emailed to the commuter's
 * registered address by /change-password/request-code. current_password and
 * password are re-validated here (not just trusted from the request-code
 * step) since this is the request that actually rotates the password.
 */
class ConfirmPasswordChangeRequest extends FormRequest
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
            'code' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required' => 'Your current password is required',
            'password.required'         => 'A new password is required',
            'password.confirmed'        => 'The new password confirmation does not match',
            'code.required'              => 'Enter the code we emailed you',
        ];
    }
}
