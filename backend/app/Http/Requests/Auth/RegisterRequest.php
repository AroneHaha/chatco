<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates POST /api/v1/auth/register (public — commuter self-sign-up).
 *
 * The commuter registers themselves with their valid-ID details + a chosen
 * password. The account is created with account_status=PENDING and
 * commuter_type=applied_type; an admin must approve before login is allowed.
 *
 * EMAIL UNIQUENESS + SOFT-DELETED REUSE
 * --------------------------------------
 * The users.email column has a DB-level unique index, but SoftDeleted rows
 * still physically occupy the table (SoftDeletes is an Eloquent scope, not a
 * DB constraint). To honour the spec ("an email belonging only to a
 * soft-deleted account is reusable"), AdminService::rejectRegistration
 * rewrites a rejected applicant's email to a unique 'rejected+{timestamp}'
 * placeholder, freeing the canonical address. AuthService::register() then
 * enforces uniqueness manually against NON-deleted users only, so a
 * previously-rejected email can be re-registered.
 *
 * ID IMAGE
 * --------
 * The valid-ID image is uploaded as a multipart file. We validate it's an
 * image (jpeg/png/webp) with a 5MB max. The file is stored to
 * storage/app/public/ids/ and the path is persisted to
 * commuter_profiles.id_image_url. NEVER store the raw file in the DB.
 */
class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // public endpoint
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'surname' => ['required', 'string', 'max:100'],
            'birthdate' => ['required', 'date', 'before:today'],
            'gender' => ['required', 'string', 'max:20'],
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'contact_number' => ['required', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{7,20}$/'],
            'username' => ['required', 'string', 'max:50', 'unique:commuter_profiles,username'],
            'password' => ['required', 'string', 'min:8', 'max:128', 'confirmed'],
            'language_preference' => ['nullable', 'string', 'max:20'],
            'applied_type' => ['required', 'string', Rule::in(['REGULAR', 'STUDENT', 'SENIOR', 'PWD'])],
            'id_image' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'applied_type.in' => 'The applied type must be one of: REGULAR, STUDENT, SENIOR, PWD.',
            'contact_number.regex' => 'The contact number format is invalid.',
            'username.unique' => 'The username has already been taken.',
            'id_image.required' => 'A valid ID image is required to complete registration.',
            'password.confirmed' => 'The password confirmation does not match.',
        ];
    }
}
