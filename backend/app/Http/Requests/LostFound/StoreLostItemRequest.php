<?php

namespace App\Http\Requests\LostFound;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/admin/lost-items (admin creates a reported item).
 *
 * Only the admin supplies the item details — commuters do not report items
 * in the revised S6 scope (admin-adds-items is the canonical entry point).
 */
class StoreLostItemRequest extends FormRequest
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
            'image_url'           => 'nullable|string|max:500',
            'plate_number'        => 'nullable|string|max:20',
            'driver_name'         => 'nullable|string|max:100',
            'conductor_name'      => 'nullable|string|max:100',
            'vehicle_id'          => 'nullable|uuid|exists:vehicles,id',
            'estimated_time_lost' => 'nullable|string|max:100',
            'category'            => 'nullable|string|max:20',
        ];
    }
}
