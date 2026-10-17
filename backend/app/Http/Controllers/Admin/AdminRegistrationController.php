<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ApproveRegistrationRequest;
use App\Http\Requests\Admin\RejectRegistrationRequest;
use App\Enums\ActivityLogCategory;
use App\Enums\UserRole;
use App\Models\CommuterProfile;
use App\Models\DiscountApplication;
use App\Mail\OnsiteAccountCreatedMail;
use App\Models\User;
use App\Rules\PhilippineMobileNumber;
use App\Rules\StrongPassword;
use App\Services\ActivityLogService;
use App\Services\AdminService;
use App\Services\RegistrationGuard;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
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
        private ActivityLogService $activityLogService,
    ) {}

    /**
     * GET /api/v1/admin/registrations
     * List PENDING commuter accounts awaiting admin review.
     * Returns id_image_url, applied_type, and identifying fields.
     */
    public function pending(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'applied_type' => ['nullable', Rule::in(['REGULAR', 'STUDENT', 'SENIOR', 'PWD'])],
            // Looks up one specific pending registration by its User.id —
            // used by the admin notification bell to deep-link straight to a
            // just-signed-up applicant regardless of where they fall in the
            // (oldest-first) review queue.
            'id' => ['nullable', 'uuid'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $registrations = $this->adminService->listPendingRegistrations($validated);

        return $this->successResponse($registrations, 'Pending registrations retrieved');
    }

    /**
     * GET /api/v1/admin/registrations/rejected
     * List REJECTED commuter accounts (soft-deleted, email rewritten to
     * 'rejected+{timestamp}@chatco.local'). Powers the Rejected tab.
     */
    public function rejected(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'applied_type' => ['nullable', Rule::in(['REGULAR', 'STUDENT', 'SENIOR', 'PWD'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $registrations = $this->adminService->listRejectedRegistrations($validated);

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
     *   - no password collection: a random default password is generated,
     *     emailed to the commuter, and must be replaced at first sign-in
     *     (users.must_change_password, enforced by EnsurePasswordChanged)
     *   - no email verification flow (admin-created accounts skip it)
     *   - account_status is APPROVED straight away, as approveRegistration()
     *     would set it: the staff member has already verified the ID in person,
     *     and the first-time password change is the activation step
     *
     * Accepts multipart/form-data (because of the ID image file).
     */
    public function store(Request $request): JsonResponse
    {
        foreach (DiscountApplication::STUDENT_TEXT_FIELDS as $field) {
            if (is_string($request->input($field))) {
                $request->merge([$field => trim($request->input($field))]);
            }
        }
        $student = $request->input('applied_type') === 'STUDENT';

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'surname' => ['required', 'string', 'max:100'],
            'birthdate' => ['required', 'date', 'before:today'],
            'gender' => ['nullable', 'string', 'max:20'],
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'contact_number' => ['required', 'string', new PhilippineMobileNumber],
            'username' => ['required', 'string', 'max:50', 'unique:commuter_profiles,username'],
            'language_preference' => ['nullable', 'string', 'max:20'],
            'applied_type' => ['required', 'string', Rule::in(['REGULAR', 'STUDENT', 'SENIOR', 'PWD'])],
            'id_image' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            // A Student gives the same school details renewal asks for.
            ...DiscountApplication::studentDetailRules($student),
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

        // Upload the ID image BEFORE opening the transaction — same reasoning
        // as AuthService::register(): storeAs() is a network call to external
        // storage (R2), so running it inside DB::transaction() would hold the
        // transaction (and the row locks the User insert takes) open for
        // however long that upload took. The id is generated up front and
        // assigned explicitly below (via $user->id = ..., not through mass
        // assignment — 'id' is deliberately excluded from User::$fillable)
        // so it matches the id already baked into the uploaded filename.
        $userId = (string) Str::uuid();
        $file = $request->file('id_image');
        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = $userId . '-' . Str::random(16) . '.' . $extension;
        $idImagePath = $file->storeAs(
            "ids/commuters/{$userId}",
            $filename,
            config('filesystems.uploads.private_id_disk', 'r2_private')
        );

        // Any failure inside the transaction (e.g. a race on the unique
        // username/email index) leaves $idImagePath uploaded with no owning
        // account — delete it before rethrowing so a failed onsite
        // registration never orphans a government ID in R2.
        // Held only in memory for this request: it is hashed on the User
        // insert and sent in the email, and never logged or returned.
        $defaultPassword = $this->generateDefaultPassword();

        try {
            $adminId = $request->user()->id;
            $created = DB::transaction(function () use ($validated, $userId, $idImagePath, $defaultPassword, $student, $adminId) {
                $user = new User([
                    'email' => $validated['email'],
                    'password' => $defaultPassword, // 'hashed' cast on User
                    'role' => UserRole::COMMUTER,
                ]);
                $user->id = $userId;
                $user->must_change_password = true;
                $user->save();

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
                    'account_status' => 'APPROVED',
                    'student_discount_expires_at' => $validated['applied_type'] === 'STUDENT' ? CommuterProfile::initialStudentExpiry() : null,
                    'id_image_url' => $idImagePath,
                    'verified_at' => now(),
                    'rejection_reason' => null,
                ]);

                // Keep the school details where renewals and discount
                // applications keep theirs: an approved Student application,
                // reviewed by the admin who saw the ID in person. The valid ID
                // stays on the profile, so no separate proof document is stored.
                if ($student) {
                    $now = now();
                    DiscountApplication::create([
                        'commuter_id' => $profile->id,
                        'request_type' => 'APPLICATION',
                        'requested_type' => 'STUDENT',
                        'status' => 'APPROVED',
                        'school_name' => $validated['school_name'],
                        'education_level' => $validated['education_level'],
                        'grade_level' => $validated['grade_level'] ?? null,
                        'school_year' => $validated['school_year'],
                        'enrollment_term' => ($validated['enrollment_term'] ?? null) ?: null,
                        'submitted_at' => $now,
                        'first_submitted_at' => $now,
                        'reviewed_at' => $now,
                        'reviewed_by' => $adminId,
                    ]);
                }

                return [
                    'user' => $user,
                    'profile' => $profile,
                ];
            });
        } catch (\Throwable $e) {
            $this->deleteIdImage($idImagePath);

            throw $e;
        }

        $emailSent = $this->sendDefaultPasswordEmail($created['user'], $created['profile'], $defaultPassword);

        $this->activityLogService->record(
            ActivityLogCategory::MEMBER,
            "Created onsite registration for {$created['profile']->first_name} {$created['profile']->surname}",
            $request->user(),
        );

        return $this->successResponse([
            'id' => $created['user']->id,
            'email' => $created['user']->email,
            'first_name' => $created['profile']->first_name,
            'surname' => $created['profile']->surname,
            'username' => $created['profile']->username,
            'applied_type' => $created['profile']->applied_type,
            'account_status' => 'APPROVED',
            'must_change_password' => true,
            // false means the account exists but the credentials email did not
            // go out; the admin should tell the commuter.
            'email_sent' => $emailSent,
        ], 'Onsite registration created. The commuter must set a new password at first sign-in.', 201);
    }

    /**
     * A random default password that satisfies App\Rules\StrongPassword, so the
     * first-time setup starts from a password the policy would have accepted.
     */
    private function generateDefaultPassword(): string
    {
        do {
            $candidate = Str::password(12, true, true, true, false);
        } while (Validator::make(['password' => $candidate], ['password' => [new StrongPassword]])->fails());

        return $candidate;
    }

    /**
     * Best-effort, like the approval and rejection emails: a mail outage must
     * not undo the account that was just created. Returns whether it was sent.
     */
    private function sendDefaultPasswordEmail(User $user, CommuterProfile $profile, string $defaultPassword): bool
    {
        try {
            Mail::to($user->email)->send(new OnsiteAccountCreatedMail(
                name: $user->getDisplayName(),
                email: $user->email,
                username: $profile->username,
                defaultPassword: $defaultPassword,
            ));

            return true;
        } catch (\Throwable $e) {
            // The exception message is logged, never the password.
            Log::error('Failed to send onsite account email', [
                'user_id' => $user->id,
                'exception' => $e->getMessage(),
            ]);

            return false;
        }
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

        $this->activityLogService->record(
            ActivityLogCategory::MEMBER,
            "Approved registration for {$result['name']}",
            $request->user(),
        );

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
        // Captured before rejectRegistration() rewrites the email/username to
        // placeholders — the profile's name fields are untouched by that, but
        // reading it up front avoids relying on that detail staying true.
        $targetName = User::find($id)?->getDisplayName() ?? $id;

        $result = $this->adminService->rejectRegistration(
            $id,
            $request->validated()['rejection_reason']
        );

        $this->activityLogService->record(
            ActivityLogCategory::MEMBER,
            "Rejected registration for {$targetName}",
            $request->user(),
        );

        return $this->successResponse($result, 'Registration rejected. The email is now available for re-registration.');
    }

    /**
     * Best-effort cleanup of an ID image uploaded in store() whose owning
     * registration failed to persist. Never throws — a failed delete here
     * must not mask the original registration failure the caller is about
     * to rethrow — but it does log, so an orphaned private ID left behind
     * by a disk-level failure is still visible operationally instead of
     * silently disappearing.
     */
    private function deleteIdImage(string $path): void
    {
        try {
            Storage::disk(config('filesystems.uploads.private_id_disk', 'r2_private'))->delete($path);
        } catch (\Throwable $e) {
            Log::warning('Failed to clean up orphaned onsite-registration ID image after a failed registration.', [
                'path' => $path,
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
