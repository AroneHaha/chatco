<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PATCH /api/v1/admin/registrations/{id}/reject.
 *
 * Authorization is enforced at the route level (auth:sanctum + role:ADMIN).
 * A rejection_reason is REQUIRED so the applicant has an auditable, human-
 * readable explanation of why their valid-ID submission was declined. The
 * reason is persisted on commuter_profiles.rejection_reason AND the account
 * is soft-deleted (see AdminService::rejectRegistration) so it can no longer
 * log in and its email is freed for reuse.
 */
class RejectRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rejection_reason' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'rejection_reason.required' => 'A rejection reason is required.',
            'rejection_reason.min' => 'The rejection reason must be at least 3 characters.',
        ];
    }
}
