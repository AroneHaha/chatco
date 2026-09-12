<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * The one contact-number format accepted system-wide: exactly 11 digits,
 * starting with "09" (e.g. "09171234567"). No spaces, dashes, parentheses,
 * or "+63" country code — those are stripped/rejected at the boundary so
 * every contact_number/contact column ends up storing the same shape.
 *
 * Used everywhere a mobile number is collected — commuter self-signup,
 * on-site/admin registration, profile edits, and driver/conductor
 * create+edit (incl. emergency contacts). The frontend mirrors this same
 * pattern via CONTACT_NUMBER_PATTERN (frontend/lib/validation/contact-number.ts)
 * — keep the two in step.
 */
class PhilippineMobileNumber implements ValidationRule
{
    public const PATTERN = '/^09[0-9]{9}$/';

    public const MESSAGE = 'Enter an 11-digit mobile number starting with 09 (e.g. 09171234567).';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! preg_match(self::PATTERN, $value)) {
            $fail(self::MESSAGE);
        }
    }
}
