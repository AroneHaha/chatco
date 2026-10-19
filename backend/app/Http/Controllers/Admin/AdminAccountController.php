<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Mail\AdminAccountCreatedMail;
use App\Models\AdminProfile;
use App\Models\User;
use App\Rules\PhilippineMobileNumber;
use App\Rules\StrongPassword;
use App\Services\ActivityLogService;
use App\Services\MediaStorageService;
use App\Traits\ApiResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdminAccountController extends Controller
{
    use ApiResponse;

    public function __construct(
        private MediaStorageService $mediaStorage,
        private ActivityLogService $activityLogService,
    ) {}

    /** Replace only the authenticated administrator's picture. */
    public function updatePhoto(Request $request): JsonResponse
    {
        $request->validate(['photo' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:3072', 'dimensions:max_width=4096,max_height=4096']]);
        $user = $request->user();
        abort_unless($user->adminProfile()->exists(), 404, 'Administrator profile not found.');

        try {
            $url = $this->mediaStorage->storeProfileImage($request->file('photo'), 'admin', $user->id);
        } catch (\Throwable $error) {
            Log::error('Admin profile photo storage failed.', ['user_id' => $user->id, 'exception' => get_class($error)]);

            return $this->errorResponse('The photo could not be stored. Please try again.', 503);
        }

        try {
            DB::transaction(function () use ($user, $url) {
                $profile = $user->adminProfile()->lockForUpdate()->firstOrFail();
                $previous = $profile->profile_picture_url;
                $profile->profile_picture_url = $url;
                $profile->save();
                DB::afterCommit(fn () => $this->mediaStorage->deletePublicUrl($previous));
            });
        } catch (\Throwable $error) {
            $this->mediaStorage->deletePublicUrl($url);
            throw $error;
        }
        $this->activityLogService->record(ActivityLogCategory::ACCOUNT, 'Updated own administrator profile picture.', $user);

        return $this->successResponse(['profile_picture_url' => $url], 'Profile picture updated.');
    }

    /**
     * POST /api/v1/admin/admins
     * Create an admin and require a password change at first sign-in.
     * The role is fixed here; callers cannot create another role through this route.
     */
    public function store(Request $request): JsonResponse
    {
        foreach (['first_name', 'middle_name', 'last_name', 'email', 'contact_number', 'address', 'username'] as $field) {
            if (is_string($request->input($field))) {
                $request->merge([$field => trim($request->input($field))]);
            }
        }
        if (is_string($request->input('email'))) {
            $request->merge(['email' => strtolower($request->input('email'))]);
        }
        if (is_string($request->input('username'))) {
            $request->merge(['username' => strtolower($request->input('username'))]);
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:255', 'unique:users,email'],
            'contact_number' => ['required', 'string', new PhilippineMobileNumber],
            'address' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'min:3', 'max:50', 'regex:/^[a-z0-9._-]+$/', 'unique:admin_profiles,username'],
            'profile_picture' => ['nullable', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ], [
            'username.regex' => 'Use only letters, numbers, periods, underscores, or hyphens in the username.',
        ]);

        $userId = (string) Str::uuid();
        $hasPicture = $request->hasFile('profile_picture');
        $pictureUrl = $hasPicture
            ? $this->mediaStorage->storeProfileImage($request->file('profile_picture'), 'admin', $userId)
            : null;
        $defaultPassword = $this->generateDefaultPassword();

        try {
            $created = DB::transaction(function () use ($validated, $userId, $pictureUrl, $defaultPassword): array {
                $user = new User([
                    'email' => $validated['email'],
                    'password' => $defaultPassword,
                    'role' => UserRole::ADMIN,
                ]);
                $user->id = $userId;
                $user->must_change_password = true;
                $user->save();

                $profile = AdminProfile::create([
                    'id' => $user->id,
                    'first_name' => $validated['first_name'],
                    'middle_name' => $validated['middle_name'] ?? null,
                    'last_name' => $validated['last_name'],
                    'username' => $validated['username'],
                    'contact_number' => $validated['contact_number'],
                    'address' => $validated['address'],
                    'profile_picture_url' => $pictureUrl,
                ]);

                return compact('user', 'profile');
            });
        } catch (QueryException $e) {
            if ($hasPicture) {
                $this->mediaStorage->deletePublicUrl($pictureUrl);
            }

            // Duplicate checks run before the upload for the normal path; this
            // catches a competing request that wins between validation and insert.
            if (User::withTrashed()->where('email', $validated['email'])->exists()) {
                throw ValidationException::withMessages(['email' => ['The email address is already in use.']]);
            }
            if (AdminProfile::withTrashed()->where('username', $validated['username'])->exists()) {
                throw ValidationException::withMessages(['username' => ['The username is already in use.']]);
            }

            throw $e;
        } catch (\Throwable $e) {
            if ($hasPicture) {
                $this->mediaStorage->deletePublicUrl($pictureUrl);
            }
            throw $e;
        }

        $emailSent = $this->sendCredentialsEmail($created['user'], $created['profile'], $defaultPassword);

        $this->activityLogService->record(
            ActivityLogCategory::ACCOUNT,
            "Created admin account for {$created['profile']->first_name} {$created['profile']->last_name}",
            $request->user(),
        );

        return $this->successResponse([
            'id' => $created['user']->id,
            'first_name' => $created['profile']->first_name,
            'last_name' => $created['profile']->last_name,
            'email' => $created['user']->email,
            'username' => $created['profile']->username,
            'role' => UserRole::ADMIN->value,
            'must_change_password' => true,
            'email_sent' => $emailSent,
        ], $emailSent
            ? 'Admin account created. Temporary credentials were sent by email.'
            : 'Admin account created, but the credentials email could not be sent. The new admin can use Forgot Password to recover access.',
            201,
        );
    }

    private function generateDefaultPassword(): string
    {
        do {
            $candidate = Str::password(16, true, true, true, false);
        } while (Validator::make(['password' => $candidate], ['password' => [new StrongPassword]])->fails());

        return $candidate;
    }

    private function sendCredentialsEmail(User $user, AdminProfile $profile, string $defaultPassword): bool
    {
        try {
            // Send synchronously so plaintext credentials are never persisted in a queue.
            Mail::to($user->email)->send(new AdminAccountCreatedMail(
                name: $user->getDisplayName(),
                email: $user->email,
                username: $profile->username,
                defaultPassword: $defaultPassword,
            ));

            return true;
        } catch (\Throwable $e) {
            Log::error('Failed to send new admin credentials email.', [
                'user_id' => $user->id,
                'exception' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
