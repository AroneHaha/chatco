<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ApproveRegistrationRequest;
use App\Http\Requests\Admin\RejectRegistrationRequest;
use App\Enums\UserRole;
use App\Models\CommuterProfile;
use App\Models\User;
use App\Services\AdminService;
use App\Services\RegistrationGuard;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Admin registration review (S5-T15) + onsite registration (S6-T14).
 *
 * Admins see PENDING commuter accounts (with uploaded valid ID), then
 * approve (granting the requested discount tier) or reject (with a reason).
 *
 * Admins can also create PENDING commuter accounts on behalf of commuters
 * who register onsite (e.g. at a terminal kiosk) — the commuter then waits
 * for admin approval before they can log in, same as self-registered users.
 *
 * Routes (all behind auth:sanctum + role:ADMIN):
 *   GET  /api/v1/admin/registrations                → pending()
 *   POST /api/v1/admin/registrations                → store()       [S6-T14]
 *   POST /api/v1/admin/registrations/{id}/approve   → approve()
 *   POST /api/v1/admin/registrations/{id}/reject    → reject()
 *
 * Thin controller — approve/reject business logic lives in AdminService.
 * store() is self-contained here because it mirrors AuthService::register()
 * but with admin-controlled fields (no email verification, gender optional).
 */
class AdminRegistrationController extends Controller
{
    use ApiResponse;

    public function __construct(
        private AdminService $adminService,
        private RegistrationGuard $registrationGuard,
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
     * GET /api/v1/admin/registrations/rejected
     * List REJECTED commuter accounts (soft-deleted, email rewritten to
     * 'rejected+{timestamp}@chatco.local'). Powers the Rejected tab.
     */
    public function rejected(Request $request): JsonResponse
    {
        $perPage = (int) $request->integer('per_page', 15);

        $registrations = $this->adminService->listRejectedRegistrations($perPage);

        return $this->successResponse($registrations, 'Rejected registrations retrieved');
    }

    /**
     * POST /api/v1/admin/registrations
     * Create a PENDING commuter account on behalf of a commuter who registered
     * onsite (e.g. at a terminal kiosk). The admin fills the form, uploads the
     * valid ID image, and the account is created with account_status=PENDING.
     *
     * Mirrors AuthService::register() but:
     *   - gender is optional (defaults to 'UNSPECIFIED') — the admin onsite
     *     flow is faster and may not collect gender
     *   - no password confirmation (the admin sets it directly)
     *   - no email verification flow (admin-created accounts skip it)
     *
     * The account appears in the Pending Verification tab immediately, where
     * the admin (or another admin) can approve it to grant the requested
     * discount tier.
     *
     * Accepts multipart/form-data (because of the ID image file).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'surname' => ['required', 'string', 'max:100'],
            'birthdate' => ['required', 'date', 'before:today'],
            'gender' => ['nullable', 'string', 'max:20'],
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'contact_number' => ['required', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{7,20}$/'],
            'username' => ['required', 'string', 'max:50', 'unique:commuter_profiles,username'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'language_preference' => ['nullable', 'string', 'max:20'],
            'applied_type' => ['required', 'string', Rule::in(['REGULAR', 'STUDENT', 'SENIOR', 'PWD'])],
            'id_image' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ]);

        // Safety net: enforce the re-registration cooldown here too, so an
        // applicant in a rejection cooldown can't be re-created via the onsite
        // kiosk flow either. Throws a 422 with a friendly retry-after message.
        $this->registrationGuard->assertNotBlocked(
            $validated['email'],
            $validated['contact_number'],
        );

        // Manual email uniqueness check against NON-deleted users — mirrors
        // AuthService::register. Soft-deleted (rejected) accounts have had
        // their email rewritten to a 'rejected+{timestamp}' placeholder, so
        // they never collide with a fresh registration.
        $emailTaken = User::whereNull('users.deleted_at')
            ->where('email', $validated['email'])
            ->exists();

        if ($emailTaken) {
            throw ValidationException::withMessages([
                'email' => ['The email has already been taken.'],
            ]);
        }

        $created = DB::transaction(function () use ($validated, $request) {
            $user = User::create([
                'email' => $validated['email'],
                'password' => $validated['password'], // 'hashed' cast on User
                'role' => UserRole::COMMUTER,
            ]);

            // Store the ID image on the private upload disk.
            $file = $request->file('id_image');
            $extension = $file->getClientOriginalExtension() ?: 'jpg';
            $filename = $user->id . '-' . Str::random(16) . '.' . $extension;
            $idImagePath = $file->storeAs(
                'ids',
                $filename,
                config('filesystems.uploads.private_id_disk', 'r2_private')
            );

            $profile = CommuterProfile::create([
                'id' => $user->id,
                'first_name' => $validated['first_name'],
                'middle_name' => $validated['middle_name'] ?? null,
                'surname' => $validated['surname'],
                'birthdate' => $validated['birthdate'],
                'gender' => $validated['gender'] ?? 'UNSPECIFIED',
                'email' => $validated['email'],
                'contact_number' => $validated['contact_number'],
                'commuter_type' => $validated['applied_type'],
                'applied_type' => $validated['applied_type'],
                'username' => $validated['username'],
                'language_preference' => $validated['language_preference'] ?? 'English',
                'account_status' => 'PENDING',
                'id_image_url' => $idImagePath,
                'verified_at' => null,
                'rejection_reason' => null,
            ]);

            return [
                'user' => $user,
                'profile' => $profile,
            ];
        });

        return $this->successResponse([
            'id' => $created['user']->id,
            'email' => $created['user']->email,
            'first_name' => $created['profile']->first_name,
            'surname' => $created['profile']->surname,
            'username' => $created['profile']->username,
            'applied_type' => $created['profile']->applied_type,
            'account_status' => 'PENDING',
        ], 'Onsite registration created — awaiting verification.', 201);
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
