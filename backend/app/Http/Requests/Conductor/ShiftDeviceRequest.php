<?php

namespace App\Http\Requests\Conductor;

use Illuminate\Foundation\Http\FormRequest;

class ShiftDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shift_id' => 'required|string|max:20|exists:shift_logs,shift_id',
            'device_id' => 'required|string|min:16|max:100|regex:/^[A-Za-z0-9._:-]+$/',
            'device_type' => 'required|string|in:WEB,MOBILE',
        ];
    }
}
