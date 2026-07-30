<?php

namespace App\Http\Requests\LostFound;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PATCH /api/v1/admin/lost-items/{itemId} (admin edits a
 * previously reported item's descriptive fields). Same shape as
 * StoreLostItemRequest minus image_url (photos have their own endpoints).
 */
class UpdateLostItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_name'           => 'required|string|max:200',
            'description'         => 'required|string|max:2000',
            'plate_number'        => 'nullable|string|max:20',
            'driver_name'         => 'nullable|string|max:100',
            'conductor_name'      => 'nullable|string|max:100',
            'vehicle_id'          => 'nullable|uuid|exists:vehicles,id',
            'estimated_time_lost' => 'nullable|string|max:100',
            'category'            => 'nullable|string|max:20',
        ];
    }
}
