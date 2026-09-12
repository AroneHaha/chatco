<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * One-time backfill: rewrites every already-stored contact/mobile number to
 * the system-wide canonical format (11 digits, starting "09" — e.g.
 * "09171234567"). Validation everywhere now enforces this for NEW writes
 * (see App\Rules\PhilippineMobileNumber); this migration brings existing
 * rows in line so display/lookup/de-dupe never has to deal with the old
 * mixed "+639171234567" / "0917 123 4567" formats it used to accept.
 *
 * Only values that unambiguously resolve to a PH mobile number are
 * rewritten (a "+63"/"63" country-code prefix, or a bare 10-digit "9..."
 * number missing its leading 0). Anything else (landlines, malformed data)
 * is left untouched rather than risk corrupting data we can't confidently
 * convert.
 */
return new class extends Migration
{
    /** Table => contact-number column(s) to normalize. */
    private const CONTACT_COLUMNS = [
        'commuter_profiles' => ['contact_number'],
        'drivers' => ['contact', 'emergency_contact_number'],
        'conductor_profiles' => ['contact', 'emergency_contact_number'],
        'registration_rejections' => ['contact_number'],
        'terminated_personnel' => ['contact'],
        'claims' => ['claimant_contact'],
    ];

    public function up(): void
    {
        foreach (self::CONTACT_COLUMNS as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            foreach ($columns as $column) {
                if (! Schema::hasColumn($table, $column)) {
                    continue;
                }

                DB::table($table)
                    ->whereNotNull($column)
                    ->orderBy('id')
                    ->chunkById(200, function ($rows) use ($table, $column) {
                        foreach ($rows as $row) {
                            $normalized = self::normalize((string) $row->{$column});

                            if ($normalized !== null) {
                                DB::table($table)->where('id', $row->id)->update([$column => $normalized]);
                            }
                        }
                    });
            }
        }
    }

    public function down(): void
    {
        // Not reversible — the original mixed formatting isn't recorded
        // anywhere, and every rewritten value is still the same phone
        // number, just canonicalized. No-op.
    }

    /** Returns the canonical "09XXXXXXXXX" form, or null if already canonical / not confidently convertible. */
    private static function normalize(string $value): ?string
    {
        $trimmed = trim($value);

        if (preg_match('/^09[0-9]{9}$/', $trimmed)) {
            return null; // already canonical
        }

        $digits = preg_replace('/[^0-9]/', '', $trimmed);

        // "+63 917 123 4567" / "63-917-123-4567" -> "09171234567"
        if (preg_match('/^63(9[0-9]{9})$/', $digits, $matches)) {
            return '0'.$matches[1];
        }

        // "917 123 4567" (missing leading 0) -> "09171234567"
        if (preg_match('/^9[0-9]{9}$/', $digits)) {
            return '0'.$digits;
        }

        // Same 11 digits, just wrapped in dashes/spaces/parens -> strip formatting only.
        if (preg_match('/^09[0-9]{9}$/', $digits)) {
            return $digits;
        }

        return null; // not a recognizable PH mobile number — leave as-is
    }
};
