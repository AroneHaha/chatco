<?php

namespace App\Http\Requests\LostFound;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/admin/lost-items/{itemId}/image (multipart upload).
 *
 * Accepts a single image file (jpg/jpeg/png/webp) up to 5MB. The file is
 * stored on the 'public' disk and the resulting URL is saved to
 * lost_items.image_url, replacing any previous image.
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
