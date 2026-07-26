<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * The password policy for account creation and password resets.
 *
 * At least 8 characters, with an uppercase letter, a number, and a symbol.
 *
 * Written as one rule rather than a stack of regexes so the applicant gets a
 * single sentence naming exactly what's missing ("needs an uppercase letter
 * and a symbol") instead of three separate near-identical errors, or the
 * framework's generic "format is invalid". The frontend mirrors these checks
 * as a live checklist — keep the two in step (components/auth/signup-form.tsx).
 */
class StrongPassword implements ValidationRule
{
    /** Minimum length, mirrored by MIN_LENGTH in the frontend checklist. */
    public const MIN_LENGTH = 8;

    /** Longest password we accept — bcrypt silently truncates past 72 bytes. */
    public const MAX_LENGTH = 128;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('Your password must be text.');

            return;
        }

        if (mb_strlen($value) > self::MAX_LENGTH) {
            $fail('Your password may not be longer than ' . self::MAX_LENGTH . ' characters.');

            return;
        }

        $missing = [];

        if (mb_strlen($value) < self::MIN_LENGTH) {
            $missing[] = 'at least ' . self::MIN_LENGTH . ' characters';
        }

        if (! preg_match('/[A-Z]/', $value)) {
            $missing[] = 'an uppercase letter';
        }

        if (! preg_match('/[0-9]/', $value)) {
            $missing[] = 'a number';
        }

        // Anything that isn't a letter, a digit, or whitespace counts as a
        // symbol — broader than a fixed list, so a password using an unusual
        // punctuation mark isn't rejected for no visible reason.
        if (! preg_match('/[^A-Za-z0-9\s]/', $value)) {
            $missing[] = 'a symbol (like ! ? @ #)';
        }

        if ($missing === []) {
            return;
        }

        $fail('Your password needs ' . $this->naturalJoin($missing) . '.');
    }

    /** "a, b and c" — reads as a sentence rather than a list of rules. */
    private function naturalJoin(array $items): string
    {
        if (count($items) === 1) {
            return $items[0];
        }

        $last = array_pop($items);

        return implode(', ', $items) . ' and ' . $last;
    }
}
