<?php

namespace App\Http\Requests\Announcement;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PUT /api/v1/admin/announcements/{id} (admin updates an announcement).
 *
 * All fields optional — partial updates allowed. Status changes are routed
 * through the archive endpoint, but status is allowed here too for one-shot
 * updates during creation/edit.
 */
class UpdateAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'   => 'sometimes|string|max:200',
            'message' => 'sometimes|string|max:5000',
            'type'    => 'sometimes|nullable|string|max:20',
            'status'  => 'sometimes|string|in:ACTIVE,ARCHIVED',
        ];
    }
}
