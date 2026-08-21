<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ShiftDeviceRecovery extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'shift_id',
        'recovered_by',
        'previous_device_id',
        'previous_device_type',
        'previous_device_claimed_at',
        'reason',
    ];

    protected $hidden = [
        'previous_device_id',
    ];

    protected function casts(): array
    {
        return [
            'previous_device_claimed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $recovery): void {
            if (empty($recovery->id)) {
                $recovery->id = (string) Str::uuid();
            }
        });
    }

    public function shift()
    {
        return $this->belongsTo(ShiftLog::class, 'shift_id', 'shift_id');
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'recovered_by');
    }
}
