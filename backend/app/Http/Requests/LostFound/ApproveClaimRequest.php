<?php

namespace App\Http\Requests\LostFound;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PATCH /api/v1/admin/lost-items/{itemId}/claims/{claimId}/approve.
 *
 * The pickup schedule tells the claimant where and when to collect the item.
 * Fields are format-checked here; whether they're required depends on the
 * claim (account claimant vs. walk-in), which LostItemService::approveClaim()
 * enforces once the claim is loaded.
 */
class ApproveClaimRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pickup_location' => 'nullable|string|max:255',
            'pickup_at' => 'nullable|date|after_or_equal:today',
            'pickup_reminder' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'pickup_at.after_or_equal' => 'The pickup date cannot be in the past.',
        ];
    }
}
