<?php

namespace App\Http\Controllers;

use App\Services\StudentRenewalService;
use App\Services\DiscountApplicationService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentRenewalController extends Controller
{
    use ApiResponse;

    public function __construct(private StudentRenewalService $renewals, private DiscountApplicationService $applications) {}

    public function state(Request $request)
    {
        return $this->successResponse($this->renewals->state($request->user()));
    }

    public function submit(Request $request)
    {
        return $this->successResponse($this->renewals->submit($request->user(), $this->proofData($request)), 'Renewal submitted for verification.', 201);
    }

    public function applicationState(Request $request)
    {
        return $this->successResponse($this->applications->state($request->user()))->header('Cache-Control', 'private, no-store');
    }

    public function applicationSubmit(Request $request)
    {
        return $this->successResponse($this->applications->submit($request->user(), $this->proofData($request, true)), 'Discount application submitted for verification.', 201)
            ->header('Cache-Control', 'private, no-store');
    }

    public function applicationCancel(Request $request)
    {
        $data = $request->validate(['application_id' => ['required', 'uuid']]);

        return $this->successResponse($this->applications->cancel($request->user(), $data['application_id']), 'Discount application cancelled.')
            ->header('Cache-Control', 'private, no-store');
    }

    private function proofData(Request $request, bool $application = false): array
    {
        foreach (['school_name', 'school_year', 'enrollment_term'] as $field) {
            if (is_string($request->input($field))) {
                $request->merge([$field => trim($request->input($field))]);
            }
        }
        $student = ! $application || $request->input('requested_type') === 'STUDENT';
        $documentOptional = $application && app()->environment('local');
        $data = $request->validate([
            'requested_type' => $application ? ['required', Rule::in(['STUDENT', 'PWD', 'SENIOR'])] : ['exclude'],
            'application_id' => $application ? ['nullable', 'uuid', 'required_with:revision'] : ['exclude'],
            'revision' => $application ? ['nullable', 'integer', 'min:1', 'required_with:application_id'] : ['exclude'],
            'document' => [$documentOptional ? 'sometimes' : 'required', 'nullable', 'file', 'mimes:jpeg,jpg,png,webp,pdf', 'max:5120'],
            'school_name' => [Rule::excludeIf(! $student), 'required', 'string', 'max:150'],
            'education_level' => [Rule::excludeIf(! $student), 'required', Rule::in(['HIGH_SCHOOL', 'COLLEGE'])],
            'grade_level' => [Rule::excludeIf(! $student), 'exclude_unless:education_level,HIGH_SCHOOL', 'required', 'integer', 'between:7,12'],
            'school_year' => [Rule::excludeIf(! $student), 'required', 'string', 'max:20'],
            'enrollment_term' => [Rule::excludeIf(! $student), 'required_if:education_level,COLLEGE', 'nullable', 'string', 'max:50'],
        ]);

        return $data;
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
            'request_type' => ['nullable', Rule::in(['APPLICATION', 'RENEWAL'])],
            'requested_type' => ['nullable', Rule::in(['STUDENT', 'PWD', 'SENIOR'])],
            'search' => ['nullable', 'string', 'max:100'], 'id' => ['nullable', 'uuid'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'], 'page' => ['nullable', 'integer', 'min:1'],
        ]);

        return $this->successResponse($this->renewals->list($filters))->header('Cache-Control', 'private, no-store');
    }

    public function review(Request $request, string $id)
    {
        if (is_string($request->input('reason'))) {
            $request->merge(['reason' => trim($request->input('reason'))]);
        }
        $data = $request->validate([
            'decision' => ['required', Rule::in(['APPROVED', 'NEEDS_CORRECTION', 'REJECTED'])],
            'revision' => ['required', 'integer', 'min:1'],
            'reason' => [Rule::requiredIf(fn () => $request->input('decision') !== 'APPROVED'), 'nullable', 'string', 'max:500'],
        ]);

        return $this->successResponse($this->renewals->review($request->user(), $id, $data))->header('Cache-Control', 'private, no-store');
    }
}
