<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class TerminatedPersonnel extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    /**
     * Override Laravel's default table name.
     *
     * Laravel's convention auto-pluralizes the model name →
     * `TerminatedPersonnel` would default to `terminated_personnels`
     * (with an 's'). The migration creates the table as `terminated_personnel`
     * (singular) because "personnel" is already a collective noun —
     * pluralizing it reads awkwardly. Pin the table name explicitly so
     * the model queries the table that actually exists.
     */
    protected $table = 'terminated_personnel';

    protected $fillable = [
        'id',
        'personnel_id',
        'personnel_type',
        'name',
        'role',
        'contact',
        'reason',
        'termination_type',
        'terminated_date',
        'last_vehicle',
    ];

    protected $casts = [
        'terminated_date' => 'date',
    ];

    /**
     * Auto-generate UUID on creation — matches the Vehicle/User/Driver
     * pattern used elsewhere in the codebase.
     */
    protected static function booted(): void
    {
        static::creating(function (TerminatedPersonnel $record) {
            if (empty($record->id)) {
                $record->id = (string) Str::uuid();
            }
        });
    }
}
