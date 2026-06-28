<?php

namespace App\Http\Requests\Announcement;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/admin/announcements (admin creates an announcement).
 *
 * title + message are required. type is optional (existing column from the
 * base migration — used for categorization, e.g. 'holiday', 'route', 'system').
 * status defaults to ACTIVE; admins can set ARCHIVED on creation if needed.
 */
class StoreAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'   => 'required|string|max:200',
            'message' => 'required|string|max:5000',
            'type'    => 'nullable|string|max:20',
            'status'  => 'nullable|string|in:ACTIVE,ARCHIVED',
        ];
    }
}
