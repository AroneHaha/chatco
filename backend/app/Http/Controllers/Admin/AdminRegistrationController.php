<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ApproveRegistrationRequest;
use App\Http\Requests\Admin\RejectRegistrationRequest;
use App\Services\AdminService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Admin registration review (S5-T15).
 *
 * Admins see PENDING commuter accounts (with uploaded valid ID), then
 * approve (granting the requested discount tier) or reject (with a reason).
 *
 * Routes (all behind auth:sanctum + role:ADMIN):
 *   GET  /api/v1/admin/registrations                → pending()
 *   POST /api/v1/admin/registrations/{id}/approve   → approve()
 *   POST /api/v1/admin/registrations/{id}/reject    → reject()
 *
 * Thin controller — all business logic lives in AdminService.
 */
class AdminRegistrationController extends Controller
{
    use ApiResponse;

    public function __construct(
        private AdminService $adminService
    ) {}

    /**
     * GET /api/v1/admin/registrations
     * List PENDING commuter accounts awaiting admin review.
     * Returns id_image_url, applied_type, and identifying fields.
     */
    public function pending(Request $request): JsonResponse
    {
        $perPage = (int) $request->integer('per_page', 15);

        $registrations = $this->adminService->listPendingRegistrations($perPage);

        return $this->successResponse($registrations, 'Pending registrations retrieved');
    }

    /**
     * POST /api/v1/admin/registrations/{id}/approve
     * Approve a pending registration.
     * - Copies applied_type → commuter_type (validated discount tier)
     * - Sets verified_at = now, account_status = APPROVED
     * - Clears rejection_reason
     * The commuter can now log in.
     */
    public function approve(ApproveRegistrationRequest $request, string $id): JsonResponse
    {
        $result = $this->adminService->approveRegistration($id);
        return $this->successResponse($result, 'Registration approved — commuter can now log in.');
    }

    /**
     * POST /api/v1/admin/registrations/{id}/reject
     * Reject a pending registration with a reason.
     * - Sets account_status = REJECTED + rejection_reason
     * - Soft-deletes the account so the email frees up for re-registration
     */
    public function reject(RejectRegistrationRequest $request, string $id): JsonResponse
    {
        $result = $this->adminService->rejectRegistration(
            $id,
            $request->validated()['rejection_reason']
        );
        return $this->successResponse($result, 'Registration rejected. The email is now available for re-registration.');
    }
}
