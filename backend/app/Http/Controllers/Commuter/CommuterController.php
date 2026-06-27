<?php

namespace App\Http\Controllers\Commuter;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commuter\ChangePasswordRequest;
use App\Http\Requests\Commuter\UpdateProfileRequest;
use App\Services\CommuterService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommuterController extends Controller
{
    use ApiResponse;

    public function __construct(
        private CommuterService $commuterService
    ) {}

    /**
     * GET /api/v1/commuter/profile
     *
     * Returns the authenticated commuter's User + CommuterProfile.
     * Never exposes password/token fields. 404 if the profile row is missing.
     */
    public function profile(Request $request): JsonResponse
    {
        $payload = $this->commuterService->getProfile($request->user());

        if ($payload === null) {
            return $this->errorResponse('Commuter profile not found', 404);
        }

        return $this->successResponse($payload, 'Profile retrieved');
    }

    /**
     * PUT /api/v1/commuter/profile
     *
     * Updates only the editable fields (contact_number, language_preference).
     * Email/role/identity fields are immutable and stripped by the FormRequest.
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $payload = $this->commuterService->updateProfile(
            $request->user(),
            $request->validated(),
        );

        if ($payload === null) {
            return $this->errorResponse('Commuter profile not found', 404);
        }

        return $this->successResponse($payload, 'Profile updated');
    }

    /**
     * POST /api/v1/commuter/change-password
     *
     * Verifies the current password before rotating. A wrong current password
     * (or reusing the same password) is surfaced as a 422 by the service.
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->commuterService->changePassword(
            $request->user(),
            $validated['current_password'],
            $validated['password'],
        );

        return $this->successResponse(null, 'Password updated successfully');
    }

    public function trips(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function rewards(): JsonResponse
    {
        return $this->notImplementedResponse();
    }
}
