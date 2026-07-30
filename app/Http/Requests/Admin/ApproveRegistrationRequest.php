<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PATCH /api/v1/admin/registrations/{id}/approve.
 *
 * Authorization is enforced at the route level (auth:sanctum + role:ADMIN).
 * Approval is idempotent from the request shape's perspective: the only
 * accepted field is an optional admin note (reserved for audit logging in a
 * follow-up). commuter_type is NOT taken from the request — it is sourced
 * from the applicant's applied_type so an admin can never override the
 * verified-ID concession type the commuter applied for.
 */
class ApproveRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'admin_note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
