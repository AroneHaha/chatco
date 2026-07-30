<?php

namespace App\Http\Requests\LostFound;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/admin/lost-items/{itemId}/photos (multipart upload).
 *
 * Accepts a single image file (jpg/jpeg/png/webp) up to 5MB, appended as the
 * next photo on the item (max 3 — see LostItemService::MAX_PHOTOS).
 */
class UploadLostItemImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ];
    }
}
