<?php

namespace App\Http\Controllers;

use App\Services\StudentRenewalService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentRenewalController extends Controller
{
    use ApiResponse;

    public function __construct(private StudentRenewalService $renewals) {}

    public function state(Request $request)
    {
        return $this->successResponse($this->renewals->state($request->user()));
    }

    public function submit(Request $request)
    {
        foreach (['school_name', 'school_year', 'enrollment_term'] as $field) {
            if (is_string($request->input($field))) {
                $request->merge([$field => trim($request->input($field))]);
            }
        }
        $data = $request->validate([
            'document' => ['required', 'file', 'mimes:jpeg,jpg,png,webp,pdf', 'max:5120'],
            'school_name' => ['required', 'string', 'max:150'],
            'education_level' => ['required', Rule::in(['HIGH_SCHOOL', 'COLLEGE'])],
            // Only high school records a grade; a college submission drops the field.
            'grade_level' => ['exclude_unless:education_level,HIGH_SCHOOL', 'required', 'integer', 'between:7,12'],
            'school_year' => ['required', 'string', 'max:20'],
            // Grades 7-10 have no semester, so the term is only mandatory for college.
            'enrollment_term' => ['required_if:education_level,COLLEGE', 'nullable', 'string', 'max:50'],
        ]);

        return $this->successResponse($this->renewals->submit($request->user(), $data), 'Renewal submitted for verification.', 201);
    }

    public function regular(Request $request)
    {
        $request->validate(['confirmed' => ['required', 'accepted']]);

        return $this->successResponse($this->renewals->switchToRegular($request->user()));
    }

    public function reminder(Request $request)
    {
        $data = $request->validate(['action' => ['required', Rule::in(['snooze', 'dismiss'])]]);

        return $this->successResponse($this->renewals->setReminder($request->user(), $data['action']));
    }

    public function index(Request $request)
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['PENDING', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'])],
            'search' => ['nullable', 'string', 'max:100'], 'id' => ['nullable', 'uuid'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'], 'page' => ['nullable', 'integer', 'min:1'],
        ]);

        return $this->successResponse($this->renewals->list($filters));
    }

    public function review(Request $request, string $id)
    {
        $data = $request->validate([
            'decision' => ['required', Rule::in(['APPROVED', 'NEEDS_CORRECTION', 'REJECTED'])],
            'revision' => ['required', 'integer', 'min:1'],
            'reason' => [Rule::requiredIf(fn () => $request->input('decision') !== 'APPROVED'), 'nullable', 'string', 'max:500'],
        ]);

        return $this->successResponse($this->renewals->review($request->user(), $id, $data));
    }
}
