<?php

namespace App\Http\Requests\LostFound;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PATCH /api/v1/admin/lost-items/{itemId}/claims/{claimId}/reject.
 *
 * rejection_reason is optional but recommended — the audit trail records it
 * so the commuter can understand why their claim was denied.
 */
class RejectClaimRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rejection_reason' => 'nullable|string|max:1000',
        ];
    }
}
