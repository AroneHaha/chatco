<?php

namespace App\Http\Requests\Commuter;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/v1/commuter/feedback.
 *
 * Shape/type validation only — business logic (shift resolution, crew
 * derivation, duplicate detection) lives in FeedbackService::submit().
 *
 * SECURITY: Server-generated fields (vehicle_id, driver_id, conductor_id,
 * commuter_id) are NEVER accepted from the client. They are NOT listed in
 * rules(), so they will NOT appear in the validated() output. The controller
 * passes only the validated fields to the service, which derives the crew
 * from the shift_id + auth user. This prevents a commuter from submitting
 * feedback for a shift they didn't scan, or impersonating another commuter.
 *
 * Authorization is handled at the route level via role:COMMUTER.
 */
class StoreFeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shift_id' => 'required|string|exists:shift_logs,shift_id',
            'rating'   => 'required|integer|min:1|max:5',
            'category' => 'nullable|string|max:50',
            'comment'  => 'nullable|string|max:2000',
        ];
    }

    public function messages(): array
    {
        return [
            'shift_id.required' => 'Shift ID is required',
            'shift_id.exists'   => 'The selected shift does not exist',
            'rating.required'   => 'Rating is required',
            'rating.integer'    => 'Rating must be an integer',
            'rating.min'        => 'Rating must be at least 1',
            'rating.max'        => 'Rating must be at most 5',
            'category.max'      => 'Category must be at most 50 characters',
            'comment.max'       => 'Comment must be at most 2000 characters',
        ];
    }
}
