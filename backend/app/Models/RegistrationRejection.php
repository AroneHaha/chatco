<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * One row per rejected commuter registration — the strike ledger that powers
 * the re-registration cooldown (see App\Services\RegistrationGuard).
 *
 * Append-only: rows are never updated once written, and deliberately outlive
 * the soft-deleted commuter account they refer to, so repeated rejections of
 * the same person (matched on normalised email OR contact number) accumulate.
 */
class RegistrationRejection extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'email',
        'contact_number',
        'rejected_user_id',
        'reason',
        'attempt_number',
        'blocked_until',
        'rejected_by',
    ];

    protected function casts(): array
    {
        return [
            'attempt_number' => 'integer',
            'blocked_until' => 'datetime',
        ];
    }

    /** The admin who performed this rejection. Not a DB-level FK (see class docblock). */
    public function rejectedBy()
    {
        return $this->belongsTo(User::class, 'rejected_by', 'id');
    }

    protected static function booted(): void
    {
        static::creating(function (self $rejection): void {
            if (empty($rejection->id)) {
                $rejection->id = (string) Str::uuid();
            }
        });
    }

    /**
     * Normalise an email for identity matching: trim + lower-case.
     */
    public static function normalizeEmail(?string $email): ?string
    {
        $email = trim((string) $email);

        return $email === '' ? null : Str::lower($email);
    }

    /**
     * Normalise a contact number for identity matching: strip everything that
     * isn't a digit, so "0912 345 6789", "0912-345-6789" and "09123456789"
     * all collapse to the same key.
     */
    public static function normalizeContact(?string $contact): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $contact);

        return ($digits === null || $digits === '') ? null : $digits;
    }
}
