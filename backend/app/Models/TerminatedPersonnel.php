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
