<?php

namespace App\Http\Requests\Conductor;

use Illuminate\Foundation\Http\FormRequest;

class SubmitRemittanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shift_id' => 'required|string',
            'total_collected' => 'required|numeric|min:0',
            'remitted_amount' => 'required|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'shift_id.required' => 'Shift ID is required',
            'total_collected.required' => 'Total collected amount is required',
            'total_collected.min' => 'Total collected cannot be negative',
            'remitted_amount.required' => 'Remitted amount is required',
            'remitted_amount.min' => 'Remitted amount cannot be negative',
        ];
    }
}