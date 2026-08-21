<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class RecoverShiftDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:10', 'max:500'],
            'acknowledge_unsynced_cash_risk' => ['required', 'accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'reason.min' => 'Explain why the operating device cannot perform a safe handoff.',
            'acknowledge_unsynced_cash_risk.accepted' => 'Confirm that the lost device may still contain unsynchronized cash before continuing.',
        ];
    }
}
