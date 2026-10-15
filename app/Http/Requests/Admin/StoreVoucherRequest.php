<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:FREE_RIDE,DISCOUNT'],
            'amount' => ['exclude_unless:type,DISCOUNT', 'required_if:type,DISCOUNT', 'numeric', 'decimal:0,2', 'min:0.01', 'max:99999999.99'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:100'],
            'allow_duplicates' => ['sometimes', 'boolean'],
            'idempotency_key' => ['sometimes', 'uuid'],
            'commuter_id' => ['prohibited'],
            'status' => ['prohibited'],
            'validity_hours' => ['nullable', 'integer', 'min:24', 'max:87600'],
            'expires_at' => ['nullable', Rule::prohibitedIf($this->filled('validity_hours')), 'date', 'after_or_equal:'.now()->addHours(24)->toIso8601String()],
            'ride_origin' => ['nullable', 'string', 'max:100'],
        ];
    }
}
