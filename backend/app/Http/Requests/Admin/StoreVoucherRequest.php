<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreVoucherRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:FREE_RIDE,DISCOUNT'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:100'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'ride_origin' => ['nullable', 'string', 'max:100'],
        ];
    }
}
