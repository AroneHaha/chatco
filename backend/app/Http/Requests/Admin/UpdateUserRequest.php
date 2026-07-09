<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates PUT /api/v1/admin/users/{id}.
 *
 * Authorization is enforced at the route level (auth:sanctum + role:ADMIN).
 *
 * SECURITY / MASS-ASSIGNMENT: only admin-editable fields are listed, so
 * role, email and password can never be changed through this endpoint even
 * if sent — they are absent from validated() and the service uses only
 * validated() data. See AdminService for the rationale.
 *
 * `account_status` and `contact_number` are commuter-only; the service
 * rejects them (422) for other roles.
 */
class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name'     => ['sometimes', 'required', 'string', 'max:100'],
            'middle_name'    => ['sometimes', 'nullable', 'string', 'max:100'],
            'last_name'      => ['sometimes', 'required', 'string', 'max:100'],
            'account_status' => ['sometimes', 'required', 'string', Rule::in(['ACTIVE', 'SUSPENDED'])],
            'contact_number' => ['sometimes', 'required', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{7,20}$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.required'    => 'First name cannot be empty',
            'last_name.required'     => 'Last name cannot be empty',
            'account_status.in'      => 'Account status must be ACTIVE or SUSPENDED',
            'contact_number.regex'   => 'Contact number format is invalid',
        ];
    }
}
